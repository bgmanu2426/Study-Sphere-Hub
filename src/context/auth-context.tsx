'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

// A mock user object for demonstration
const mockUser = {
  uid: '12345',
  email: 'test.user@example.com',
  displayName: 'Test User',
  photoURL: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
};

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Simulate checking auth state
    const timer = setTimeout(() => {
        // To test the logged-out state, you can set this to null
        // setUser(null);
        setUser(mockUser);
        setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.replace('/login');
    }
     if (!loading && user && pathname === '/login') {
      router.replace('/');
    }
  }, [user, loading, pathname, router]);

  const signInWithGoogle = async () => {
    setLoading(true);
    // This is a mock sign-in.
    setTimeout(() => {
        setUser(mockUser);
        setLoading(false);
        router.push('/');
    }, 1000);
  };

  const logout = async () => {
    setLoading(true);
    setTimeout(() => {
        setUser(null);
        setLoading(false);
        router.push('/login');
    }, 500);
  };
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
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
