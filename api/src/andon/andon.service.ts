import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import {
  ALERT_TYPE_ACTIVE_PORT,
  AlertTypeActivePort,
} from '../alert-catalog/ports';
import { EntityManager } from 'typeorm';
import { CurrentUser } from '../auth/current-user';
import {
  VISITA_CERRADA,
  VisitaCerradaPayload,
} from '../kernel/events/visita-cerrada';
import { OutboxService } from '../kernel/outbox/outbox.service';
import { TiposVehiculoService } from '../unidades/tipos-vehiculo.service';
import {
  AndonEngine,
  AndonForbiddenError,
  AndonNotFoundError,
} from './andon-engine';
import { Aviso, LastClosedVisit } from './andon-types';
import { AvisoDto, UmbralDto } from './dto/andon.dto';
import {
  DEFAULT_T_DIAS,
  DEFAULT_T_KM,
  DEFAULT_CRITICAL_OVERDUE_DAYS,
  DEFAULT_CRITICAL_OVERDUE_KM,
  EstadoAviso,
} from './enums';
import { diasEntre, prioridadMantenimiento } from './andon-rules';
import { NestUnidadCatalog } from './nest-unidad-catalog';
import {
  AndonAbiertoPort,
  AVISO_INBOX_PORT,
  AvisoInboxPort,
  NOTIFY_PORT,
  NotifyPort,
} from './ports';
import { TypeOrmAndonStore } from './typeorm-store';

@Injectable()
export class AndonService implements OnModuleInit, AndonAbiertoPort {
  constructor(
    private readonly store: TypeOrmAndonStore,
    private readonly catalog: NestUnidadCatalog,
    @Inject(NOTIFY_PORT) private readonly notifier: NotifyPort,
    @Inject(AVISO_INBOX_PORT) private readonly inbox: AvisoInboxPort,
    private readonly outbox: OutboxService,
    private readonly tipos: TiposVehiculoService,
    @Optional()
    @Inject(ALERT_TYPE_ACTIVE_PORT)
    private readonly alertTypes?: AlertTypeActivePort,
  ) {
    // Constructor: listo antes de Seed.onModuleInit (cierre de visita semilla).
    this.outbox.register(VISITA_CERRADA, async (payload, manager) => {
      await this.ingestVisitaCerrada(
        payload as unknown as VisitaCerradaPayload,
        manager,
      );
    });
  }

  async onModuleInit() {
    await this.seedUmbrales();
  }

  private engine(store = this.store) {
    return new AndonEngine({
      store,
      catalog: this.catalog,
      whatsapp: this.notifier,
      inbox: this.inbox,
      alertTypes: this.alertTypes,
    });
  }

  async ingestVisitaCerrada(
    payload: VisitaCerradaPayload,
    manager?: EntityManager,
  ) {
    const store = manager ? this.store.withManager(manager) : this.store;
    return this.engine(store).handleVisitaCerrada(payload);
  }

  async alignLastClosed(row: LastClosedVisit) {
    await this.store.setLastClosed(row);
  }

  async evaluarPendientes() {
    return this.engine().evaluarTodas();
  }

  async listAvisos(
    unidadId?: string,
    estado?: EstadoAviso,
  ): Promise<AvisoDto[]> {
    await this.engine().evaluarTodas();
    const estados = estado
      ? [estado]
      : [EstadoAviso.ABIERTO, EstadoAviso.ENTERADO];
    let avisos = await this.store.listAvisos(estados);
    if (unidadId) {
      avisos = avisos.filter((a) => a.unidadId === unidadId);
    }
    return Promise.all(avisos.map((a) => this.toDto(a)));
  }

  async hasNoResuelto(unidadId: string): Promise<boolean> {
    const aviso = await this.store.getNoResuelto(unidadId);
    return Boolean(aviso);
  }

  async unidadIdsNoResuelto(): Promise<string[]> {
    const avisos = await this.store.listNoResueltos();
    return [...new Set(avisos.map((a) => a.unidadId))];
  }

