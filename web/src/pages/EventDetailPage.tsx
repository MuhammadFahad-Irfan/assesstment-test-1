import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useEvent } from '../hooks/useEvents';
import { useAddBudgetItem } from '../hooks/useBudgetItems';
import { apiErrorMessage } from '../lib/api';
import { formatMoney } from '../lib/format';
import { BudgetTable } from '../components/BudgetTable';
import { CategoryBreakdownPanel } from '../components/CategoryBreakdown';
import { AiChatPanel } from '../components/AiChatPanel';

export function EventDetailPage() {
  const { id = '' } = useParams();
  const event = useEvent(id);
  const addItem = useAddBudgetItem(id);

  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  if (event.isLoading) return <p className="muted">Loading event…</p>;
  if (event.isError)
    return <p className="error">{apiErrorMessage(event.error)}</p>;
  if (!event.data) return <p className="muted">Event not found.</p>;

  const ev = event.data;
  const { budgetSummary } = ev;

  function addManualItem(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!category.trim() || !description.trim() || !(value > 0)) return;
    addItem.mutate(
      {
        category: category.trim(),
        description: description.trim(),
        amount: value,
        currency: ev.currency,
      },
      {
        onSuccess: () => {
          setCategory('');
          setDescription('');
          setAmount('');
        },
      },
    );
  }

  return (
    <div className="stack">
      <div className="crumbs">
        <Link className="link" to="/">
          ← All events
        </Link>
      </div>

      <header className="event-header">
        <div>
          <h2>{ev.title}</h2>
          <p className="muted">
            {new Date(ev.date).toLocaleDateString()} · {ev.currency}
          </p>
        </div>
        <div className="total-badge">
          <span className="muted small">Total spend</span>
          <strong>{formatMoney(budgetSummary.totalSpend, ev.currency)}</strong>
        </div>
      </header>

      <div className="grid">
        <section className="panel">
          <h3>Budget items</h3>
          <BudgetTable eventId={ev.id} items={ev.budgetItems} currency={ev.currency} />

          <form className="row-form top-gap" onSubmit={addManualItem}>
            <label className="grow">
              Category
              <input
                value={category}
                placeholder="Venue"
                onChange={(e) => setCategory(e.target.value)}
                required
              />
            </label>
            <label className="grow">
              Description
              <input
                value={description}
                placeholder="Main hall"
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </label>
            <label>
              Amount ({ev.currency})
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>
            <button className="btn" type="submit" disabled={addItem.isPending}>
              {addItem.isPending ? 'Adding…' : 'Add item'}
            </button>
          </form>
          {addItem.isError && (
            <p className="error">{apiErrorMessage(addItem.error)}</p>
          )}
        </section>

        <section className="panel">
          <h3>By category</h3>
          <CategoryBreakdownPanel
            breakdown={budgetSummary.breakdownByCategory}
            total={budgetSummary.totalSpend}
            currency={ev.currency}
          />
        </section>
      </div>

      <AiChatPanel eventId={ev.id} currency={ev.currency} />
    </div>
  );
}
