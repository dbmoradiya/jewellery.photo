import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken } from './api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { user } = await api('/auth/me');
        setUser(user);
      } catch { setUser(null); }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(data.token); setUser(data.user); return data.user;
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const data = await api('/auth/google', { method: 'POST', body: { credential } });
    setToken(data.token); setUser(data.user); return data.user;
  }, []);
  const register = useCallback(async (payload) => {
    const data = await api('/auth/register', { method: 'POST', body: payload });
    setToken(data.token); setUser(data.user); return data.user;
  }, []);

  const logout = useCallback(() => { setToken(null); setUser(null); }, []);
  const refresh = useCallback(async () => {
    try { const { user } = await api('/auth/me'); setUser(user); } catch { /* keep */ }
  }, []);

  return <AuthCtx.Provider value={{ user, loading, login, loginWithGoogle, register, logout, refresh, setUser }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
