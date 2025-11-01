'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<any>;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For production, onAuthStateChanged will handle auth state.
    // For the mock user, we set it directly in the login function.
    if (process.env.NODE_ENV === 'production') {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
        });
        return () => unsubscribe();
    } else {
        setLoading(false);
    }
  }, []);

  const signup = (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const login = (email: string, password: string) => {
    // In development, we bypass Firebase Auth and create a mock user.
    if (process.env.NODE_ENV !== 'production') {
      console.log("DEV MODE: Bypassing Firebase Auth and creating a mock user.");
      const mockUser: FirebaseUser = {
        uid: 'mock-user-uid-12345',
        email: email,
        displayName: 'Mock User',
        photoURL: null,
        emailVerified: true,
        isAnonymous: false,
        metadata: {},
        providerData: [],
        providerId: 'password',
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => 'mock-id-token',
        getIdTokenResult: async () => ({
          token: 'mock-id-token',
          expirationTime: '',
          authTime: '',
          issuedAtTime: '',
          signInProvider: null,
          signInSecondFactor: null,
          claims: {},
        }),
        reload: async () => {},
        toJSON: () => ({}),
      };
      setUser(mockUser);
      return Promise.resolve();
    }
    // In production, use the real Firebase login.
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    // Also clear the mock user on logout
    if (process.env.NODE_ENV !== 'production') {
        setUser(null);
    }
    return signOut(auth);
  };
  
  const value = {
    user,
    loading,
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
