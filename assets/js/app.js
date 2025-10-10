/* ============================
   LocalStorage Auth + Hash + Encrypt
   Web Crypto API based
   ============================ */

/*
IMPORTANT SECURITY NOTE:
- This is client-side protection only. If attacker has access to browser devtools and your JS,
  they can eventually extract the passphrase/key and decrypt data.
- For production-grade security use a server or Firebase Auth and keep keys out of client code.
*/

/* ===== Configuration ===== */
// Passphrase used to derive AES key. For production, do NOT hardcode — fetch from server or use real auth.
const APP_PASSPHRASE = "ShopNestLocalEnc_v1#changeThis!"; // CHANGE in dev, but still insecure if in client

// PBKDF2 params
const PBKDF2_SALT = new TextEncoder().encode("ShopNestSalt_v1"); // can be constant
const PBKDF2_ITER = 100_000; // reasonable iterations
const AES_KEY_LEN = 256; // bits
const AES_IV_LEN = 12; // bytes for AES-GCM

/* ===== Helpers: encoding ===== */
function toBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
function fromBase64(b64) {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
function hexFromBuffer(buf) {
  const b = new Uint8Array(buf);
  return Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("");
}

/* ===== Crypto helpers (Web Crypto) ===== */
async function deriveKey(passphrase) {
  // Derive an AES-GCM key from passphrase using PBKDF2
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: PBKDF2_SALT,
      iterations: PBKDF2_ITER,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: AES_KEY_LEN },
    false,
    ["encrypt", "decrypt"]
  );

  return aesKey;
}

async function encryptJSON(obj) {
  const key = await deriveKey(APP_PASSPHRASE);
  const iv = crypto.getRandomValues(new Uint8Array(AES_IV_LEN));
  const plain = new TextEncoder().encode(JSON.stringify(obj));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plain
  );
  // store iv + cipher as base64 parts
  return {
    iv: toBase64(iv.buffer),
    data: toBase64(cipher)
  };
}

async function decryptJSON(encObj) {
  try {
    const key = await deriveKey(APP_PASSPHRASE);
    const ivBuf = fromBase64(encObj.iv);
    const cipherBuf = fromBase64(encObj.data);
    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(ivBuf) },
      key,
      cipherBuf
    );
    const jsonStr = new TextDecoder().decode(plainBuf);
    return JSON.parse(jsonStr);
  } catch (err) {
    // decryption failed
    console.error("Decrypt failed:", err);
    throw new Error("Decryption failed");
  }
}

/* ===== Hash helper: SHA-256 (returns hex) ===== */
async function sha256Hex(str) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(str));
  return hexFromBuffer(buf);
}

/* ===== Storage helpers with encryption wrapper ===== */
async function saveUsersEncrypted(usersArray) {
  const enc = await encryptJSON(usersArray);
  // store as JSON string containing iv and data
  localStorage.setItem("users_enc", JSON.stringify(enc));
  // remove legacy plain key if present
  localStorage.removeItem("users");
}

async function loadUsersDecrypted() {
  const encStr = localStorage.getItem("users_enc");
  if (!encStr) {
    // Fallback: support old plain storage (for migration)
    const plain = localStorage.getItem("users");
    if (plain) {
      try {
        const arr = JSON.parse(plain);
        // Immediately re-encrypt and save
        await saveUsersEncrypted(arr);
        localStorage.removeItem("users");
        return arr;
      } catch (e) {
        return [];
      }
    }
    return [];
  }
  // parse and decrypt
  const encObj = JSON.parse(encStr);
  return await decryptJSON(encObj);
}

/* ===== Utility: show alert ===== */
function showMsg(msg) {
  alert(msg);
}

/* ===== Signup Logic (hash + encrypt) ===== */
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

  // Hash password (one-way)
  const hashed = await sha256Hex(password);

  // Load current users (decrypted)
  let users = [];
  try {
    users = await loadUsersDecrypted();
  } catch (err) {
    showMsg("Unable to load users (possible corruption).");
    return;
  }

  // Check existing
  if (users.some(u => u.email === email)) {
    showMsg("User already exists. Please login.");
    window.location.href = "login.html";
    return;
  }

  const newUser = {
    name,
    email,
    passwordHash: hashed,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);

  // Save encrypted
  try {
    await saveUsersEncrypted(users);
    showMsg("Account created successfully!");
    e.target.reset();
    window.location.href = "login.html";
  } catch (err) {
    console.error(err);
    showMsg("Failed to save user.");
  }
}

/* ===== Login Logic (decrypt + compare hash) ===== */
async function loginFunc(e) {
  if (e) e.preventDefault();

  const email = document.getElementById("login-email")?.value.trim();
  const password = document.getElementById("login-password")?.value;

  if (!email || !password) {
    showMsg("Please enter email and password.");
    return;
  }

  let users = [];
  try {
    users = await loadUsersDecrypted();
  } catch (err) {
    showMsg("Unable to read user database.");
    return;
  }

  // Hash submitted password and compare with stored hash
  const hashed = await sha256Hex(password);
  const user = users.find(u => u.email === email && u.passwordHash === hashed);

  if (!user) {
    showMsg("Invalid email or password.");
    return;
  }

  // Save logged in user (we'll save only minimal public info)
  const sessionUser = {
    name: user.name,
    email: user.email,
    loggedAt: new Date().toISOString()
  };

  // session storage might be slightly safer lifetime-wise than localStorage
  sessionStorage.setItem("loggedInUser", JSON.stringify(sessionUser));
  showMsg(`Welcome back, ${user.name}!`);
  window.location.href = "home.html";
}

/* ===== Logout (clear session) ===== */
function logoutFunc() {
  sessionStorage.removeItem("loggedInUser");
  showMsg("Logged out.");
  window.location.href = "login.html";
}

/* ===== Auth Guard (protect pages) ===== */
async function checkAuth() {
  const currentPage = window.location.pathname.split("/").pop();
  const authPages = ["login.html", "signup.html"];
  const protectedPages = ["home.html", "cart.html", "contact.html", "about.html", "shop.html"];

  const sessionUser = JSON.parse(sessionStorage.getItem("loggedInUser") || "null");

  // Not logged in & on protected -> redirect
  if (!sessionUser && protectedPages.includes(currentPage)) {
    window.location.href = "login.html";
    return;
  }

  // Logged in & on auth pages -> redirect
  if (sessionUser && authPages.includes(currentPage)) {
    window.location.href = "home.html";
    return;
  }

  // Show username on home
  if (sessionUser && document.getElementById("userEmail")) {
    document.getElementById("userEmail").textContent = sessionUser.name || sessionUser.email;
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

  // Run auth guard
  checkAuth();
});
