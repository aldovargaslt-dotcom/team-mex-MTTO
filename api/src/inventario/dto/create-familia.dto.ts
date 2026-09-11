import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { RequiredTrimmed } from '../../common/trim';

export class CreateFamiliaDto {
  @ApiProperty({ example: 'Filtros' })
  @RequiredTrimmed('El nombre de la familia no puede estar vacío.')
  @MaxLength(80)
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}
