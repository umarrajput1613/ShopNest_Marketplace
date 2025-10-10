// assets/js/app.js

import { 
  auth, db, doc, setDoc, getDoc, updateDoc, onAuthStateChanged 
} from "./firebase.js";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

/* ===== Helper: show simple alerts ===== */
function showMsg(msg) {
  alert(msg);
}

/* ===== Default user data template ===== */
const defaultUserData = {
  favorites: [],
  cart: [],
  buyHistory: [],
  sellList: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

/* ===== Signup ===== */
async function signupFunc(e) {
  if (e) e.preventDefault();

  const name = document.getElementById("signup-name")?.value.trim();
  const email = document.getElementById("signup-email")?.value.trim();
  const password = document.getElementById("signup-password")?.value;
  const confirm = document.getElementById("confirm-password")?.value;

  if (!name || !email || !password || !confirm) {
    showMsg("Please fill all fields.");
    return;
  }
  if (password !== confirm) {
    showMsg("Passwords do not match.");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: name });

    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      name,
      email,
      ...defaultUserData
    });

    showMsg("Account created successfully!");
    e.target.reset();
    window.location.href = "login.html";
  } catch (err) {
    console.error(err);
    showMsg(err.message || "Signup failed");
  }
}

/* ===== Login ===== */
async function loginFunc(e) {
  if (e) e.preventDefault();

  const email = document.getElementById("login-email")?.value.trim();
  const password = document.getElementById("login-password")?.value;

  if (!email || !password) {
    showMsg("Enter email and password.");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Fetch user doc and store locally
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const userData = docSnap.data();
      localStorage.setItem("userData", JSON.stringify(userData));
    } else {
      await setDoc(docRef, { ...defaultUserData, uid: user.uid, email: user.email });
    }

    showMsg("Login successful");
    window.location.href = "home.html";
  } catch (err) {
    console.error(err);
    showMsg(err.message || "Login failed");
  }
}

/* ===== Logout ===== */
async function logoutFunc() {
  try {
    await signOut(auth);
    localStorage.removeItem("userData");
    showMsg("Logged out successfully.");
    window.location.href = "login.html";
  } catch (err) {
    console.error(err);
    showMsg("Logout failed");
  }
}

/* ===== Load & Display User ===== */
onAuthStateChanged(auth, async (user) => {
  const currentPage = window.location.pathname.split("/").pop();
  const authPages = ["login.html", "signup.html"];
  const protectedPages = ["home.html", "cart.html", "contact.html", "about.html", "shop.html"];

  if (!user && protectedPages.includes(currentPage)) {
    window.location.href = "login.html";
    return;
  }

  if (user && authPages.includes(currentPage)) {
    window.location.href = "home.html";
    return;
  }

  if (user && document.getElementById("userEmail")) {
    document.getElementById("userEmail").textContent = user.displayName || user.email || "";
  }
});

/* ===== Sync Local to Firestore ===== */
async function syncUserData() {
  const user = auth.currentUser;
  if (!user) return;

  const localData = JSON.parse(localStorage.getItem("userData") || "{}");
  if (!localData || Object.keys(localData).length === 0) return;

  try {
    await updateDoc(doc(db, "users", user.uid), {
      ...localData,
      updatedAt: new Date().toISOString()
    });
    console.log("User data synced to Firestore");
  } catch (err) {
    console.error("Failed to sync:", err);
  }
}

/* ===== Event Listeners ===== */
document.addEventListener("DOMContentLoaded", () => {
  const createForm = document.getElementById("createAccForm");
  if (createForm) createForm.addEventListener("submit", signupFunc);

  const loginForm = document.getElementById("login-form");
  if (loginForm) loginForm.addEventListener("submit", loginFunc);

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logoutFunc);

  // Periodically sync data every 30 seconds
  setInterval(syncUserData, 30000);
});
