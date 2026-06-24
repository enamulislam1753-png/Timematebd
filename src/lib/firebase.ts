import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebaseConfig';

const app = initializeApp(firebaseConfig);

const getDbInstance = () => {
  const baseOptions: any = {
    experimentalForceLongPolling: true
  };

  let cacheOptions = baseOptions;
  try {
    if (typeof window !== "undefined" && window.indexedDB) {
      cacheOptions = {
        ...baseOptions,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      };
    }
  } catch {
    // indexedDB inaccessible in iframe
  }

  // 1. Attempt named database
  if (firebaseConfig.firestoreDatabaseId) {
    try {
      return initializeFirestore(app, cacheOptions, firebaseConfig.firestoreDatabaseId);
    } catch (e) {
      console.warn("Named DB + cache init failed, trying base options:", e);
      try {
        return initializeFirestore(app, baseOptions, firebaseConfig.firestoreDatabaseId);
      } catch (e2) {
        console.warn("Named DB base init failed, trying getFirestore:", e2);
        try {
          return getFirestore(app, firebaseConfig.firestoreDatabaseId);
        } catch (e3) {
          console.warn("Named DB getFirestore failed, falling back to default DB:", e3);
        }
      }
    }
  }

  // 2. Fallback to default database "(default)"
  try {
    return initializeFirestore(app, cacheOptions);
  } catch (e) {
    console.warn("Default DB + cache init failed, trying base options:", e);
    try {
      return initializeFirestore(app, baseOptions);
    } catch (e2) {
      console.warn("Default DB base init failed, trying getFirestore:", e2);
      try {
        return getFirestore(app);
      } catch (e3) {
        console.error("Critical: Failed all Firestore initialization attempts:", e3);
        return getFirestore(app);
      }
    }
  }
};

export const db = getDbInstance();

export const auth = getAuth(app);
