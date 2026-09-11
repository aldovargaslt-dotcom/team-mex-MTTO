import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
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
import { TipoVisita } from '../enums';
import { FirmaDto } from './firma.dto';
import { FotoDto } from './foto.dto';
import { PiezaDto } from './pieza.dto';
import { TrabajoDto } from './trabajo.dto';

export class UpdateVisitaDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('4', { message: 'El chofer seleccionado no es válido.' })
  choferId?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 125000 })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt({ message: 'El kilometraje debe ser un número entero.' })
  @Min(0, { message: 'El kilometraje debe ser mayor o igual a 0.' })
  km?: number | null;

  @ApiPropertyOptional({ enum: TipoVisita, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(TipoVisita, {
    message: 'El tipo de visita debe ser PREDICTIVO o CORRECTIVO.',
  })
  tipo?: TipoVisita | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @OptionalTrimmed()
  observaciones?: string | null;

  @ApiPropertyOptional({ type: [TrabajoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrabajoDto)
  trabajos?: TrabajoDto[];

  @ApiPropertyOptional({ type: [FotoDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8, { message: 'Puede adjuntar como máximo 8 fotos.' })
  @ValidateNested({ each: true })
  @Type(() => FotoDto)
  fotos?: FotoDto[];

  @ApiPropertyOptional({ type: [FirmaDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2, { message: 'Solo se registran las firmas de chofer y jefe.' })
  @ValidateNested({ each: true })
  @Type(() => FirmaDto)
  firmas?: FirmaDto[];

  @ApiPropertyOptional({ type: [PiezaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PiezaDto)
  piezas?: PiezaDto[];
}
