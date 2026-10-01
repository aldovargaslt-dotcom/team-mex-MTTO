import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsUUID, Min } from 'class-validator';
import { TipoVisita } from '../enums';

export class CreateVisitaDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'El chofer seleccionado no es válido.' })
  choferId: string;

  @ApiProperty({ example: 125000 })
  @IsInt({ message: 'El kilometraje debe ser un número entero.' })
  @Min(0, { message: 'El kilometraje debe ser mayor o igual a 0.' })
  km: number;

  @ApiProperty({ enum: TipoVisita })
  @IsEnum(TipoVisita, {
    message: 'El tipo de visita debe ser PREDICTIVO o CORRECTIVO.',
  })
  tipo: TipoVisita;
}
