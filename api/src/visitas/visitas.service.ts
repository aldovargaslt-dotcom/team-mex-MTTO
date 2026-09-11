import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { CurrentUser } from '../auth/current-user';
import { Rol } from '../auth/roles.enum';
import { EstadoUnidad } from '../common/estado-unidad.enum';
import { ChoferesService } from '../choferes/choferes.service';
import {
  OrigenConsumo,
  VISITA_CERRADA,
  buildVisitaCerrada,
} from '../kernel/events/visita-cerrada';
import { OutboxService } from '../kernel/outbox/outbox.service';
import { UnidadesService } from '../unidades/unidades.service';
import { erroresCierre, mensajeKmInvalido } from './close-rules';
import { EstadoVisita, TipoFirma } from './enums';
import { UpdateVisitaDto } from './dto/update-visita.dto';
import { esTrabajoCatalogo } from './trabajos-catalogo';
import { Visita } from './visita.entity';
import { VisitaFirma } from './visita-firma.entity';
import { VisitaFoto } from './visita-foto.entity';
import { VisitaPieza } from './visita-pieza.entity';
import { VisitaTrabajo } from './visita-trabajo.entity';

@Injectable()
export class VisitasService {
  constructor(
    @InjectRepository(Visita)
    private readonly repo: Repository<Visita>,
    @InjectRepository(VisitaTrabajo)
    private readonly trabajos: Repository<VisitaTrabajo>,
    @InjectRepository(VisitaFoto)
    private readonly fotos: Repository<VisitaFoto>,
    @InjectRepository(VisitaFirma)
    private readonly firmas: Repository<VisitaFirma>,
    @InjectRepository(VisitaPieza)
    private readonly piezas: Repository<VisitaPieza>,
    private readonly unidades: UnidadesService,
    private readonly choferes: ChoferesService,
    private readonly outbox: OutboxService,
    private readonly dataSource: DataSource,
  ) {}

  async createDraft(unidadId: string, user: CurrentUser) {
    const unidad = await this.unidades.findOne(unidadId);
    if (unidad.estado !== EstadoUnidad.ACTIVA) {
      throw new BadRequestException(
        'No se puede crear una visita porque la unidad está inactiva.',
      );
    }
    const visita = this.repo.create({
      unidad,
      estado: EstadoVisita.BORRADOR,
      createdBy: user.userId,
      chofer: null,
      km: null,
      tipo: null,
      observaciones: null,
      trabajos: [],
      fotos: [],
      firmas: [],
      piezas: [],
    });
    const saved = await this.repo.save(visita);
    return this.findDetalle(saved.id, user);
  }

  async findDetalle(id: string, user: CurrentUser) {
    const visita = await this.repo.findOne({
      where: { id },
      relations: {
        trabajos: true,
        fotos: true,
        firmas: true,
        piezas: true,
        chofer: true,
        unidad: { tipo: true },
      },
    });
    if (!visita) {
      throw new NotFoundException('No se encontró la visita.');
    }
    if (
      user.rol === Rol.ADMIN_DIRECTIVO &&
      visita.estado === EstadoVisita.BORRADOR
    ) {
      throw new NotFoundException('No se encontró la visita.');
    }
    return this.toDetalle(visita);
  }

  async listByUnidad(unidadId: string, user: CurrentUser) {
    await this.unidades.findOne(unidadId);
    const visitas = await this.repo.find({
      where: { unidad: { id: unidadId } },
      relations: { chofer: true, trabajos: true },
      order: { createdAt: 'DESC' },
    });
    const visibles =
      user.rol === Rol.ADMIN_DIRECTIVO
        ? visitas.filter((v) => v.estado === EstadoVisita.CERRADO)
        : visitas;
    return visibles.map((v) => this.toResumen(v));
  }

