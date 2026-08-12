'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AdminUser } from '@/types';
import { login as apiLogin, getAdminUsers } from '@/lib/api';

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AdminUser | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'lms_admin_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncCurrentUser = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object' && parsed.email) {
            const admins = getAdminUsers();
            const match = admins.find((a) => a.email.toLowerCase() === parsed.email.toLowerCase());
            if (match) {
              const updatedUser: AdminUser = {
                ...parsed,
                nama: match.nama,
                role: match.role,
              };
              setUser(updatedUser);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
            } else {
              setUser(parsed);
            }
          }
        }
      } catch {
        // ignore
      }
      setLoading(false);
    };

    syncCurrentUser();
    window.addEventListener('lms_admins_updated', syncCurrentUser);
    return () => window.removeEventListener('lms_admins_updated', syncCurrentUser);
  }, []);

  const login = async (email: string, password: string): Promise<AdminUser | null> => {
    const u = await apiLogin(email, password);
    if (u && typeof u === 'object' && u.email) {
      const safeUser: AdminUser = {
        email: u.email,
        password: '',
        nama: u.nama || 'Admin',
        role: u.role || 'Admin',
      };
      setUser(safeUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeUser));
      return safeUser;
    }
    return null;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
