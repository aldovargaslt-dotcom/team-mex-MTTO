import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddCompatibilidadDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'El tipo de vehículo no es válido.' })
  tipoVehiculoId: string;
}
