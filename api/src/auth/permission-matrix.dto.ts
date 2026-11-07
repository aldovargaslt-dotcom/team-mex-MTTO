import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  permissions: string[];
  @IsInt() @Min(1) expectedVersion: number;
  @IsString() @MaxLength(600) motivo: string;
}
