import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyC8M6V8PKbJsFfcMRSnVi0x873_SMEKNQ8",
  authDomain: "doremi-2d517.firebaseapp.com",
  projectId: "doremi-2d517",
  storageBucket: "doremi-2d517.firebasestorage.app",
  messagingSenderId: "803709642649",
  appId: "1:803709642649:web:3b42db5db20865348d9508",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "asia-northeast1");
export const googleProvider = new GoogleAuthProvider();
