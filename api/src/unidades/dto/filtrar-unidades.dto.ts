import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoUnidad } from '../../common/estado-unidad.enum';

export class FiltrarUnidadesDto {
  @ApiPropertyOptional({ description: 'Filtro por número interno (parcial)' })
  @IsOptional()
  @IsString()
  numeroInterno?: string;

  @ApiPropertyOptional({ description: 'Filtro por placas (parcial)' })
  @IsOptional()
  @IsString()
  placas?: string;

  @ApiPropertyOptional({
    description: 'Filtro por tipo: UUID o nombre (parcial)',
  })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional({
    description:
      'Un término; OR ILIKE en numeroInterno, placas y marcaModelo',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    enum: EstadoUnidad,
    description: 'Filtrar por estado. Sin valor: todas.',
  })
  @IsOptional()
  @IsEnum(EstadoUnidad, { message: 'El estado de la unidad no es válido.' })
  estado?: EstadoUnidad;
}
