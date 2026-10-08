import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Rol } from './roles.enum';
import { Transform } from 'class-transformer';

export class AccessFieldsDto {
  @IsString() @MinLength(1) @MaxLength(120) displayName: string;
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(4)
  @IsEnum(Rol, { each: true })
  roles: Rol[];
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(200, { each: true })
  facilityScopes: string[];
  @Transform(({ obj, key }) => obj[key])
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
export class CreateAccessDto extends AccessFieldsDto {
  @IsString() @MinLength(1) @MaxLength(255) subject: string;
}
export class UpdateAccessDto extends AccessFieldsDto {
  @IsInt() @Min(1) version: number;
}
