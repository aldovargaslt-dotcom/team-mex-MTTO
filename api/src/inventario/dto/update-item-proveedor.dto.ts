import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { OptionalTrimmed } from '../../common/trim';

export class UpdateItemProveedorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @OptionalTrimmed()
  @MaxLength(80)
  codigoProveedor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  preferido?: boolean;
}
