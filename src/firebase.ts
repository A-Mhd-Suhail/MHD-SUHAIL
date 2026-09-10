import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// MHD Hospital — existing Firebase project (same data as the original app)
const firebaseConfig = {
  apiKey: "AIzaSyBXdkeWIoIlMEa5DWIrE4yHuI_jHTeM1mo",
  authDomain: "every-life-matters-8aca8.firebaseapp.com",
  projectId: "every-life-matters-8aca8",
  storageBucket: "every-life-matters-8aca8.firebasestorage.app",
  messagingSenderId: "471031101690",
  appId: "1:471031101690:web:56f82fae6aa0287e787143",
  measurementId: "G-4K1CNF2MZ7",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth
const auth = getAuth(app);

// Initialize Analytics (only in supported environments)
let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

export { app, db, auth, analytics };
