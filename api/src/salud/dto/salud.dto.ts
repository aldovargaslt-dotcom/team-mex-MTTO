import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HealthDimensionId, KNOWN_DIMENSION_IDS } from '../enums';

export class DimensionWeightDto {
  @ApiProperty({ enum: HealthDimensionId })
  @IsIn(KNOWN_DIMENSION_IDS)
  id: HealthDimensionId;

  @ApiProperty({ example: 45 })
  @IsInt()
  @Min(0)
  @Max(100)
  weight: number;
}

export class UpdateHealthConfigDto {
  @ApiProperty({ type: [DimensionWeightDto] })
  @IsArray()
  @ArrayMinSize(3)
  @ValidateNested({ each: true })
  @Type(() => DimensionWeightDto)
  dimensions: DimensionWeightDto[];

  @ApiProperty()
  @IsBoolean()
  alertEnabled: boolean;

  @ApiProperty({ example: 60 })
  @IsInt()
  @Min(0)
  @Max(100)
  alertThreshold: number;

  @ApiProperty({ example: 65 })
  @IsInt()
  @Min(0)
  @Max(100)
  recoveryThreshold: number;

  @ApiProperty({ enum: ['LOW', 'INFO', 'WARNING', 'CRITICAL'] })
  @IsString()
  @IsIn(['LOW', 'INFO', 'WARNING', 'CRITICAL'])
  alertSeverity: 'LOW' | 'INFO' | 'WARNING' | 'CRITICAL';
}

export class HealthConfigDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  version: number;

  @ApiProperty({ type: [DimensionWeightDto] })
  dimensions: DimensionWeightDto[];

  @ApiProperty()
  alertEnabled: boolean;

  @ApiProperty()
  alertThreshold: number;

  @ApiProperty()
  recoveryThreshold: number;

  @ApiProperty()
  alertSeverity: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  createdBy: string | null;
}
