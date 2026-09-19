import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { User } from '../types/index.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  can: (moduleName: string, action?: string) => boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ooting_crm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ooting_crm_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const can = (moduleName: string, action: string = 'view'): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;

    // Check custom permissions if configured
    if (user.permissions) {
      try {
        const perms = JSON.parse(user.permissions);
        if (Array.isArray(perms)) {
          const directMatch = `${moduleName}:${action}`;
          const dotMatch = `${moduleName}.${action}`;
          const wildMatch = `${moduleName}:*`;
          if (perms.includes('*') || perms.includes(directMatch) || perms.includes(dotMatch) || perms.includes(wildMatch)) {
            return true;
          }
        } else if (typeof perms === 'object' && perms !== null) {
          const modulePerms = perms[moduleName];
          if (modulePerms === true || modulePerms === '*') return true;
          if (Array.isArray(modulePerms) && (modulePerms.includes(action) || modulePerms.includes('*'))) return true;
          if (typeof modulePerms === 'object' && modulePerms !== null && modulePerms[action] === true) return true;
        }
      } catch (err) {
        console.error('Failed to parse permissions:', err);
      }
    }

    // Role-based defaults when custom permissions not set
    if (user.role === 'ADMIN') return true;

    if (user.role === 'SALES') {
      if (['leads', 'customers', 'bookings', 'cabs', 'suppliers', 'calendar', 'dashboard'].includes(moduleName)) {
        return action !== 'delete';
      }
    }

    if (user.role === 'OPERATIONS') {
      if (['bookings', 'cabs', 'calendar', 'suppliers', 'dashboard'].includes(moduleName)) {
        return action !== 'delete';
      }
    }

    if (user.role === 'ACCOUNTANT') {
      if (['reports', 'payments', 'bookings', 'cabs', 'dashboard'].includes(moduleName)) {
        return action !== 'delete';
      }
    }

    if (user.role === 'AGENT') {
      if (['bookings', 'calendar', 'dashboard'].includes(moduleName)) {
        return action === 'view';
      }
    }

    return false;
  };

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('ooting_crm_token', newToken);
    localStorage.setItem('ooting_crm_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('ooting_crm_token');
    localStorage.removeItem('ooting_crm_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      if (res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem('ooting_crm_user', JSON.stringify(res.data.user));
      }
    } catch (err) {
      console.error('Failed to restore user session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isSuperAdmin, can, login, logout, refreshUser }}>
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
