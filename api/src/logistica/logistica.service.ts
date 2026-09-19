import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChoferesService } from '../choferes/choferes.service';
import { EstadoChofer } from '../choferes/estado-chofer.enum';
import { Unidad } from '../unidades/unidad.entity';
import { UnidadesService } from '../unidades/unidades.service';
import {
  alertaSinRegreso,
  errorAssign,
  errorRegreso,
  filaChofer,
  filtrarFilas,
  filtrarUnidadesOps,
  kpisActivos,
  kpisUnidadesOps,
} from './logistica-rules';
import {
  ChipLogistica,
  ChipLogisticaUnidad,
  LogisticaChoferRow,
  LogisticaUnidadRow,
  UnidadChoferAssignmentPort,
} from './logistica-types';
import { OpsEstadoUnidad } from '../unidades/ops-estado-unidad.enum';

@Injectable()
export class LogisticaService implements UnidadChoferAssignmentPort {
  constructor(
    private readonly unidades: UnidadesService,
    private readonly choferes: ChoferesService,
    @InjectRepository(Unidad)
    private readonly unidadRepo: Repository<Unidad>,
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
    const unidades = await this.unidadRepo.find({
      relations: { tipo: true },
      order: { placas: 'ASC' },
    });
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
    const rows: LogisticaUnidadRow[] = unidades.map((unidad) => ({
      unidadId: unidad.id,
      placas: unidad.placas,
      numeroInterno: unidad.numeroInterno,
      choferNombre: unidad.choferId
        ? (nombreById.get(unidad.choferId) ?? null)
        : null,
      opsEstado: unidad.opsEstado,
      ambito: unidad.ambito,
      destino: unidad.destino,
      alerta: alertaSinRegreso(unidad.opsEstado),
    }));
    return {
      items: filtrarUnidadesOps(rows, q, chip),
      kpis: kpisUnidadesOps(rows),
    };
  }

  async registrarRegreso(unidadId: string): Promise<void> {
    const unidad = await this.unidades.findOne(unidadId);
    const error = errorRegreso(unidad.opsEstado);
    if (error) {
      throw new BadRequestException(error);
    }
    unidad.opsEstado = OpsEstadoUnidad.DISPONIBLE;
    await this.unidadRepo.save(unidad);
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
}
