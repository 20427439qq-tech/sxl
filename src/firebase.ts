import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, onSnapshot, deleteDoc, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

let app;
try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export const auth = app ? getAuth(app) : null as any;
export const db = app ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : null as any;

export const signInWithCredentials = async (username: string, password: string) => {
  if (username === 'wfwd' && password === 'wfwd1031') {
    if (auth) {
      return signInAnonymously(auth);
    }
    return Promise.reject("Auth not initialized");
  }
  return Promise.reject("Invalid credentials");
};

export const logout = () => auth ? auth.signOut() : Promise.reject("Auth not initialized");

// Test connection
async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
