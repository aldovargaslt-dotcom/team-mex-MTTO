export const MAINTENANCE_TYPES = {
  PREVENTIVE: {
    label: "Preventivo",
    color: "#2F5BB8",
    className: "maintenance-type--preventive",
  },
  CORRECTIVE: {
    label: "Correctivo",
    color: "#C45D23",
    className: "maintenance-type--corrective",
  },
  UNKNOWN: {
    label: "Sin clasificar",
    color: "#737589",
    className: "maintenance-type--unknown",
  },
} as const;
export function maintenanceType(value: string | null | undefined) {
  return value === "PREVENTIVE" || value === "PREDICTIVO"
    ? MAINTENANCE_TYPES.PREVENTIVE
    : value === "CORRECTIVE" || value === "CORRECTIVO"
      ? MAINTENANCE_TYPES.CORRECTIVE
      : MAINTENANCE_TYPES.UNKNOWN;
}
