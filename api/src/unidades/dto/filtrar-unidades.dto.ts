import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

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
}
