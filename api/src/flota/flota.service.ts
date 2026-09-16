import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CurrentUser } from '../auth/current-user';
import {
  ANDON_ABIERTO_PORT,
  AndonAbiertoPort,
} from '../andon/ports';
import { ChoferesService } from '../choferes/choferes.service';
import { Chofer } from '../choferes/chofer.entity';
import { EstadoChofer } from '../choferes/estado-chofer.enum';
import { EstadoUnidad } from '../common/estado-unidad.enum';
import { requireTrimmed } from '../common/require-trimmed';
import { Unidad } from '../unidades/unidad.entity';
import { UnidadesService } from '../unidades/unidades.service';
import {
  CreateMovimientoFlotaDto,
  CreateSitioDto,
  UpdateSitioDto,
} from './dto/flota.dto';
import { SitioEntity } from './entities/sitio.entity';
import { EstadoSitio } from './enums';
import { FlotaDomainError, FlotaEngine } from './flota-engine';
import { MovimientoFlota, UnidadOperativa } from './flota-types';
import { TypeOrmFlotaStore } from './typeorm-flota-store';

const SITIOS_SEED = ['Patio', 'Taller'];

@Injectable()
export class FlotaService implements OnModuleInit {
  constructor(
    private readonly store: TypeOrmFlotaStore,
    @InjectRepository(SitioEntity)
    private readonly sitios: Repository<SitioEntity>,
    private readonly unidades: UnidadesService,
    private readonly choferes: ChoferesService,
    @Inject(ANDON_ABIERTO_PORT)
    private readonly andon: AndonAbiertoPort,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    for (const nombre of SITIOS_SEED) {
      const exists = await this.sitios.findOne({ where: { nombre } });
      if (!exists) {
        await this.sitios.save(this.sitios.create({ nombre }));
      }
    }
  }

  listSitios() {
    return this.sitios.find({ order: { nombre: 'ASC' } });
  }

  async getLatestKm(unidadId: string): Promise<number | null> {
    return this.store.getLatestKm(unidadId);
  }

  async createSitio(dto: CreateSitioDto) {
    const nombre = requireTrimmed(
      dto.nombre,
      'El nombre del sitio no puede estar vacío.',
    );
    const dup = await this.sitios.findOne({ where: { nombre } });
    if (dup) {
      throw new BadRequestException('Ya existe un sitio con ese nombre.');
    }
    return this.sitios.save(this.sitios.create({ nombre }));
  }

  async updateSitio(id: string, dto: UpdateSitioDto) {
    const sitio = await this.sitios.findOne({ where: { id } });
    if (!sitio) {
      throw new NotFoundException('No se encontró el sitio.');
    }
    if (dto.nombre !== undefined) {
      const nombre = requireTrimmed(
        dto.nombre,
        'El nombre del sitio no puede estar vacío.',
      );
      const dup = await this.sitios.findOne({ where: { nombre } });
      if (dup && dup.id !== id) {
        throw new BadRequestException('Ya existe un sitio con ese nombre.');
      }
      sitio.nombre = nombre;
    }
    if (dto.estado !== undefined) {
      sitio.estado = dto.estado as EstadoSitio;
    }
    return this.sitios.save(sitio);
  }

  async tablero(soloFuera = false) {
    const [unidades, ctx] = await Promise.all([
      this.unidades.findAll({}),
      this.tableroContext(),
    ]);
    return unidades
      .filter((unidad) => {
        if (!soloFuera) return true;
        return Boolean(ctx.opByUnidad.get(unidad.id)?.salidaAbiertaId);
      })
      .map((unidad) => this.filaTablero(unidad, ctx))
      .sort((a, b) => a.numeroInterno.localeCompare(b.numeroInterno, 'es'));
  }

  async detalle(unidadId: string) {
    const unidad = await this.unidades.findOne(unidadId);
    const [ctx, historial, ultimoKmVisita] = await Promise.all([
      this.tableroContext(),
      this.store.listMovimientos(unidadId),
      this.unidades.ultimoKmCerrado(unidadId),
    ]);
    return {
      unidad: {
        id: unidad.id,
        numeroInterno: unidad.numeroInterno,
        placas: unidad.placas,
        estado: unidad.estado,
        motivoInactivacion: unidad.motivoInactivacion,
        tipoNombre: unidad.tipo.nombre,
        ultimoKmVisita,
      },
      tablero: this.filaTablero(unidad, ctx),
      historial: historial.map((m) => ({
        ...m,
        choferNombre: ctx.choferById.get(m.choferId)?.nombre ?? null,
        sitioNombre: ctx.sitioById.get(m.sitioId)?.nombre ?? null,
      })),
    };
  }

