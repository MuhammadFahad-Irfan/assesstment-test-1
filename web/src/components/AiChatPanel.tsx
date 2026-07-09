import { useState } from 'react';
import {
  useApproveProposal,
  useChat,
  usePendingProposal,
  useRejectProposal,
} from '../hooks/useAi';
import { apiErrorMessage } from '../lib/api';
import { ProposalCard } from './ProposalCard';
import type { Proposal } from '../lib/types';

export function AiChatPanel({
  eventId,
  currency,
}: {
  eventId: string;
  currency: string;
}) {
  const [message, setMessage] = useState('');

  const pending = usePendingProposal(eventId);
  const chat = useChat(eventId);
  const approve = useApproveProposal(eventId);
  const reject = useRejectProposal(eventId);

  // Prefer a freshly generated proposal; otherwise restore a saved pending one.
  const fresh = chat.data as Proposal | undefined;
  const saved = pending.data;

  const proposal:
    | { id: string; items: Proposal['items']; total: number }
    | null = fresh
    ? { id: fresh.id, items: fresh.items, total: fresh.total }
    : saved
      ? {
          id: saved.id,
          items: saved.items,
          total: saved.items.reduce((s, i) => s + Number(i.amount), 0),
        }
      : null;

  const errorMsg =
    (chat.isError && apiErrorMessage(chat.error)) ||
    (approve.isError && apiErrorMessage(approve.error)) ||
    (reject.isError && apiErrorMessage(reject.error)) ||
    '';

  function send() {
    const text = message.trim();
    if (!text) return;
    chat.mutate(text, { onSuccess: () => setMessage('') });
  }

  return (
    <section className="panel">
      <h3>Budget assistant</h3>
      <p className="muted small">
        Ask for a budget in {currency}. Nothing is saved until you approve.
      </p>

      <div className="chat-input">
        <textarea
          rows={3}
          value={message}
          placeholder="e.g. Draft a budget for a 150-person outdoor wedding with catering and music."
          onChange={(e) => setMessage(e.target.value)}
          disabled={chat.isPending}
        />
        <button
          className="btn"
          onClick={send}
          disabled={chat.isPending || !message.trim()}
        >
          {chat.isPending ? 'Generating…' : 'Send'}
        </button>
      </div>

      {errorMsg && <p className="error">{errorMsg}</p>}

      {proposal && (
        <ProposalCard
          items={proposal.items}
          currency={currency}
          total={proposal.total}
          isApproving={approve.isPending}
          isRejecting={reject.isPending}
          onApprove={() => approve.mutate(proposal.id, { onSuccess: reset })}
          onReject={() => reject.mutate(proposal.id, { onSuccess: reset })}
        />
      )}
    </section>
  );

  // Clear the visible card after approve/reject. The pending query has already
  // been invalidated by the mutation hooks, so it won't reappear.
  function reset() {
    chat.reset();
  }
}
