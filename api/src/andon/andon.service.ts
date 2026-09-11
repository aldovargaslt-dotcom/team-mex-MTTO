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
import { Aviso } from './andon-types';
import { AvisoDto, UmbralDto } from './dto/andon.dto';
import { DEFAULT_T_DIAS, DEFAULT_T_KM } from './enums';
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
  ) {}

  onModuleInit() {
    this.outbox.register(VISITA_CERRADA, async (payload, manager) => {
      await this.ingestVisitaCerrada(
        payload as unknown as VisitaCerradaPayload,
        manager,
      );
    });
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

  async listAvisos(unidadId?: string): Promise<AvisoDto[]> {
    await this.engine().evaluarTodas();
    let avisos = await this.store.listNoResueltos();
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

  async seedDefaults() {
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
    const unidades = await this.catalog.list();
    const u101 = unidades.find((u) => u.numeroInterno === 'U-101');
    const u103 = unidades.find((u) => u.numeroInterno === 'U-103');
    if (u101 && !(await this.store.getLastClosed(u101.unidadId))) {
      const cerradoAt = new Date();
      cerradoAt.setUTCDate(cerradoAt.getUTCDate() - 120);
      await this.ingestVisitaCerrada({
        eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
        eventType: VISITA_CERRADA,
        occurredAt: cerradoAt.toISOString(),
        visitaId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
        unidadId: u101.unidadId,
        tipoVehiculoId: u101.tipoVehiculoId,
        km: 10000,
        cerradoAt: cerradoAt.toISOString(),
        consumos: [],
      });
    }
    if (u103 && !(await this.store.getLastClosed(u103.unidadId))) {
      const cerradoAt = new Date();
      cerradoAt.setUTCDate(cerradoAt.getUTCDate() - 200);
      await this.ingestVisitaCerrada({
        eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
        eventType: VISITA_CERRADA,
        occurredAt: cerradoAt.toISOString(),
        visitaId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
        unidadId: u103.unidadId,
        tipoVehiculoId: u103.tipoVehiculoId,
        km: 8000,
        cerradoAt: cerradoAt.toISOString(),
        consumos: [],
      });
    }
    await this.engine().evaluarTodas();
  }

  private async toDto(aviso: Aviso): Promise<AvisoDto> {
    const unidad = await this.catalog.get(aviso.unidadId);
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
    };
  }
}
