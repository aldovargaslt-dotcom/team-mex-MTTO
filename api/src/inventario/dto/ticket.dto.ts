import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { Trim } from '../../common/trim';

export class TicketDto {
  @ApiProperty({
    example: 'data:image/jpeg;base64,/9j/...',
    description: 'Foto del ticket / comprobante en data URL.',
  })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'El ticket no puede estar vacío.' })
  @Matches(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, {
    message: 'El ticket debe ser una imagen en formato data URL.',
  })
  @MaxLength(2_000_000, {
    message: 'El ticket supera el tamaño máximo permitido.',
  })
  dataUrl: string;
}
