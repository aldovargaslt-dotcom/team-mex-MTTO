import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { CheckSource, maintenanceTypes, WorkOrderType } from '../work-order';

export class CreateCheckDto {
  @IsOptional() @IsEnum(CheckSource) source?: CheckSource;
}
export class CreateMaintenanceDto {
  @IsIn(maintenanceTypes) type: WorkOrderType;
  @IsUUID('4') choferId: string;
  @IsInt() @Min(0) km: number;
  @Transform(({ obj, key }) => (obj as Record<string, unknown>)[key])
  @IsBoolean()
  blocksOperation: boolean;
  @ValidateIf((o) => o.blocksOperation === true || o.blockReason !== undefined)
  @IsString()
  @Length(1, 1000)
  @Matches(/\S/)
  blockReason?: string;
  @IsOptional()
  @Transform(({ obj, key }) => (obj as Record<string, unknown>)[key])
  @IsBoolean()
  requiresReinspection?: boolean;
  @IsOptional()
  @IsString()
  @Length(1, 128)
  @Matches(/\S/)
  idempotencyKey?: string;
}
export class OrdersQuery {
  @IsOptional() @IsUUID('4') unidadId?: string;
  @IsOptional() @IsUUID('4') cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
export class ChecksQuery extends OrdersQuery {
  @IsOptional() @IsIn(['mine-or-eligible']) scope?: string;
}
