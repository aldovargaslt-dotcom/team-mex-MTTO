import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { OptionalTrimmed } from '../../common/trim';
import { ChipLogistica, ChipLogisticaUnidad } from '../logistica-types';

export class FiltrarLogisticaChoferesDto {
  @ApiPropertyOptional({ description: 'Búsqueda por nombre de chofer.' })
  @OptionalTrimmed()
  q?: string;

  @ApiPropertyOptional({ enum: ['DISPONIBLE', 'EN_RUTA', 'TODOS'] })
  @IsOptional()
  @IsEnum(['DISPONIBLE', 'EN_RUTA', 'TODOS'] as const, {
    message: 'El chip debe ser DISPONIBLE, EN_RUTA o TODOS.',
  })
  chip?: ChipLogistica;
}

export class FiltrarLogisticaUnidadesDto {
  @ApiPropertyOptional({ description: 'Búsqueda por placas o nombre de unidad.' })
  @OptionalTrimmed()
  q?: string;

  @ApiPropertyOptional({ enum: ['EN_RUTA', 'DISPONIBLE', 'TODAS'] })
  @IsOptional()
  @IsEnum(['EN_RUTA', 'DISPONIBLE', 'TODAS'] as const, {
    message: 'El chip debe ser EN_RUTA, DISPONIBLE o TODAS.',
  })
  chip?: ChipLogisticaUnidad;
}

export class CreateAsignacionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID(undefined, { message: 'Indique una unidad válida.' })
  unidadId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID(undefined, { message: 'Indique un chofer válido.' })
  choferId: string;
}
