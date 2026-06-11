import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebaseConfig';

const app = initializeApp(firebaseConfig);

let dbInstance;
try {
  const options = {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  };
  if (firebaseConfig.firestoreDatabaseId) {
    dbInstance = initializeFirestore(app, options, firebaseConfig.firestoreDatabaseId);
  } else {
    dbInstance = initializeFirestore(app, options);
  }
} catch (e) {
  console.warn("Firestore persistent local cache failed to initialize, falling back to standard Firestore:", e);
  if (firebaseConfig.firestoreDatabaseId) {
    dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } else {
    dbInstance = getFirestore(app);
  }
}

export const db = dbInstance;

export const auth = getAuth(app);
