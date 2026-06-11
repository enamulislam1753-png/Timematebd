// Firebase configuration with fallback variables for GitHub and Production builds.
const metaEnv = (import.meta as any).env || {};

const getDynamicDatabaseId = () => {
  if (metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID) {
    return metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID;
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // If running in Google AI Studio preview or sandbox development environment
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
  // Fall back to default database on live/production/Vercel URLs
  return undefined;
};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyBUREZZew5XF9d_HfG7a6gFnqGCcvdpHsk",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "timamatebd.firebaseapp.com",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "timamatebd",
  firestoreDatabaseId: getDynamicDatabaseId(),
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "timamatebd.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "530730807723",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "1:530730807723:web:e82711698c452972d0e2ee"
};

export default firebaseConfig;
