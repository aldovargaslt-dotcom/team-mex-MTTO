import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, MaxLength } from 'class-validator';
import { RequiredTrimmed } from '../../common/trim';
import { EstadoChofer } from '../estado-chofer.enum';

export class CreateChoferDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @RequiredTrimmed('El nombre del chofer no puede estar vacío.')
  @MaxLength(120)
  nombre: string;

  @ApiPropertyOptional({ enum: EstadoChofer, default: EstadoChofer.ACTIVO })
  @IsOptional()
  @IsEnum(EstadoChofer, { message: 'El estado del chofer no es válido.' })
  estado?: EstadoChofer;
}
