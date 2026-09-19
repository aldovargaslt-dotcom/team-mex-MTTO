import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Rol } from '../auth/roles.enum';
import { Chofer } from '../choferes/chofer.entity';
import { EstadoChofer } from '../choferes/estado-chofer.enum';
import { EstadoUnidad } from '../common/estado-unidad.enum';
import { AndonService } from '../andon/andon.service';
import { UnidadOperativaEntity } from '../flota/entities/unidad-operativa.entity';
import { InventarioService } from '../inventario/inventario.service';
import { TipoVehiculo } from '../unidades/tipo-vehiculo.entity';
import { Unidad } from '../unidades/unidad.entity';
import { AmbitoUnidad } from '../unidades/ambito-unidad.enum';
import { OpsEstadoUnidad } from '../unidades/ops-estado-unidad.enum';
import {
  CategoriaTrabajo,
  EstadoVisita,
  TipoFirma,
  TipoVisita,
} from '../visitas/enums';
import { Visita } from '../visitas/visita.entity';
import { VisitasService } from '../visitas/visitas.service';
import {
  CHOFERES_DEMO,
  CHOFER_ANDON_DEMO,
  LEGACY_CHOFERES_DEMO,
  LEGACY_TIPOS_DEMO,
  LEGACY_UNIDADES_PLACAS,
  TIPOS_DEMO,
  TIPO_CAMIONES_3_Y_MEDIA,
  TIPO_RUTAS,
  TIPO_STOCK,
  UNIDADES_DEMO,
  UNIDAD_ANDON_DEMO,
  type UnidadDemoSeed,
} from './catalogo-demo';

