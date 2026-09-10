import { PartialType } from '@nestjs/swagger';
import { CreateTipoVehiculoDto } from './create-tipo-vehiculo.dto';

export class UpdateTipoVehiculoDto extends PartialType(CreateTipoVehiculoDto) {}
