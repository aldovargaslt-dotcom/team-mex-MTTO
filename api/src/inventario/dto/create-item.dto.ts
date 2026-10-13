import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsIn,
  Min,
  Max,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { OptionalTrimmed, RequiredTrimmed } from '../../common/trim';
import { OptionalMinQty } from './optional-min-qty';

export class CreateItemDto {
  @IsOptional() @IsIn(['pieza', 'L', 'kg', 'm'])
  uom?: string;
  @IsOptional() @IsInt() @Min(0) @Max(6)
  quantityScale?: number;
  @ApiProperty({ example: 'FIL-ACEITE-01' })
  @RequiredTrimmed('El SKU no puede estar vacío.')
  @MaxLength(40)
  sku: string;

  @ApiProperty({ example: 'Filtro de aceite' })
  @RequiredTrimmed('El nombre del ítem no puede estar vacío.')
  @MaxLength(120)
  nombre: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'La familia no es válida.' })
  familiaId: string;

  @ApiPropertyOptional({ example: 'OEM-FIL-01' })
  @OptionalTrimmed()
  @MaxLength(80)
  oem?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'El tipo de vehículo no es válido.' })
  tipoVehiculoIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'La unidad no es válida.' })
  unidadIds?: string[];

  @OptionalMinQty()
  minQty?: number | null;
}
