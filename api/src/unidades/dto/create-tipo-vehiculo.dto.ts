import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, MaxLength } from 'class-validator';
import { OptionalTrimmed, RequiredTrimmed } from '../../common/trim';
import { IconoTipoVehiculo } from '../icono-tipo-vehiculo.enum';

export class CreateTipoVehiculoDto {
  @ApiProperty({ example: 'Camión' })
  @RequiredTrimmed('El nombre del tipo no puede estar vacío.')
  @MaxLength(80)
  nombre: string;

  @ApiPropertyOptional({ example: 'Unidad de carga pesada' })
  @OptionalTrimmed()
  @MaxLength(255)
  descripcion?: string;

  @ApiPropertyOptional({ enum: IconoTipoVehiculo, example: IconoTipoVehiculo.TRUCK })
  @IsOptional()
  @IsEnum(IconoTipoVehiculo, { message: 'El icono del tipo no es válido.' })
  icono?: IconoTipoVehiculo;
}
