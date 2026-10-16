import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  Index,
} from 'typeorm';
import type { CostMoney } from '../cost-rules';
export type CostRevision = {
  actor: string;
  at: string;
  reason: string;
  before: CostMoney | null;
  after: CostMoney | null;
  netBefore: string | null;
  netAfter: string | null;
};
@Entity({ schema: 'inventario', name: 'cost_operations' })
@Index(['unidadId', 'effectiveAt'])
export class CostOperation {
  @PrimaryColumn('uuid') id: string;
  @Column({ type: 'uuid' }) itemId: string;
  @Column() kind: string;
  @Column('int') qty: number;
  @Column({ type: 'uuid', nullable: true }) visitaId: string | null;
  @Column({ type: 'uuid', nullable: true }) unidadId: string | null;
  @Column({ type: 'uuid', nullable: true }) supplierId: string | null;
  @Column({ type: 'varchar', nullable: true }) supplierName: string | null;
  @Column({ type: 'varchar', nullable: true }) reference: string | null;
  @Column({ type: 'jsonb', nullable: true }) money: CostMoney | null;
  @Column({ type: 'bigint', nullable: true }) netCents: string | null;
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  revisions: CostRevision[];
  @Column({ type: 'int', default: 1 }) version: number;
  @Column({ type: 'varchar' }) actor: string;
  @Column({ type: 'text', nullable: true }) reason: string | null;
  @Column({ type: 'uuid', nullable: true }) sourceId: string | null;
  @Column({ type: 'timestamptz' }) effectiveAt: Date;
  @CreateDateColumn() createdAt: Date;
}
@Entity({ schema: 'inventario', name: 'valuation_state' })
export class ValuationState {
  @PrimaryColumn('uuid') itemId: string;
  @Column({ type: 'bigint', nullable: true }) valueCents: string | null;
  @Column({ type: 'int', default: 0 }) version: number;
  @Column({ type: 'int', default: 0 }) quantityAtCost: number;
  @Column({ type: 'timestamptz', nullable: true }) cutAt: Date | null;
}
@Entity({ schema: 'inventario', name: 'operation_receipts' })
export class OperationReceipt {
  @PrimaryColumn() identity: string;
  @Column() hash: string;
  @Column('jsonb') result: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
}

@Entity({ schema: 'inventario', name: 'document_attachments' })
export class DocumentAttachment {
  @PrimaryColumn('uuid') id: string;
  @Column('uuid') pendingId: string;
  @Column('text') dataUrl: string;
  @Column({ type: 'varchar', nullable: true }) actor: string | null;
  @CreateDateColumn() createdAt: Date;
}
