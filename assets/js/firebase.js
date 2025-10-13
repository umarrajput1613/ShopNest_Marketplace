// =======================================================
// ✅ assets/js/firebase.js
// Centralized Firebase Config + Helper Setup
// =======================================================

// Import Firebase SDK Modules (Latest v12+)
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
// 🔥 Your Firebase Configuration (Project Settings → Config)
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
// 🚀 Initialize Firebase Core Services
// =======================================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =======================================================
// 🧠 Firestore Helper Functions
// =======================================================

/**
 * Save or update user's cart in Firestore.
 * Automatically merges if the document already exists.
 */
export async function saveCartToFirestore(cart) {
  const user = auth.currentUser;
  if (!user) return console.warn("User not logged in, skipping Firestore cart save.");

  const userRef = doc(db, "users", user.uid);

  try {
    await updateDoc(userRef, {
      cart,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    // If user document doesn't exist, create one
    await setDoc(userRef, {
      email: user.email,
      cart,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
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
    console.error("Failed to get Firestore cart:", err);
  }
  return [];
}

// =======================================================
// 🧩 Auth State Listener (optional global use)
// =======================================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ User logged in:", user.email);
  } else {
    console.log("🚪 User logged out");
  }
});

// =======================================================
// ✅ Exports
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
