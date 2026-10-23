import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInAnonymously,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import appletConfig from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || appletConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || appletConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || appletConfig.appId,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;
  if (!app) {
    if (getApps().length > 0) {
      app = getApp();
    } else {
      try {
        app = initializeApp(firebaseConfig);
      } catch (err) {
        console.warn('Firebase init notice:', err);
        return null;
      }
    }
  }
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const fApp = getFirebaseApp();
  if (!fApp) return null;
  if (!auth) {
    try {
      auth = getAuth(fApp);
    } catch {
      return null;
    }
  }
  return auth;
}

export function getFirebaseDb(): Firestore | null {
  const fApp = getFirebaseApp();
  if (!fApp) return null;
  if (!db) {
    try {
      const dbId = appletConfig.firestoreDatabaseId;
      db = dbId && dbId !== '(default)' ? getFirestore(fApp, dbId) : getFirestore(fApp);
    } catch {
      return null;
    }
  }
  return db;
}

export function getFirebaseStorage(): FirebaseStorage | null {
  const fApp = getFirebaseApp();
  if (!fApp) return null;
  if (!storage) {
    try {
      storage = getStorage(fApp);
    } catch {
      return null;
    }
  }
  return storage;
}

export const googleProvider = new GoogleAuthProvider();

/**
 * Ensures a valid authenticated user session (anonymous or authenticated)
 * to comply with Firestore and Storage security rules without blocking offline usage.
 */
export async function ensureAuthenticatedUser(): Promise<FirebaseUser | null> {
  const a = getFirebaseAuth();
  if (!a) return null;

  if (a.currentUser) {
    return a.currentUser;
  }

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(a, async (user) => {
      unsubscribe();
      if (user) {
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(a);
          resolve(cred.user);
        } catch (err) {
          console.warn('Anonymous sign-in skipped, local-first mode active:', err);
          resolve(null);
        }
      }
    });
  });
}

export async function testFirestoreConnection(): Promise<boolean> {
  const database = getFirebaseDb();
  if (!database) return false;
  try {
    await getDocFromServer(doc(database, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline, using IndexedDB local-first storage.');
    }
    return false;
  }
}
