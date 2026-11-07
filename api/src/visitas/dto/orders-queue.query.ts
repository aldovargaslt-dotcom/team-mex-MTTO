import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const ORDER_QUEUES = ['abiertas', 'borradores', 'cerradas'] as const;
export type OrderQueue = (typeof ORDER_QUEUES)[number];

/** ADR-031: query for the maintenance orders queue read. */
export class OrdersQueueQuery {
  @IsOptional()
  @IsIn(ORDER_QUEUES)
  cola?: OrderQueue;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  /** Opaque keyset cursor: `<updatedAt ISO ms>|<uuid>`. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z\|[0-9a-f-]{36}$/i, {
    message: 'Cursor inválido.',
  })
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