  async updateDraft(id: string, dto: UpdateVisitaDto, _user: CurrentUser) {
    const visita = await this.requireDraft(id);
    if (dto.choferId !== undefined) {
      visita.chofer = dto.choferId
        ? await this.choferes.findOne(dto.choferId)
        : null;
    }
    if (dto.km !== undefined) {
      if (dto.km != null) {
        await this.assertKmPersistible(visita.unidad.id, dto.km);
      }
      visita.km = dto.km;
    }
    if (dto.tipo !== undefined) {
      visita.tipo = dto.tipo;
    }
    if (dto.observaciones !== undefined) {
      visita.observaciones = dto.observaciones?.trim() || null;
    }
    await this.repo.save(visita);

    if (dto.trabajos) {
      this.assertTrabajosCatalogo(dto.trabajos);
      await this.trabajos.delete({ visita: { id } });
      if (dto.trabajos.length) {
        await this.trabajos.save(
          dto.trabajos.map((trabajo) =>
            this.trabajos.create({
              visita: { id } as Visita,
              categoria: trabajo.categoria,
              item: trabajo.item,
            }),
          ),
        );
      }
    }
    if (dto.fotos) {
      await this.fotos.delete({ visita: { id } });
      if (dto.fotos.length) {
        await this.fotos.save(
          dto.fotos.map((foto) =>
            this.fotos.create({
              visita: { id } as Visita,
              dataUrl: foto.dataUrl,
            }),
          ),
        );
      }
    }
    if (dto.firmas) {
      await this.firmas.delete({ visita: { id } });
      const byTipo = new Map(dto.firmas.map((firma) => [firma.tipo, firma]));
      if (byTipo.size) {
        await this.firmas.save(
          [...byTipo.values()].map((firma) =>
            this.firmas.create({
              visita: { id } as Visita,
              tipo: firma.tipo,
              dataUrl: firma.dataUrl,
            }),
          ),
        );
      }
    }
    if (dto.piezas) {
      await this.replacePiezas(id, dto.piezas);
    }

    return this.findDetalle(id, _user);
  }

  async removeDraft(id: string) {
    const visita = await this.requireDraft(id);
    await this.firmas.delete({ visita: { id } });
    await this.fotos.delete({ visita: { id } });
    await this.trabajos.delete({ visita: { id } });
    await this.piezas.delete({ visita: { id } });
    await this.repo.remove(visita);
    return { message: 'Borrador eliminado.' };
  }

  async close(id: string, user: CurrentUser) {
    await this.dataSource.transaction(async (manager) => {
      const visita = await manager.findOne(Visita, {
        where: { id },
        relations: {
          chofer: true,
          unidad: { tipo: true },
          trabajos: true,
          firmas: true,
          piezas: true,
        },
      });
      if (!visita) {
        throw new NotFoundException('No se encontró la visita.');
      }
      const ultimoKm = await this.ultimoKmCerrado(visita.unidad.id);
      const errores = erroresCierre({
        estadoVisita: visita.estado,
        unidadEstado: visita.unidad.estado,
        choferId: visita.chofer?.id ?? null,
        km: visita.km,
        ultimoKmCerrado: ultimoKm,
        tipo: visita.tipo,
        trabajos: visita.trabajos.length,
        firmas: visita.firmas.map((firma) => firma.tipo),
      });
      if (errores.length) {
        throw new BadRequestException(errores[0]);
      }
      visita.estado = EstadoVisita.CERRADO;
      visita.cerradoAt = new Date();
      await manager.save(visita);
      const payload = buildVisitaCerrada({
        eventId: randomUUID(),
        visitaId: visita.id,
        unidadId: visita.unidad.id,
        tipoVehiculoId: visita.unidad.tipo.id,
        km: visita.km as number,
        cerradoAt: visita.cerradoAt,
        consumos: (visita.piezas ?? []).map((pieza) => ({
          itemId: pieza.itemId,
          qty: pieza.qty,
          origen: pieza.origen,
        })),
      });
      await this.outbox.enqueueAndDispatch(manager, VISITA_CERRADA, payload);
    });
    return this.findDetalle(id, user);
  }

  async ultimoKmCerrado(unidadId: string): Promise<number | null> {
    const last = await this.repo.findOne({
      where: { unidad: { id: unidadId }, estado: EstadoVisita.CERRADO },
      order: { cerradoAt: 'DESC' },
    });
    return last?.km ?? null;
  }

  async listBorradores(unidadId: string) {
    const visitas = await this.repo.find({
      where: { unidad: { id: unidadId }, estado: EstadoVisita.BORRADOR },
      relations: { chofer: true, trabajos: true },
      order: { updatedAt: 'DESC' },
    });
    return visitas.map((v) => this.toResumen(v));
  }

