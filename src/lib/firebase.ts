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
    }),
    experimentalForceLongPolling: true,
    experimentalAutoDetectLongPolling: true
  };
  if (firebaseConfig.firestoreDatabaseId) {
    dbInstance = initializeFirestore(app, options, firebaseConfig.firestoreDatabaseId);
  } else {
    dbInstance = initializeFirestore(app, options);
  }
} catch (e) {
  console.warn("Firestore persistent local cache failed to initialize, falling back with long polling enabled:", e);
  const fallbackOptions = {
    experimentalForceLongPolling: true,
    experimentalAutoDetectLongPolling: true
  };
  try {
    if (firebaseConfig.firestoreDatabaseId) {
      dbInstance = initializeFirestore(app, fallbackOptions, firebaseConfig.firestoreDatabaseId);
    } else {
      dbInstance = initializeFirestore(app, fallbackOptions);
    }
  } catch (err) {
    console.warn("Could not initializeFirestore with fallback options:", err);
    if (firebaseConfig.firestoreDatabaseId) {
      dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    } else {
      dbInstance = getFirestore(app);
    }
  }
}

export const db = dbInstance;

export const auth = getAuth(app);
