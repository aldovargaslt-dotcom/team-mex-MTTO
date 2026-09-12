import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoSitio, FLOTA_SCHEMA } from '../enums';

@Entity({ name: 'sitios', schema: FLOTA_SCHEMA })
export class SitioEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 16, default: EstadoSitio.ACTIVO })
  estado: EstadoSitio;

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
