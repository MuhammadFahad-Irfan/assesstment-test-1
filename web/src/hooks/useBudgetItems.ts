import { useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetItemsApi } from '../lib/api';
import { eventKey, eventsKey } from './useEvents';

export function useAddBudgetItem(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      category: string;
      description: string;
      amount: number;
      currency: string;
    }) => budgetItemsApi.create(eventId, body),
    onSuccess: () => {
      // Refresh the event detail (table + summary) and the list totals.
      qc.invalidateQueries({ queryKey: eventKey(eventId) });
      qc.invalidateQueries({ queryKey: eventsKey });
    },
  });
}

export function useDeleteBudgetItem(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => budgetItemsApi.remove(eventId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventKey(eventId) });
      qc.invalidateQueries({ queryKey: eventsKey });
    },
  });
}
