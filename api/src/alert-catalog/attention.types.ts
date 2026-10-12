export type ActiveAttention = {
  id: string;
  area: 'FLOTA' | 'INVENTARIO';
  kind: 'maintenance' | 'stock' | 'purchase';
  severity: 'WARNING' | 'CRITICAL';
  title: string;
  detail: string;
  reference: string | null;
  photo: string | null;
  href: string;
  action: string;
  createdAt: string;
};

export type AttentionResponse = {
  items: ActiveAttention[];
  sources: { id: string; name: string; status: 'ok' | 'error' }[];
};

export function comparePriorities(
  before: Map<string, 'WARNING' | 'CRITICAL'>,
  after: Map<string, 'WARNING' | 'CRITICAL'>,
) {
  let opened = 0;
  let closed = 0;
  let priorityChanged = 0;
  for (const [id, severity] of before) {
    if (!after.has(id)) closed++;
    else if (after.get(id) !== severity) priorityChanged++;
  }
  for (const id of after.keys()) if (!before.has(id)) opened++;
  return {
    before: before.size,
    after: after.size,
    opened,
    closed,
    priorityChanged,
  };
}
