# Bandeja mecánico V1 — validación de pendientes

Estado: verificación técnica local completada con límites; el alcance de producto
aclarado por el usuario se registra abajo. Las propuestas técnicas restantes **no son
decisiones aprobadas**. Autorización de esta sesión: «¿Cómo validamos los
pendientes? ¿puedes hacerlo?». Se conservan todos los cambios sin commit.

Fuentes: [plan](plan-bandeja-mecanico-v1.md),
[contrato](../contracts/CHK-001-contract.md),
[UX](ux-check-operativo-v1.md), ADR-016/018/003,
[evidencia](../evidence/EWO-023.md).

## Cómo cerrar cada pendiente

| Pendiente | Validación técnica | Decisión requerida / propuesta a revisar |
|---|---|---|
| Navegación | Verificar páginas y permisos reales; recorrer cada destino aprobado | Propuesta V1: usar destinos funcionales actuales y omitir Escanear/Mantenimiento/Perfil hasta definir pantallas. No reservar nombres de rutas ficticias |
| Consulta mantenimiento | Probar 401 sin identidad, 403 por rol/scope; mismo scope en items y counts | El usuario confirma acceso del Mecánico a work orders y flotilla en su dominio. Falta precisar unidades/patios/asignaciones visibles y acciones por endpoint; la consulta denegada ya no representa el alcance solicitado |
| Campos de tarjetas | Cotejar entity/DTO/read model; validar null sin defaults ficticios | Hoy hay unidad/folio/tipo/estado/assignedActor ID/startedAt. No hay fecha programada/vencimiento/prioridad persistidas de la orden. Omitirlas hasta acordar fuente |
| Terminales | COMPLETED/CANCELLED excluidos de cola activa; lectura firmada permanece autorizada | Propuesta: terminales en lectura/historial, sin CTA de ejecución. Falta decidir ubicación del historial y acción de CANCELLED |
| Prioridad y cursor | Actualmente id DESC y cursor UUID; no equivalen a urgencia | Propuesta para revisar: órdenes propias IN_PROGRESS primero, ASSIGNED propias después, PENDING elegibles al final; createdAt y id como desempate. No aplicar hasta aprobar prioridad y contrato de cursor |
| Retorno | `/mi-trabajo`, `/logistica` y `/flota` existen; CHECK enlaza solo a Mi trabajo | Propuesta: conservar origen interno autorizado cuando exista; fallback MECANICO→Mi trabajo, LOGISTICA→Logística. Falta acordar Admin y origen/callback |
| Condición antes de claim | Endpoint actual autoriza MECANICO mediante detail; Config exige asignación | Elegir si se permite lectura técnica elegible antes de claim. No confundir lectura con permiso de captura/firma |
| Guía visual | ADR003 define CTA naranja; VISUAL_DIRECTION dice azul para nuevas pantallas y conserva shell aceptado | Propuesta: conservar ADR003/primitivas actuales en este incremento; aprobar aparte nuevo patrón desktop y shell mecánico |
| Correctiva posterior | CORRECTIVE PENDING derivada al cierre; referencia CHECK/hallazgo. No endpoints de programación/ciclo completo | Indicar rol que programa/asigna, ejecuta y cierra/cancela. Definir transición con estados existentes y efecto en historial/Torre, antes de escribir CTAs |

## Gates técnicos

1. API con PostgreSQL y storage privado descartables: claim/start/condición,
   evidencia, clasificación REQUIRES_WORK, review, firma, respuesta repetida,
   una sola correctiva, snapshot reabierto, archivos privados y rechazo de edición.
2. Expiración/invalidación: validez cambia; contenido/hash firmados no cambian.
3. Regresión E2E y migraciones en bases explícitamente de prueba.
4. Build real con Roboto y preview sin fallback; capturas loading/expired/
   invalidated/denied además del incremento anterior y revisión independiente.
5. Staging requiere entorno, identidad, storage y configuración reales. La
   evidencia local y las imágenes sintéticas no lo sustituyen.

## Alcance aclarado por el usuario

