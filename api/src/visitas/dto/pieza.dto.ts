import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsUUID, Min } from 'class-validator';
import { OrigenConsumo } from '../../kernel/events/visita-cerrada';

export class PiezaDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'El ítem de la pieza no es válido.' })
  itemId: string;

  @ApiProperty({ example: 1 })
  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @Min(1, { message: 'La cantidad debe ser al menos 1.' })
  qty: number;

  @ApiProperty({ enum: OrigenConsumo })
  @IsEnum(OrigenConsumo, {
    message: 'El origen debe ser DESDE_STOCK o COMPRA_EXTERNA.',
  })
  origen: OrigenConsumo;
}
