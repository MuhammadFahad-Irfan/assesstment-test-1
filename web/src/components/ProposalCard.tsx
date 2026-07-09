import type { ProposedItem } from '../lib/types';
import { formatMoney } from '../lib/format';

export function ProposalCard({
  items,
  currency,
  total,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  items: ProposedItem[];
  currency: string;
  total: number;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const busy = isApproving || isRejecting;

  return (
    <div className="proposal">
      <div className="proposal-head">
        <span className="pill">Proposed budget · review before saving</span>
      </div>

      <table className="table compact">
        <thead>
          <tr>
            <th>Category</th>
            <th>Description</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={`${item.category}-${i}`}>
              <td>{item.category}</td>
              <td>{item.description}</td>
              <td className="num">{formatMoney(item.amount, currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>Total</td>
            <td className="num strong">{formatMoney(total, currency)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="proposal-actions">
        <button className="btn" onClick={onApprove} disabled={busy}>
          {isApproving ? 'Approving…' : 'Approve'}
        </button>
        <button className="btn ghost" onClick={onReject} disabled={busy}>
          {isRejecting ? 'Rejecting…' : 'Reject'}
        </button>
      </div>
    </div>
  );
}
