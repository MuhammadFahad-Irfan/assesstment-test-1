import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiApi } from '../lib/api';
import { eventKey, eventsKey } from './useEvents';

export const pendingProposalKey = (eventId: string) =>
  ['proposal', 'pending', eventId] as const;

// Restores a pending proposal card after a reload.
export function usePendingProposal(eventId: string) {
  return useQuery({
    queryKey: pendingProposalKey(eventId),
    queryFn: () => aiApi.pending(eventId),
    enabled: !!eventId,
  });
}

export function useChat(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => aiApi.chat(eventId, message),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: pendingProposalKey(eventId) }),
  });
}

export function useApproveProposal(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) => aiApi.approve(eventId, proposalId),
    onSuccess: () => {
      // Budget table refreshes without a page reload.
      qc.invalidateQueries({ queryKey: eventKey(eventId) });
      qc.invalidateQueries({ queryKey: eventsKey });
      qc.invalidateQueries({ queryKey: pendingProposalKey(eventId) });
    },
  });
}

export function useRejectProposal(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) => aiApi.reject(eventId, proposalId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: pendingProposalKey(eventId) }),
  });
}
