import { Badge } from "@/components/ui/badge";
import { maintenanceType } from "@/lib/maintenance-type";
export function MaintenanceTypeBadge({
  type,
}: {
  type: string | null | undefined;
}) {
  if (type === "CHECK") return <Badge variant="secondary">Revisión</Badge>;
  const item = maintenanceType(type);
  return (
    <Badge variant="outline" className={`maintenance-type ${item.className}`}>
      {item.label}
    </Badge>
  );
}
