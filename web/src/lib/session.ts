import type { AuthUser } from './types';

// A tiny persisted store for the JWT, active workspace, and user. The axios
// interceptor reads from here; AuthContext writes to it and mirrors it in React
// state so components re-render on login/logout.

const TOKEN_KEY = 'eb.token';
const WORKSPACE_KEY = 'eb.workspaceId';
const USER_KEY = 'eb.user';

export interface Session {
  token: string;
  workspaceId: string;
  user: AuthUser;
}

export function loadSession(): Session | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const workspaceId = localStorage.getItem(WORKSPACE_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  if (!token || !workspaceId || !userRaw) return null;
  try {
    return { token, workspaceId, user: JSON.parse(userRaw) as AuthUser };
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(WORKSPACE_KEY, session.workspaceId);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(WORKSPACE_KEY);
  localStorage.removeItem(USER_KEY);
}
