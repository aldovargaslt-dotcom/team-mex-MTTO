import { randomUUID } from 'crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertasService } from '../alertas/alertas.service';
import { elapsedHoras, resolveUmbralHoras } from '../alertas/umbral-rules';
import { ChoferesService } from '../choferes/choferes.service';
import { EstadoChofer } from '../choferes/estado-chofer.enum';
import { AmbitoUnidad } from '../unidades/ambito-unidad.enum';
import { Unidad } from '../unidades/unidad.entity';
import { UnidadesService } from '../unidades/unidades.service';
import { OpsEstadoUnidad } from '../unidades/ops-estado-unidad.enum';
import {
  alertaSinRegreso,
  errorAssign,
  errorRegreso,
  errorSalida,
  filaChofer,
  filtrarFilas,
  filtrarUnidadesOps,
  kpisActivos,
  kpisUnidadesOps,
} from './logistica-rules';
import {
  ChipLogistica,
  ChipLogisticaUnidad,
  FLOTA_SIN_REGRESO_PORT,
  FlotaSinRegresoPort,
  LogisticaChoferRow,
  LogisticaUnidadRow,
  RegistrarSalidaInput,
  UnidadChoferAssignmentPort,
} from './logistica-types';

@Injectable()
export class LogisticaService implements UnidadChoferAssignmentPort {
  constructor(
    private readonly unidades: UnidadesService,
    private readonly choferes: ChoferesService,
    private readonly alertas: AlertasService,
    @InjectRepository(Unidad)
    private readonly unidadRepo: Repository<Unidad>,
    @Inject(FLOTA_SIN_REGRESO_PORT)
    private readonly flotaAlert: FlotaSinRegresoPort,
  ) {}

  async listChoferes(q?: string, chip?: ChipLogistica) {
    const [choferes, unidades] = await Promise.all([
      this.choferes.findAll(EstadoChofer.ACTIVO),
      this.unidadRepo.find(),
    ]);
    const byChofer = new Map<string, Unidad>();
    for (const unidad of unidades) {
      if (unidad.choferId) byChofer.set(unidad.choferId, unidad);
    }
    const rows: LogisticaChoferRow[] = choferes.map((chofer) => {
      const unidad = byChofer.get(chofer.id);
      return filaChofer({
        choferId: chofer.id,
        nombre: chofer.nombre,
        unidadId: unidad?.id,
        placas: unidad?.placas,
      });
    });
    return {
      items: filtrarFilas(rows, q, chip),
      kpis: kpisActivos(rows),
    };
  }

  async listUnidades(q?: string, chip?: ChipLogisticaUnidad) {
    const [unidades, config] = await Promise.all([
      this.unidadRepo.find({
        relations: { tipo: true },
        order: { placas: 'ASC' },
      }),
      this.alertas.getConfig(),
    ]);
    const choferIds = [
      ...new Set(
        unidades.map((u) => u.choferId).filter((id): id is string => Boolean(id)),
      ),
    ];
    const choferes = await Promise.all(
      choferIds.map((id) => this.choferes.findOne(id).catch(() => null)),
    );
    const nombreById = new Map<string, string>();
    for (const chofer of choferes) {
      if (chofer) nombreById.set(chofer.id, chofer.nombre);
    }
    const overrideById = new Map(
      config.umbrales.map((row) => [row.unidadId, row.horas]),
    );
    const now = new Date();
    const rows: LogisticaUnidadRow[] = [];
    for (const unidad of unidades) {
      const thresholdHoras = resolveUmbralHoras({
        ambito: unidad.ambito === AmbitoUnidad.FORANEO ? 'FORANEO' : 'LOCAL',
        overrideHoras: overrideById.get(unidad.id) ?? null,
        defaultLocalH: config.localH,
        defaultForaneoH: config.foraneoH,
      });
      const row = this.toUnidadRow(unidad, nombreById, now, thresholdHoras);
      rows.push(row);
      await this.syncInbox(unidad, row, now, thresholdHoras);
    }
    return {
      items: filtrarUnidadesOps(rows, q, chip),
      kpis: kpisUnidadesOps(rows),
    };
  }

