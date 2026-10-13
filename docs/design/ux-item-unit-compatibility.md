# UX — Tipos y unidades compatibles con una refacción

Approved by the user's request and combined-selection answer, 2026-10-13. Sibling: `web/src/components/NewItemDialog.tsx`, the existing shared inventory/purchase alta recipe; maintain scroll body and fixed Guardar/Cancelar footer.

Supervisor/Admin choose what units a part fits. Primary: Guardar; secondary: Cancelar. Keep SKU/name/category first. Replace Vehículos compatibles with two checkbox groups: **Tipos de unidad** and **Unidades específicas**. Both may be combined; explain “Aplica a los tipos seleccionados y también a las unidades elegidas.”

Unit search: **Buscar unidad**, number, plates or model; bounded scrolling list shows number/plates/type, accessible44px targets. Counter/selected summary remains visible when search filters out a selected unit. No technical IDs. Empty filter: “No hay unidades con esa búsqueda.” Empty compatibility: “Elige al menos un tipo o una unidad.” Error/retry retains entered capture and selections; loading disables saving. No units beyond list loading prevents accidentally saving incomplete capture. Cancel dirty capture follows existing confirmation.

Proof: type-only, unit-only, combined save, filtered selection retained, loading/empty/error,390/1024/1440 and separate visual review. Existing purchase line capture must survive shared alta callback.
