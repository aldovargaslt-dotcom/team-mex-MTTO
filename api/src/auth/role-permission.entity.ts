import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'auth', name: 'role_permission_versions' })
export class RolePermissionVersion {
  @PrimaryColumn('text') role: string;
  @Column({ type: 'integer', default: 1 }) version: number;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

@Entity({ schema: 'auth', name: 'role_permissions' })
export class RolePermission {
  @PrimaryColumn('text') role: string;
  @PrimaryColumn('text') permission: string;
}

@Entity({ schema: 'auth', name: 'role_permission_audit' })
export class RolePermissionAudit {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('text') role: string;
  @Column({ name: 'actor_subject', type: 'text' }) actorSubject: string;
  @Column('text') action: 'SEED' | 'UPDATE';
  @Column('text') reason: string;
  @Column({ name: 'before_permissions', type: 'jsonb', nullable: true })
  before: string[] | null;
  @Column({ name: 'after_permissions', type: 'jsonb' }) after: string[];
  @Column({ name: 'version_after', type: 'integer' }) versionAfter: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
