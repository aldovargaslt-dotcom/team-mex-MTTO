# SPEC-DEPLOY-001 — Migración controlada de CHECK en Railway

Autorización: usuario solicita avanzar con preparación y ensayo local sin backup
(2026-10-08). No implica ejecutar contra Railway, commit, PR o despliegue.
ADR-020 y plan CHK-001 gobiernan el schema y backfill; no redefinir dominio.

- DEPLOY-01: inspección read-only, sin crear historial ni arrancar Nest/seed.
  Distinguir base legacy limpia, schema CHECK completo y drift/estado parcial.
- DEPLOY-02: aplicación explícita requiere nombre exacto de base, writers
  drenados, synchronize/drop desactivados y reconocimiento de ausencia de backup.
  No relajar el runner descartable existente. Sólo up; no rollback destructivo.
- DEPLOY-03: bloquear escritura durante migración; aplicar las 13 migraciones
  existentes y sus verificaciones en una transacción. Verificar checksum y
  cantidad de todas las columnas históricas de visitas, hijos, unidades,
  choferes, tipos y outbox antes de commit. Fallo revierte la transacción.
- DEPLOY-04: inconsistencias legacy, drift, concurrencia o gate faltante abortan
  sin reparar datos automáticamente. Repetición completa no modifica datos.
- DEPLOY-05: producción nunca usa synchronize/dropSchema; fixtures descartables
  prueban preservación, errores, rollback e idempotencia. No afirmar restore,
  ensayo con datos/volumen reales, ni configuración Railway sin verificarlos.
  Implementar el default productivo false y rechazar overrides inseguros; el
  default de desarrollo local sigue disponible para demo/fixtures existentes.

No inventar patios, scopes, estados físicos, usuarios, permisos ni configuración
CHECK. La preparación Auth sigue EWO-025/026 y requiere patios reales.
