export function InventoryResultCount({ count, total = count, singular, plural }: {
  count: number; total?: number; singular: string; plural: string;
}) {
  return <p className="inventory-result-count" role="status">
    {count === total ? `${count} ${count === 1 ? singular : plural}` : `${count} de ${total} ${plural}`}
  </p>;
}
