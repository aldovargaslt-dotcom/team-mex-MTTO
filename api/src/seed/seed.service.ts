import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rol } from '../auth/roles.enum';
import { Chofer } from '../choferes/chofer.entity';
import { EstadoUnidad } from '../common/estado-unidad.enum';
import { AndonService } from '../andon/andon.service';
import { InventarioService } from '../inventario/inventario.service';
import { TipoVehiculo } from '../tipos-vehiculo/tipo-vehiculo.entity';
import { Unidad } from '../unidades/unidad.entity';
import {
  CategoriaTrabajo,
  EstadoVisita,
  TipoFirma,
  TipoVisita,
} from '../visitas/enums';
import { Visita } from '../visitas/visita.entity';
import { VisitasService } from '../visitas/visitas.service';

const TIPOS_SEED = [
  { nombre: 'Camión', descripcion: 'Unidad de carga pesada' },
  { nombre: 'Camioneta', descripcion: 'Unidad ligera de apoyo' },
  { nombre: 'Van', descripcion: 'Unidad de pasajeros' },
];

const SEED_ANDON_OBS = 'Semilla Andon';
const SEED_ANDON_KM = 100;
const SEED_ANDON_DAYS_AGO = 120;
const SEED_FIRMA_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const CHOFERES_SEED = ['Juan Pérez', 'María López', 'Carlos Ruiz'];

const UNIDADES_SEED = [
  {
    numeroInterno: 'U-101',
    placas: 'TMX-101-A',
    vin: '3HSDZAPR5NN101001',
    tipoNombre: 'Camión',
    estado: EstadoUnidad.ACTIVA,
    marcaModelo: 'International MV',
    anio: 2022,
  },
  {
    numeroInterno: 'U-102',
    placas: 'TMX-102-B',
    vin: '1FTER4EH5PL102002',
    tipoNombre: 'Camioneta',
    estado: EstadoUnidad.ACTIVA,
    marcaModelo: 'Ford Ranger',
    anio: 2023,
  },
  {
    numeroInterno: 'U-103',
    placas: 'TMX-103-C',
    vin: 'WDB9066331N103003',
    tipoNombre: 'Van',
    estado: EstadoUnidad.INACTIVA,
    marcaModelo: 'Mercedes-Benz Sprinter',
    anio: 2019,
  },
];

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
    private readonly inventario: InventarioService,
    private readonly andon: AndonService,
    private readonly visitasService: VisitasService,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed() {
    for (const tipo of TIPOS_SEED) {
      const exists = await this.tipos.findOne({
        where: { nombre: tipo.nombre },
      });
      if (!exists) {
        await this.tipos.save(this.tipos.create(tipo));
      }
    }

    for (const nombre of CHOFERES_SEED) {
      const exists = await this.choferes.findOne({ where: { nombre } });
      if (!exists) {
        await this.choferes.save(this.choferes.create({ nombre }));
      }
    }

    for (const item of UNIDADES_SEED) {
      const tipo = await this.tipos.findOneByOrFail({
        nombre: item.tipoNombre,
      });
      const exists = await this.unidades.findOne({
        where: { numeroInterno: item.numeroInterno },
      });
      if (exists) {
        exists.placas = item.placas;
        exists.vin = item.vin;
        exists.tipo = tipo;
        exists.estado = item.estado;
        exists.marcaModelo = item.marcaModelo;
        exists.anio = item.anio;
        await this.unidades.save(exists);
        continue;
      }
      await this.unidades.save(
        this.unidades.create({
          numeroInterno: item.numeroInterno,
          placas: item.placas,
          vin: item.vin,
          tipo,
          estado: item.estado,
          marcaModelo: item.marcaModelo,
          anio: item.anio,
        }),
      );
    }

    await this.seedInventario();
    await this.seedAndonDemo();

    this.logger.log(
      'Semilla lista (unidades, choferes, inventario v0, andon v0).',
    );
  }

  private async seedInventario() {
    const camion = await this.tipos.findOneByOrFail({ nombre: 'Camión' });
    const camioneta = await this.tipos.findOneByOrFail({ nombre: 'Camioneta' });
    const van = await this.tipos.findOneByOrFail({ nombre: 'Van' });

    const familiaFiltros = await this.ensureFamilia('Filtros');
    const familiaFrenos = await this.ensureFamilia('Frenos');
    const proveedor = await this.ensureProveedor('Refacciones del Norte');
    const seedUser = { rol: Rol.SUPERVISOR, userId: 'seed' };

    await this.ensureItem({
      sku: 'FIL-ACEITE-01',
      nombre: 'Filtro de aceite',
      familiaId: familiaFiltros.id,
      oem: 'OEM-FIL-01',
      tipos: [camion.id, camioneta.id],
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
      tipos: [camion.id],
      stock: 2,
      stockMin: 5,
      codigoProveedor: 'PN-PAST-20',
      proveedorId: proveedor.id,
      seedUser,
    });
    await this.ensureItem({
      sku: 'FIL-CAB-01',
      nombre: 'Filtro de cabina',
      familiaId: familiaFiltros.id,
      oem: undefined,
      tipos: [van.id],
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
    stockMin?: number | null;
    codigoProveedor: string;
    proveedorId: string;
    seedUser: { rol: Rol; userId: string };
  }) {
    const existing = (await this.inventario.listItems()).find(
      (i) => i.sku === input.sku,
    );
    if (existing) {
      if (input.stockMin != null && existing.stockMin == null) {
        await this.inventario.updateItem(existing.id, {
          stockMin: input.stockMin,
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
    if (input.stockMin != null) {
      await this.inventario.updateItem(item.id, { stockMin: input.stockMin });
    }
    await this.inventario.addItemProveedor(item.id, {
      proveedorId: input.proveedorId,
      codigoProveedor: input.codigoProveedor,
      preferido: true,
    });
    return item;
  }

  /**
   * Demo Andon: una VisitaCerrada real en U-101 (historial + último km),
   * retrodatada para vencer t_dias. No se inventa proyección Andon sin visita.
   */
  private async seedAndonDemo() {
    await this.andon.seedUmbrales();

    const u101 = await this.unidades.findOne({
      where: { numeroInterno: 'U-101' },
      relations: { tipo: true },
    });
    if (!u101) {
      await this.andon.evaluarPendientes();
      return;
    }

    const latestClosed = await this.visitas.findOne({
      where: { unidad: { id: u101.id }, estado: EstadoVisita.CERRADO },
      order: { cerradoAt: 'DESC' },
    });

    let prior = latestClosed;
    if (!prior) {
      prior = await this.createAndCloseSeedVisit(u101);
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
      unidadId: u101.id,
      visitaId: prior.id,
      tipoVehiculoId: u101.tipo.id,
      km: prior.km ?? SEED_ANDON_KM,
      cerradoAt: (prior.cerradoAt ?? new Date()).toISOString(),
    });

    await this.andon.evaluarPendientes();
  }

  private async createAndCloseSeedVisit(unidad: Unidad) {
    const chofer = await this.choferes.findOneByOrFail({
      nombre: CHOFERES_SEED[0],
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
