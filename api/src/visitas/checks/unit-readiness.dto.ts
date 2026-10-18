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
  ValidateIf,
  ValidateNested,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import {
  CheckInterval,
  SettingsScope,
  UnitUsage,
} from './readiness-settings.entity';

class CheckIntervalDto implements CheckInterval {
  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM']) mode: CheckInterval['mode'];
  @ValidateIf(
    (v: CheckIntervalDto) => v.mode === 'CUSTOM' || v.hours !== undefined,
  )
  @IsInt()
  @Min(1)
  @Max(8760)
  hours?: number;
}
export class UpdateReadinessSettingsDto {
  @IsString() @MaxLength(128) facilityId: string;
  @IsIn(['FLEET', 'CATEGORY', 'UNIT']) scope: SettingsScope;
  @IsString() @MaxLength(128) targetId: string;
  @IsInt() @Min(0) expectedVersion: number;
  @IsOptional()
  @ValidateNested()
  @Type(() => CheckIntervalDto)
  interval?: CheckIntervalDto | null;
  @IsOptional() @IsIn(['DAILY', 'STOCK']) usage?: UnitUsage | null;
}
export class UnitReadinessQuery {
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional() @IsString() @MaxLength(128) tipo?: string;
  @IsOptional() @IsIn(['ACTIVA', 'INACTIVA']) estado?: string;
  @IsOptional() @IsIn(['DAILY', 'STOCK', 'ALL', 'UNCLASSIFIED']) usage?: string;
  @IsOptional()
  @IsIn(['CRITICAL', 'ATTENTION', 'CLEAR', 'UNKNOWN'])
  attention?: string;
  @IsOptional()
  @IsIn(['VALID', 'EXPIRED', 'MISSING', 'UNKNOWN'])
  checkState?: string;
  @IsOptional() @IsIn(['1', '0']) orders?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset = 0;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 30;
}
export class CreateReadinessHoldDto {
  @IsUUID() orderId: string;
  @IsString() @MaxLength(2000) reason: string;
  @IsUUID() idempotencyKey: string;
}
export class AssignMaintenanceDto {
  @IsString() @MaxLength(128) assignedActorId: string;
  @IsInt() @Min(1) expectedVersion: number;
}
export class VerifyReadinessHoldsDto {
  @IsUUID() orderId: string;
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  holdIds: string[];
  @IsString() @MaxLength(4000) observation: string;
  @IsString() @MaxLength(1400000) signatureDataUrl: string;
  @IsUUID() idempotencyKey: string;
}
