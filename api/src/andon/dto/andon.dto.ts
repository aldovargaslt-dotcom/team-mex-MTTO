import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { EstadoAviso } from '../enums';

export class CriticalMarginsDto {
  @ApiPropertyOptional({ default: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  criticalOverdueKm?: number;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  criticalOverdueDays?: number;
}

export class UpdateUmbralDto extends CriticalMarginsDto {
  @ApiProperty({ example: 10000 })
  @IsInt({ message: 't_km debe ser un entero.' })
  @Min(1, { message: 't_km debe ser al menos 1.' })
  tKm: number;

  @ApiProperty({ example: 90 })
  @IsInt({ message: 't_dias debe ser un entero.' })
  @Min(1, { message: 't_dias debe ser al menos 1.' })
  tDias: number;
}

export class UmbralDto extends CriticalMarginsDto {
  @ApiProperty()
  tipoVehiculoId: string;

  @ApiProperty()
  tipoNombre: string;

  @ApiProperty()
  tKm: number;

  @ApiProperty()
  tDias: number;
}

export class AvisoDto {
  @ApiProperty({ enum: ['WARNING', 'CRITICAL'] })
  severity: 'WARNING' | 'CRITICAL';

  @ApiProperty()
  diasDesde: number;

  @ApiProperty()
  kmDesde: number;

  @ApiProperty()
  atrasoDias: number;

  @ApiProperty()
  atrasoKm: number;

  @ApiPropertyOptional({ nullable: true })
  marcaModelo: string | null;

  @ApiPropertyOptional({ nullable: true })
  fotoDataUrl: string | null;

  @ApiProperty()
  id: string;

  @ApiProperty()
  unidadId: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  numeroInterno: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  placas: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  tipoNombre: string | null;

  @ApiProperty()
  tipoVehiculoId: string;

  @ApiProperty({ enum: EstadoAviso })
  estado: EstadoAviso;

  @ApiProperty()
  abiertaAt: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  enteradoAt: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  enteradoBy: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  resueltoAt: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  visitaResolutoriaId: string | null;

  @ApiProperty()
  kmAlAbrir: number;

  @ApiProperty()
  diasAlAbrir: number;

  @ApiProperty()
  umbralKm: number;

  @ApiProperty()
  umbralDias: number;

  @ApiPropertyOptional({ type: Number, nullable: true })
  lastClosedKm: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  lastClosedAt: string | null;
}
