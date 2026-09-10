import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTipoVehiculoDto {
  @ApiProperty({ example: 'Camión' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre: string;

  @ApiPropertyOptional({ example: 'Unidad de carga pesada' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;
}