  async enterado(id: string, user: CurrentUser): Promise<AvisoDto> {
    try {
      const aviso = await this.engine().enterado(id, {
        rol: user.rol,
        userId: user.userId,
      });
      return this.toDto(aviso);
    } catch (err) {
      if (err instanceof AndonForbiddenError) {
        throw new ForbiddenException(err.message);
      }
      if (err instanceof AndonNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  async listUmbrales(): Promise<UmbralDto[]> {
    const tipos = await this.tipos.findAll();
    const stored = await this.store.listUmbrales();
    const byTipo = new Map(stored.map((u) => [u.tipoVehiculoId, u]));
    return tipos.map((tipo) => {
      const umbral = byTipo.get(tipo.id);
      return {
        tipoVehiculoId: tipo.id,
        tipoNombre: tipo.nombre,
        tKm: umbral?.tKm ?? DEFAULT_T_KM,
        tDias: umbral?.tDias ?? DEFAULT_T_DIAS,
        criticalOverdueKm:
          umbral?.criticalOverdueKm ?? DEFAULT_CRITICAL_OVERDUE_KM,
        criticalOverdueDays:
          umbral?.criticalOverdueDays ?? DEFAULT_CRITICAL_OVERDUE_DAYS,
      };
    });
  }

  async updateUmbral(
    tipoVehiculoId: string,
    tKm: number,
    tDias: number,
    criticalOverdueKm?: number,
    criticalOverdueDays?: number,
    manager?: EntityManager,
  ) {
    const tipo = await this.tipos.findOne(tipoVehiculoId);
    const store = manager ? this.store.withManager(manager) : this.store;
    const existing = await store.getUmbral(tipoVehiculoId);
    const next = {
      tipoVehiculoId,
      tKm,
      tDias,
      criticalOverdueKm:
        criticalOverdueKm ??
        existing?.criticalOverdueKm ??
        DEFAULT_CRITICAL_OVERDUE_KM,
      criticalOverdueDays:
        criticalOverdueDays ??
        existing?.criticalOverdueDays ??
        DEFAULT_CRITICAL_OVERDUE_DAYS,
    };
    await store.setUmbral(next);
    if (!manager) await this.engine(store).evaluarTodas();
    return { ...next, tipoNombre: tipo.nombre };
  }

  /** Preview sin abrir/resolver avisos ni tocar inbox. */
  async previewPriorities(
    overrides: {
      tipoVehiculoId: string;
      tKm: number;
      tDias: number;
      criticalOverdueKm?: number;
      criticalOverdueDays?: number;
    }[] = [],
  ) {
    const rows = await this.store.listUmbrales();
    const settings = new Map(rows.map((row) => [row.tipoVehiculoId, row]));
    for (const row of overrides) {
      await this.tipos.findOne(row.tipoVehiculoId);
      settings.set(row.tipoVehiculoId, {
        ...settings.get(row.tipoVehiculoId),
        ...row,
      });
    }
    const units = await this.catalog.list();
    const priorities = new Map<string, 'WARNING' | 'CRITICAL'>();
    for (const unit of units.filter((row) => row.activa)) {
      const last = await this.store.getLastClosed(unit.unidadId);
      if (!last?.visitaId) continue;
      const notice = await this.store.getNoResuelto(unit.unidadId);
      const setting = settings.get(unit.tipoVehiculoId);
      const severity = prioridadMantenimiento({
        kmDesde: Math.max(0, notice?.kmAlAbrir ?? 0),
        diasDesde: Math.max(
          0,
          diasEntre(last.cerradoAt, new Date().toISOString()),
        ),
        tKm: setting?.tKm ?? DEFAULT_T_KM,
        tDias: setting?.tDias ?? DEFAULT_T_DIAS,
        criticalOverdueKm:
          setting?.criticalOverdueKm ?? DEFAULT_CRITICAL_OVERDUE_KM,
        criticalOverdueDays:
          setting?.criticalOverdueDays ?? DEFAULT_CRITICAL_OVERDUE_DAYS,
      });
      if (severity) priorities.set(unit.unidadId, severity);
    }
    return priorities;
  }

  async seedUmbrales() {
    const tipos = await this.tipos.findAll();
    for (const tipo of tipos) {
      const existing = await this.store.getUmbral(tipo.id);
      if (!existing) {
        await this.store.setUmbral({
          tipoVehiculoId: tipo.id,
          tKm: DEFAULT_T_KM,
          tDias: DEFAULT_T_DIAS,
        });
      }
    }
  }

  async seedDefaults() {
    await this.seedUmbrales();
    await this.engine().evaluarTodas();
  }

  async getLastClosed(unidadId: string) {
    return this.store.getLastClosed(unidadId);
  }

  async getUmbral(tipoVehiculoId: string) {
    return this.store.getUmbral(tipoVehiculoId);
  }

  private async toDto(aviso: Aviso): Promise<AvisoDto> {
    const [unidad, lastClosed, umbral] = await Promise.all([
      this.catalog.get(aviso.unidadId),
      this.store.getLastClosed(aviso.unidadId),
      this.store.getUmbral(aviso.tipoVehiculoId),
    ]);
    const diasDesde = Math.max(
      0,
      lastClosed
        ? diasEntre(lastClosed.cerradoAt, new Date().toISOString())
        : aviso.diasAlAbrir,
    );
    const kmDesde = Math.max(0, aviso.kmAlAbrir);
    const tKm = umbral?.tKm ?? DEFAULT_T_KM;
    const tDias = umbral?.tDias ?? DEFAULT_T_DIAS;
    const severity =
      prioridadMantenimiento({
        kmDesde,
        diasDesde,
        tKm,
        tDias,
        criticalOverdueKm:
          umbral?.criticalOverdueKm ?? DEFAULT_CRITICAL_OVERDUE_KM,
        criticalOverdueDays:
          umbral?.criticalOverdueDays ?? DEFAULT_CRITICAL_OVERDUE_DAYS,
      }) ?? 'WARNING';
    return {
      severity,
      diasDesde,
      kmDesde,
      atrasoDias: Math.max(0, diasDesde - tDias),
      atrasoKm: Math.max(0, kmDesde - tKm),
      marcaModelo: unidad?.marcaModelo ?? null,
      fotoDataUrl: unidad?.fotoDataUrl ?? null,
      id: aviso.id,
      unidadId: aviso.unidadId,
      numeroInterno: unidad?.numeroInterno ?? null,
      placas: unidad?.placas ?? null,
      tipoNombre: unidad?.tipoNombre ?? null,
      tipoVehiculoId: aviso.tipoVehiculoId,
      estado: aviso.estado,
      abiertaAt: aviso.abiertaAt,
      enteradoAt: aviso.enteradoAt,
      enteradoBy: aviso.enteradoBy,
      resueltoAt: aviso.resueltoAt,
      visitaResolutoriaId: aviso.visitaResolutoriaId,
      kmAlAbrir: aviso.kmAlAbrir,
      diasAlAbrir: aviso.diasAlAbrir,
      umbralKm: tKm,
      umbralDias: tDias,
      lastClosedKm: lastClosed?.km ?? null,
      lastClosedAt: lastClosed?.cerradoAt ?? null,
    };
  }
}
