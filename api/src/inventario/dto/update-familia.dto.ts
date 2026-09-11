import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { OptionalTrimmed } from '../../common/trim';

export class UpdateFamiliaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @OptionalTrimmed()
  @MaxLength(80)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}
