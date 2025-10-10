// assets/js/firebase.js

// Import Firebase SDK modules
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

// ================================
// ✅ Your Firebase Configuration
// ================================
const firebaseConfig = {
  apiKey: "AIzaSyCZUQ5Y5NrUw8O8qhN8EuNgV32AqAG13pA",
  authDomain: "auth-signupflow.firebaseapp.com",
  projectId: "auth-signupflow",
  storageBucket: "auth-signupflow.firebasestorage.app",
  messagingSenderId: "179064320718",
  appId: "1:179064320718:web:65329ad731c21fc912969f",
  measurementId: "G-NYSQ6GN7RE"
};

// ================================
// 🔥 Initialize Firebase
// ================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================================
// ✅ Export everything needed
// ================================
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
