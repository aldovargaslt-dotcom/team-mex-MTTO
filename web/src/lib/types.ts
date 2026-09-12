export type Role = 'SUPERVISOR' | 'ADMIN_DIRECTIVO' | 'LOGISTICA';

export type EstadoUnidad = 'ACTIVA' | 'INACTIVA';

export type MotivoInactivacion = 'ENVIO_ESPECIAL';

export type EstadoChofer = 'ACTIVO' | 'INACTIVO';

export type EstadoVisita = 'BORRADOR' | 'CERRADO';

export type TipoVisita = 'PREDICTIVO' | 'CORRECTIVO';

export type CategoriaTrabajo = 'A' | 'B' | 'C' | 'D' | 'E';

export type TipoFirma = 'CHOFER' | 'JEFE';

export type OrigenPieza = 'DESDE_STOCK' | 'COMPRA_EXTERNA';

export type TipoMovimiento = 'ENTRADA' | 'SALIDA_OT' | 'AJUSTE';

export type EstadoPendiente = 'PENDIENTE' | 'RECIBIDA';

export type AlertaStock = 'OK' | 'BAJO' | 'AGOTADO';

export type EstadoAviso = 'ABIERTO' | 'ENTERADO' | 'RESUELTO';

export type TipoVehiculo = {
  id: string;
  nombre: string;
  descripcion: string | null;
};

export type Chofer = {
  id: string;
  nombre: string;
  estado: EstadoChofer;
};

export type Unidad = {
  id: string;
  numeroInterno: string;
  placas: string;
  vin: string | null;
  estado: EstadoUnidad;
  motivoInactivacion?: MotivoInactivacion | null;
  tipo: TipoVehiculo;
  marcaModelo: string | null;
  anio: number | null;
};

export type VisitaResumen = {
  id: string;
  estado: EstadoVisita;
  tipo: TipoVisita | null;
  km: number | null;
  choferId: string | null;
  choferNombre: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  cerradoAt: string | null;
  trabajosCount: number;
};

export type VisitaDetalle = {
  id: string;
  unidadId: string;
  unidadNumeroInterno: string;
  estado: EstadoVisita;
  chofer: Chofer | null;
  km: number | null;
  tipo: TipoVisita | null;
  observaciones: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  cerradoAt: string | null;
  tipoVehiculoId: string | null;
  tipoVehiculoNombre: string | null;
  trabajos: { id: string; categoria: CategoriaTrabajo; item: string }[];
  fotos: { id: string; dataUrl: string; createdAt: string }[];
  firmas: { id: string; tipo: TipoFirma; dataUrl: string; createdAt: string }[];
  piezas: VisitaPieza[];
};

export type VisitaPieza = {
  id: string;
  itemId: string;
  qty: number;
  origen: OrigenPieza;
};

export type Familia = {
  id: string;
  nombre: string;
  activa: boolean;
};

export type Proveedor = {
  id: string;
  nombre: string;
  activo: boolean;
};

export type ItemInventario = {
  id: string;
  sku: string;
  nombre: string;
  familiaId: string | null;
  familiaNombre: string | null;
  oem: string | null;
  uom: string;
  activo: boolean;
  stock: number;
  minQty: number | null;
  alerta: AlertaStock | null;
  tipoVehiculoIds: string[];
  proveedores: {
    id: string;
    proveedorId: string;
    proveedorNombre: string;
    codigoProveedor: string;
    preferido: boolean;
  }[];
};

export type SkuCompatible = {
  id: string;
  sku: string;
  nombre: string;
  familia: string | null;
  oem: string | null;
  uom: string;
  stock: number;
};

export type StockRow = {
  itemId: string;
  sku: string;
  nombre: string;
  familia: string | null;
  activo: boolean;
  uom: string;
  qty: number;
  minQty: number | null;
  alerta: AlertaStock | null;
  updatedAt: string;
};

