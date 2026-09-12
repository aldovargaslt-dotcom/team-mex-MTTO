'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Role } from './types';

const ROLE_KEY = 'team-mex-role';
const USER_KEY = 'team-mex-user-id';

type RoleContextValue = {
  role: Role | null;
  userId: string;
  ready: boolean;
  setRole: (role: Role) => void;
  clearRole: () => void;
  isAdmin: boolean;
  isLogistica: boolean;
  canFlota: boolean;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(null);
  const [userId, setUserId] = useState('stub-user');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(ROLE_KEY);
    const storedUser = window.localStorage.getItem(USER_KEY);
    if (
      stored === 'SUPERVISOR' ||
      stored === 'ADMIN_DIRECTIVO' ||
      stored === 'LOGISTICA'
    ) {
      setRoleState(stored);
    }
    if (storedUser) {
      setUserId(storedUser);
    } else {
      const generated = `stub-${Math.random().toString(36).slice(2, 8)}`;
      window.localStorage.setItem(USER_KEY, generated);
      setUserId(generated);
    }
    setReady(true);
  }, []);

  const setRole = useCallback((next: Role) => {
    window.localStorage.setItem(ROLE_KEY, next);
    setRoleState(next);
  }, []);

  const clearRole = useCallback(() => {
    window.localStorage.removeItem(ROLE_KEY);
    setRoleState(null);
  }, []);

  const value = useMemo(
    () => ({
      role,
      userId,
      ready,
      setRole,
      clearRole,
      isAdmin: role === 'ADMIN_DIRECTIVO',
      isLogistica: role === 'LOGISTICA',
      canFlota: role === 'LOGISTICA' || role === 'ADMIN_DIRECTIVO',
    }),
    [role, userId, ready, setRole, clearRole],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error('useRole debe usarse dentro de RoleProvider');
  }
  return ctx;
}

export function etiquetaRol(role: Role) {
  if (role === 'ADMIN_DIRECTIVO') return 'Administrador directivo';
  if (role === 'LOGISTICA') return 'Logística';
  return 'Supervisor';
}
