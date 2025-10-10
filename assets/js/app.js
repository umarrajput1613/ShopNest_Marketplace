
import { db, auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

/* ===== Helper: show simple alerts ===== */
function showMsg(msg) {
  alert(msg);
}

/* ===== Signup ===== */
async function signupFunc(e) {
  if (e) e.preventDefault();

  const nameEl = document.getElementById("signup-name");
  const emailEl = document.getElementById("signup-email");
  const passwordEl = document.getElementById("signup-password");
  const confirmEl = document.getElementById("confirm-password");

  const name = nameEl?.value?.trim();
  const email = emailEl?.value?.trim();
  const password = passwordEl?.value;
  const confirm = confirmEl?.value;

  if (!name || !email || !password) {
    showMsg("Please fill all fields.");
    return;
  }
  if (password !== confirm) {
    showMsg("Password and Confirm Password do not match.");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

   
    await updateProfile(user, {
      displayName: name
    });

   
    await addDoc(collection(db, "users"), {
      uid: user.uid,
      name,
      email,
      createdAt: serverTimestamp()
    });

    showMsg("Signup successful — you can now login.");
    // clear form
    nameEl.value = emailEl.value = passwordEl.value = confirmEl.value = "";
    // redirect to login
    window.location.href = "login.html";
  } catch (err) {
    console.error(err);
    showMsg(err.message || "Signup failed");
  }
}

/* ===== Login ===== */
async function loginFunc(e) {
  if (e) e.preventDefault();

  const email = document.getElementById("login-email")?.value?.trim();
  const password = document.getElementById("login-password")?.value;

  if (!email || !password) {
    showMsg("Enter email and password.");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    showMsg("Login successful");
    window.location.href = "index.html";
  } catch (err) {
    console.error(err);
    showMsg(err.message || "Login failed");
  }
}

/* ===== Logout ===== */
async function logoutFunc() {
  try {
    await signOut(auth);
    showMsg("Logged out");
    window.location.href = "login.html";
  } catch (err) {
    console.error(err);
    showMsg("Logout failed");
  }
}

/* ===== Auth state listener ===== */
onAuthStateChanged(auth, (user) => {
  const onAuthPages = !!document.getElementById("login-form") || !!document.getElementById("createAccForm");
  const onHomePage = !!document.getElementById("homePage");

  // If on home and not logged in -> send to login
  if (!user && onHomePage) {
    window.location.href = "login.html";
  }

  // If logged in and currently on login/signup, redirect to home
  if (user && onAuthPages) {
    window.location.href = "index.html";
  }

  // If on home page and user exists, show email/name
  if (user && onHomePage) {
    const el = document.getElementById("userEmail");
    if (el) el.textContent = user.displayName || user.email || "";
  }
});

/* ===== Attach event listeners ===== */
document.addEventListener("DOMContentLoaded", () => {
  const createForm = document.getElementById("createAccForm");
  if (createForm) createForm.addEventListener("submit", signupFunc);

  const loginForm = document.getElementById("login-form");
  if (loginForm) loginForm.addEventListener("submit", loginFunc);

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logoutFunc);
});
