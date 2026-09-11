# UI — mobile touch targets v0

Estado: aceptado (visual only, viewport `<768`)

Problema: CTAs, selects y filas del WO wizard quedan por debajo de 44×44 (compact 32, checklist 36, sticky Continuar ~40).

Meta: hit de dedo en el wizard de visita (Datos → Confirmar) y Piezas si comparte chrome. Dominio / Inventario apply / ADR-000 / ADR-002 sin cambios.

Aplica a: Supervisor WO mobile. Desktop `≥768` conserva densidad anti-generic (~40).

## Must

1. CTA primario/secundario (Continuar, Cerrar, Atrás, barra sticky) ≥44×44; botones sticky a altura completa ≥44.
2. Selects (Chofer, Tipo) e input de km con altura ≥44.
3. Texto + Agregar / acciones de fila = hit de **fila completa** ≥44 de alto (no solo el vínculo de texto).
4. Checklist de Trabajos: cada ítem-fila ≥44; tocar la fila completa alterna el check.
5. Guardar y salir / Borrar firma ≥44 (outline permitido).

## Don’t

Agregar/Editar solo como texto chico; Continuar sticky `<44`; checkbox de 16px sin expandir la fila.
