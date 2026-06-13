// Firebase configuration with fallback variables for GitHub and Production builds.

const getVal = (val: any, fallback: string): string => {
  if (!val || typeof val !== "string" || val === "undefined" || val === "null" || val.trim() === "") {
    return fallback;
  }
  return val.trim();
};

const getDynamicDatabaseId = (): string | undefined => {
  if (import.meta.env && import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID) {
    const val = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID.trim();
    if (val !== "undefined" && val !== "null" && val !== "") {
      return val;
    }
  }

  // Always fallback to the correct registered database ID so that data loads perfectly in both local, preview, and Vercel production environments.
  return "ai-studio-5f44c271-9a6a-4045-92dd-bbec258d887b";
};

const firebaseConfig = {
  apiKey: getVal(import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY, "AIzaSyBUREZZew5XF9d_HfG7a6gFnqGCcvdpHsk"),
  authDomain: getVal(import.meta.env && import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, "timamatebd.firebaseapp.com"),
  projectId: getVal(import.meta.env && import.meta.env.VITE_FIREBASE_PROJECT_ID, "timamatebd"),
  firestoreDatabaseId: getDynamicDatabaseId(),
  storageBucket: getVal(import.meta.env && import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, "timamatebd.firebasestorage.app"),
  messagingSenderId: getVal(import.meta.env && import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, "530730807723"),
  appId: getVal(import.meta.env && import.meta.env.VITE_FIREBASE_APP_ID, "1:530730807723:web:e82711698c452972d0e2ee")
};

export default firebaseConfig;


