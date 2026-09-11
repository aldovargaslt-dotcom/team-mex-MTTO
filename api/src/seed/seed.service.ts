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

const TIPOS_SEED = [
  { nombre: 'Camión', descripcion: 'Unidad de carga pesada' },
  { nombre: 'Camioneta', descripcion: 'Unidad ligera de apoyo' },
  { nombre: 'Van', descripcion: 'Unidad de pasajeros' },
];

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
    private readonly inventario: InventarioService,
    private readonly andon: AndonService,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed() {
    for (const tipo of TIPOS_SEED) {
      const exists = await this.tipos.findOne({ where: { nombre: tipo.nombre } });
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
    await this.andon.seedDefaults();

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
    const exists = (await this.inventario.listFamilias()).find((f) => f.nombre === nombre);
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
    codigoProveedor: string;
    proveedorId: string;
    seedUser: { rol: Rol; userId: string };
  }) {
    const existing = (await this.inventario.listItems()).find((i) => i.sku === input.sku);
    if (existing) {
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
    await this.inventario.addItemProveedor(item.id, {
      proveedorId: input.proveedorId,
      codigoProveedor: input.codigoProveedor,
      preferido: true,
    });
    return item;
  }
}

