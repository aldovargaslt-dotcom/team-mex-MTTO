import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { OptionalTrimmed, RequiredTrimmed } from '../../common/trim';
import { TipoFirmaFlota, TipoMovimientoFlota } from '../enums';

export class FirmaFlotaDto {
  @ApiProperty({ enum: TipoFirmaFlota })
  @IsEnum(TipoFirmaFlota, {
    message: 'La firma debe ser de chofer o de aval.',
  })
  tipo: TipoFirmaFlota;

  @ApiProperty({ example: 'data:image/png;base64,iVBOR...' })
  @RequiredTrimmed('La firma no puede estar vacía.')
  @Matches(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, {
    message: 'La firma debe ser una imagen en formato data URL.',
  })
  @MaxLength(2_000_000, {
    message: 'La firma supera el tamaño máximo permitido.',
  })
  dataUrl: string;
}

export class CreateMovimientoFlotaDto {
  @ApiProperty({ enum: TipoMovimientoFlota })
  @IsEnum(TipoMovimientoFlota, {
    message: 'El movimiento debe ser SALIDA o ENTRADA.',
  })
  tipo: TipoMovimientoFlota;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  unidadId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  choferId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sitioId: string;

  @ApiProperty({ example: '2026-09-12T12:00:00.000Z' })
  @IsISO8601(
    { strict: true },
    { message: 'La fecha y hora del movimiento no es válida.' },
  )
  occurredAt: string;

  @ApiProperty({ example: 12450 })
  @Type(() => Number)
  @IsInt({ message: 'Indique el kilometraje (0 o más).' })
  @Min(0, { message: 'Indique el kilometraje (0 o más).' })
  km: number;

  @ApiPropertyOptional({ example: 'Cliente Norte' })
  @OptionalTrimmed()
  @MaxLength(240)
  notas?: string;

  @ApiProperty({ type: [FirmaFlotaDto] })
  @IsArray()
  @ArrayMinSize(2, {
    message:
      'Se requieren las firmas del chofer y del aval para registrar el movimiento.',
  })
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => FirmaFlotaDto)
  firmas: FirmaFlotaDto[];
}

export class CreateSitioDto {
  @ApiProperty({ example: 'Patio' })
  @RequiredTrimmed('El nombre del sitio no puede estar vacío.')
  @MaxLength(80)
  nombre: string;
}

export class UpdateSitioDto {
  @ApiPropertyOptional()
  @OptionalTrimmed()
  @MaxLength(80)
  nombre?: string;

  @ApiPropertyOptional({ enum: ['ACTIVO', 'INACTIVO'] })
  @IsOptional()
  @IsEnum(['ACTIVO', 'INACTIVO'] as const, {
    message: 'El estado del sitio debe ser ACTIVO o INACTIVO.',
  })
  estado?: 'ACTIVO' | 'INACTIVO';
}
