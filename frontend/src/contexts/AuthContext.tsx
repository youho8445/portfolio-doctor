'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

export type AuthUser = {
  id: number;
  email: string | null;
  name: string | null;
  phoneNumber?: string | null;
  trialEndsAt?: string | null;
  isPremiumUser?: boolean;
  isAdmin?: boolean;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoggedIn: boolean;
  isLoading: boolean;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch latest user data from /auth/me and update state
  const refreshUser = useCallback(async (): Promise<void> => {
    const stored = localStorage.getItem('auth_token');
    if (!stored) return;
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${stored}` },
      });
      if (r.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setToken(null);
        setUser(null);
        return;
      }
      if (r.ok) {
        const u = await r.json();
        setUser(u);
        localStorage.setItem('auth_user', JSON.stringify(u));
      }
    } catch { /* network error — keep existing state */ }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    if (stored && storedUser) {
      // Show cached state immediately for fast render, but do NOT mark loading=false
      // until /auth/me confirms the latest premium/trial status from backend
      setToken(stored);
      setUser(JSON.parse(storedUser));
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${stored}` },
      })
        .then((r) => {
          if (r.status === 401) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            setToken(null);
            setUser(null);
            return null;
          }
          return r.ok ? r.json() : null;
        })
        .then((u) => { if (u) { setUser(u); localStorage.setItem('auth_user', JSON.stringify(u)); } })
        .catch(() => {})
        .finally(() => setIsLoading(false)); // wait for /auth/me before unblocking UI
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((t: string, u: AuthUser) => {
    localStorage.setItem('auth_token', t);
    localStorage.setItem('auth_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    setIsModalOpen(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  }, []);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser, isLoggedIn: !!token, isLoading, isModalOpen, openModal, closeModal }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
