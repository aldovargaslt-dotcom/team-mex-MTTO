import { ApiProperty } from '@nestjs/swagger';
import { EstadoUnidad } from '../../common/estado-unidad.enum';

export class FichaCortaDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  numeroInterno: string;

  @ApiProperty()
  placas: string;

  @ApiProperty({ enum: EstadoUnidad })
  estado: EstadoUnidad;

  @ApiProperty()
  tipoId: string;

  @ApiProperty()
  tipoNombre: string;

  @ApiProperty({ nullable: true })
  marca: string | null;

  @ApiProperty({ nullable: true })
  modelo: string | null;

  @ApiProperty({ nullable: true })
  anio: number | null;

  @ApiProperty({ nullable: true })
  kilometraje: number | null;
}

export class MantenimientoStubDto {
  @ApiProperty({ example: 'sin_registros' })
  estado: 'sin_registros';

  @ApiProperty({ nullable: true, type: String, example: null })
  ultimaVisita: string | null;

  @ApiProperty({
    example: 'Aún no hay visitas de mantenimiento registradas.',
  })
  mensajeHistorial: string;

  @ApiProperty({
    example: 'El historial de mantenimiento estará disponible en una siguiente entrega.',
  })
  mensajeResumen: string;
}

export class UnidadHubDto {
  @ApiProperty({ type: FichaCortaDto })
  fichaCorta: FichaCortaDto;

  @ApiProperty({ type: MantenimientoStubDto })
  mantenimiento: MantenimientoStubDto;

  @ApiProperty({
    description:
      'Solo true cuando el rol es SUPERVISOR y la unidad está ACTIVA. Nunca true para ADMIN_DIRECTIVO.',
  })
  puedeCrearVisita: boolean;

  @ApiProperty()
  mensaje: string;
}
