import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { demoUser } from '../data/mockData';

/**
 * Demo-only authentication.
 *
 * There are no real credentials anywhere in this codebase: any well-formed
 * email plus a password of 6+ characters signs in as the fictional demo user.
 * The session lives in sessionStorage so a refresh keeps you signed in and
 * closing the tab signs you out.
 *
 * To add real auth later, replace the body of `login` with a call to the
 * backend (e.g. POST /api/auth/login) and store the returned token; the rest
 * of the app only depends on `user`, `login` and `logout`.
 */
const STORAGE_KEY = 'legacytrack.session';
const AuthContext = createContext(null);

function readSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSession);

  const login = useCallback(async ({ email }) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const session = { ...demoUser, email };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      /* storage unavailable — stay signed in for this page load only */
    }
    setUser(session);
    return session;
  }, []);

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
