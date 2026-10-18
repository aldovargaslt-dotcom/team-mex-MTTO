# ADR029 — Chequeo diario universal

Accepted2026-10-18 por instrucción explícita del usuario: desactivar Daily/Stock y
usar chequeo diario. Sustituye ADR028 solo en clasificación/programación/vigencia.

Todas las unidades usan política efectiva diaria CDMX. Stock, herencia e intervalos
anteriores dejan de gobernar operación; se conserva registro histórico sin borrar
configuración ni firmas. No se reescribe deadline firmado; la lectura operativa
requiere jornada vigente además de evidencia/deadline firmado. Un resultado apto
semanal previo no evita la revisión del día. Review/firma nueva captura política
diaria. Generador automático una vez por unidad/jornada y sin CHECK activo duplicado.

Elegibilidad ACTIVA/EN_PATIO y fuente física confiable permanece; no se interrumpe
viaje ni se crea downtime por vencer revisión. Al regresar se reevalúa. Si hay CHECK
pendiente se reutiliza. Creación PENDING no equivale a apertura de mantenimiento.
Generador se invoca en proceso con reintentos; despliegue/activación externos no
ocurren desde esta entrega. Apagado operativo explícito conserva flag existente.

[Implementación](../engineering-work-orders/EWO-060.md). No nuevas facultades,
ledger UTIL ni cambios a firma personal, reparación o seguros.
