import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
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

export class RegistrarSalidaDto {
  @ApiProperty({ enum: ['LOCAL', 'FORANEO'] })
  @IsEnum(['LOCAL', 'FORANEO'] as const, {
    message: 'Indique si la salida es local o foránea.',
  })
  ambito: 'LOCAL' | 'FORANEO';

  @ApiPropertyOptional()
  @OptionalTrimmed()
  destino?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID(undefined, { message: 'Indique un chofer válido.' })
  choferId?: string;
}

export class UmbralUnidadDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID(undefined, { message: 'Indique una unidad válida.' })
  unidadId: string;

  @ApiPropertyOptional({
    description: 'Horas de override. Null borra el override.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value != null)
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'El umbral de la unidad debe ser al menos 1 hora.' })
  horas: number | null;
}

export class PatchAlertasSinRegresoDto {
  @ApiPropertyOptional({ description: 'Default horas LOCAL (8).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'El umbral local debe ser al menos 1 hora.' })
  localH?: number;

  @ApiPropertyOptional({ description: 'Default horas FORANEO (24).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'El umbral foráneo debe ser al menos 1 hora.' })
  foraneoH?: number;

  @ApiPropertyOptional({ type: [UmbralUnidadDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UmbralUnidadDto)
  umbrales?: UmbralUnidadDto[];
}
