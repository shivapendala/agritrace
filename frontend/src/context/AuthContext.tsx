import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, LoginCredentials, RegisterCredentials } from '../types/auth';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<User>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('agritrace_access_token');
      if (token) {
        try {
          const userData = await api.getMe();
          setUser(userData);
        } catch {
          // Token expired or invalid
          localStorage.removeItem('agritrace_access_token');
          localStorage.removeItem('agritrace_refresh_token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    try {
      const tokens = await api.login(credentials);
      localStorage.setItem('agritrace_access_token', tokens.access_token);
      localStorage.setItem('agritrace_refresh_token', tokens.refresh_token);
      setUser(tokens.user);
    } finally {
      setLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    return await api.register(credentials);
  };

  const logout = () => {
    localStorage.removeItem('agritrace_access_token');
    localStorage.removeItem('agritrace_refresh_token');
    setUser(null);
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, hasRole }}>
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
