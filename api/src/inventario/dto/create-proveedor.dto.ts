import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { RequiredTrimmed } from '../../common/trim';

export class CreateProveedorDto {
  @ApiProperty({ example: 'Refacciones del Norte' })
  @RequiredTrimmed('El nombre del proveedor no puede estar vacío.')
  @MaxLength(120)
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
