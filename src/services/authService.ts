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

// Only in development: load saved demo session if present
if (!import.meta.env.PROD) {
  try {
    const saved = localStorage.getItem('messsync_admin_session');
    if (saved) {
      currentUser = JSON.parse(saved);
    }
  } catch {}
}

function notifyListeners() {
  authListeners.forEach((fn) => fn(currentUser));
}

// Allowed admin emails for Chitkara (strict list, no domain wildcards)
const AUTHORIZED_ADMIN_EMAILS = [
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
          if (profile.role === 'admin') {
            currentUser = profile;
            localStorage.setItem('messsync_admin_session', JSON.stringify(profile));
          } else {
            // Non-admin user signed in; do not grant admin session
            currentUser = profile;
            localStorage.removeItem('messsync_admin_session');
          }
        } else {
          // Firebase signed out
          currentUser = null;
          localStorage.removeItem('messsync_admin_session');
        }
        notifyListeners();
      });
    }
  },

  async resolveUserProfile(fbUser: FirebaseUser): Promise<UserProfile> {
    let role: UserRole = 'student';

    // 1. Authoritative check: Firebase Custom Claims (set via Firebase Admin SDK / Cloud Function)
    try {
      const idTokenResult = await fbUser.getIdTokenResult(true);
      if (idTokenResult.claims.admin === true || idTokenResult.claims.role === 'admin') {
        role = 'admin';
      }
    } catch (err) {
      console.warn('[authService] Error fetching custom claims:', err);
    }

    // 2. Secondary check: Firestore `users/{uid}` document role
    if (db && role !== 'admin') {
      try {
        const uDoc = await getDoc(doc(db, 'users', fbUser.uid));
        if (uDoc.exists() && uDoc.data().role === 'admin') {
          role = 'admin';
        }
      } catch (err) {
        console.warn('[authService] Error checking users collection:', err);
      }
    }

    // 3. Exact email whitelist fallback for verified university administrators
    if (role !== 'admin' && fbUser.email) {
      const normalizedEmail = fbUser.email.toLowerCase().trim();
      if (AUTHORIZED_ADMIN_EMAILS.includes(normalizedEmail)) {
        role = 'admin';
      }
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

    // 1. If Firebase is configured, perform real Firebase Authentication
    if (auth && isFirebaseConfigured()) {
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
        const profile = await this.resolveUserProfile(cred.user);

        if (profile.role !== 'admin') {
          // Reject non-admin accounts and sign out immediately
          await signOut(auth);
          throw new Error('Access denied. This account does not possess administrator privileges.');
        }

        currentUser = profile;
        localStorage.setItem('messsync_admin_session', JSON.stringify(profile));
        notifyListeners();
        return profile;
      } catch (err: any) {
        console.warn('[authService] Firebase admin authentication failed:', err.message);
        throw new Error(err.message || 'Invalid administrator credentials');
      }
    }

    // 2. Production Security Gate: Never allow demo/mock logins in production builds!
    if (import.meta.env.PROD) {
      throw new Error(
        'Production authentication error: Firebase Authentication credentials must be configured in environment variables. Demo logins are disabled in production.'
      );
    }

    // 3. Local Development / Evaluation Mode ONLY
    // Only accessible when running locally in development mode (import.meta.env.PROD === false)
    if (
      cleanEmail === 'admin@chitkara.edu.in' ||
      cleanEmail === 'messadmin@chitkara.edu.in'
    ) {
      if (pass !== 'admin123') {
        throw new Error('Invalid administrator password for local development evaluation.');
      }

      const profile: UserProfile = {
        uid: 'dev_admin_eval',
        email: cleanEmail,
        displayName: 'Mess Warden Admin (Dev)',
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
