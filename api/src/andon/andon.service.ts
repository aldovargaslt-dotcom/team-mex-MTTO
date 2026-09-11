import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CurrentUser } from '../auth/current-user';
import {
  VISITA_CERRADA,
  VisitaCerradaPayload,
} from '../kernel/events/visita-cerrada';
import { OutboxService } from '../kernel/outbox/outbox.service';
import { TiposVehiculoService } from '../tipos-vehiculo/tipos-vehiculo.service';
import {
  AndonEngine,
  AndonForbiddenError,
  AndonNotFoundError,
} from './andon-engine';
import { Aviso, LastClosedVisit } from './andon-types';
import { AvisoDto, UmbralDto } from './dto/andon.dto';
import { DEFAULT_T_DIAS, DEFAULT_T_KM, EstadoAviso } from './enums';
import { NestUnidadCatalog } from './nest-unidad-catalog';
import { StubWhatsAppAdapter } from './stub-whatsapp.adapter';
import { TypeOrmAndonStore } from './typeorm-store';

@Injectable()
export class AndonService implements OnModuleInit {
  constructor(
    private readonly store: TypeOrmAndonStore,
    private readonly catalog: NestUnidadCatalog,
    private readonly whatsapp: StubWhatsAppAdapter,
    private readonly outbox: OutboxService,
    private readonly tipos: TiposVehiculoService,
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
      whatsapp: this.whatsapp,
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
      };
    });
  }

  async updateUmbral(tipoVehiculoId: string, tKm: number, tDias: number) {
    await this.tipos.findOne(tipoVehiculoId);
    await this.store.setUmbral({ tipoVehiculoId, tKm, tDias });
    const tipo = await this.tipos.findOne(tipoVehiculoId);
    return {
      tipoVehiculoId,
      tipoNombre: tipo.nombre,
      tKm,
      tDias,
    };
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

  private async toDto(aviso: Aviso): Promise<AvisoDto> {
    const [unidad, lastClosed] = await Promise.all([
      this.catalog.get(aviso.unidadId),
      this.store.getLastClosed(aviso.unidadId),
    ]);
    return {
      id: aviso.id,
      unidadId: aviso.unidadId,
      numeroInterno: unidad?.numeroInterno ?? null,
      placas: unidad?.placas ?? null,
      tipoNombre: unidad?.tipoNombre ?? null,
      tipoVehiculoId: aviso.tipoVehiculoId,
      estado: aviso.estado,
      abiertaAt: aviso.abiertaAt,
      enteradoAt: aviso.enteradoAt,
      visitaResolutoriaId: aviso.visitaResolutoriaId,
      kmAlAbrir: aviso.kmAlAbrir,
      diasAlAbrir: aviso.diasAlAbrir,
      umbralKm: aviso.umbralKm,
      umbralDias: aviso.umbralDias,
      lastClosedKm: lastClosed?.km ?? null,
      lastClosedAt: lastClosed?.cerradoAt ?? null,
    };
  }
}
