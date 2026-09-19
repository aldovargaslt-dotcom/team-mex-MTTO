import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { requireTrimmed } from '../common/require-trimmed';
import { errorInactivarSiAsignado } from '../logistica/logistica-rules';
import { Unidad } from '../unidades/unidad.entity';
import { Chofer } from './chofer.entity';
import { CreateChoferDto } from './dto/create-chofer.dto';
import { UpdateChoferDto } from './dto/update-chofer.dto';
import {
  EstadoChofer,
  puedeAsignarChoferAVisita,
} from './estado-chofer.enum';

@Injectable()
export class ChoferesService {
  constructor(
    @InjectRepository(Chofer)
    private readonly repo: Repository<Chofer>,
    @InjectRepository(Unidad)
    private readonly unidades: Repository<Unidad>,
  ) {}

  findAll(estado?: EstadoChofer) {
    return this.repo.find({
      where: estado ? { estado } : {},
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: string) {
    const chofer = await this.repo.findOne({ where: { id } });
    if (!chofer) {
      throw new NotFoundException('No se encontró el chofer.');
    }
    return chofer;
  }

  async requireActivo(id: string) {
    const chofer = await this.findOne(id);
    if (!puedeAsignarChoferAVisita(chofer.estado)) {
      throw new BadRequestException(
        'El chofer no está activo. Seleccione un chofer activo.',
      );
    }
    return chofer;
  }

  async create(dto: CreateChoferDto) {
    const chofer = this.repo.create({
      nombre: requireTrimmed(
        dto.nombre,
        'El nombre del chofer no puede estar vacío.',
      ),
      estado: dto.estado ?? EstadoChofer.ACTIVO,
    });
    return this.repo.save(chofer);
  }

  async update(id: string, dto: UpdateChoferDto) {
    const chofer = await this.findOne(id);
    if (dto.nombre !== undefined) {
      chofer.nombre = requireTrimmed(
        dto.nombre,
        'El nombre del chofer no puede estar vacío.',
      );
    }
    if (dto.estado !== undefined) {
      if (dto.estado === EstadoChofer.INACTIVO) {
        const assigned = await this.unidades.findOne({
          where: { choferId: id },
        });
        const bloqueo = errorInactivarSiAsignado(assigned?.id ?? null);
        if (bloqueo) {
          throw new BadRequestException(bloqueo);
        }
      }
      chofer.estado = dto.estado;
    }
    return this.repo.save(chofer);
  }
}
