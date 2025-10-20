// frontend/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authProvider } from '../lib/auth-provider';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User | null>;
  signUp: (email: string, password: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBackendUser = async (token: string): Promise<User> => {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.json();
  };

  const signIn = async (email: string, password: string): Promise<User | null> => {
    const { session } = await authProvider.login(email, password);
    
    if (session?.access_token) {
      localStorage.setItem('token', session.access_token);
      
      const backendUser = await fetchBackendUser(session.access_token);
      setUser(backendUser);
      return backendUser;
    }
    return null;
  };

  const signUp = async (email: string, password: string, role: string) => {
    const { session } = await authProvider.signup(email, password, role);
    
    if (session?.access_token) {
      localStorage.setItem('token', session.access_token);
      
      const backendUser = await fetchBackendUser(session.access_token);
      setUser(backendUser);
    }
  };

  const signOut = async () => {
    await authProvider.logout();
    localStorage.removeItem('token');
    setUser(null);
  };

  useEffect(() => {
    authProvider.initialize();

    authProvider.getSession().then(async (session) => {
      if (session?.user) {
        const token = await authProvider.getToken();
        if (token) {
          localStorage.setItem('token', token);
          const backendUser = await fetchBackendUser(token);
          setUser(backendUser);
        }
      }
      setLoading(false);
    });

    const unsubscribe = authProvider.onAuthStateChange(async (supabaseUser) => {
      if (supabaseUser) {
        const token = await authProvider.getToken();
        if (token) {
          localStorage.setItem('token', token);
          const backendUser = await fetchBackendUser(token);
          setUser(backendUser);
        }
      } else {
        setUser(null);
        localStorage.removeItem('token');
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn, 
      signUp, 
      signOut,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};