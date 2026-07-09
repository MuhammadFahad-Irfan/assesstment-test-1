import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCreateEvent, useEvents } from '../hooks/useEvents';
import { apiErrorMessage } from '../lib/api';
import { formatMoney } from '../lib/format';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AUD', 'CAD'];

export function EventsPage() {
  const events = useEvents();
  const create = useCreateEvent();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [currency, setCurrency] = useState('USD');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    create.mutate(
      { title: title.trim(), date, currency },
      {
        onSuccess: () => {
          setTitle('');
          setDate('');
        },
      },
    );
  }

  return (
    <div className="stack">
      <section className="panel">
        <h2>New event</h2>
        <form className="row-form" onSubmit={submit}>
          <label className="grow">
            Title
            <input
              value={title}
              placeholder="Company Summit 2025"
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label>
            Currency
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <button className="btn" type="submit" disabled={create.isPending}>
            {create.isPending ? 'Adding…' : 'Add event'}
          </button>
        </form>
        {create.isError && <p className="error">{apiErrorMessage(create.error)}</p>}
      </section>

      <section className="panel">
        <h2>Events</h2>
        {events.isLoading && <p className="muted">Loading events…</p>}
        {events.isError && <p className="error">{apiErrorMessage(events.error)}</p>}
        {events.data && events.data.length === 0 && (
          <p className="muted">No events yet. Create your first one above.</p>
        )}
        {events.data && events.data.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Date</th>
                <th className="num">Total budget</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {events.data.map((ev) => (
                <tr key={ev.id}>
                  <td>{ev.title}</td>
                  <td>{new Date(ev.date).toLocaleDateString()}</td>
                  <td className="num">{formatMoney(ev.totalSpend, ev.currency)}</td>
                  <td className="num">
                    <Link className="link" to={`/events/${ev.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
