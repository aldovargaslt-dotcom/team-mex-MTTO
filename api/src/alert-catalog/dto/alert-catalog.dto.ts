import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  AlertFamily,
  AlertOwningModule,
  ThresholdMode,
} from '../alert-catalog.types';

export class CreateAlertTypeDto {
  @ApiProperty({ example: 'MTTO_EXTRA' })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  code: string;

  @ApiProperty({ example: 'Revisión especial' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label: string;

  @ApiProperty({ enum: AlertFamily })
  @IsIn(Object.values(AlertFamily))
  family: AlertFamily;

  @ApiProperty({ enum: AlertOwningModule })
  @IsIn(Object.values(AlertOwningModule))
  owningModule: AlertOwningModule;

  @ApiProperty({ enum: ThresholdMode })
  @IsIn(Object.values(ThresholdMode))
  thresholdMode: ThresholdMode;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class PatchAlertTypeDto {
  @ApiProperty()
  @IsBoolean()
  active: boolean;
}

export class AndonUmbralInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  tipoVehiculoId: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Kilómetros debe ser al menos 1.' })
  tKm: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Días sin visita debe ser al menos 1.' })
  tDias: number;
}

export class StockMinInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  itemId: string;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, value) => value != null)
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Avisar si quedan no puede ser negativo.' })
  minQty: number | null;
}

export class PatchCatalogUmbralesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'El aviso local debe ser al menos 1 hora.' })
  localH?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'El aviso foráneo debe ser al menos 1 hora.' })
  foraneoH?: number;

  @ApiPropertyOptional({ type: [AndonUmbralInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AndonUmbralInputDto)
  umbrales?: AndonUmbralInputDto[];

  @ApiPropertyOptional({ type: [StockMinInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockMinInputDto)
  items?: StockMinInputDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  alertEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  alertThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  recoveryThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['LOW', 'INFO', 'WARNING', 'CRITICAL'])
  alertSeverity?: 'LOW' | 'INFO' | 'WARNING' | 'CRITICAL';
}
