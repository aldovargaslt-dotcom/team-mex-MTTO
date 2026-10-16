import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CostInput } from '../cost-rules';
export class MoneyDto implements CostInput {
  @IsIn(['PENDING', 'RECORDED']) state: 'PENDING' | 'RECORDED';
  @IsOptional() @IsString() @MaxLength(16) inputTotalCents?: string;
  @IsOptional() @IsIn(['INCLUDED', 'EXCLUDED']) taxMode?:
    'INCLUDED' | 'EXCLUDED';
  @IsOptional() @IsIn(['TAXED', 'NO_TAX']) taxTreatment?: 'TAXED' | 'NO_TAX';
  @IsOptional() @IsInt() @Min(0) @Max(10000) rateBps?: number;
  @IsOptional() @IsIn(['MXN']) currency?: 'MXN';
}
export class ReceiptDto {
  @IsUUID() itemId: string;
  @IsInt() @Min(1) @Max(1000000000) qty: number;
  @IsUUID() supplierId: string;
  @ValidateNested() @Type(() => MoneyDto) cost: MoneyDto;
  @IsOptional() @IsString() @MaxLength(200) documentReference?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}
export class RevisionDto {
  @IsInt() @Min(1) expectedVersion: number;
  @ValidateNested() @Type(() => MoneyDto) cost: MoneyDto;
  @IsString() @MaxLength(1000) reason: string;
  @IsOptional() @IsUUID() supplierId?: string;
}
export class OpeningDto {
  @IsInt() @Min(0) @Max(1000000000) qty: number;
  @IsString() @MaxLength(16) valueCents: string;
  @IsInt() @Min(0) expectedVersion: number;
  @IsString() @MaxLength(1000) reason: string;
}
export class ReturnDto {
  @IsInt() @Min(1) @Max(1000000000) qty: number;
  @IsString() @MaxLength(1000) reason: string;
}
