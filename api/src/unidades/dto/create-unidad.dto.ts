import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { OptionalTrimmed, RequiredTrimmed } from '../../common/trim';
import { EstadoUnidad } from '../../common/estado-unidad.enum';

export class CreateUnidadDto {
  @ApiProperty({ example: 'U-104' })
  @RequiredTrimmed('El número interno no puede estar vacío.')
  @MaxLength(20)
  numeroInterno: string;

  @ApiProperty({ example: 'TMX-104-D' })
  @RequiredTrimmed('Las placas no pueden estar vacías.')
  @MaxLength(20)
  placas: string;

  @ApiPropertyOptional({ example: '3HSDZAPR5NN104001' })
  @OptionalTrimmed()
  @MaxLength(32)
  vin?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  tipoId: string;

  @ApiPropertyOptional({ enum: EstadoUnidad, default: EstadoUnidad.ACTIVA })
  @IsOptional()
  @IsEnum(EstadoUnidad)
  estado?: EstadoUnidad;

  @ApiPropertyOptional({ example: 'International MV' })
  @OptionalTrimmed()
  @MaxLength(120)
  marcaModelo?: string;

  @ApiPropertyOptional({ example: 2022 })
  @IsOptional()
  @IsInt()
  @Min(1980)
  @Max(2100)
  anio?: number;

  @ApiPropertyOptional({
    description: 'Foto de la unidad. Vacío la quita. ADR-014.',
  })
  @IsOptional()
  @OptionalTrimmed()
  @MaxLength(1_500_000, {
    message: 'La foto de la unidad es demasiado grande.',
  })
  fotoDataUrl?: string | null;
}
