/** This release enables costing after its additive production schema guard. */
export function inventoryCostsEnabled(env: NodeJS.ProcessEnv = process.env) {
  return (
    env.INVENTORY_COSTS_ENABLED == null ||
    env.INVENTORY_COSTS_ENABLED === 'true'
  );
}
