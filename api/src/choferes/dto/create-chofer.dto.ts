import { ApiProperty } from '@nestjs/swagger';
import { MaxLength } from 'class-validator';
import { RequiredTrimmed } from '../../common/trim';

export class CreateChoferDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @RequiredTrimmed('El nombre del chofer no puede estar vacío.')
  @MaxLength(120)
  nombre: string;
}
