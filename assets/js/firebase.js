


import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js"; // optional

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCZUQ5Y5NrUw8O8qhN8EuNgV32AqAG13pA",
  authDomain: "auth-signupflow.firebaseapp.com",
  projectId: "auth-signupflow",
  storageBucket: "auth-signupflow.firebasestorage.app",
  messagingSenderId: "179064320718",
  appId: "1:179064320718:web:65329ad731c21fc912969f",
  measurementId: "G-NYSQ6GN7RE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
// const analytics = getAnalytics(app); // only if needed

// Export services for use in other files
export { app, auth, db };
