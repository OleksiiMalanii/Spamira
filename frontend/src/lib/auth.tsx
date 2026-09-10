import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { request } from './api';

export const userSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  email: z.string(),
});
export const sessionSchema = z.object({
  user: userSchema.nullable(),
  guestQuota: z
    .object({ limit: z.number(), used: z.number(), remaining: z.number(), resetsAt: z.string() })
    .nullable(),
});
type User = z.infer<typeof userSchema>;
type Session = z.infer<typeof sessionSchema>;
type Login = { email: string; password: string; rememberMe: boolean };
type Register = { displayName: string; email: string; password: string };
type AuthState = {
  user: User | null;
  quota: Session['guestQuota'];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  login: (values: Login) => Promise<void>;
  register: (values: Register) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ user: null, guestQuota: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++revision.current;
    try {
      const next = await request('/auth/session', sessionSchema);
      if (current !== revision.current) return;
      setSession(next);
      setError('');
    } catch (reason) {
      if (current !== revision.current) return;
      setError(reason instanceof Error ? reason.message : 'Unable to load your session.');
    } finally {
      if (current === revision.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const update = () => {
      void refresh();
    };
    window.addEventListener('focus', update);
    window.addEventListener('spamira:session-expired', update);
    return () => {
      window.removeEventListener('focus', update);
      window.removeEventListener('spamira:session-expired', update);
    };
  }, [refresh]);
  useEffect(() => {
    if (!session.guestQuota) return;
    const delay = Math.max(1000, Date.parse(session.guestQuota.resetsAt) - Date.now() + 1000);
    const timer = window.setTimeout(() => void refresh(), delay);
    return () => window.clearTimeout(timer);
  }, [session.guestQuota, refresh]);
  const authenticate = async (path: string, values: Login | Register) => {
    const user = await request(path, userSchema, { method: 'POST', body: JSON.stringify(values) });
    revision.current++;
    setSession({ user, guestQuota: null });
    setLoading(false);
    setError('');
  };
  const logout = async () => {
    await request('/auth/logout', z.object({ signedOut: z.boolean() }), { method: 'POST' });
    revision.current++;
    setSession({ user: null, guestQuota: null });
    await refresh();
  };
  return (
    <AuthContext.Provider
      value={{
        user: session.user,
        quota: session.guestQuota,
        loading,
        error,
        refresh,
        login: (values) => authenticate('/auth/login', values),
        register: (values) => authenticate('/auth/register', values),
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('AuthProvider is required.');
  return auth;
}
