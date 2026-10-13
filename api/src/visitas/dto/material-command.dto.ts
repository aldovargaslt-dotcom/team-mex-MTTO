import { IsInt, IsObject, IsUUID, Min } from 'class-validator';
import { MaterialCommand } from '../../inventario/materials-model';

export class MaterialCommandDto {
  @IsUUID('4') key: string;
  @IsInt() @Min(0) revision: number;
  @IsObject() command: MaterialCommand;
}
