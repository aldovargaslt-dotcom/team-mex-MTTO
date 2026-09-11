import { PartialType } from '@nestjs/swagger';
import { CreateChoferDto } from './create-chofer.dto';

export class UpdateChoferDto extends PartialType(CreateChoferDto) {}
