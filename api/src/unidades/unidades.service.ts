import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from '../auth/current-user';
import { mensajeVisita, puedeCrearVisita } from '../common/hub-policy';
import { TiposVehiculoService } from '../tipos-vehiculo/tipos-vehiculo.service';
import { CreateUnidadDto } from './dto/create-unidad.dto';
import { FiltrarUnidadesDto } from './dto/filtrar-unidades.dto';
import { UpdateUnidadDto } from './dto/update-unidad.dto';
import { UnidadHubDto } from './dto/unidad-hub.dto';
import { Unidad } from './unidad.entity';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class UnidadesService {
  constructor(
    @InjectRepository(Unidad)
    private readonly repo: Repository<Unidad>,
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
      numeroInterno: dto.numeroInterno.trim(),
      placas: dto.placas.trim().toUpperCase(),
      tipo,
      estado: dto.estado,
      marca: dto.marca?.trim() || null,
      modelo: dto.modelo?.trim() || null,
      anio: dto.anio ?? null,
      kilometraje: dto.kilometraje ?? null,
    });
    return this.repo.save(unidad);
  }

  async update(id: string, dto: UpdateUnidadDto) {
    const unidad = await this.findOne(id);
    if (dto.tipoId) {
      unidad.tipo = await this.tipos.findOne(dto.tipoId);
    }
    if (dto.numeroInterno !== undefined) {
      unidad.numeroInterno = dto.numeroInterno.trim();
    }
    if (dto.placas !== undefined) {
      unidad.placas = dto.placas.trim().toUpperCase();
    }
    if (dto.estado !== undefined) {
      unidad.estado = dto.estado;
    }
    if (dto.marca !== undefined) {
      unidad.marca = dto.marca.trim() || null;
    }
    if (dto.modelo !== undefined) {
      unidad.modelo = dto.modelo.trim() || null;
    }
    if (dto.anio !== undefined) {
      unidad.anio = dto.anio;
    }
    if (dto.kilometraje !== undefined) {
      unidad.kilometraje = dto.kilometraje;
    }
    return this.repo.save(unidad);
  }

  async hub(id: string, user: CurrentUser): Promise<UnidadHubDto> {
    const unidad = await this.findOne(id);
    return {
      fichaCorta: {
        id: unidad.id,
        numeroInterno: unidad.numeroInterno,
        placas: unidad.placas,
        estado: unidad.estado,
        tipoId: unidad.tipo.id,
        tipoNombre: unidad.tipo.nombre,
        marca: unidad.marca,
        modelo: unidad.modelo,
        anio: unidad.anio,
        kilometraje: unidad.kilometraje,
      },
      mantenimiento: {
        estado: 'sin_registros',
        ultimaVisita: null,
        mensajeHistorial: 'Aún no hay visitas de mantenimiento registradas.',
        mensajeResumen:
          'El historial de mantenimiento estará disponible en una siguiente entrega.',
      },
      puedeCrearVisita: puedeCrearVisita(user.rol, unidad.estado),
      mensaje: mensajeVisita(user.rol, unidad.estado),
    };
  }
}
