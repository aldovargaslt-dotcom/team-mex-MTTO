import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CurrentUser } from '../auth/current-user';
import { AndonService } from '../andon/andon.service';
import { ChoferesService } from '../choferes/choferes.service';
import { EstadoChofer } from '../choferes/estado-chofer.enum';
import { EstadoUnidad } from '../common/estado-unidad.enum';
import { requireTrimmed } from '../common/require-trimmed';
import { UnidadesService } from '../unidades/unidades.service';
import {
  CreateMovimientoFlotaDto,
  CreateSitioDto,
  UpdateSitioDto,
} from './dto/flota.dto';
import { SitioEntity } from './entities/sitio.entity';
import { EstadoSitio } from './enums';
import { FlotaDomainError, FlotaEngine } from './flota-engine';
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
    private readonly andon: AndonService,
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
    const [unidades, choferes, sitios, operativas] = await Promise.all([
      this.unidades.findAll({}),
      this.choferes.findAll(),
      this.sitios.find(),
      this.store.listOperativas(),
    ]);
    const choferById = new Map(choferes.map((c) => [c.id, c]));
    const sitioById = new Map(sitios.map((s) => [s.id, s]));
    const opByUnidad = new Map(operativas.map((o) => [o.unidadId, o]));
    const now = Date.now();

    const rows = [];
    for (const unidad of unidades) {
      const op = opByUnidad.get(unidad.id);
      if (soloFuera && !op?.salidaAbiertaId) continue;
      const salida = op?.salidaAbiertaId
        ? await this.store.getMovimiento(op.salidaAbiertaId)
        : null;
      const andonAbierto = await this.andon.hasNoResuelto(unidad.id);
      rows.push({
        unidadId: unidad.id,
        numeroInterno: unidad.numeroInterno,
        placas: unidad.placas,
        tipoNombre: unidad.tipo.nombre,
        estado: unidad.estado,
        motivoInactivacion: unidad.motivoInactivacion,
        sitioId: op?.sitioId ?? null,
        sitioNombre: op?.sitioId
          ? (sitioById.get(op.sitioId)?.nombre ?? null)
          : null,
        choferActualId: op?.choferActualId ?? null,
        choferActualNombre: op?.choferActualId
          ? (choferById.get(op.choferActualId)?.nombre ?? null)
          : null,
        choferUltimoId: op?.choferUltimoId ?? null,
        choferUltimoNombre: op?.choferUltimoId
          ? (choferById.get(op.choferUltimoId)?.nombre ?? null)
          : null,
        salidaAbiertaId: op?.salidaAbiertaId ?? null,
        salidaAbiertaAt: salida?.occurredAt ?? null,
        tiempoFueraMs:
          salida?.occurredAt != null
            ? Math.max(0, now - Date.parse(salida.occurredAt))
            : null,
        kmSalida: salida?.km ?? null,
        andonAbierto,
      });
    }
    return rows.sort((a, b) =>
      a.numeroInterno.localeCompare(b.numeroInterno, 'es'),
    );
  }

  async detalle(unidadId: string) {
    const unidad = await this.unidades.findOne(unidadId);
    const [tablero] = (await this.tablero()).filter(
      (r) => r.unidadId === unidadId,
    );
    const historial = await this.store.listMovimientos(unidadId);
    const choferes = await this.choferes.findAll();
    const sitios = await this.sitios.find();
    const choferById = new Map(choferes.map((c) => [c.id, c]));
    const sitioById = new Map(sitios.map((s) => [s.id, s]));
    const ultimoKmVisita = await this.unidades.ultimoKmCerrado(unidadId);
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
      tablero: tablero ?? null,
      historial: historial.map((m) => ({
        ...m,
        choferNombre: choferById.get(m.choferId)?.nombre ?? null,
        sitioNombre: sitioById.get(m.sitioId)?.nombre ?? null,
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
}
