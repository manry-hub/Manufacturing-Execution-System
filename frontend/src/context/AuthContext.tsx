import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, UserRole } from '../types/auth.js';
import { api } from '../services/api.js';

interface AuthContextValue {
  user: User | null;
  role: UserRole;
  switchRole: (role: UserRole) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const DEMO_ROLES: Array<{ role: UserRole; username: string; label: string; badgeColor: string }> = [
  { role: 'production_supervisor', username: 'supervisor', label: 'Supervisor', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { role: 'operator', username: 'operator', label: 'Operator', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { role: 'maintenance_technician', username: 'technician', label: 'Technician', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { role: 'planner', username: 'planner', label: 'Planner', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { role: 'quality_inspector', username: 'quality_inspector', label: 'Quality', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { role: 'admin', username: 'admin', label: 'Admin', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('production_supervisor');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const switchRole = useCallback(async (targetRole: UserRole) => {
    setIsLoading(true);
    setError(null);
    try {
      const demoConfig = DEMO_ROLES.find((r) => r.role === targetRole) ?? DEMO_ROLES[0];
      const res = await api.login(demoConfig.username, 'password123');
      const currentUser: User = {
        id: res.user.id,
        username: res.user.username,
        role: res.user.role,
        token: res.accessToken,
      };
      setUser(currentUser);
      setRole(currentUser.role);
      localStorage.setItem('mes_demo_role', targetRole);
    } catch (err) {
      console.error('Failed to authenticate role:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedRole = (localStorage.getItem('mes_demo_role') as UserRole) || 'production_supervisor';
    void switchRole(savedRole);
  }, [switchRole]);

  return (
    <AuthContext.Provider value={{ user, role, switchRole, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
