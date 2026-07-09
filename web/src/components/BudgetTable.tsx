import type { BudgetItem } from '../lib/types';
import { formatMoney } from '../lib/format';
import { useDeleteBudgetItem } from '../hooks/useBudgetItems';

export function BudgetTable({
  eventId,
  items,
  currency,
}: {
  eventId: string;
  items: BudgetItem[];
  currency: string;
}) {
  const del = useDeleteBudgetItem(eventId);

  if (items.length === 0) {
    return (
      <p className="muted">
        No budget items yet. Add one below, or ask the assistant to draft a
        budget.
      </p>
    );
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Category</th>
          <th>Description</th>
          <th className="num">Amount</th>
          <th aria-label="actions" />
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>{item.category}</td>
            <td>{item.description}</td>
            <td className="num">{formatMoney(item.amount, currency)}</td>
            <td className="num">
              <button
                className="link-danger"
                onClick={() => del.mutate(item.id)}
                disabled={del.isPending}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
