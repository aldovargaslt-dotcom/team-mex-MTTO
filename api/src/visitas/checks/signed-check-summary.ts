/** Public projection of the immutable snapshot; private storage keys stay internal. */
export function signedCheckSummary(snapshot: Record<string, unknown> | null) {
  if (!snapshot) return null;
  const unit = snapshot.unit as Record<string, unknown>;
  const evidence = snapshot.evidence as Record<string, unknown>[];
  return {
    unit: {
      id: unit.id,
      numeroInterno: unit.numeroInterno,
      placas: unit.placas,
      marcaModelo: unit.marcaModelo,
    },
    condition: snapshot.condition,
    findings: snapshot.findings,
    disposition: snapshot.disposition,
    evidence: evidence.map((item) => ({
      id: item.id,
      tags: item.tags,
      bytes: item.bytes,
      mimeType: item.mimeType,
      sha256: item.sha256,
    })),
  };
}