export type Movimiento = {
  id: string;
  tipo: TipoMovimiento;
  itemId: string;
  sku: string;
  nombre: string;
  qty: number;
  delta: number;
  visitaId: string | null;
  nota: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type PendienteComprobante = {
  id: string;
  visitaId: string;
  itemId: string;
  sku: string;
  nombre: string;
  qty: number;
  estado: EstadoPendiente;
  ticketDataUrl: string | null;
  createdAt: string;
};

export type CatalogoCategoria = {
  categoria: CategoriaTrabajo;
  nombre: string;
  items: string[];
};

export type UnidadHub = {
  fichaCorta: {
    id: string;
    numeroInterno: string;
    placas: string;
    vin: string | null;
    estado: EstadoUnidad;
    motivoInactivacion?: MotivoInactivacion | null;
    tipoId: string;
    tipoNombre: string;
    marcaModelo: string | null;
    anio: number | null;
    ultimoKm: number | null;
  };
  borradores: VisitaResumen[];
  historialCerrado: VisitaResumen[];
  puedeCrearVisita: boolean;
  mensajes: string[];
};

export type AvisoAndon = {
  id: string;
  unidadId: string;
  numeroInterno: string | null;
  placas: string | null;
  tipoNombre: string | null;
  tipoVehiculoId: string;
  estado: EstadoAviso;
  abiertaAt: string;
  enteradoAt: string | null;
  visitaResolutoriaId: string | null;
  kmAlAbrir: number;
  diasAlAbrir: number;
  umbralKm: number;
  umbralDias: number;
  lastClosedKm: number | null;
  lastClosedAt: string | null;
};

export type UmbralAndon = {
  tipoVehiculoId: string;
  tipoNombre: string;
  tKm: number;
  tDias: number;
};

export type InboxItem = {
  id: string;
  sourceModule: SourceModule;
  sourceEvent: string;
  sourceRef: string;
  subjectType: SubjectType;
  subjectRef: string | null;
  severity: Severity;
  title: string;
  body: string;
  dedupeKey: string;
  createdAt: string;
  expiresAt: string | null;
  readAt: string | null;
  deeplinkPath: string;
};

export type SourceModule = 'ANDON' | 'INVENTARIO';

export type SubjectType = 'UNIDAD' | 'ITEM' | 'NONE';

export type Severity = 'LOW' | 'INFO' | 'WARNING' | 'CRITICAL';

export type TipoMovimientoFlota = 'SALIDA' | 'ENTRADA';

export type TipoFirmaFlota = 'CHOFER' | 'AVAL';

export type EstadoSitio = 'ACTIVO' | 'INACTIVO';

export type SitioFlota = {
  id: string;
  nombre: string;
  estado: EstadoSitio;
};

export type TableroFlotaRow = {
  unidadId: string;
  numeroInterno: string;
  placas: string;
  tipoNombre: string;
  estado: EstadoUnidad;
  motivoInactivacion: MotivoInactivacion | null;
  sitioId: string | null;
  sitioNombre: string | null;
  choferActualId: string | null;
  choferActualNombre: string | null;
  choferUltimoId: string | null;
  choferUltimoNombre: string | null;
  salidaAbiertaId: string | null;
  salidaAbiertaAt: string | null;
  tiempoFueraMs: number | null;
  kmSalida: number | null;
  andonAbierto: boolean;
};

export type MovimientoFlota = {
  id: string;
  tipo: TipoMovimientoFlota;
  unidadId: string;
  choferId: string;
  sitioId: string;
  occurredAt: string;
  km: number;
  notas: string | null;
  createdBy: string | null;
  avalRol: Role;
  firmas: { tipo: TipoFirmaFlota; dataUrl: string }[];
  choferNombre?: string | null;
  sitioNombre?: string | null;
};

export type FlotaUnidadDetalle = {
  unidad: {
    id: string;
    numeroInterno: string;
    placas: string;
    estado: EstadoUnidad;
    motivoInactivacion: MotivoInactivacion | null;
    tipoNombre: string;
    ultimoKmVisita: number | null;
  };
  tablero: TableroFlotaRow | null;
  historial: MovimientoFlota[];
};

export type ApiError = {
  statusCode: number;
  message: string;
};
