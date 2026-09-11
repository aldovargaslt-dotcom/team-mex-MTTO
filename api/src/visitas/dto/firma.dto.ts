import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { Trim } from '../../common/trim';
import { TipoFirma } from '../enums';

export class FirmaDto {
  @ApiProperty({ enum: TipoFirma })
  @IsEnum(TipoFirma, {
    message: 'La firma debe ser de chofer o de jefe.',
  })
  tipo: TipoFirma;

  @ApiProperty({ example: 'data:image/png;base64,iVBOR...' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'La firma no puede estar vacía.' })
  @Matches(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, {
    message: 'La firma debe ser una imagen en formato data URL.',
  })
  @MaxLength(2_000_000, {
    message: 'La firma supera el tamaño máximo permitido.',
  })
  dataUrl: string;
}
