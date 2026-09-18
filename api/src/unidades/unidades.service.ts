import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from '../auth/current-user';
import { Rol } from '../auth/roles.enum';
import { mensajesHub, puedeCrearVisita } from '../common/hub-policy';
import { EstadoUnidad } from '../common/estado-unidad.enum';
import { MotivoInactivacion } from '../common/motivo-inactivacion.enum';
import { requireTrimmed } from '../common/require-trimmed';
import { Chofer } from '../choferes/chofer.entity';
import { EstadoChofer } from '../choferes/estado-chofer.enum';
import { TiposVehiculoService } from './tipos-vehiculo.service';
import { EstadoVisita } from '../visitas/enums';
import { Visita } from '../visitas/visita.entity';
import { CreateUnidadDto } from './dto/create-unidad.dto';
import { FiltrarUnidadesDto } from './dto/filtrar-unidades.dto';
import { UpdateUnidadDto } from './dto/update-unidad.dto';
import { UnidadHubDto } from './dto/unidad-hub.dto';
import { Unidad } from './unidad.entity';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toHubTrabajos(visita: Visita) {
  return (visita.trabajos ?? [])
    .slice()
    .sort((a, b) =>
      a.categoria === b.categoria
        ? a.item.localeCompare(b.item, 'es')
        : a.categoria.localeCompare(b.categoria),
    )
    .map((trabajo) => ({
      categoria: trabajo.categoria,
      item: trabajo.item,
    }));
}

@Injectable()
export class UnidadesService {
  constructor(
    @InjectRepository(Unidad)
    private readonly repo: Repository<Unidad>,
    @InjectRepository(Visita)
    private readonly visitas: Repository<Visita>,
    @InjectRepository(Chofer)
    private readonly choferes: Repository<Chofer>,
    private readonly tipos: TiposVehiculoService,
  ) {}

  async findAll(filtros: FiltrarUnidadesDto) {
    const qb = this.repo
      .createQueryBuilder('unidad')
      .leftJoinAndSelect('unidad.tipo', 'tipo')
      .orderBy('unidad.numeroInterno', 'ASC');

    if (filtros.numeroInterno?.trim()) {
      qb.andWhere('unidad.numeroInterno ILIKE :numeroInterno', {
        numeroInterno: `%${filtros.numeroInterno.trim()}%`,
      });
    }
    if (filtros.placas?.trim()) {
      qb.andWhere('unidad.placas ILIKE :placas', {
        placas: `%${filtros.placas.trim()}%`,
      });
    }
    if (filtros.tipo?.trim()) {
      const tipo = filtros.tipo.trim();
      if (UUID_RE.test(tipo)) {
        qb.andWhere('tipo.id = :tipoId', { tipoId: tipo });
      } else {
        qb.andWhere('tipo.nombre ILIKE :tipoNombre', {
          tipoNombre: `%${tipo}%`,
        });
      }
    }
    if (filtros.q?.trim()) {
      const q = `%${filtros.q.trim()}%`;
      qb.andWhere(
        '(unidad.numeroInterno ILIKE :q OR unidad.placas ILIKE :q OR unidad.marcaModelo ILIKE :q)',
        { q },
      );
    }
    if (filtros.estado) {
      qb.andWhere('unidad.estado = :estado', { estado: filtros.estado });
    }

    return qb.getMany();
  }

  async findOne(id: string) {
    const unidad = await this.repo.findOne({ where: { id } });
    if (!unidad) {
      throw new NotFoundException('No se encontró la unidad.');
    }
    return unidad;
  }

  async create(dto: CreateUnidadDto) {
    const tipo = await this.tipos.findOne(dto.tipoId);
    const unidad = this.repo.create({
      numeroInterno: requireTrimmed(
        dto.numeroInterno,
        'El número interno no puede estar vacío.',
      ),
      placas: requireTrimmed(
        dto.placas,
        'Las placas no pueden estar vacías.',
      ).toUpperCase(),
      vin: this.normalizeVin(dto.vin),
      tipo,
      estado: dto.estado,
      motivoInactivacion: null,
      choferId: null,
      marcaModelo: dto.marcaModelo?.trim() || null,
      anio: dto.anio ?? null,
    });
    return this.repo.save(unidad);
  }

