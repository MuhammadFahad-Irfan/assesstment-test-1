import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, apiErrorMessage, type AuthResponse } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res: AuthResponse =
        mode === 'login'
          ? await authApi.login({ email, password })
          : await authApi.register({ email, password });

      const workspaceId = res.workspaceId ?? res.workspaceIds?.[0];
      if (!workspaceId) {
        throw new Error('No workspace returned for this account');
      }

      login({ token: res.accessToken, workspaceId, user: res.user });
      navigate('/', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <h1>Event Budgeting</h1>
        <p className="muted">
          {mode === 'login' ? 'Sign in to your workspace.' : 'Create an account and workspace.'}
        </p>

        <label>
          Email
          <input
            type="email"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={8}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <button
          type="button"
          className="link"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
        >
          {mode === 'login'
            ? 'Need an account? Register'
            : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}
