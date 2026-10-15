import * as SecureStore from 'expo-secure-store';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { apiRequest, User } from '../services/api';

const TOKEN_KEY = 'serein.session';
let webToken: string | null = null;

async function readToken() {
  return Platform.OS === 'web' ? webToken : SecureStore.getItemAsync(TOKEN_KEY);
}

async function writeToken(token: string | null) {
  if (Platform.OS === 'web') { webToken = token; return; }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

type Session = { token: string; user: User; expiresAt: number };
type AppContextValue = {
  token: string | null;
  user: User | null;
  ready: boolean;
  accountError: string;
  signIn: (email: string, password: string) => Promise<void>;
  register: (values: { email: string; username: string; displayName: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [accountError, setAccountError] = useState('');

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const saved = await readToken();
        if (saved) {
          try {
            const data = await apiRequest<{ user: User }>('/api/auth/me', saved);
            if (mounted) { setToken(saved); setUser(data.user); }
          } catch (error) {
            const isUnauthorized = error instanceof Error && error.message.includes('session');
            if (isUnauthorized) await writeToken(null).catch(() => {});
            else if (mounted) setAccountError(error instanceof Error ? error.message : 'Could not restore your session.');
          }
        }
      } catch (error) {
        if (mounted) setAccountError(error instanceof Error ? error.message : 'Could not restore your session.');
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const acceptSession = async (session: Session) => {
    await writeToken(session.token);
    setToken(session.token);
    setUser(session.user);
    setAccountError('');
  };

  const signIn = async (email: string, password: string) => {
    const data = await apiRequest<Session>('/api/auth/login', null, { method: 'POST', body: JSON.stringify({ email, password }) });
    await acceptSession(data);
  };

  const register = async (values: { email: string; username: string; displayName: string; password: string }) => {
    const data = await apiRequest<Session>('/api/auth/register', null, { method: 'POST', body: JSON.stringify(values) });
    await acceptSession(data);
  };

  const signOut = async () => {
    try { if (token) await apiRequest('/api/auth/logout', token, { method: 'POST' }); }
    finally {
      await writeToken(null);
      setToken(null);
      setUser(null);
    }
  };

  const value = useMemo(() => ({ token, user, ready, accountError, signIn, register, signOut, setUser }), [token, user, ready, accountError]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider.');
  return value;
}
