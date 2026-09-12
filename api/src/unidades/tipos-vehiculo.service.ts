import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { requireTrimmed } from '../common/require-trimmed';
import { CreateTipoVehiculoDto } from './dto/create-tipo-vehiculo.dto';
import { UpdateTipoVehiculoDto } from './dto/update-tipo-vehiculo.dto';
import { TipoVehiculo } from './tipo-vehiculo.entity';

@Injectable()
export class TiposVehiculoService {
  constructor(
    @InjectRepository(TipoVehiculo)
    private readonly repo: Repository<TipoVehiculo>,
  ) {}

  findAll() {
    return this.repo.find({ order: { nombre: 'ASC' } });
  }

  async findOne(id: string) {
    const tipo = await this.repo.findOne({ where: { id } });
    if (!tipo) {
      throw new NotFoundException('No se encontró el tipo de vehículo.');
    }
    return tipo;
  }

  async create(dto: CreateTipoVehiculoDto) {
    const tipo = this.repo.create({
      nombre: requireTrimmed(
        dto.nombre,
        'El nombre del tipo no puede estar vacío.',
      ),
      descripcion: dto.descripcion?.trim() || null,
    });
    return this.repo.save(tipo);
  }

  async update(id: string, dto: UpdateTipoVehiculoDto) {
    const tipo = await this.findOne(id);
    if (dto.nombre !== undefined) {
      tipo.nombre = requireTrimmed(
        dto.nombre,
        'El nombre del tipo no puede estar vacío.',
      );
    }
    if (dto.descripcion !== undefined) {
      tipo.descripcion = dto.descripcion.trim() || null;
    }
    return this.repo.save(tipo);
  }

  async remove(id: string) {
    const tipo = await this.repo.findOne({
      where: { id },
      relations: { unidades: true },
    });
    if (!tipo) {
      throw new NotFoundException('No se encontró el tipo de vehículo.');
    }
    if (tipo.unidades?.length) {
      throw new ConflictException(
        'No se puede eliminar el tipo porque hay unidades asociadas.',
      );
    }
    await this.repo.remove(tipo);
    return { message: 'Tipo de vehículo eliminado.' };
  }
}
