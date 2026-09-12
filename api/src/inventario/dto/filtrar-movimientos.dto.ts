import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TipoMovimiento } from '../enums';

export class FiltrarMovimientosDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  itemId?: string;

  @ApiPropertyOptional({ enum: TipoMovimiento })
  @IsOptional()
  @IsEnum(TipoMovimiento)
  tipo?: TipoMovimiento;

  /** Inclusive start (ISO date or datetime). Date-only = start of that UTC day. */
  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Inclusive end (ISO date or datetime). Date-only = end of that UTC day. */
  @ApiPropertyOptional({ example: '2026-09-12' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export function parseFromInclusive(raw: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T00:00:00.000Z`);
  }
  return new Date(raw);
}

export function parseToInclusive(raw: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T23:59:59.999Z`);
  }
  return new Date(raw);
}