  async registrarSalida(
    unidadId: string,
    input: RegistrarSalidaInput,
  ): Promise<void> {
    const error = errorSalida(input.ambito);
    if (error) {
      throw new BadRequestException(error);
    }
    const unidad = await this.unidades.findOne(unidadId);
    unidad.opsEstado = OpsEstadoUnidad.EN_RUTA;
    unidad.ambito =
      input.ambito === 'FORANEO' ? AmbitoUnidad.FORANEO : AmbitoUnidad.LOCAL;
    if (input.destino !== undefined) {
      unidad.destino = input.destino.trim() || null;
    }
    unidad.salidaAt = new Date();
    await this.unidadRepo.save(unidad);
    if (input.choferId) {
      await this.assign(unidadId, input.choferId);
    }
    await this.evalUnidad(await this.unidades.findOne(unidadId));
  }

  async registrarRegreso(unidadId: string): Promise<void> {
    const unidad = await this.unidades.findOne(unidadId);
    const error = errorRegreso(unidad.opsEstado);
    if (error) {
      throw new BadRequestException(error);
    }
    unidad.opsEstado = OpsEstadoUnidad.DISPONIBLE;
    unidad.salidaAt = null;
    await this.unidadRepo.save(unidad);
    await this.evalUnidad(unidad);
  }

  getAlertasSinRegreso() {
    return this.alertas.getConfig();
  }

  patchAlertasSinRegreso(input: {
    localH?: number;
    foraneoH?: number;
    umbrales?: { unidadId: string; horas: number | null }[];
  }) {
    return this.alertas.patchConfig(input);
  }

  async assign(unidadId: string, choferId: string): Promise<void> {
    const chofer = await this.choferes.findOne(choferId);
    const unidad = await this.unidades.findOne(unidadId);
    const ocupadaPorChofer = await this.unidadRepo.findOne({
      where: { choferId },
    });
    const error = errorAssign({
      choferEstado: chofer.estado,
      unidadExiste: true,
      unidadChoferId: unidad.choferId,
      choferUnidadId: ocupadaPorChofer?.id ?? null,
      choferId,
    });
    if (error) {
      throw new BadRequestException(error);
    }
    if (unidad.choferId === choferId) {
      return;
    }
    unidad.choferId = choferId;
    await this.unidadRepo.save(unidad);
  }

  async unassign(unidadId: string): Promise<void> {
    const unidad = await this.unidades.findOne(unidadId);
    if (!unidad.choferId) {
      return;
    }
    unidad.choferId = null;
    await this.unidadRepo.save(unidad);
  }

  private toUnidadRow(
    unidad: Unidad,
    nombreById: Map<string, string>,
    now: Date,
    thresholdHoras: number,
  ): LogisticaUnidadRow {
    return {
      unidadId: unidad.id,
      placas: unidad.placas,
      numeroInterno: unidad.numeroInterno,
      choferNombre: unidad.choferId
        ? (nombreById.get(unidad.choferId) ?? null)
        : null,
      opsEstado: unidad.opsEstado,
      ambito: unidad.ambito,
      destino: unidad.destino,
      salidaAt: unidad.salidaAt ? unidad.salidaAt.toISOString() : null,
      alerta: alertaSinRegreso({
        opsEstado: unidad.opsEstado,
        salidaAt: unidad.salidaAt,
        now,
        thresholdHoras,
      }),
    };
  }

  private async evalUnidad(unidad: Unidad): Promise<void> {
    const now = new Date();
    const thresholdHoras = await this.alertas.resolveUmbralHoras({
      id: unidad.id,
      ambito: unidad.ambito,
    });
    const row = this.toUnidadRow(unidad, new Map(), now, thresholdHoras);
    await this.syncInbox(unidad, row, now, thresholdHoras);
  }

  private async syncInbox(
    unidad: Unidad,
    row: LogisticaUnidadRow,
    now: Date,
    thresholdHoras: number,
  ): Promise<void> {
    if (row.alerta === 'SIN_REGRESO' && unidad.salidaAt) {
      await this.flotaAlert.onAbierto({
        eventId: randomUUID(),
        eventType: 'FLOTA_SIN_REGRESO',
        unidadId: unidad.id,
        ambito: unidad.ambito,
        salidaAt: unidad.salidaAt.toISOString(),
        thresholdHoras,
        elapsedHoras: elapsedHoras(unidad.salidaAt, now),
        occurredAt: now.toISOString(),
        numeroInterno: unidad.numeroInterno,
        placas: unidad.placas,
      });
      return;
    }
    await this.flotaAlert.onCerrado(unidad.id);
  }
}
