import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { OptionalTrimmed } from '../../common/trim';

export class UpdateItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @OptionalTrimmed()
  @MaxLength(40)
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @OptionalTrimmed()
  @MaxLength(120)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'La familia no es válida.' })
  familiaId?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @OptionalTrimmed()
  @MaxLength(80)
  oem?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'El tipo de vehículo no es válido.' })
  tipoVehiculoIds?: string[];
}
