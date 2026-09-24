import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FotoUnidadDto {
  @ApiPropertyOptional({
    nullable: true,
    description: 'Foto de la unidad. Vacío o null la quita.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1_500_000, {
    message: 'La foto de la unidad es demasiado grande.',
  })
  fotoDataUrl?: string | null;
}
