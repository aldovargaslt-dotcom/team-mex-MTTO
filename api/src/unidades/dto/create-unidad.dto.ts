import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EstadoUnidad } from '../../common/estado-unidad.enum';

export class CreateUnidadDto {
  @ApiProperty({ example: 'U-104' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  numeroInterno: string;

  @ApiProperty({ example: 'TMX-104-D' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  placas: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  tipoId: string;

  @ApiPropertyOptional({ enum: EstadoUnidad, default: EstadoUnidad.ACTIVA })
  @IsOptional()
  @IsEnum(EstadoUnidad)
  estado?: EstadoUnidad;

  @ApiPropertyOptional({ example: 'International' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  marca?: string;

  @ApiPropertyOptional({ example: 'MV' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  modelo?: string;

  @ApiPropertyOptional({ example: 2022 })
  @IsOptional()
  @IsInt()
  @Min(1980)
  @Max(2100)
  anio?: number;

  @ApiPropertyOptional({ example: 12000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  kilometraje?: number;
}