const SEED_ANDON_OBS = 'Semilla de mantenimiento';
const SEED_ANDON_KM = 100;
const SEED_ANDON_DAYS_AGO = 120;
const SEED_FIRMA_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(TipoVehiculo)
    private readonly tipos: Repository<TipoVehiculo>,
    @InjectRepository(Unidad)
    private readonly unidades: Repository<Unidad>,
    @InjectRepository(Chofer)
    private readonly choferes: Repository<Chofer>,
    @InjectRepository(Visita)
    private readonly visitas: Repository<Visita>,
    @InjectRepository(UnidadOperativaEntity)
    private readonly operativas: Repository<UnidadOperativaEntity>,
    private readonly inventario: InventarioService,
    private readonly andon: AndonService,
    private readonly visitasService: VisitasService,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed() {
    await this.seedCatalogo();
    await this.seedInventario();
    await this.seedAndonDemo();

    this.logger.log(
      'Semilla lista (catálogo Aldo: tipos, choferes, unidades; inventario v0, andon v0).',
    );
  }

  /** Idempotent upsert by tipo.nombre, chofer.nombre, unidad.placas. */
  async seedCatalogo() {
    for (const tipo of TIPOS_DEMO) {
      const exists = await this.tipos.findOne({
        where: { nombre: tipo.nombre },
      });
      if (!exists) {
        await this.tipos.save(this.tipos.create({ ...tipo }));
      } else if (exists.icono == null && tipo.icono) {
        exists.icono = tipo.icono;
        await this.tipos.save(exists);
      }
    }

    for (const nombre of CHOFERES_DEMO) {
      const exists = await this.choferes.findOne({ where: { nombre } });
      if (!exists) {
        await this.choferes.save(
          this.choferes.create({ nombre, estado: EstadoChofer.ACTIVO }),
        );
      } else if (exists.estado !== EstadoChofer.ACTIVO) {
        exists.estado = EstadoChofer.ACTIVO;
        await this.choferes.save(exists);
      }
    }

    for (const item of UNIDADES_DEMO) {
      const unidad = await this.upsertUnidad(item);
      await this.upsertChoferUsual(unidad, item.choferNombre);
    }

    await this.retireLegacyPlaceholderCatalog();
  }

  private async upsertUnidad(item: UnidadDemoSeed): Promise<Unidad> {
    const tipo = await this.tipos.findOneByOrFail({
      nombre: item.tipoNombre,
    });
    const placas = item.placas.toUpperCase();
    let exists = await this.unidades.findOne({ where: { placas } });
    if (!exists) {
      exists = await this.unidades.findOne({
        where: { numeroInterno: item.nombre },
      });
    }
    if (exists) {
      exists.numeroInterno = item.nombre;
      exists.placas = placas;
      exists.tipo = tipo;
      exists.estado = EstadoUnidad.ACTIVA;
      exists.motivoInactivacion = null;
      exists.ambito = item.ambito === 'FORANEO' ? AmbitoUnidad.FORANEO : AmbitoUnidad.LOCAL;
      exists.opsEstado =
        item.opsEstado === 'EN_RUTA'
          ? OpsEstadoUnidad.EN_RUTA
          : OpsEstadoUnidad.DISPONIBLE;
      exists.destino = item.destino?.trim() || null;
      return this.unidades.save(exists);
    }
    return this.unidades.save(
      this.unidades.create({
        numeroInterno: item.nombre,
        placas,
        vin: null,
        tipo,
        estado: EstadoUnidad.ACTIVA,
        ambito: item.ambito === 'FORANEO' ? AmbitoUnidad.FORANEO : AmbitoUnidad.LOCAL,
        opsEstado:
          item.opsEstado === 'EN_RUTA'
            ? OpsEstadoUnidad.EN_RUTA
            : OpsEstadoUnidad.DISPONIBLE,
        destino: item.destino?.trim() || null,
      }),
    );
  }

  /**
   * Usual driver lives in flota.unidad_operativa (patio), not as SALIDA/ENTRADA.
   * Standing despacho assignment is Kernel unidades.chofer_id (logistica); seed
   * leaves it null so the UI starts DISPONIBLE.
   */
  private async upsertChoferUsual(
    unidad: Unidad,
    choferNombre: string | null,
  ) {
    if (!choferNombre) return;
    const chofer = await this.choferes.findOneByOrFail({ nombre: choferNombre });
    const op = await this.operativas.findOne({
      where: { unidadId: unidad.id },
    });
    if (op?.salidaAbiertaId || op?.ultimoMovimientoAt) {
      return;
    }
    const row = op ?? this.operativas.create({ unidadId: unidad.id });
    row.choferUltimoId = chofer.id;
    await this.operativas.save(row);
  }

  /**
   * Drop the previous Camión/U-101/Juan Pérez placeholder catalog by natural key.
   * Visitas on those units are demo-only (RESTRICT); children cascade.
   */
  private async retireLegacyPlaceholderCatalog() {
    try {
      await this.retireLegacyPlaceholderCatalogUnsafe();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`No se pudo retirar semilla placeholder: ${message}`);
    }
  }

  private async retireLegacyPlaceholderCatalogUnsafe() {
    const legacyUnidades = await this.unidades.find({
      where: { placas: In([...LEGACY_UNIDADES_PLACAS]) },
    });
    for (const unidad of legacyUnidades) {
      const visitas = await this.visitas.find({
        where: { unidad: { id: unidad.id } },
      });
      if (visitas.length) {
        await this.visitas.remove(visitas);
      }
      const op = await this.operativas.findOne({
        where: { unidadId: unidad.id },
      });
      if (op) {
        await this.operativas.remove(op);
      }
      await this.unidades.remove(unidad);
    }

    for (const nombre of LEGACY_CHOFERES_DEMO) {
      const chofer = await this.choferes.findOne({ where: { nombre } });
      if (!chofer) continue;
      const used = await this.visitas.count({
        where: { chofer: { id: chofer.id } },
      });
      if (used > 0) continue;
      await this.choferes.remove(chofer);
    }

    for (const nombre of LEGACY_TIPOS_DEMO) {
      const tipo = await this.tipos.findOne({ where: { nombre } });
      if (!tipo) continue;
      const used = await this.unidades.count({ where: { tipo: { id: tipo.id } } });
      if (used > 0) continue;
      await this.tipos.remove(tipo);
    }
  }

  private async seedInventario() {
    const camiones = await this.tipos.findOneByOrFail({
      nombre: TIPO_CAMIONES_3_Y_MEDIA,
    });
    const rutas = await this.tipos.findOneByOrFail({ nombre: TIPO_RUTAS });
    const stock = await this.tipos.findOneByOrFail({ nombre: TIPO_STOCK });

    const familiaFiltros = await this.ensureFamilia('Filtros');
    const familiaFrenos = await this.ensureFamilia('Frenos');
    const proveedor = await this.ensureProveedor('Refacciones del Norte');
    const seedUser = { rol: Rol.SUPERVISOR, userId: 'seed' };

    await this.ensureItem({
      sku: 'FIL-ACEITE-01',
      nombre: 'Filtro de aceite',
      familiaId: familiaFiltros.id,
      oem: 'OEM-FIL-01',
      tipos: [camiones.id, rutas.id],
      stock: 10,
      codigoProveedor: 'PN-FIL-100',
      proveedorId: proveedor.id,
      seedUser,
    });
    await this.ensureItem({
      sku: 'PAST-FR-01',
      nombre: 'Pastillas de freno',
      familiaId: familiaFrenos.id,
      oem: 'OEM-PAST-01',
      tipos: [camiones.id],
      stock: 2,
      minQty: 5,
      codigoProveedor: 'PN-PAST-20',
      proveedorId: proveedor.id,
      seedUser,
    });
    await this.ensureItem({
      sku: 'FIL-CAB-01',
      nombre: 'Filtro de cabina',
      familiaId: familiaFiltros.id,
      oem: undefined,
      tipos: [stock.id],
      stock: 5,
      codigoProveedor: 'PN-CAB-05',
      proveedorId: proveedor.id,
      seedUser,
    });
  }

  private async ensureFamilia(nombre: string) {
    const exists = (await this.inventario.listFamilias()).find(
      (f) => f.nombre === nombre,
    );
    if (exists) return exists;
    return this.inventario.createFamilia({ nombre, activa: true });
  }

  private async ensureProveedor(nombre: string) {
    const exists = (await this.inventario.listProveedores()).find(
      (p) => p.nombre === nombre,
    );
    if (exists) return exists;
    return this.inventario.createProveedor({ nombre, activo: true });
  }

  private async ensureItem(input: {
    sku: string;
    nombre: string;
    familiaId: string;
    oem?: string;
    tipos: string[];
    stock: number;
    minQty?: number | null;
    codigoProveedor: string;
    proveedorId: string;
    seedUser: { rol: Rol; userId: string };
  }) {
    const existing = (await this.inventario.listItems()).find(
      (i) => i.sku === input.sku,
    );
    if (existing) {
      if (input.minQty != null && existing.minQty == null) {
        await this.inventario.updateItem(existing.id, {
          minQty: input.minQty,
        });
      }
      return existing;
    }
    const item = await this.inventario.createItem({
      sku: input.sku,
      nombre: input.nombre,
      familiaId: input.familiaId,
      oem: input.oem,
      tipoVehiculoIds: input.tipos,
    });
    if (input.stock > 0) {
      await this.inventario.entrada(
        { itemId: item.id, qty: input.stock, nota: 'Semilla inicial' },
        input.seedUser,
      );
    }
    if (input.minQty != null) {
      await this.inventario.updateItem(item.id, { minQty: input.minQty });
    }
    await this.inventario.addItemProveedor(item.id, {
      proveedorId: input.proveedorId,
      codigoProveedor: input.codigoProveedor,
      preferido: true,
    });
    return item;
  }

  /**
   * Demo Andon: una VisitaCerrada real en FOTON (historial + último km),
   * retrodatada para vencer t_dias. No se inventa proyección Andon sin visita.
   */
  private async seedAndonDemo() {
    await this.andon.seedUmbrales();

    const foton = await this.unidades.findOne({
      where: { numeroInterno: UNIDAD_ANDON_DEMO },
      relations: { tipo: true },
    });
    if (!foton) {
      await this.andon.evaluarPendientes();
      return;
    }

    const latestClosed = await this.visitas.findOne({
      where: { unidad: { id: foton.id }, estado: EstadoVisita.CERRADO },
      order: { cerradoAt: 'DESC' },
    });

    let prior = latestClosed;
    if (!prior) {
      prior = await this.createAndCloseSeedVisit(foton);
      const cerradoAt = new Date();
      cerradoAt.setUTCDate(cerradoAt.getUTCDate() - SEED_ANDON_DAYS_AGO);
      prior.cerradoAt = cerradoAt;
      await this.visitas.save(prior);
    } else if (prior.observaciones === SEED_ANDON_OBS) {
      const cerradoAt = new Date();
      cerradoAt.setUTCDate(cerradoAt.getUTCDate() - SEED_ANDON_DAYS_AGO);
      prior.cerradoAt = cerradoAt;
      await this.visitas.save(prior);
    }

    await this.andon.alignLastClosed({
      unidadId: foton.id,
      visitaId: prior.id,
      tipoVehiculoId: foton.tipo.id,
      km: prior.km ?? SEED_ANDON_KM,
      cerradoAt: (prior.cerradoAt ?? new Date()).toISOString(),
    });

    await this.andon.evaluarPendientes();
  }

  private async createAndCloseSeedVisit(unidad: Unidad) {
    const chofer = await this.choferes.findOneByOrFail({
      nombre: CHOFER_ANDON_DEMO,
    });
    const user = { rol: Rol.SUPERVISOR, userId: 'seed' };
    const draft = await this.visitasService.createDraft(unidad.id, user);
    await this.visitasService.updateDraft(
      draft.id,
      {
        choferId: chofer.id,
        km: SEED_ANDON_KM,
        tipo: TipoVisita.PREDICTIVO,
        observaciones: SEED_ANDON_OBS,
        trabajos: [
          {
            categoria: CategoriaTrabajo.A,
            item: 'Afinación / filtros de aceite',
          },
        ],
        firmas: [
          { tipo: TipoFirma.CHOFER, dataUrl: SEED_FIRMA_PNG },
          { tipo: TipoFirma.JEFE, dataUrl: SEED_FIRMA_PNG },
        ],
      },
      user,
    );
    await this.visitasService.close(draft.id, user);
    return this.visitas.findOneByOrFail({ id: draft.id });
  }
}
