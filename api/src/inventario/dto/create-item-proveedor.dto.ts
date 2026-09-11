import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { RequiredTrimmed } from '../../common/trim';

export class CreateItemProveedorDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'El proveedor no es válido.' })
  proveedorId: string;

  @ApiProperty({ example: 'PN-FIL-100' })
  @RequiredTrimmed('El código de proveedor no puede estar vacío.')
  @MaxLength(80)
  codigoProveedor: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  preferido?: boolean;
}
