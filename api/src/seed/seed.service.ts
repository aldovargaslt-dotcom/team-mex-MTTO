import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoUnidad } from '../common/estado-unidad.enum';
import { TipoVehiculo } from '../tipos-vehiculo/tipo-vehiculo.entity';
import { Unidad } from '../unidades/unidad.entity';

const TIPOS_SEED = [
  { nombre: 'Camión', descripcion: 'Unidad de carga pesada' },
  { nombre: 'Camioneta', descripcion: 'Unidad ligera de apoyo' },
  { nombre: 'Van', descripcion: 'Unidad de pasajeros' },
];

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

    this.logger.log('Semilla Slice 1 lista (U-101, U-102 ACTIVA; U-103 INACTIVA).');
  }
}
