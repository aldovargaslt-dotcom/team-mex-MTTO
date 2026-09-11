import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { EstadoChofer } from '../estado-chofer.enum';

export class FiltrarChoferesDto {
  @ApiPropertyOptional({
    enum: EstadoChofer,
    description: 'Filtrar por estado. Sin valor: todos (catálogo admin).',
  })
  @IsOptional()
  @IsEnum(EstadoChofer, { message: 'El estado del chofer no es válido.' })
  estado?: EstadoChofer;
}
