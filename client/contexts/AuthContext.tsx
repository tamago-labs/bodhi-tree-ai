'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  username: string;
  email?: string;
  apiEndpoint?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, apiEndpoint?: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored session on mount
    const storedUser = localStorage.getItem('bodhi-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string, apiEndpoint?: string): Promise<boolean> => {
    // Mock authentication
    if (username === 'admin' && password === 'bodhi2025') {
      const userData: User = { username, email: 'admin@bodhitree.pro', apiEndpoint };
      setUser(userData);
      localStorage.setItem('bodhi-user', JSON.stringify(userData));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('bodhi-user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
