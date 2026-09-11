import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { OptionalTrimmed } from '../../common/trim';

export class EntradaDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'El ítem no es válido.' })
  itemId: string;

  @ApiProperty({ example: 10 })
  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @Min(1, { message: 'La cantidad de entrada debe ser al menos 1.' })
  qty: number;

  @ApiPropertyOptional()
  @IsOptional()
  @OptionalTrimmed()
  nota?: string;
}
