import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';

export class CreateInsuranceVersionDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) expirationDate: string;
  @IsOptional() @IsInt() @Min(1) expectedVersion?: number;
  @IsOptional() @IsString() @Length(1, 160) issuer?: string;
  @IsOptional() @IsString() @Length(1, 160) reference?: string;
}
