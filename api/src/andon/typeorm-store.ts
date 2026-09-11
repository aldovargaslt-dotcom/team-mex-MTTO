import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Aviso, LastClosedVisit, UmbralTipo } from './andon-types';
import { EstadoAviso } from './enums';
import { AndonStore } from './ports';
import { AvisoEntity } from './entities/aviso.entity';
import { EventoProcesadoEntity } from './entities/evento-procesado.entity';
import { UltimaVisitaEntity } from './entities/ultima-visita.entity';
import { UmbralEntity } from './entities/umbral.entity';

@Injectable()
export class TypeOrmAndonStore implements AndonStore {
  constructor(
    @InjectRepository(AvisoEntity)
    private readonly avisosRepo: Repository<AvisoEntity>,
    @InjectRepository(UmbralEntity)
    private readonly umbralesRepo: Repository<UmbralEntity>,
    @InjectRepository(UltimaVisitaEntity)
    private readonly lastRepo: Repository<UltimaVisitaEntity>,
    @InjectRepository(EventoProcesadoEntity)
    private readonly eventsRepo: Repository<EventoProcesadoEntity>,
  ) {}

  withManager(manager: EntityManager): TypeOrmAndonStore {
    return new TypeOrmAndonStore(
      manager.getRepository(AvisoEntity),
      manager.getRepository(UmbralEntity),
      manager.getRepository(UltimaVisitaEntity),
      manager.getRepository(EventoProcesadoEntity),
    );
  }

  private avisos() {
    return this.avisosRepo;
  }

  private umbrales() {
    return this.umbralesRepo;
  }

  private last() {
    return this.lastRepo;
  }

  private events() {
    return this.eventsRepo;
  }

  async getLastClosed(unidadId: string): Promise<LastClosedVisit | null> {
    const row = await this.last().findOne({ where: { unidadId } });
    if (!row) return null;
    return {
      unidadId: row.unidadId,
      visitaId: row.visitaId,
      tipoVehiculoId: row.tipoVehiculoId,
      km: row.km,
      cerradoAt: row.cerradoAt.toISOString(),
    };
  }

  async setLastClosed(row: LastClosedVisit): Promise<void> {
    const repo = this.last();
    const existing = await repo.findOne({ where: { unidadId: row.unidadId } });
    const entity = existing ?? repo.create({ unidadId: row.unidadId });
    entity.visitaId = row.visitaId;
    entity.tipoVehiculoId = row.tipoVehiculoId;
    entity.km = row.km;
    entity.cerradoAt = new Date(row.cerradoAt);
    await repo.save(entity);
  }

  async getNoResuelto(unidadId: string): Promise<Aviso | null> {
    const row = await this.avisos().findOne({
      where: [
        { unidadId, estado: EstadoAviso.ABIERTO },
        { unidadId, estado: EstadoAviso.ENTERADO },
      ],
    });
    return row ? this.toAviso(row) : null;
  }

  async getAviso(id: string): Promise<Aviso | null> {
    const row = await this.avisos().findOne({ where: { id } });
    return row ? this.toAviso(row) : null;
  }

  async insertAviso(aviso: Aviso): Promise<void> {
    const repo = this.avisos();
    await repo.save(this.fromAviso(repo, aviso));
  }

  async updateAviso(aviso: Aviso): Promise<void> {
    const repo = this.avisos();
    const existing = await repo.findOne({ where: { id: aviso.id } });
    if (!existing) {
      await this.insertAviso(aviso);
      return;
    }
    Object.assign(existing, this.fromAviso(repo, aviso));
    await repo.save(existing);
  }

  async listNoResueltos(): Promise<Aviso[]> {
    const rows = await this.avisos().find({
      where: [
        { estado: EstadoAviso.ABIERTO },
        { estado: EstadoAviso.ENTERADO },
      ],
      order: { abiertaAt: 'DESC' },
    });
    return rows.map((row) => this.toAviso(row));
  }

  async getUmbral(tipoVehiculoId: string): Promise<UmbralTipo | null> {
    const row = await this.umbrales().findOne({ where: { tipoVehiculoId } });
    return row
      ? { tipoVehiculoId: row.tipoVehiculoId, tKm: row.tKm, tDias: row.tDias }
      : null;
  }

  async setUmbral(umbral: UmbralTipo): Promise<void> {
    const repo = this.umbrales();
    const existing = await repo.findOne({
      where: { tipoVehiculoId: umbral.tipoVehiculoId },
    });
    const entity =
      existing ?? repo.create({ tipoVehiculoId: umbral.tipoVehiculoId });
    entity.tKm = umbral.tKm;
    entity.tDias = umbral.tDias;
    await repo.save(entity);
  }

  async listUmbrales(): Promise<UmbralTipo[]> {
    const rows = await this.umbrales().find({
      order: { tipoVehiculoId: 'ASC' },
    });
    return rows.map((row) => ({
      tipoVehiculoId: row.tipoVehiculoId,
      tKm: row.tKm,
      tDias: row.tDias,
    }));
  }

  async hasProcessed(eventId: string): Promise<boolean> {
    const row = await this.events().findOne({ where: { eventId } });
    return !!row;
  }

  async markProcessed(eventId: string): Promise<void> {
    const repo = this.events();
    const existing = await repo.findOne({ where: { eventId } });
    if (existing) return;
    await repo.save(repo.create({ eventId }));
  }

  private toAviso(row: AvisoEntity): Aviso {
    return {
      id: row.id,
      unidadId: row.unidadId,
      tipoVehiculoId: row.tipoVehiculoId,
      estado: row.estado,
      abiertaAt: row.abiertaAt.toISOString(),
      enteradoAt: row.enteradoAt ? row.enteradoAt.toISOString() : null,
      enteradoBy: row.enteradoBy,
      resueltoAt: row.resueltoAt ? row.resueltoAt.toISOString() : null,
      visitaResolutoriaId: row.visitaResolutoriaId,
      kmAlAbrir: row.kmAlAbrir,
      diasAlAbrir: row.diasAlAbrir,
      umbralKm: row.umbralKm,
      umbralDias: row.umbralDias,
    };
  }

  private fromAviso(repo: Repository<AvisoEntity>, aviso: Aviso): AvisoEntity {
    return repo.create({
      id: aviso.id,
      unidadId: aviso.unidadId,
      tipoVehiculoId: aviso.tipoVehiculoId,
      estado: aviso.estado,
      abiertaAt: new Date(aviso.abiertaAt),
      enteradoAt: aviso.enteradoAt ? new Date(aviso.enteradoAt) : null,
      enteradoBy: aviso.enteradoBy,
      resueltoAt: aviso.resueltoAt ? new Date(aviso.resueltoAt) : null,
      visitaResolutoriaId: aviso.visitaResolutoriaId,
      kmAlAbrir: aviso.kmAlAbrir,
      diasAlAbrir: aviso.diasAlAbrir,
      umbralKm: aviso.umbralKm,
      umbralDias: aviso.umbralDias,
    });
  }
}
