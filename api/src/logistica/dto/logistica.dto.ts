import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { OptionalTrimmed } from '../../common/trim';
import { ChipLogistica } from '../logistica-types';

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

export class CreateAsignacionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID(undefined, { message: 'Indique una unidad válida.' })
  unidadId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID(undefined, { message: 'Indique un chofer válido.' })
  choferId: string;
}
