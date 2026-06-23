import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebaseConfig';

const app = initializeApp(firebaseConfig);

let dbInstance;
let isIndexedDBAvailable = false;
try {
  if (typeof window !== "undefined" && window.indexedDB) {
    isIndexedDBAvailable = true;
  }
} catch (e) {
  console.warn("IndexedDB is blocked or unavailable (likely due to sandbox/iframe restrictions):", e);
}

let options: any = {
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: true
};

if (isIndexedDBAvailable) {
  try {
    options = {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      }),
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: true
    };
  } catch (e) {
    console.warn("Failed to construct persistent local cache options, using default polling:", e);
  }
}

try {
  if (firebaseConfig.firestoreDatabaseId) {
    dbInstance = initializeFirestore(app, options, firebaseConfig.firestoreDatabaseId);
  } else {
    dbInstance = initializeFirestore(app, options);
  }
} catch (e) {
  console.warn("initializeFirestore failed, attempting fallback getFirestore:", e);
  try {
    if (firebaseConfig.firestoreDatabaseId) {
      dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    } else {
      dbInstance = getFirestore(app);
    }
  } catch (err) {
    console.error("Critical: Could not initialize or get Firestore:", err);
  }
}

export const db = dbInstance;

export const auth = getAuth(app);
