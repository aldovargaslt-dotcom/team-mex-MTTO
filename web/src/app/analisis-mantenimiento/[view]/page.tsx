import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MaintenanceAnalysisView } from "@/components/analysis/MaintenanceAnalysisView";
import { ANALYSIS_NAV, type AnalysisView } from "@/lib/maintenance-analysis";
export default async function Page({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (!ANALYSIS_NAV.some((item) => item.key === view)) notFound();
  return (
    <Suspense fallback={<p className="muted">Cargando análisis…</p>}>
      <MaintenanceAnalysisView view={view as AnalysisView} />
    </Suspense>
  );
}
