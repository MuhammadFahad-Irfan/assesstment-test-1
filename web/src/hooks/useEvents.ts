import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../lib/api';

export const eventsKey = ['events'] as const;
export const eventKey = (id: string) => ['event', id] as const;

export function useEvents() {
  return useQuery({ queryKey: eventsKey, queryFn: eventsApi.list });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKey(id),
    queryFn: () => eventsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: eventsKey }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eventsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventsKey }),
  });
}
