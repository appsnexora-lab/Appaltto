import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-altto-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'altto-christian-reading.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'altto-christian-reading',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'altto-christian-reading.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;
  if (!app) {
    if (getApps().length > 0) {
      app = getApp();
    } else {
      try {
        app = initializeApp(firebaseConfig);
      } catch (err) {
        console.warn('Firebase init deferred or in offline mode:', err);
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
      db = getFirestore(fApp);
    } catch {
      return null;
    }
  }
  return db;
}

export const googleProvider = new GoogleAuthProvider();

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
