import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsUUID, Min } from 'class-validator';
import { OrigenConsumo } from '../../kernel/events/visita-cerrada';

export class PiezaDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'El ítem de la pieza no es válido.' })
  itemId: string;

  @ApiProperty({ example: 1 })
  @IsNumber({ maxDecimalPlaces: 6 }, { message: 'La cantidad admite hasta seis decimales.' })
  @Min(0.000001, { message: 'La cantidad debe ser positiva.' })
  qty: number;

  @ApiProperty({ enum: OrigenConsumo })
  @IsEnum(OrigenConsumo, {
    message: 'El origen debe ser DESDE_STOCK o COMPRA_EXTERNA.',
  })
  origen: OrigenConsumo;
}
