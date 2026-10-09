import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api from '../lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  phone?: string;
  permissions?: Record<string, boolean>;
  branchId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: (role: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (module: string, right?: 'read' | 'edit' | 'delete') => boolean;
  hasRole: (...roles: string[]) => boolean;
  canSeePricing: (module?: string) => boolean;
  canSeeContactDetails: (module?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('auth_token')
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then((userData) => {
          setUser(userData);
          localStorage.setItem('auth_user', JSON.stringify(userData));
        })
        .catch(() => {
          setToken(null);
          setUser(null);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const data = await api.post('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
  };

  const demoLogin = async (role: string) => {
    const data = await api.post('/auth/demo-login', { role });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  const hasPermission = useCallback((module: string, right: 'read' | 'edit' | 'delete' = 'read'): boolean => {
    if (!user) return false;
    if (user.role === 'owner') return true;
    if (!user.permissions) return false;
    
    // Support legacy flat boolean or new object structure
    const modulePerms = user.permissions[module];
    if (typeof modulePerms === 'boolean') {
      return right === 'read' ? modulePerms : false;
    }
    if (modulePerms && typeof modulePerms === 'object') {
      return modulePerms[right] === true;
    }
    return false;
  }, [user]);

  const hasRole = useCallback((...roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  const canSeePricing = useCallback((module?: string): boolean => {
    if (!user) return false;
    if (user.role === 'owner') return true;
    if (user.permissions?.show_pricing === true) return true;
    if (module && hasPermission(module, 'edit')) return true;
    return false;
  }, [user, hasPermission]);

  const canSeeContactDetails = useCallback((module?: string): boolean => {
    if (!user) return false;
    if (user.role === 'owner') return true;
    if (user.permissions?.show_contact_details === true) return true;
    if (module && hasPermission(module, 'edit')) return true;
    return false;
  }, [user, hasPermission]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        demoLogin,
        logout,
        isAuthenticated: !!user && !!token,
        hasPermission,
        hasRole,
        canSeePricing,
        canSeeContactDetails,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
