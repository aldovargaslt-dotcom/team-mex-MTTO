import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/trim';
import { CategoriaTrabajo } from '../enums';

export class TrabajoDto {
  @ApiProperty({ enum: CategoriaTrabajo })
  @IsEnum(CategoriaTrabajo, {
    message: 'La categoría de trabajo debe ser A, B, C, D o E.',
  })
  categoria: CategoriaTrabajo;

  @ApiProperty({ example: 'Kit de tiempo' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'El trabajo no puede estar vacío.' })
  @MaxLength(120)
  item: string;
}
