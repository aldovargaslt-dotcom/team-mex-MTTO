import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { requireTrimmed } from '../common/require-trimmed';
import { Visita } from '../visitas/visita.entity';
import { Chofer } from './chofer.entity';
import { CreateChoferDto } from './dto/create-chofer.dto';
import { UpdateChoferDto } from './dto/update-chofer.dto';

@Injectable()
export class ChoferesService {
  constructor(
    @InjectRepository(Chofer)
    private readonly repo: Repository<Chofer>,
    @InjectRepository(Visita)
    private readonly visitas: Repository<Visita>,
  ) {}

  findAll() {
    return this.repo.find({ order: { nombre: 'ASC' } });
  }

  async findOne(id: string) {
    const chofer = await this.repo.findOne({ where: { id } });
    if (!chofer) {
      throw new NotFoundException('No se encontró el chofer.');
    }
    return chofer;
  }

  async create(dto: CreateChoferDto) {
    const chofer = this.repo.create({
      nombre: requireTrimmed(
        dto.nombre,
        'El nombre del chofer no puede estar vacío.',
      ),
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
    return this.repo.save(chofer);
  }

  async remove(id: string) {
    const chofer = await this.findOne(id);
    const usadas = await this.visitas.count({
      where: { chofer: { id } },
    });
    if (usadas > 0) {
      throw new ConflictException(
        'No se puede eliminar el chofer porque hay visitas asociadas.',
      );
    }
    await this.repo.remove(chofer);
    return { message: 'Chofer eliminado.' };
  }

  async count() {
    return this.repo.count();
  }
}