El usuario establece que el rol Mecánico debe tener acceso a work orders,
flotilla en el dominio del mecánico y lo relacionado con las work orders:

- Asignar correctivos a cada unidad.
- Agendar mantenimiento preventivo para las unidades dentro de su dominio.
- Adjuntar tickets para órdenes de compra de inventario o mantenimiento preventivo.
- Llenar la sección del mecánico en los formularios del contrato de liberación de unidades.

Esto confirma la dirección de producto; no significa que esos permisos o
formularios estén implementados. Asignar un correctivo a una unidad no define
por sí solo quién asigna personal, programa, cierra o cancela la orden. Falta
precisar el alcance por unidad/patio, el ciclo de la correctiva, el destino y
contrato de los adjuntos, y el formulario real de liberación con sus campos y
reglas. Para agendar preventivos falta definir los datos de programación,
las reglas de disponibilidad y los permisos de reprogramación/cancelación;
no se inventan rutas ni estados. No se deducen permisos de Logística ni aprobación de compras.

El módulo formal de órdenes de compra está fuera de V0 según
`context/PRODUCT.md`; esta necesidad debe reflejarse en su especificación de
alcance antes de implementar ese módulo. Los adjuntos y la sección del contrato
de liberación requieren un incremento definido, separado del flujo ABC del CHECK.

El usuario propone probar la integración cuando exista staging en Vercel.
La comprobación deberá cubrir login e identidad estable, permisos reales del
Mecánico, aislamiento entre unidades/patios, programación de preventivos,
persistencia de las órdenes y
adjuntos privados. Requiere conectar el frontend con API, base de datos,
almacenamiento privado y autenticación de staging; publicar el frontend por sí
solo no resuelve esas dependencias. No se ha realizado un despliegue.

## Identidad: hallazgo original y estado actual

`web/src/lib/api.ts` envía X-Role/X-User-Id, sin sesión/token integrado.
`CanonicalOrdersController` usa TrustedAuthentication; estos headers no son
credenciales. Sin un adapter/session confiable el flujo real se rechaza con 401,
aunque el preview con fixtures funcione. Las previews privadas también usan
headers legacy. No relajar AuthGuard ni transformar headers en identidad.
Hace falta integrar la identidad autorizada de frontend/backend para staging.

Actualización autorizada por el usuario: [EWO-024](../engineering-work-orders/EWO-024.md)
implementa login OpenID Connect, sesión cifrada, proxy con Bearer del lado servidor,
identidad `/auth/me` y validación de tokens/roles/patios en API. Los headers legacy
de los clientes no se propagan en modo OIDC. La integración con proveedor real
continúa pendiente de [configuración staging](auth-web-staging.md); no se afirma
login productivo habilitado ni nuevos permisos de mantenimiento.

El contrato documenta 200 en comandos CHECK, pero los @Post actuales de
claim/start/review/complete usan el 201 predeterminado de Nest. Las pruebas de
recorrido caracterizan el comportamiento actual. Alinear el contrato HTTP es
un pendiente técnico distinto de la aprobación de roles/estados.

## Resultado local

PASS: 224 unitarias, 93 E2E, 16 de migración; compilación API, lint y build
estándar Next con Roboto usando el proxy. Firma real vía API con storage de
prueba y PNG sintético, reintento sin duplicar correctiva, bytes privados,
403 fuera de scope, 401 sin credenciales y 409 por edición terminal.
Se corrigió el 500 reproducido de correctiva con estado legacy null, respetando
el espejo BORRADOR/CORRECTIVO existente. Expirar/invalidar conserva snapshot/hash.

14 PNG, Roboto cargada y segundo pase ux-auditor: OK acotado con fixtures.
Pendientes de integración: sesión/token frontend, staging autorizado y archivos
representativos. Turbopack todavía falla al descargar fuentes; el comando
alternativo estándar sí pasa. El alcance general del Mecánico queda aclarado
arriba; las decisiones específicas de rutas, permisos por recurso, datos y ciclo
continúan pendientes. No se han habilitado permisos nuevos a partir de propuestas.
