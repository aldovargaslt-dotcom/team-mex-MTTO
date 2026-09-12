import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, NotEquals } from 'class-validator';
import { RequiredTrimmed } from '../../common/trim';

export class AjusteDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'El ítem no es válido.' })
  itemId: string;

  @ApiProperty({ example: -2, description: 'Delta con signo; no puede ser 0.' })
  @IsInt({ message: 'El ajuste debe ser un número entero.' })
  @NotEquals(0, { message: 'El ajuste no puede ser 0.' })
  qtyDelta: number;

  @ApiProperty({ example: 'Conteo físico' })
  @RequiredTrimmed('La nota es obligatoria')
  nota: string;
}
