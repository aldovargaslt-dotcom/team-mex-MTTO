import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaxLength } from 'class-validator';
import { OptionalTrimmed, RequiredTrimmed } from '../../common/trim';

export class CreateTipoVehiculoDto {
  @ApiProperty({ example: 'Camión' })
  @RequiredTrimmed('El nombre del tipo no puede estar vacío.')
  @MaxLength(80)
  nombre: string;

  @ApiPropertyOptional({ example: 'Unidad de carga pesada' })
  @OptionalTrimmed()
  @MaxLength(255)
  descripcion?: string;
}
