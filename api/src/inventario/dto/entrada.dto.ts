import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { OptionalTrimmed } from '../../common/trim';

export class EntradaDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'El ítem no es válido.' })
  itemId: string;

  @ApiProperty({ example: 10 })
  @IsNumber({ maxDecimalPlaces: 6 }, { message: 'La cantidad admite hasta seis decimales.' })
  @Min(0.000001, { message: 'La cantidad de entrada debe ser positiva.' })
  qty: number;

  @ApiPropertyOptional()
  @IsOptional()
  @OptionalTrimmed()
  nota?: string;
}
