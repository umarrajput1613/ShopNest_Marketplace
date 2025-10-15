// =======================================================
// ✅ assets/js/firebase.js
// Centralized Firebase Config + Helper Setup (Fixed Version)
// =======================================================

// 🔥 Import Firebase SDK Modules (Latest v12+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// =======================================================
// 🔧 Firebase Config
// =======================================================
const firebaseConfig = {
  apiKey: "AIzaSyCZUQ5Y5NrUw8O8qhN8EuNgV32AqAG13pA",
  authDomain: "auth-signupflow.firebaseapp.com",
  projectId: "auth-signupflow",
  storageBucket: "auth-signupflow.firebasestorage.app",
  messagingSenderId: "179064320718",
  appId: "1:179064320718:web:65329ad731c21fc912969f",
  measurementId: "G-NYSQ6GN7RE"
};

// =======================================================
// 🚀 Initialize Firebase
// =======================================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =======================================================
// 🧠 CART — Save & Fetch from Firestore
// =======================================================

/**
 * Save or update user's cart in Firestore.
 * Creates new document if it doesn't exist.
 */
export async function saveCartToFirestore(cart) {
  const user = auth.currentUser;
  if (!user) return console.warn("⚠️ User not logged in, skipping Firestore cart save.");

  const userRef = doc(db, "users", user.uid);

  try {
    await updateDoc(userRef, {
      cart,
      updatedAt: new Date().toISOString(),
    });
    console.log("🛒 Cart updated in Firestore ✅");
  } catch (err) {
    console.warn("Document not found — creating new user doc...");
    await setDoc(userRef, {
      email: user.email,
      cart,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log("🆕 New user document created ✅");
  }
}

/**
 * Fetch user's cart from Firestore.
 * Returns [] if empty or not found.
 */
export async function getCartFromFirestore() {
  const user = auth.currentUser;
  if (!user) return [];
  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) return snap.data().cart || [];
  } catch (err) {
    console.error("❌ Failed to get Firestore cart:", err);
  }
  return [];
}

// =======================================================
// 🔄 SYNC — Local User Data ↔ Firestore
// =======================================================
export async function syncUserData() {
  const user = auth.currentUser;
  if (!user) return console.warn("⚠️ No user logged in. Sync skipped.");

  const local = JSON.parse(localStorage.getItem("userData") || "{}");
  if (!local || Object.keys(local).length === 0) return console.warn("⚠️ No local data to sync.");

  const userRef = doc(db, "users", user.uid);

  try {
    await updateDoc(userRef, {
      ...local,
      updatedAt: new Date().toISOString(),
    });
    console.log("✅ Synced user data with Firestore");
  } catch (err) {
    console.warn("User doc not found — creating new one...");
    await setDoc(userRef, {
      email: user.email,
      ...local,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log("🆕 Created user document & synced data ✅");
  }
}

// =======================================================
// 👥 Auth State Listener (optional global)
// =======================================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ Logged in:", user.email);
  } else {
    console.log("🚪 Logged out");
  }
});

// =======================================================
// 📦 Exports
// =======================================================
export {
  app,
  auth,
  db,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
};