  async registrar(dto: CreateMovimientoFlotaDto, user: CurrentUser) {
    let unidad: { id: string; activa: boolean } | null = null;
    try {
      const u = await this.unidades.findOne(dto.unidadId);
      unidad = { id: u.id, activa: u.estado === EstadoUnidad.ACTIVA };
    } catch {
      unidad = null;
    }

    let chofer: { id: string; activo: boolean } | null = null;
    try {
      const c = await this.choferes.findOne(dto.choferId);
      chofer = { id: c.id, activo: c.estado === EstadoChofer.ACTIVO };
    } catch {
      chofer = null;
    }

    const ultimoKmVisita = unidad
      ? await this.unidades.ultimoKmCerrado(unidad.id)
      : null;
    const andonAbierto = unidad
      ? await this.andon.hasNoResuelto(unidad.id)
      : false;

    try {
      return await this.dataSource.transaction(async (manager) => {
        const engine = new FlotaEngine(this.store.withManager(manager));
        return engine.registrar(
          {
            tipo: dto.tipo,
            unidadId: dto.unidadId,
            choferId: dto.choferId,
            sitioId: dto.sitioId,
            occurredAt: new Date(dto.occurredAt).toISOString(),
            km: dto.km,
            notas: dto.notas?.trim() || null,
            firmas: dto.firmas.map((f) => ({
              tipo: f.tipo,
              dataUrl: f.dataUrl,
            })),
            createdBy: user.userId,
            avalRol: user.rol,
          },
          {
            nowIso: new Date().toISOString(),
            unidad,
            chofer,
            ultimoKmVisita,
            andonAbierto,
          },
        );
      });
    } catch (err) {
      if (err instanceof FlotaDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  marcarEnvioEspecial(unidadId: string) {
    return this.unidades.marcarEnvioEspecial(unidadId);
  }

  reactivar(unidadId: string) {
    return this.unidades.reactivar(unidadId);
  }

  private async tableroContext(): Promise<TableroCtx> {
    const [choferes, sitios, operativas, andonIds] = await Promise.all([
      this.choferes.findAll(),
      this.sitios.find(),
      this.store.listOperativas(),
      this.andon.unidadIdsNoResuelto(),
    ]);
    const openIds = [
      ...new Set(
        operativas
          .map((op) => op.salidaAbiertaId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const salidas = await Promise.all(
      openIds.map((id) => this.store.getMovimiento(id)),
    );
    const salidaById = new Map<string, MovimientoFlota>();
    for (const mov of salidas) {
      if (mov) salidaById.set(mov.id, mov);
    }
    return {
      now: Date.now(),
      choferById: new Map(choferes.map((c) => [c.id, c])),
      sitioById: new Map(sitios.map((s) => [s.id, s])),
      opByUnidad: new Map(operativas.map((o) => [o.unidadId, o])),
      salidaById,
      andonIds: new Set(andonIds),
    };
  }

  private filaTablero(unidad: Unidad, ctx: TableroCtx) {
    const op = ctx.opByUnidad.get(unidad.id);
    const salida = op?.salidaAbiertaId
      ? (ctx.salidaById.get(op.salidaAbiertaId) ?? null)
      : null;
    return {
      unidadId: unidad.id,
      numeroInterno: unidad.numeroInterno,
      placas: unidad.placas,
      tipoNombre: unidad.tipo.nombre,
      estado: unidad.estado,
      motivoInactivacion: unidad.motivoInactivacion,
      sitioId: op?.sitioId ?? null,
      sitioNombre: op?.sitioId
        ? (ctx.sitioById.get(op.sitioId)?.nombre ?? null)
        : null,
      choferActualId: op?.choferActualId ?? null,
      choferActualNombre: op?.choferActualId
        ? (ctx.choferById.get(op.choferActualId)?.nombre ?? null)
        : null,
      choferUltimoId: op?.choferUltimoId ?? null,
      choferUltimoNombre: op?.choferUltimoId
        ? (ctx.choferById.get(op.choferUltimoId)?.nombre ?? null)
        : null,
      salidaAbiertaId: op?.salidaAbiertaId ?? null,
      salidaAbiertaAt: salida?.occurredAt ?? null,
      ultimoMovimientoAt: op?.ultimoMovimientoAt ?? null,
      tiempoFueraMs:
        salida?.occurredAt != null
          ? Math.max(0, ctx.now - Date.parse(salida.occurredAt))
          : null,
      kmSalida: salida?.km ?? null,
      andonAbierto: ctx.andonIds.has(unidad.id),
    };
  }
}

type TableroCtx = {
  now: number;
  choferById: Map<string, Chofer>;
  sitioById: Map<string, SitioEntity>;
  opByUnidad: Map<string, UnidadOperativa>;
  salidaById: Map<string, MovimientoFlota>;
  andonIds: Set<string>;
};
