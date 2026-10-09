import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Rol } from './roles.enum';

export type AccessSnapshot = {
  subject: string;
  displayName: string;
  roles: Rol[];
  facilityScopes: string[];
  active: boolean;
  version: number;
};

@Entity({ schema: 'auth', name: 'users' })
@Index('auth_users_identity_unique', ['issuer', 'subject'], { unique: true })
@Check('auth_users_version_check', 'version > 0')
@Check(
  'auth_users_roles_check',
  "cardinality(roles)>0 AND roles <@ ARRAY['SUPERVISOR','ADMIN_DIRECTIVO','LOGISTICA','MECANICO']::text[]",
)
@Check('auth_users_scopes_check', 'cardinality(facility_scopes)>0')
export class UserAccess {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('text') issuer: string;
  @Column('text') subject: string;
  @Column({ name: 'display_name', type: 'text' }) displayName: string;
  @Column({ type: 'text', array: true }) roles: Rol[];
  @Column({ name: 'facility_scopes', type: 'text', array: true })
  facilityScopes: string[];
  @Column({ type: 'boolean', default: true }) active: boolean;
  @Column({ type: 'integer', default: 1 }) version: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

@Entity({ schema: 'auth', name: 'user_audit' })
export class UserAccessAudit {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId: string;
  @Column('text') issuer: string;
  @Column({ name: 'actor_subject', type: 'text' }) actorSubject: string;
  @Column('text') action: 'BOOTSTRAP' | 'CREATE' | 'UPDATE';
  @Column({ name: 'before_snapshot', type: 'jsonb', nullable: true })
  before: AccessSnapshot | null;
  @Column({ name: 'after_snapshot', type: 'jsonb' }) after: AccessSnapshot;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