  async update(id: string, dto: UpdateUnidadDto) {
    const unidad = await this.findOne(id);
    if (dto.tipoId) {
      unidad.tipo = await this.tipos.findOne(dto.tipoId);
    }
    if (dto.numeroInterno !== undefined) {
      unidad.numeroInterno = requireTrimmed(
        dto.numeroInterno,
        'El número interno no puede estar vacío.',
      );
    }
    if (dto.placas !== undefined) {
      unidad.placas = requireTrimmed(
        dto.placas,
        'Las placas no pueden estar vacías.',
      ).toUpperCase();
    }
    if (dto.vin !== undefined) {
      unidad.vin = this.normalizeVin(dto.vin);
    }
    if (dto.estado !== undefined) {
      unidad.estado = dto.estado;
      unidad.motivoInactivacion = null;
    }
    if (dto.marcaModelo !== undefined) {
      unidad.marcaModelo = dto.marcaModelo.trim() || null;
    }
    if (dto.anio !== undefined) {
      unidad.anio = dto.anio;
    }
    return this.repo.save(unidad);
  }

  async marcarEnvioEspecial(id: string) {
    const unidad = await this.findOne(id);
    unidad.estado = EstadoUnidad.INACTIVA;
    unidad.motivoInactivacion = MotivoInactivacion.ENVIO_ESPECIAL;
    return this.repo.save(unidad);
  }

  async reactivar(id: string) {
    const unidad = await this.findOne(id);
    unidad.estado = EstadoUnidad.ACTIVA;
    unidad.motivoInactivacion = null;
    return this.repo.save(unidad);
  }

  async ultimoKmCerrado(unidadId: string): Promise<number | null> {
    const ultimoCerrado = await this.visitas.findOne({
      where: { unidad: { id: unidadId }, estado: EstadoVisita.CERRADO },
      order: { cerradoAt: 'DESC' },
    });
    return ultimoCerrado?.km ?? null;
  }

  async hub(id: string, user: CurrentUser): Promise<UnidadHubDto> {
    const unidad = await this.findOne(id);
    const [ultimoCerrado, hayChoferesActivos, visitas] = await Promise.all([
      this.visitas.findOne({
        where: { unidad: { id }, estado: EstadoVisita.CERRADO },
        order: { cerradoAt: 'DESC' },
      }),
      this.choferes
        .count({ where: { estado: EstadoChofer.ACTIVO } })
        .then((n) => n > 0),
      this.visitas.find({
        where: { unidad: { id } },
        relations: { chofer: true, trabajos: true, piezas: true },
        order: { updatedAt: 'DESC' },
      }),
    ]);

    const toItem = (visita: Visita) => ({
      id: visita.id,
      estado: visita.estado,
      tipo: visita.tipo,
      km: visita.km,
      choferId: visita.chofer?.id ?? null,
      choferNombre: visita.chofer?.nombre ?? null,
      createdBy: visita.createdBy,
      createdAt: visita.createdAt,
      updatedAt: visita.updatedAt,
      cerradoAt: visita.cerradoAt,
      trabajosCount: visita.trabajos?.length ?? 0,
      trabajos: toHubTrabajos(visita),
      piezas: (visita.piezas ?? []).map((pieza) => ({
        itemId: pieza.itemId,
        qty: pieza.qty,
        origen: pieza.origen,
      })),
    });

    const historialCerrado = visitas
      .filter((v) => v.estado === EstadoVisita.CERRADO)
      .sort((a, b) => {
        const ta = a.cerradoAt?.getTime() ?? 0;
        const tb = b.cerradoAt?.getTime() ?? 0;
        return tb - ta;
      })
      .map(toItem);

    const borradores =
      user.rol === Rol.ADMIN_DIRECTIVO
        ? []
        : visitas
            .filter((v) => v.estado === EstadoVisita.BORRADOR)
            .map(toItem);

    return {
      fichaCorta: {
        id: unidad.id,
        numeroInterno: unidad.numeroInterno,
        placas: unidad.placas,
        vin: unidad.vin,
        estado: unidad.estado,
        motivoInactivacion: unidad.motivoInactivacion,
        tipoId: unidad.tipo.id,
        tipoNombre: unidad.tipo.nombre,
        marcaModelo: unidad.marcaModelo,
        anio: unidad.anio,
        ultimoKm: ultimoCerrado?.km ?? null,
      },
      borradores,
      historialCerrado,
      puedeCrearVisita: puedeCrearVisita(user.rol, unidad.estado),
      mensajes: mensajesHub(
        user.rol,
        unidad.estado,
        hayChoferesActivos,
        unidad.motivoInactivacion,
      ),
    };
  }

  private normalizeVin(vin?: string | null) {
    const value = vin?.trim().toUpperCase() ?? '';
    return value.length ? value : null;
  }
}
