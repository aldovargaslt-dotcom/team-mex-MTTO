import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class ControlTowerQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional()
  @IsIn(['EN_PATIO', 'EN_RUTA', 'EN_TALLER', 'INACTIVA', 'UNAVAILABLE'])
  physicalState?: string;
  @IsOptional()
  @IsIn(['LISTA', 'PENDIENTE', 'BLOQUEADA', 'DESPACHADA'])
  readiness?: string;
  @IsOptional()
  @IsIn(['APTA', 'APTA_CON_OBSERVACION', 'NO_APTA', 'EN_PROGRESO', 'REQUERIDO'])
  checkState?: string;
  @IsOptional() @IsIn(['CRITICAL', 'ATTENTION', 'NORMAL']) urgency?: string;
  @IsOptional() @IsUUID() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
}
