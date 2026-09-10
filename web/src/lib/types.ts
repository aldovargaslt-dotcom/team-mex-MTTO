export type Role = 'SUPERVISOR' | 'ADMIN_DIRECTIVO';

export type EstadoUnidad = 'ACTIVA' | 'INACTIVA';

export type TipoVehiculo = {
  id: string;
  nombre: string;
  descripcion: string | null;
};

export type Unidad = {
  id: string;
  numeroInterno: string;
  placas: string;
  estado: EstadoUnidad;
  tipo: TipoVehiculo;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  kilometraje: number | null;
};

export type UnidadHub = {
  fichaCorta: {
    id: string;
    numeroInterno: string;
    placas: string;
    estado: EstadoUnidad;
    tipoId: string;
    tipoNombre: string;
    marca: string | null;
    modelo: string | null;
    anio: number | null;
    kilometraje: number | null;
  };
  mantenimiento: {
    estado: 'sin_registros';
    ultimaVisita: string | null;
    mensajeHistorial: string;
    mensajeResumen: string;
  };
  puedeCrearVisita: boolean;
  mensaje: string;
};

export type ApiError = {
  statusCode: number;
  message: string;
};
