import type { CategoryBreakdown } from '../lib/types';
import { formatMoney } from '../lib/format';

export function CategoryBreakdownPanel({
  breakdown,
  total,
  currency,
}: {
  breakdown: CategoryBreakdown[];
  total: number;
  currency: string;
}) {
  if (breakdown.length === 0) {
    return <p className="muted">No spend to break down yet.</p>;
  }

  return (
    <div className="breakdown">
      {breakdown.map((row) => {
        const pct = total > 0 ? (row.total / total) * 100 : 0;
        return (
          <div key={row.category} className="breakdown-row">
            <div className="breakdown-head">
              <span>{row.category}</span>
              <span className="num">{formatMoney(row.total, currency)}</span>
            </div>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
