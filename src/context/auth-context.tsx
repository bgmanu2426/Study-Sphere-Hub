'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { account } from '@/lib/appwrite';
import { Models, ID } from 'appwrite';
import { ROLE_ADMIN } from '@/lib/constants';

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  loading: boolean;
  isAdmin: boolean;
  hasRole: (role: string) => boolean;
  signup: (email: string, password: string, name: string) => Promise<any>;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      try {
        const currentUser = await account.get();
        setUser(currentUser);
      } catch (error) {
        // User is not logged in
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();
  }, []);

  // Check if user has a specific role using Appwrite labels
  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.labels?.includes(role) ?? false;
  };

  // Computed property for admin check
  const isAdmin = useMemo(() => {
    return hasRole(ROLE_ADMIN);
  }, [user]);

  const signup = async (email: string, password: string, name: string) => {
    // Create a new account with name
    await account.create(ID.unique(), email, password, name);
    // Login the user after signup
    await account.createEmailPasswordSession(email, password);
    const currentUser = await account.get();
    setUser(currentUser);
  };

  const login = async (email: string, password: string) => {
    await account.createEmailPasswordSession(email, password);
    const currentUser = await account.get();
    setUser(currentUser);
  };

  const logout = async () => {
    await account.deleteSession('current');
    setUser(null);
  };
  
  const value = {
    user,
    loading,
    isAdmin,
    hasRole,
    signup,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
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
