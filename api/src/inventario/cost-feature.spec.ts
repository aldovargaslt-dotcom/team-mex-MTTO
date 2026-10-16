import { inventoryCostsEnabled } from './cost-feature';

describe('inventory costing release activation', () => {
  it('enables production after the schema guard by default', () => {
    expect(inventoryCostsEnabled({ NODE_ENV: 'production' })).toBe(true);
    expect(inventoryCostsEnabled({ INVENTORY_COSTS_ENABLED: 'true' })).toBe(
      true,
    );
  });
  it('preserves an explicit operator disable and fails closed on invalid flags', () => {
    expect(inventoryCostsEnabled({ INVENTORY_COSTS_ENABLED: 'false' })).toBe(
      false,
    );
    expect(inventoryCostsEnabled({ INVENTORY_COSTS_ENABLED: 'invalid' })).toBe(
      false,
    );
  });
});
