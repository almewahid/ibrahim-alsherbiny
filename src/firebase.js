// src/firebase.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

import { 
  getFirestore, 
  serverTimestamp,
  doc,
  setDoc,
  getDoc 
} from "firebase/firestore";

import { getStorage } from "firebase/storage";

/* --------------------------------------------------------
   نستخدم متغيرات البيئة (Environment Variables)
   لكي يعمل مع Vite + Vercel بدون أي تسريب للمفاتيح
--------------------------------------------------------- */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MSG_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

/* --------------------------------------------------------
   Initialize Firebase — كل المشاريع ستستخدم نفس النظام
--------------------------------------------------------- */
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/* --------------------------------------------------------
   Auth Helpers
--------------------------------------------------------- */

// Google Login
const googleProvider = new GoogleAuthProvider();
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

// Anonymous Login
export const signInAnon = () => signInAnonymously(auth);

// Email & Password — Register
export const signUpEmail = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);

// Email & Password — Login
export const signInEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

// Logout
export const signOutUser = () => signOut(auth);

// Watch Auth State
export const onAuthChanged = (cb) => onAuthStateChanged(auth, cb);

/* --------------------------------------------------------
   Ensure User Document in Firestore (optional)
   — لإنشاء Doc للمستخدم فقط عند التسجيل لأول مرة
--------------------------------------------------------- */
export async function ensureUserDoc(user) {
  if (!user) return;

  const docRef = doc(db, "users", user.uid);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    await setDoc(docRef, {
      uid: user.uid,
      email: user.email || null,
      provider: user.providerData[0]?.providerId || "unknown",
      createdAt: serverTimestamp()
    });
  }
}

export { serverTimestamp };
