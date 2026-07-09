import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createSocket } from '../lib/socket';
import { useAuth } from '../auth/AuthContext';
import { eventKey, eventsKey } from './useEvents';

/**
 * Opens one authenticated socket for the session and invalidates the affected
 * event's queries whenever the server broadcasts `budget:updated`. This is what
 * refreshes a viewer's budget when *another* client approves a proposal.
 */
export function useWorkspaceSocket() {
  const { session } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!session) return;
    const socket = createSocket(session.token, session.workspaceId);

    socket.on('budget:updated', ({ eventId }: { eventId: string }) => {
      qc.invalidateQueries({ queryKey: eventKey(eventId) });
      qc.invalidateQueries({ queryKey: eventsKey });
    });

    return () => {
      socket.off('budget:updated');
      socket.disconnect();
    };
  }, [session, qc]);
}
