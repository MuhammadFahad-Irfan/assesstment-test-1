import axios, { AxiosError } from 'axios';
import { loadSession } from './session';
import type {
  AuthUser,
  BudgetItem,
  EventDetail,
  EventSummaryRow,
  PendingProposalRow,
  Proposal,
} from './types';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const http = axios.create({ baseURL });

// Attach the JWT and the active workspace id to every request.
http.interceptors.request.use((config) => {
  const session = loadSession();
  if (session) {
    config.headers.Authorization = `Bearer ${session.token}`;
    config.headers['x-workspace-id'] = session.workspaceId;
  }
  return config;
});

/** Pull a human-readable message out of an axios error. */
export function apiErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
    return err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}

// ---- Auth ----

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
  workspaceId?: string; // register
  workspaceIds?: string[]; // login
}

export const authApi = {
  register: (body: { email: string; password: string; workspaceName?: string }) =>
    http.post<AuthResponse>('/auth/register', body).then((r) => r.data),
  login: (body: { email: string; password: string }) =>
    http.post<AuthResponse>('/auth/login', body).then((r) => r.data),
};

// ---- Events ----

export const eventsApi = {
  list: () => http.get<EventSummaryRow[]>('/events').then((r) => r.data),
  get: (id: string) => http.get<EventDetail>(`/events/${id}`).then((r) => r.data),
  create: (body: { title: string; date: string; currency: string }) =>
    http.post<EventDetail>('/events', body).then((r) => r.data),
  update: (id: string, body: Partial<{ title: string; date: string; currency: string }>) =>
    http.patch(`/events/${id}`, body).then((r) => r.data),
  remove: (id: string) => http.delete(`/events/${id}`).then((r) => r.data),
};

// ---- Budget items ----

export const budgetItemsApi = {
  create: (
    eventId: string,
    body: { category: string; description: string; amount: number; currency: string },
  ) =>
    http
      .post<BudgetItem>(`/events/${eventId}/budget-items`, body)
      .then((r) => r.data),
  remove: (eventId: string, itemId: string) =>
    http.delete(`/events/${eventId}/budget-items/${itemId}`).then((r) => r.data),
};

// ---- AI assistant ----

export const aiApi = {
  chat: (eventId: string, message: string) =>
    http
      .post<Proposal>(`/events/${eventId}/ai/chat`, { message })
      .then((r) => r.data),
  pending: (eventId: string) =>
    http
      .get<PendingProposalRow | null>(`/events/${eventId}/ai/proposals/pending`)
      .then((r) => r.data),
  approve: (eventId: string, proposalId: string) =>
    http
      .post(`/events/${eventId}/ai/proposals/${proposalId}/approve`)
      .then((r) => r.data),
  reject: (eventId: string, proposalId: string) =>
    http
      .post(`/events/${eventId}/ai/proposals/${proposalId}/reject`)
      .then((r) => r.data),
};
