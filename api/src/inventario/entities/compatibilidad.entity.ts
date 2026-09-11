import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { INVENTARIO_SCHEMA } from '../enums';
import { Item } from './item.entity';

@Entity({ name: 'compatibilidades', schema: INVENTARIO_SCHEMA })
@Unique(['item', 'tipoVehiculoId'])
export class Compatibilidad {
  @PrimaryColumn('uuid')
  id: string;

  @ManyToOne(() => Item, (item) => item.compatibilidades, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'item_id' })
  item: Item;

  /** ID opaco del kernel (TipoVehiculo). Sin FK cruzada. */
  @Column({ name: 'tipo_vehiculo_id', type: 'uuid' })
  tipoVehiculoId: string;

  @BeforeInsert()
  assignId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
