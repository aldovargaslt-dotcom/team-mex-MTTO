import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoChofer } from './estado-chofer.enum';

@Entity('choferes')
@Unique('choferes_nombre_uidx', ['nombre'])
export class Chofer {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({
    type: 'enum',
    enum: EstadoChofer,
    default: EstadoChofer.ACTIVO,
  })
  estado: EstadoChofer;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  assignId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
