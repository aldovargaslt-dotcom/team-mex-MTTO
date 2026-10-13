import { Column, Entity, PrimaryColumn, CreateDateColumn } from 'typeorm';
import { MaterialState, emptyMaterials } from './materials-model';

@Entity({ schema: 'inventario', name: 'material_accounts' })
export class MaterialAccount {
  @PrimaryColumn('uuid', { name: 'visita_id' }) visitaId: string;
  @Column({ type: 'integer', default: 0 }) revision: number;
  @Column({ type: 'jsonb', default: () => "'{\"purchases\":[],\"postings\":[],\"audits\":[]}'::jsonb" })
  state: MaterialState = emptyMaterials();
}
@Entity({ schema: 'inventario', name: 'material_commands' })
export class MaterialCommandRecord {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'visita_id', type: 'uuid' }) visitaId: string;
  @Column() hash: string;
  @Column({ type: 'jsonb' }) result: object;
  @Column() actor: string;
  @Column({ type: 'integer' }) revision: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
@Entity({ schema: 'inventario', name: 'material_closures' })
export class MaterialClosure {
  @PrimaryColumn('uuid', { name: 'event_id' }) eventId: string;
  @Column({ name: 'visita_id', type: 'uuid' }) visitaId: string;
  @Column({ type: 'jsonb' }) legacy: { itemId: string; qty: number; origen: string }[];
}
