import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chofer } from '../choferes/chofer.entity';
import { EstadoUnidad } from '../common/estado-unidad.enum';
import { Compatibilidad } from '../inventario/entities/compatibilidad.entity';
import { Familia } from '../inventario/entities/familia.entity';
import { Item } from '../inventario/entities/item.entity';
import { ItemProveedor } from '../inventario/entities/item-proveedor.entity';
import { Movimiento } from '../inventario/entities/movimiento.entity';
import { Proveedor } from '../inventario/entities/proveedor.entity';
import { Stock } from '../inventario/entities/stock.entity';
import { TipoMovimiento, UOM_PIEZA } from '../inventario/enums';
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
    @InjectRepository(Familia)
    private readonly familias: Repository<Familia>,
    @InjectRepository(Item)
    private readonly items: Repository<Item>,
    @InjectRepository(Proveedor)
    private readonly proveedores: Repository<Proveedor>,
    @InjectRepository(ItemProveedor)
    private readonly itemProveedores: Repository<ItemProveedor>,
    @InjectRepository(Compatibilidad)
    private readonly compatibilidades: Repository<Compatibilidad>,
    @InjectRepository(Stock)
    private readonly stock: Repository<Stock>,
    @InjectRepository(Movimiento)
    private readonly movimientos: Repository<Movimiento>,
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

    this.logger.log(
      'Semilla lista (unidades, choferes, inventario v0).',
    );
  }

  private async seedInventario() {
    const camion = await this.tipos.findOneByOrFail({ nombre: 'Camión' });
    const camioneta = await this.tipos.findOneByOrFail({ nombre: 'Camioneta' });
    const van = await this.tipos.findOneByOrFail({ nombre: 'Van' });

    const familiaFiltros = await this.ensureFamilia('Filtros');
    const familiaFrenos = await this.ensureFamilia('Frenos');
    const proveedor = await this.ensureProveedor('Refacciones del Norte');

    await this.ensureItem({
      sku: 'FIL-ACEITE-01',
      nombre: 'Filtro de aceite',
      familia: familiaFiltros,
      oem: 'OEM-FIL-01',
      tipos: [camion.id, camioneta.id],
      stock: 10,
      codigoProveedor: 'PN-FIL-100',
      proveedor,
    });
    await this.ensureItem({
      sku: 'PAST-FR-01',
      nombre: 'Pastillas de freno',
      familia: familiaFrenos,
      oem: 'OEM-PAST-01',
      tipos: [camion.id],
      stock: 2,
      codigoProveedor: 'PN-PAST-20',
      proveedor,
    });
    await this.ensureItem({
      sku: 'FIL-CAB-01',
      nombre: 'Filtro de cabina',
      familia: familiaFiltros,
      oem: null,
      tipos: [van.id],
      stock: 5,
      codigoProveedor: 'PN-CAB-05',
      proveedor,
    });
  }

  private async ensureFamilia(nombre: string) {
    const exists = await this.familias.findOne({ where: { nombre } });
    if (exists) return exists;
    return this.familias.save(this.familias.create({ nombre, activa: true }));
  }

  private async ensureProveedor(nombre: string) {
    const exists = await this.proveedores.findOne({ where: { nombre } });
    if (exists) return exists;
    return this.proveedores.save(
      this.proveedores.create({ nombre, activo: true }),
    );
  }

  private async ensureItem(input: {
    sku: string;
    nombre: string;
    familia: Familia;
    oem: string | null;
    tipos: string[];
    stock: number;
    codigoProveedor: string;
    proveedor: Proveedor;
  }) {
    let item = await this.items.findOne({
      where: { sku: input.sku },
      relations: { stock: true, compatibilidades: true, proveedores: true },
    });
    if (!item) {
      item = await this.items.save(
        this.items.create({
          sku: input.sku,
          nombre: input.nombre,
          familia: input.familia,
          oem: input.oem,
          uom: UOM_PIEZA,
          activo: true,
        }),
      );
    }
    const stock = await this.stock.findOne({ where: { itemId: item.id } });
    if (!stock) {
      await this.stock.save(this.stock.create({ itemId: item.id, qty: input.stock }));
      if (input.stock > 0) {
        await this.movimientos.save(
          this.movimientos.create({
            tipo: TipoMovimiento.ENTRADA,
            item: { id: item.id } as Item,
            qty: input.stock,
            delta: input.stock,
            visitaId: null,
            nota: 'Semilla inicial',
            createdBy: 'seed',
          }),
        );
      }
    }
    for (const tipoVehiculoId of input.tipos) {
      const exists = await this.compatibilidades.findOne({
        where: { item: { id: item.id }, tipoVehiculoId },
      });
      if (!exists) {
        await this.compatibilidades.save(
          this.compatibilidades.create({
            item: { id: item.id } as Item,
            tipoVehiculoId,
          }),
        );
      }
    }
    const link = await this.itemProveedores.findOne({
      where: { item: { id: item.id }, proveedor: { id: input.proveedor.id } },
    });
    if (!link) {
      await this.itemProveedores.save(
        this.itemProveedores.create({
          item: { id: item.id } as Item,
          proveedor: input.proveedor,
          codigoProveedor: input.codigoProveedor,
          preferido: true,
        }),
      );
    }
    return item;
  }
}
