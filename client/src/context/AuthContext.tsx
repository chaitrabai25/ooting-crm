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
    if (user.permissions && typeof user.permissions === 'string' && user.permissions.trim() !== '') {
      try {
        const perms = JSON.parse(user.permissions);
        if (Array.isArray(perms)) {
          const directMatch = `${moduleName}:${action}`;
          const dotMatch = `${moduleName}.${action}`;
          const wildMatch = `${moduleName}:*`;
          if (perms.includes('*') || perms.includes(directMatch) || perms.includes(dotMatch) || perms.includes(wildMatch)) {
            return true;
          }
          return false;
        } else if (typeof perms === 'object' && perms !== null) {
          const modulePerms = perms[moduleName];
          if (modulePerms === true || modulePerms === '*') return true;
          if (Array.isArray(modulePerms) && (modulePerms.includes(action) || modulePerms.includes('*'))) return true;
          if (typeof modulePerms === 'object' && modulePerms !== null && modulePerms[action] === true) return true;
          return false;
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

    if (user.role === 'TOUR_GUIDE') {
      if (['guides', 'expenses', 'dashboard', 'packages', 'calendar', 'bookings', 'customers'].includes(moduleName)) {
        return action !== 'delete';
      }
    }

    return false;
  };

  const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity

  const recordActivity = () => {
    const now = Date.now();
    const last = Number(localStorage.getItem('ooting_last_active') || '0');
    if (now - last > 10000) {
      localStorage.setItem('ooting_last_active', String(now));
    }
  };

  const checkSessionTimeout = () => {
    const storedToken = localStorage.getItem('ooting_crm_token');
    if (!storedToken) return;

    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const isPublic =
      path.includes('/itinerary-pdf') ||
      path.includes('/pdf') ||
      path.startsWith('/itinerary/') ||
      path.startsWith('/register-tour/') ||
      path.startsWith('/trip-registration/') ||
      path === '/login';
    if (isPublic) return;

    const lastActive = Number(localStorage.getItem('ooting_last_active') || '0');
    if (lastActive > 0 && Date.now() - lastActive > SESSION_IDLE_TIMEOUT_MS) {
      localStorage.removeItem('ooting_crm_token');
      localStorage.removeItem('ooting_crm_user');
      localStorage.removeItem('ooting_last_active');
      sessionStorage.setItem('ooting_session_expired', 'true');
      setToken(null);
      setUser(null);
      window.location.href = '/login?expired=1';
    }
  };

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('ooting_crm_token', newToken);
    localStorage.setItem('ooting_crm_user', JSON.stringify(newUser));
    localStorage.setItem('ooting_last_active', String(Date.now()));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Best-effort server notification
    } finally {
      localStorage.removeItem('ooting_crm_token');
      localStorage.removeItem('ooting_crm_user');
      localStorage.removeItem('ooting_company_settings');
      localStorage.removeItem('ooting_last_active');
      setToken(null);
      setUser(null);
      window.location.href = '/login';
    }
  };

  const refreshUser = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    // Check if system was off or inactive for a prolonged period
    const lastActive = Number(localStorage.getItem('ooting_last_active') || '0');
    if (lastActive > 0 && Date.now() - lastActive > SESSION_IDLE_TIMEOUT_MS) {
      localStorage.removeItem('ooting_crm_token');
      localStorage.removeItem('ooting_crm_user');
      localStorage.removeItem('ooting_last_active');
      sessionStorage.setItem('ooting_session_expired', 'true');
      setToken(null);
      setUser(null);
      setIsLoading(false);
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (path !== '/login') {
        window.location.href = '/login?expired=1';
      }
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem('ooting_crm_user', JSON.stringify(res.data.user));
        recordActivity();
      }
    } catch (err) {
      console.error('Failed to restore user session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    // Listen to user activity to refresh last active timestamp
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleUserActivity = () => recordActivity();

    activityEvents.forEach((ev) => {
      window.addEventListener(ev, handleUserActivity, { passive: true });
    });

    // Check on visibility change (e.g. system wake up from sleep or laptop lid opened)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSessionTimeout();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic interval check every 30 seconds
    const intervalTimer = setInterval(checkSessionTimeout, 30000);

    return () => {
      activityEvents.forEach((ev) => {
        window.removeEventListener(ev, handleUserActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalTimer);
    };
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
