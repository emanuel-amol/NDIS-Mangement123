// frontend/src/contexts/AuthContext.tsx - COMPLETE FILE
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authProvider } from '../lib/auth-provider';
import { authAPI } from '../services/api';

interface User {
  id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBackendUser = async (token: string): Promise<User> => {
    try {
      console.log('🔄 Fetching backend user with token');
      
      const backendUser = await authAPI.getCurrentUser(token);
      
      console.log('✅ Backend user fetched:', backendUser);
      
      if (!backendUser || !backendUser.email) {
        throw new Error('Invalid user data received');
      }
      
      return backendUser;
    } catch (error) {
      console.error('❌ Failed to fetch backend user:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string): Promise<User | null> => {
    try {
      console.log('🔑 Signing in user:', email);
      
      const { session } = await authProvider.login(email, password);

      if (session?.access_token) {
        localStorage.setItem('token', session.access_token);
        console.log('✅ Supabase session obtained');

        const backendUser = await fetchBackendUser(session.access_token);
        
        if (backendUser && backendUser.email) {
          setUser(backendUser);
          console.log('✅ Sign in complete for user:', backendUser.email, 'role:', backendUser.role);
          return backendUser;
        } else {
          console.error('❌ Invalid user data received');
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Sign in failed:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, role: string) => {
    try {
      console.log('📝 Signing up user:', email, 'with role:', role);
      
      localStorage.setItem('userRole', role);
      
      const { session } = await authProvider.signup(email, password, role);
      
      if (session?.access_token) {
        localStorage.setItem('token', session.access_token);
        console.log('✅ Supabase signup successful');

        const backendUser = await fetchBackendUser(session.access_token);
        
        if (backendUser && backendUser.email) {
          setUser(backendUser);
          console.log('✅ Sign up complete');
        } else {
          console.error('❌ Invalid user data after signup');
        }
      }
    } catch (error) {
      console.error('❌ Sign up failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('👋 Signing out user');
      
      await authProvider.logout();
      await authAPI.logout();
      
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      setUser(null);
      
      console.log('✅ Sign out complete');
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      setUser(null);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing auth...');
        
        await authProvider.initialize();

        const session = await authProvider.getSession();
        
        if (session?.user) {
          const token = await authProvider.getToken();
          
          if (token) {
            localStorage.setItem('token', token);
            console.log('📌 Found existing session');
            
            try {
              const backendUser = await fetchBackendUser(token);
              
              if (backendUser && backendUser.email) {
                setUser(backendUser);
                console.log('✅ Auth initialized with user:', backendUser.email);
              } else {
                console.warn('⚠️ Invalid user data on init');
                localStorage.removeItem('token');
                localStorage.removeItem('userRole');
              }
            } catch (error) {
              console.error('⚠️ Failed to fetch backend user on init:', error);
              localStorage.removeItem('token');
              localStorage.removeItem('userRole');
            }
          }
        } else {
          console.log('ℹ️ No existing session found');
        }
      } catch (error) {
        console.error('❌ Auth initialization failed:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const unsubscribe = authProvider.onAuthStateChange(async (supabaseUser) => {
      console.log('🔔 Auth state changed:', supabaseUser ? 'User logged in' : 'User logged out');
      
      if (supabaseUser) {
        const token = await authProvider.getToken();
        
        if (token) {
          localStorage.setItem('token', token);
          
          try {
            const backendUser = await fetchBackendUser(token);
            
            if (backendUser && backendUser.email) {
              setUser(backendUser);
            } else {
              console.warn('⚠️ Invalid user data on auth change');
            }
          } catch (error) {
            console.error('⚠️ Failed to fetch backend user on auth change:', error);
          }
        }
      } else {
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
      }
    });

    return () => {
      console.log('🧹 Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        isAuthenticated: !!user,
      }}
    >
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