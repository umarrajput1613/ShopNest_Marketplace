// assets/js/app.js
import {
  auth, db, doc, setDoc, getDoc, updateDoc,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, updateProfile, onAuthStateChanged
} from "./firebase.js";

/* ===== Helper Alert ===== */
function showMsg(msg) {
  alert(msg);
}

/* ===== Default Template ===== */
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
  e.preventDefault();
  const name = document.getElementById("signup-name")?.value.trim();
  const email = document.getElementById("signup-email")?.value.trim();
  const password = document.getElementById("signup-password")?.value;
  const confirm = document.getElementById("confirm-password")?.value;

  if (!name || !email || !password || !confirm) return showMsg("Fill all fields.");
  if (password !== confirm) return showMsg("Passwords do not match.");

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCred.user, { displayName: name });

    await setDoc(doc(db, "users", userCred.user.uid), {
      uid: userCred.user.uid,
      name, email,
      ...defaultUserData
    });

    localStorage.setItem("userData", JSON.stringify({
      uid: userCred.user.uid,
      name, email,
      ...defaultUserData
    }));

    showMsg("Account created successfully!");
    window.location.href = "home.html";
  } catch (err) {
    console.error(err);
    showMsg(err.message);
  }
}

/* ===== Login ===== */
async function loginFunc(e) {
  e.preventDefault();
  const email = document.getElementById("login-email")?.value.trim();
  const password = document.getElementById("login-password")?.value;

  if (!email || !password) return showMsg("Enter email and password.");

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const ref = doc(db, "users", userCred.user.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      localStorage.setItem("userData", JSON.stringify(snap.data()));
    } else {
      await setDoc(ref, { uid: userCred.user.uid, email, ...defaultUserData });
    }

    showMsg("Login successful!");
    window.location.href = "home.html";
  } catch (err) {
    console.error(err);
    showMsg(err.message);
  }
}

/* ===== Logout ===== */
async function logoutFunc() {
  await signOut(auth);
  localStorage.removeItem("userData");
  showMsg("Logged out.");
  window.location.href = "login.html";
}

/* ===== Sync Local → Firestore ===== */
async function syncUserData() {
  const user = auth.currentUser;
  if (!user) return;

  const local = JSON.parse(localStorage.getItem("userData") || "{}");
  if (!local || Object.keys(local).length === 0) return;

  try {
    await updateDoc(doc(db, "users", user.uid), {
      ...local,
      updatedAt: new Date().toISOString()
    });
    console.log("Synced user data ✅");
  } catch (err) {
    console.error("Sync failed:", err);
  }
}

/* ===== Restore Data from Firestore (If Missing) ===== */
async function restoreUserData(user) {
  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      localStorage.setItem("userData", JSON.stringify(snap.data()));
      console.log("Restored data from Firestore.");
    }
  } catch (err) {
    console.error("Failed to restore:", err);
  }
}

/* ===== Auth State Logic ===== */
onAuthStateChanged(auth, async (user) => {
  const page = window.location.pathname.split("/").pop();
  const authPages = ["login.html", "signup.html"];
  const protectedPages = ["home.html", "cart.html", "about.html", "contact.html", "shop.html"];

  if (!user && protectedPages.includes(page)) {
    window.location.href = "login.html";
    return;
  }

  if (user && authPages.includes(page)) {
    window.location.href = "home.html";
    return;
  }

  if (user) {
    if (!localStorage.getItem("userData")) {
      await restoreUserData(user);
    }
    if (document.getElementById("userEmail")) {
      document.getElementById("userEmail").textContent = user.displayName || user.email;
    }
  }
});

/* ===== Event Listeners ===== */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("createAccForm")?.addEventListener("submit", signupFunc);
  document.getElementById("login-form")?.addEventListener("submit", loginFunc);
  document.getElementById("logoutBtn")?.addEventListener("click", logoutFunc);

  // Sync every 30 seconds
  setInterval(syncUserData, 30000);

  // Final sync before closing window
  window.addEventListener("beforeunload", syncUserData);
});
