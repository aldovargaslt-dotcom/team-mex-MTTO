import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoUnidad } from '../../common/estado-unidad.enum';
import { MotivoInactivacion } from '../../common/motivo-inactivacion.enum';
import { EstadoVisita, TipoVisita } from '../../visitas/enums';
import { OrigenConsumo } from '../../kernel/events/visita-cerrada';

export class FichaCortaDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  numeroInterno: string;

  @ApiProperty()
  placas: string;

  @ApiProperty({ nullable: true, type: String })
  vin: string | null;

  @ApiProperty({ enum: EstadoUnidad })
  estado: EstadoUnidad;

  @ApiProperty({
    enum: MotivoInactivacion,
    nullable: true,
    type: String,
  })
  motivoInactivacion: MotivoInactivacion | null;

  @ApiProperty()
  tipoId: string;

  @ApiProperty()
  tipoNombre: string;

  @ApiProperty({ nullable: true, type: String })
  marcaModelo: string | null;

  @ApiProperty({ nullable: true, type: Number })
  anio: number | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    description:
      'Kilometraje de la última visita de mantenimiento cerrada. Sin visitas cerradas: null.',
  })
  ultimoKm: number | null;
}

export class VisitaHubPiezaDto {
  @ApiProperty({ format: 'uuid' })
  itemId: string;

  @ApiProperty()
  qty: number;

  @ApiProperty({ enum: OrigenConsumo })
  origen: OrigenConsumo;
}

export class VisitaHubItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: EstadoVisita })
  estado: EstadoVisita;

  @ApiProperty({ enum: TipoVisita, nullable: true, type: String })
  tipo: TipoVisita | null;

  @ApiProperty({ nullable: true, type: Number })
  km: number | null;

  @ApiProperty({ nullable: true, type: String })
  choferId: string | null;

  @ApiProperty({ nullable: true, type: String })
  choferNombre: string | null;

  @ApiProperty({ nullable: true, type: String })
  createdBy: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ nullable: true, type: Date })
  cerradoAt: Date | null;

  @ApiProperty()
  trabajosCount: number;

  @ApiProperty({
    type: [VisitaHubPiezaDto],
    description: 'Piezas de la visita (itemId opaco). Sin JOIN a inventario.',
  })
  piezas: VisitaHubPiezaDto[];
}

export class UnidadHubDto {
  @ApiProperty({ type: FichaCortaDto })
  fichaCorta: FichaCortaDto;

  @ApiProperty({
    type: [VisitaHubItemDto],
    description: 'Borradores vivos. Vacío para administrador directivo.',
  })
  borradores: VisitaHubItemDto[];

  @ApiProperty({ type: [VisitaHubItemDto] })
  historialCerrado: VisitaHubItemDto[];

  @ApiProperty({
    description:
      'Solo true cuando el rol es SUPERVISOR y la unidad está ACTIVA. Nunca true para ADMIN_DIRECTIVO.',
  })
  puedeCrearVisita: boolean;

  @ApiProperty({ type: [String] })
  mensajes: string[];
}
