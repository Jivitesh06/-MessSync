import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from './firebase';
import { UserProfile, UserRole } from '@/types/user';
import { doc, getDoc } from 'firebase/firestore';

type AuthListener = (profile: UserProfile | null) => void;
const authListeners = new Set<AuthListener>();

let currentUser: UserProfile | null = null;

// Check for local stored demo admin session
try {
  const saved = localStorage.getItem('messsync_admin_session');
  if (saved) {
    currentUser = JSON.parse(saved);
  }
} catch {}

function notifyListeners() {
  authListeners.forEach((fn) => fn(currentUser));
}

// Allowed admin emails for Chitkara
const KNOWN_ADMIN_EMAILS = [
  'admin@chitkara.edu.in',
  'messadmin@chitkara.edu.in',
  'warden@chitkara.edu.in',
];

export const authService = {
  init() {
    if (auth && isFirebaseConfigured()) {
      onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          const profile = await this.resolveUserProfile(fbUser);
          currentUser = profile;
          if (profile.role === 'admin') {
            localStorage.setItem('messsync_admin_session', JSON.stringify(profile));
          }
        } else {
          // Keep local demo session if firebase is not logged in but local session exists
          if (!localStorage.getItem('messsync_admin_session')) {
            currentUser = null;
          }
        }
        notifyListeners();
      });
    }
  },

  async resolveUserProfile(fbUser: FirebaseUser): Promise<UserProfile> {
    // 1. Check custom claims
    let role: UserRole = 'student';
    try {
      const idTokenResult = await fbUser.getIdTokenResult();
      if (idTokenResult.claims.admin === true || idTokenResult.claims.role === 'admin') {
        role = 'admin';
      }
    } catch {}

    // 2. Check known admin email domains / emails
    if (fbUser.email && (KNOWN_ADMIN_EMAILS.includes(fbUser.email.toLowerCase()) || fbUser.email.endsWith('@chitkara.edu.in'))) {
      role = 'admin';
    }

    // 3. Check Firestore users collection if available
    if (db && role !== 'admin') {
      try {
        const uDoc = await getDoc(doc(db, 'users', fbUser.uid));
        if (uDoc.exists() && uDoc.data().role === 'admin') {
          role = 'admin';
        }
      } catch {}
    }

    return {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName || fbUser.email?.split('@')[0],
      role,
      createdAt: new Date().toISOString(),
    };
  },

  async loginAdmin(email: string, pass: string): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. If Firebase is configured, perform real Firebase Auth
    if (auth && isFirebaseConfigured()) {
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
        const profile = await this.resolveUserProfile(cred.user);
        currentUser = profile;
        localStorage.setItem('messsync_admin_session', JSON.stringify(profile));
        notifyListeners();
        return profile;
      } catch (err: any) {
        console.warn('Firebase auth failed:', err.message);
        throw new Error(err.message || 'Invalid administrator credentials');
      }
    }

    // 2. Offline / local simulated administrator authentication
    // Allows immediate evaluation and testing
    if (
      cleanEmail === 'admin@chitkara.edu.in' ||
      cleanEmail === 'messadmin@chitkara.edu.in' ||
      cleanEmail.includes('admin')
    ) {
      if (pass.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      const profile: UserProfile = {
        uid: 'admin_local_' + Date.now().toString(36),
        email: cleanEmail,
        displayName: 'Mess Warden Admin',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      currentUser = profile;
      localStorage.setItem('messsync_admin_session', JSON.stringify(profile));
      notifyListeners();
      return profile;
    }

    throw new Error('Unauthorized. Only recognized Chitkara Mess Administrators may sign in.');
  },

  async logout(): Promise<void> {
    if (auth && isFirebaseConfigured()) {
      try {
        await signOut(auth);
      } catch {}
    }
    currentUser = null;
    localStorage.removeItem('messsync_admin_session');
    notifyListeners();
  },

  getCurrentUser(): UserProfile | null {
    return currentUser;
  },

  isAdmin(): boolean {
    return currentUser?.role === 'admin';
  },

  subscribe(listener: AuthListener): () => void {
    authListeners.add(listener);
    listener(currentUser);
    return () => authListeners.delete(listener);
  },
};