  async listHistorial(unidadId: string) {
    const visitas = await this.repo.find({
      where: { unidad: { id: unidadId }, estado: EstadoVisita.CERRADO },
      relations: { chofer: true, trabajos: true },
      order: { cerradoAt: 'DESC' },
    });
    return visitas.map((v) => this.toResumen(v));
  }

  private async assertKmPersistible(unidadId: string, km: number) {
    const ultimo = await this.ultimoKmCerrado(unidadId);
    const error = mensajeKmInvalido(km, ultimo);
    if (error) {
      throw new BadRequestException(error);
    }
  }

  private assertTrabajosCatalogo(
    trabajos: { categoria: string; item: string }[],
  ) {
    for (const trabajo of trabajos) {
      if (!esTrabajoCatalogo(trabajo.categoria, trabajo.item)) {
        throw new BadRequestException(
          `El trabajo «${trabajo.item}» no pertenece a la categoría ${trabajo.categoria}.`,
        );
      }
    }
  }

  private async replacePiezas(
    visitaId: string,
    piezas: { itemId: string; qty: number; origen: OrigenConsumo }[],
  ) {
    const seen = new Set<string>();
    for (const pieza of piezas) {
      if (seen.has(pieza.itemId)) {
        throw new BadRequestException(
          'No se puede repetir el mismo SKU en las piezas de la visita.',
        );
      }
      seen.add(pieza.itemId);
      if (pieza.qty < 1) {
        throw new BadRequestException('La cantidad de cada pieza debe ser al menos 1.');
      }
    }
    await this.piezas.delete({ visita: { id: visitaId } });
    if (piezas.length) {
      await this.piezas.save(
        piezas.map((pieza) =>
          this.piezas.create({
            visita: { id: visitaId } as Visita,
            itemId: pieza.itemId,
            qty: pieza.qty,
            origen: pieza.origen,
          }),
        ),
      );
    }
  }

  private async requireDraft(id: string) {
    const visita = await this.repo.findOne({
      where: { id },
      relations: { chofer: true, unidad: true },
    });
    if (!visita) {
      throw new NotFoundException('No se encontró la visita.');
    }
    if (visita.estado !== EstadoVisita.BORRADOR) {
      throw new BadRequestException(
        'La visita ya está cerrada y no se puede modificar.',
      );
    }
    return visita;
  }

  toResumen(visita: Visita) {
    return {
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
    };
  }

  toDetalle(visita: Visita) {
    const piezas = visita.piezas ?? [];
    return {
      id: visita.id,
      unidadId: visita.unidad.id,
      unidadNumeroInterno: visita.unidad.numeroInterno,
      tipoVehiculoId: visita.unidad.tipo?.id ?? null,
      tipoVehiculoNombre: visita.unidad.tipo?.nombre ?? null,
      estado: visita.estado,
      chofer: visita.chofer
        ? { id: visita.chofer.id, nombre: visita.chofer.nombre }
        : null,
      km: visita.km,
      tipo: visita.tipo,
      observaciones: visita.observaciones,
      createdBy: visita.createdBy,
      createdAt: visita.createdAt,
      updatedAt: visita.updatedAt,
      cerradoAt: visita.cerradoAt,
      trabajos: (visita.trabajos ?? [])
        .slice()
        .sort((a, b) =>
          a.categoria === b.categoria
            ? a.item.localeCompare(b.item, 'es')
            : a.categoria.localeCompare(b.categoria),
        )
        .map((trabajo) => ({
          id: trabajo.id,
          categoria: trabajo.categoria,
          item: trabajo.item,
        })),
      fotos: (visita.fotos ?? []).map((foto) => ({
        id: foto.id,
        dataUrl: foto.dataUrl,
        createdAt: foto.createdAt,
      })),
      firmas: (visita.firmas ?? []).map((firma) => ({
        id: firma.id,
        tipo: firma.tipo as TipoFirma,
        dataUrl: firma.dataUrl,
        createdAt: firma.createdAt,
      })),
      piezas: piezas.map((pieza) => ({
        id: pieza.id,
        itemId: pieza.itemId,
        qty: pieza.qty,
        origen: pieza.origen,
      })),
    };
  }
}
