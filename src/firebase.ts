import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// MHD Hospital — Firebase config from env vars, with the original app's
// project (every-life-matters-8aca8) as fallback so the portals work
// even when .env is not available (e.g. on Vercel).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBXdkeWIoIlMEa5DWIrE4yHuI_jHTeM1mo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "every-life-matters-8aca8.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "every-life-matters-8aca8",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "every-life-matters-8aca8.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "471031101690",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:471031101690:web:56f82fae6aa0287e787143",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth
const auth = getAuth(app);

// Analytics is optional and adds bundle weight — load it lazily, only in
// environments where it is actually supported (never in the critical path).
if (typeof window !== 'undefined' && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  import('firebase/analytics')
    .then(({ getAnalytics, isSupported }) => isSupported().then((ok) => ok && getAnalytics(app)))
    .catch(() => { /* analytics is best-effort only */ });
}

export { app, db, auth };
