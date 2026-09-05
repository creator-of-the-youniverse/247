import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  getIdToken
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { api } from '../services/api';

export const DEMO_IDENTITIES: Record<UserRole, { uid: string; email: string; name: string; role: UserRole }> = {
  CUSTOMER: {
    uid: 'demo-customer-uid',
    email: 'customer@trader24.net',
    name: 'Customer Member',
    role: 'CUSTOMER'
  },
  RIDER: {
    uid: 'demo-rider-uid',
    email: 'rider@trader24.net',
    name: 'Cargo Rider 1',
    role: 'RIDER'
  },
  ADMIN: {
    uid: 'demo-admin-uid',
    email: 'admin@trader24.net',
    name: 'Admin Controller',
    role: 'ADMIN'
  }
};

function generateDemoToken(uid: string, email: string, name: string, role: UserRole): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    uid,
    user_id: uid,
    sub: uid,
    email,
    name,
    role,
    email_verified: true,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 30
  }));
  return `${header}.${payload}.demo-signature`;
}

interface AuthContextType {
  currentUser: User | null;
  profile: UserProfile | null;
  role: UserRole;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<UserProfile>;
  register: (email: string, pass: string, displayName: string, phone?: string) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<UserProfile>;
  quickDemoLogin: (role: UserRole) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to fetch valid ID token
  const getToken = useCallback(async (): Promise<string | null> => {
    if (auth.currentUser) {
      try {
        const idToken = await getIdToken(auth.currentUser, true);
        setToken(idToken);
        api.setAuthToken(idToken);
        return idToken;
      } catch (e) {
        console.error('Failed to get auth token from Firebase:', e);
      }
    }
    const currentToken = api.getAuthToken();
    return currentToken;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!currentUser && !auth.currentUser) {
      setProfile(null);
      setRole('CUSTOMER');
      setToken(null);
      api.setAuthToken(null);
      return;
    }

    try {
      if (auth.currentUser) {
        const idToken = await getIdToken(auth.currentUser);
        setToken(idToken);
        api.setAuthToken(idToken);
      }

      const userProfile = await api.getCurrentUserProfile();
      setProfile(userProfile);
      setRole(userProfile.role || 'CUSTOMER');
    } catch (err) {
      console.error('Error fetching user profile:', err);
      if (currentUser) {
        const fallback: UserProfile = {
          id: currentUser.uid,
          email: currentUser.email || '',
          display_name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Customer',
          role: role || 'CUSTOMER',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          active: true
        };
        setProfile(fallback);
      }
    }
  }, [currentUser, role]);

  useEffect(() => {
    // Check if a demo session exists in localStorage
    const savedDemoSession = localStorage.getItem('trader24_demo_session');
    if (savedDemoSession) {
      try {
        const parsed = JSON.parse(savedDemoSession);
        if (parsed?.token && parsed?.profile) {
          const demoUser = {
            uid: parsed.profile.id,
            email: parsed.profile.email,
            displayName: parsed.profile.display_name,
            emailVerified: true,
            isAnonymous: false,
            getIdToken: async () => parsed.token
          } as unknown as User;

          setCurrentUser(demoUser);
          setProfile(parsed.profile);
          setRole(parsed.profile.role || 'CUSTOMER');
          setToken(parsed.token);
          api.setAuthToken(parsed.token);
        }
      } catch (e) {
        console.warn('Failed to parse saved demo session:', e);
        localStorage.removeItem('trader24_demo_session');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Firebase auth user takes precedence over demo session
        localStorage.removeItem('trader24_demo_session');
        setCurrentUser(user);
        try {
          const idToken = await getIdToken(user);
          setToken(idToken);
          api.setAuthToken(idToken);
          const p = await api.getCurrentUserProfile();
          setProfile(p);
          setRole(p.role || 'CUSTOMER');
        } catch (e) {
          console.error('Auth state changed profile fetch error:', e);
        }
      } else {
        // Only clear if no demo session active
        const hasDemoSession = localStorage.getItem('trader24_demo_session');
        if (!hasDemoSession) {
          setCurrentUser(null);
          setProfile(null);
          setRole('CUSTOMER');
          setToken(null);
          api.setAuthToken(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<UserProfile> => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      localStorage.removeItem('trader24_demo_session');
      const idToken = await getIdToken(cred.user, true);
      setCurrentUser(cred.user);
      setToken(idToken);
      api.setAuthToken(idToken);
      const userProfile = await api.getCurrentUserProfile();
      setProfile(userProfile);
      setRole(userProfile.role || 'CUSTOMER');
      return userProfile;
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed' || err?.message?.includes('operation-not-allowed')) {
        throw new Error('Firebase Email/Password provider is not enabled in Firebase Console. Enable "Email/Password" in Firebase Console > Authentication > Sign-in method, or sign in with Google or use Quick Demo.');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, pass: string, displayName: string, phone?: string): Promise<UserProfile> => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      localStorage.removeItem('trader24_demo_session');
      const idToken = await getIdToken(cred.user, true);
      setCurrentUser(cred.user);
      setToken(idToken);
      api.setAuthToken(idToken);

      // Register profile on backend
      const userProfile = await api.registerUserProfile({
        email,
        display_name: displayName,
        phone,
        role: 'CUSTOMER'
      });
      setProfile(userProfile);
      setRole('CUSTOMER');
      return userProfile;
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed' || err?.message?.includes('operation-not-allowed')) {
        throw new Error('Firebase Email/Password provider is not enabled in Firebase Console. Enable "Email/Password" in Firebase Console > Authentication > Sign-in method, or sign in with Google or use Quick Demo.');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<UserProfile> => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      localStorage.removeItem('trader24_demo_session');
      const idToken = await getIdToken(cred.user, true);
      setCurrentUser(cred.user);
      setToken(idToken);
      api.setAuthToken(idToken);

      let userProfile: UserProfile;
      try {
        userProfile = await api.getCurrentUserProfile();
      } catch {
        userProfile = await api.registerUserProfile({
          email: cred.user.email || '',
          display_name: cred.user.displayName || 'Customer',
          role: 'CUSTOMER'
        });
      }
      setProfile(userProfile);
      setRole(userProfile.role || 'CUSTOMER');
      return userProfile;
    } finally {
      setLoading(false);
    }
  };

  const quickDemoLogin = async (demoRole: UserRole): Promise<UserProfile> => {
    setLoading(true);
    try {
      const identity = DEMO_IDENTITIES[demoRole];
      const demoToken = generateDemoToken(identity.uid, identity.email, identity.name, demoRole);

      const demoProfile: UserProfile = {
        id: identity.uid,
        email: identity.email,
        display_name: identity.name,
        role: demoRole,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        active: true
      };

      const demoUser = {
        uid: identity.uid,
        email: identity.email,
        displayName: identity.name,
        emailVerified: true,
        isAnonymous: false,
        getIdToken: async () => demoToken
      } as unknown as User;

      // Persist demo session so refresh preserves state
      localStorage.setItem('trader24_demo_session', JSON.stringify({ token: demoToken, profile: demoProfile }));

      api.setAuthToken(demoToken);
      setToken(demoToken);
      setCurrentUser(demoUser);
      setProfile(demoProfile);
      setRole(demoRole);

      // Attempt to sync or verify with backend Firestore
      try {
        const synced = await api.getCurrentUserProfile();
        if (synced) {
          setProfile(synced);
          setRole(synced.role || demoRole);
          localStorage.setItem('trader24_demo_session', JSON.stringify({ token: demoToken, profile: synced }));
          return synced;
        }
      } catch (err) {
        console.warn('Backend sync for demo identity completed with fallback:', err);
      }

      return demoProfile;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('trader24_demo_session');
      try {
        await firebaseSignOut(auth);
      } catch (e) {
        console.warn('Firebase sign out error:', e);
      }
      setCurrentUser(null);
      setProfile(null);
      setRole('CUSTOMER');
      setToken(null);
      api.setAuthToken(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        role,
        token,
        loading,
        isAuthenticated: !!currentUser,
        login,
        register,
        loginWithGoogle,
        quickDemoLogin,
        logout,
        refreshProfile,
        getToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
