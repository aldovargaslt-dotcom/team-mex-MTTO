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
    tipoNombre: 'Camión',
    estado: EstadoUnidad.ACTIVA,
    marca: 'International',
    modelo: 'MV',
    anio: 2022,
    kilometraje: 85400,
  },
  {
    numeroInterno: 'U-102',
    placas: 'TMX-102-B',
    tipoNombre: 'Camioneta',
    estado: EstadoUnidad.ACTIVA,
    marca: 'Ford',
    modelo: 'Ranger',
    anio: 2023,
    kilometraje: 41200,
  },
  {
    numeroInterno: 'U-103',
    placas: 'TMX-103-C',
    tipoNombre: 'Van',
    estado: EstadoUnidad.INACTIVA,
    marca: 'Mercedes-Benz',
    modelo: 'Sprinter',
    anio: 2019,
    kilometraje: 162000,
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
      const exists = await this.unidades.findOne({
        where: { numeroInterno: item.numeroInterno },
      });
      if (exists) {
        continue;
      }
      const tipo = await this.tipos.findOneByOrFail({
        nombre: item.tipoNombre,
      });
      await this.unidades.save(
        this.unidades.create({
          numeroInterno: item.numeroInterno,
          placas: item.placas,
          tipo,
          estado: item.estado,
          marca: item.marca,
          modelo: item.modelo,
          anio: item.anio,
          kilometraje: item.kilometraje,
        }),
      );
    }

    this.logger.log('Semilla Slice 1 lista (U-101, U-102 ACTIVA; U-103 INACTIVA).');
  }
}
