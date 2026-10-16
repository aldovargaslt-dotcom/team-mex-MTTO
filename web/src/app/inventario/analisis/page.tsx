import { Suspense } from 'react';
import { InventoryAnalysis } from '@/components/inventario/InventoryAnalysis';

export default function AnalysisPage() {
  return <Suspense fallback={<p className="muted" role="status">Cargando análisis…</p>}><InventoryAnalysis /></Suspense>;
}
