// Firebase configuration with fallback variables for GitHub and Production builds.
const metaEnv = (import.meta as any).env || {};

const getVal = (val: any, fallback: string): string => {
  if (!val || typeof val !== "string" || val === "undefined" || val === "null" || val.trim() === "") {
    return fallback;
  }
  return val.trim();
};

const getDynamicDatabaseId = (): string | undefined => {
  if (metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID) {
    const val = metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID.trim();
    if (val !== "undefined" && val !== "null" && val !== "") {
      return val;
    }
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isStudioEnvironment =
      hostname.includes("run.app") ||
      hostname.includes("aistudio") ||
      hostname.includes("google") ||
      hostname.includes("localhost") ||
      hostname === "127.0.0.1";

    if (isStudioEnvironment) {
      return "ai-studio-5f44c271-9a6a-4045-92dd-bbec258d887b";
    }
  }

  return undefined; // Falls back to (default) database in production Vercel apps
};

const firebaseConfig = {
  apiKey: getVal(metaEnv.VITE_FIREBASE_API_KEY, "AIzaSyBUREZZew5XF9d_HfG7a6gFnqGCcvdpHsk"),
  authDomain: getVal(metaEnv.VITE_FIREBASE_AUTH_DOMAIN, "timamatebd.firebaseapp.com"),
  projectId: getVal(metaEnv.VITE_FIREBASE_PROJECT_ID, "timamatebd"),
  firestoreDatabaseId: getDynamicDatabaseId(),
  storageBucket: getVal(metaEnv.VITE_FIREBASE_STORAGE_BUCKET, "timamatebd.firebasestorage.app"),
  messagingSenderId: getVal(metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID, "530730807723"),
  appId: getVal(metaEnv.VITE_FIREBASE_APP_ID, "1:530730807723:web:e82711698c452972d0e2ee")
};

export default firebaseConfig;


