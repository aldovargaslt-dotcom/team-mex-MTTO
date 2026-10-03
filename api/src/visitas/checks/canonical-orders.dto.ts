import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsObject,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { CheckSource, maintenanceTypes, WorkOrderType } from '../work-order';
import { FINDING_CLASSIFICATIONS, FindingClassification } from './check-finding.rules';
import { CHECK_INVALIDATION_TYPES, CheckInvalidationType } from './check-invalidation.entity';

export class CreateCheckDto {
  @IsOptional() @IsEnum(CheckSource) source?: CheckSource;
}

export class ReviewCheckDto {
  @IsOptional() @IsInt() @Min(1) expectedVersion?: number;
}

export class CompleteCheckDto {
  @IsString() @Length(1, 128) @Matches(/\S/) idempotencyKey: string;
  @IsInt() @Min(1) reviewedVersion: number;
  @IsString() @Matches(/^[a-f0-9]{64}$/) reviewedHash: string;
  @IsString() signatureDataUrl: string;
  @IsInt() @Min(1) @Max(4096) signatureWidth: number;
  @IsInt() @Min(1) @Max(4096) signatureHeight: number;
  @IsIn(['TOUCH_CANVAS']) signatureMethod: 'TOUCH_CANVAS';
}

export class InvalidateCheckDto {
  @IsIn(CHECK_INVALIDATION_TYPES) type: CheckInvalidationType;
  @IsString() @Length(1, 1000) @Matches(/\S/) reason: string;
  @IsString() @Length(1, 160) @Matches(/\S/) sourceEventId: string;
}

export class ClassifyFindingDto {
  @IsIn(FINDING_CLASSIFICATIONS) classification: FindingClassification;
  @IsOptional() @IsString() @Length(1, 1000) @Matches(/\S/) note?: string;
  @IsOptional() @IsInt() @Min(1) expectedVersion?: number;
}

export const CHECK_EVIDENCE_TAGS = ['ODOMETER', 'FUEL', 'WITNESSES'] as const;

export class ReserveEvidenceDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(3)
  @IsIn(CHECK_EVIDENCE_TAGS, { each: true })
  tags: string[];
  @IsOptional() @IsInt() @Min(1) expectedVersion?: number;
}

export class RegisterEvidenceDto extends ReserveEvidenceDto {
  @IsUUID('4') reservationId: string;
  @IsString() dataUrl: string;
}

export class AssignCheckDto {
  @IsString() @Length(1, 128) assignedActorId: string;
  @IsOptional() @IsInt() @Min(1) expectedVersion?: number;
}

export class CheckCommandDto {
  @IsOptional() @IsInt() @Min(1) expectedVersion?: number;
}

export class CheckConditionDto {
  @IsOptional() @IsInt() @Min(1) expectedVersion?: number;
  @IsObject() payload: Record<string, unknown>;
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
