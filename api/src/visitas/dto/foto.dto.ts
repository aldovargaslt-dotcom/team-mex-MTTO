import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { Trim } from '../../common/trim';

export class FotoDto {
  @ApiProperty({
    example: 'data:image/png;base64,iVBOR...',
    description: 'Imagen en data URL.',
  })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'La foto no puede estar vacía.' })
  @Matches(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, {
    message: 'La foto debe ser una imagen en formato data URL.',
  })
  @MaxLength(2_000_000, {
    message: 'La foto supera el tamaño máximo permitido.',
  })
  dataUrl: string;
}
