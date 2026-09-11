import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { OptionalTrimmed } from '../../common/trim';

export class UpdateProveedorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @OptionalTrimmed()
  @MaxLength(120)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
