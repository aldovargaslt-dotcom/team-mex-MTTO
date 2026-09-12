import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Not, Repository } from 'typeorm';
import { Rol } from '../auth/roles.enum';
import { EstadoSitio, TipoFirmaFlota, TipoMovimientoFlota } from './enums';
import { MovimientoEntity } from './entities/movimiento.entity';
import { MovimientoFirmaEntity } from './entities/movimiento-firma.entity';
import { SitioEntity } from './entities/sitio.entity';
import { UnidadOperativaEntity } from './entities/unidad-operativa.entity';
import { FlotaStore } from './flota-store';
import { MovimientoFlota, Sitio, UnidadOperativa } from './flota-types';

@Injectable()
export class TypeOrmFlotaStore implements FlotaStore {
  constructor(
    @InjectRepository(SitioEntity)
    private readonly sitios: Repository<SitioEntity>,
    @InjectRepository(MovimientoEntity)
    private readonly movimientos: Repository<MovimientoEntity>,
    @InjectRepository(UnidadOperativaEntity)
    private readonly operativas: Repository<UnidadOperativaEntity>,
  ) {}

  withManager(manager: EntityManager): TypeOrmFlotaStore {
    return new TypeOrmFlotaStore(
      manager.getRepository(SitioEntity),
      manager.getRepository(MovimientoEntity),
      manager.getRepository(UnidadOperativaEntity),
    );
  }

  async getSitio(id: string): Promise<Sitio | null> {
    const row = await this.sitios.findOne({ where: { id } });
    return row ? this.toSitio(row) : null;
  }

  async getOperativa(unidadId: string): Promise<UnidadOperativa | null> {
    const row = await this.operativas.findOne({ where: { unidadId } });
    return row ? this.toOperativa(row) : null;
  }

  async listOperativas(): Promise<UnidadOperativa[]> {
    const rows = await this.operativas.find();
    return rows.map((r) => this.toOperativa(r));
  }

  async getMovimiento(id: string): Promise<MovimientoFlota | null> {
    const row = await this.movimientos.findOne({ where: { id } });
    return row ? this.toMovimiento(row) : null;
  }

  async listMovimientos(unidadId: string): Promise<MovimientoFlota[]> {
    const rows = await this.movimientos.find({
      where: { unidadId },
      order: { occurredAt: 'DESC' },
    });
    return rows.map((r) => this.toMovimiento(r));
  }

  async choferTieneSalidaAbierta(
    choferId: string,
    exceptUnidadId?: string,
  ): Promise<boolean> {
    const abiertas = await this.operativas.find({
      where: { salidaAbiertaId: Not(IsNull()) },
    });
    for (const op of abiertas) {
      if (exceptUnidadId && op.unidadId === exceptUnidadId) continue;
      if (!op.salidaAbiertaId) continue;
      const mov = await this.movimientos.findOne({
        where: { id: op.salidaAbiertaId },
      });
      if (mov?.choferId === choferId) return true;
    }
    return false;
  }

  async insertMovimiento(mov: MovimientoFlota): Promise<void> {
    const entity = this.movimientos.create({
      id: mov.id,
      tipo: mov.tipo,
      unidadId: mov.unidadId,
      choferId: mov.choferId,
      sitioId: mov.sitioId,
      occurredAt: new Date(mov.occurredAt),
      km: mov.km,
      notas: mov.notas,
      createdBy: mov.createdBy,
      avalRol: mov.avalRol,
      firmas: mov.firmas.map((f) => {
        const firma = new MovimientoFirmaEntity();
        firma.tipo = f.tipo;
        firma.dataUrl = f.dataUrl;
        return firma;
      }),
    });
    await this.movimientos.save(entity);
  }

  async upsertOperativa(row: UnidadOperativa): Promise<void> {
    const existing = await this.operativas.findOne({
      where: { unidadId: row.unidadId },
    });
    const entity = existing ?? this.operativas.create({ unidadId: row.unidadId });
    entity.sitioId = row.sitioId;
    entity.choferActualId = row.choferActualId;
    entity.choferUltimoId = row.choferUltimoId;
    entity.salidaAbiertaId = row.salidaAbiertaId;
    entity.ultimoMovimientoAt = row.ultimoMovimientoAt
      ? new Date(row.ultimoMovimientoAt)
      : null;
    await this.operativas.save(entity);
  }

  private toSitio(row: SitioEntity): Sitio {
    return { id: row.id, nombre: row.nombre, estado: row.estado as EstadoSitio };
  }

  private toOperativa(row: UnidadOperativaEntity): UnidadOperativa {
    return {
      unidadId: row.unidadId,
      sitioId: row.sitioId,
      choferActualId: row.choferActualId,
      choferUltimoId: row.choferUltimoId,
      salidaAbiertaId: row.salidaAbiertaId,
      ultimoMovimientoAt: row.ultimoMovimientoAt
        ? row.ultimoMovimientoAt.toISOString()
        : null,
    };
  }

  private toMovimiento(row: MovimientoEntity): MovimientoFlota {
    return {
      id: row.id,
      tipo: row.tipo as TipoMovimientoFlota,
      unidadId: row.unidadId,
      choferId: row.choferId,
      sitioId: row.sitioId,
      occurredAt: row.occurredAt.toISOString(),
      km: row.km,
      notas: row.notas,
      createdBy: row.createdBy,
      avalRol: row.avalRol as Rol,
      firmas: (row.firmas ?? []).map((f) => ({
        tipo: f.tipo as TipoFirmaFlota,
        dataUrl: f.dataUrl,
      })),
    };
  }
}
