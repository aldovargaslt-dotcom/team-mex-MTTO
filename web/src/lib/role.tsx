'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Role } from './types';
const ROLE_KEY = 'team-mex-role';
const USER_KEY = 'team-mex-user-id';
const DEVELOPMENT_ROLES: Role[] = ['SUPERVISOR', 'ADMIN_DIRECTIVO', 'LOGISTICA', 'MECANICO'];
type RoleContextValue = {
  role: Role | null; userId: string; displayName: string; roles: Role[];
  ready: boolean; development: boolean; sessionError: string;
  setRole: (role: Role) => void; clearRole: () => Promise<void>;
  reloadSession: () => Promise<void>;
  isAdmin: boolean; isLogistica: boolean; canFlota: boolean; canLogistica: boolean;
};
const RoleContext = createContext<RoleContextValue | null>(null);
export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(null);
  const [userId, setUserId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [development, setDevelopment] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [ready, setReady] = useState(false);
  const reloadSession = useCallback(async () => {
    setReady(false);
    setSessionError('');
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store', credentials: 'same-origin' });
      const session = await response.json();
      if (!response.ok) throw new Error('No se pudo verificar la sesión. Intenta de nuevo.');
      const stored = window.localStorage.getItem(ROLE_KEY) as Role;
      if (session.mode === 'DEVELOPMENT') {
        setDevelopment(true);
        setRoles(DEVELOPMENT_ROLES);
        setRoleState(DEVELOPMENT_ROLES.includes(stored) ? stored : null);
        const storedUser = window.localStorage.getItem(USER_KEY) || `stub-${crypto.randomUUID()}`;
        window.localStorage.setItem(USER_KEY, storedUser);
        setUserId(storedUser);
        setDisplayName('');
      } else {
        setDevelopment(false);
        window.localStorage.removeItem(USER_KEY);
        const actor = session.authenticated ? session.actor : null;
        const granted: Role[] = actor?.roles ?? [];
        setRoles(granted);
        setUserId(actor?.subject ?? '');
        setDisplayName(actor?.displayName ?? '');
        setRoleState(granted.includes(stored) ? stored : granted.length === 1 ? granted[0] : null);
      }
    } catch {
      setRoleState(null); setRoles([]); setUserId(''); setDisplayName(''); setDevelopment(false);
      setSessionError('No se pudo verificar la sesión. Intenta de nuevo.');
    } finally { setReady(true); }
  }, []);
  useEffect(() => {
    void reloadSession();
    const expired = () => {
      setRoleState(null); setRoles([]); setUserId(''); setDisplayName('');
      setSessionError('Tu sesión venció o perdió autorización. Inicia sesión nuevamente.');
    };
    window.addEventListener('team-mex-session-expired', expired);
    return () => window.removeEventListener('team-mex-session-expired', expired);
  }, [reloadSession]);
  const setRole = useCallback((next: Role) => {
    if (!roles.includes(next)) return;
    window.localStorage.setItem(ROLE_KEY, next);
    setRoleState(next);
  }, [roles]);
  const clearRole = useCallback(async () => {
    if (!development) {
      const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      if (!response.ok) throw new Error('No se pudo cerrar sesión. Intenta de nuevo.');
      setRoles([]); setUserId(''); setDisplayName('');
    }
    window.localStorage.removeItem(ROLE_KEY);
    setSessionError(''); setRoleState(null);
  }, [development]);
  const value = useMemo(() => ({
    role, userId, displayName, roles, ready, development, sessionError, setRole, clearRole, reloadSession,
    isAdmin: role === 'ADMIN_DIRECTIVO', isLogistica: role === 'LOGISTICA',
    canFlota: role === 'LOGISTICA' || role === 'ADMIN_DIRECTIVO',
    canLogistica: role === 'LOGISTICA' || role === 'ADMIN_DIRECTIVO',
  }), [role, userId, displayName, roles, ready, development, sessionError, setRole, clearRole, reloadSession]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole debe usarse dentro de RoleProvider');
  return ctx;
}
export function etiquetaRol(role: Role) {
  if (role === 'ADMIN_DIRECTIVO') return 'Administrador directivo';
  if (role === 'LOGISTICA') return 'Logística';
  if (role === 'MECANICO') return 'Mecánico';
  return 'Supervisor';
}
