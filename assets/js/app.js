/* ===== Helper: show simple alerts ===== */
function showMsg(msg) {
  alert(msg);
}

/* ===== Signup ===== */
function signupFunc(e) {
  if (e) e.preventDefault();

  const nameEl = document.getElementById("signup-name");
  const emailEl = document.getElementById("signup-email");
  const passwordEl = document.getElementById("signup-password");
  const confirmEl = document.getElementById("confirm-password");

  const name = nameEl?.value?.trim();
  const email = emailEl?.value?.trim();
  const password = passwordEl?.value;
  const confirm = confirmEl?.value;

  // Step 1: Validation - check empty fields
  if (!name || !email || !password) {
    showMsg("Please fill all fields.");
    return;
  }

  // Step 2: Validation - check password match
  if (password !== confirm) {
    showMsg("Password and Confirm Password do not match.");
    return;
  }

  // Step 3: Check if user already exists
  const existingUser = JSON.parse(localStorage.getItem("userData"));
  if (existingUser && existingUser.email === email) {
    showMsg("User already exists! Please login instead.");
    window.location.href = "login.html";
    return;
  }

  // Step 4: Create user object
  const user = {
    name: name,
    email: email,
    password: password,
    createdAt: new Date().toISOString(),
  };

  // Step 5: Save to localStorage
  localStorage.setItem("userData", JSON.stringify(user));

  showMsg("Signup successful — you can now login.");

  // Step 6: Clear form
  nameEl.value = emailEl.value = passwordEl.value = confirmEl.value = "";

  // Step 7: Redirect to login
  window.location.href = "login.html";
}

/* ===== Login ===== */
function loginFunc(e) {
  if (e) e.preventDefault();

  const email = document.getElementById("login-email")?.value?.trim();
  const password = document.getElementById("login-password")?.value;

  // Step 1: Check if fields are empty
  if (!email || !password) {
    showMsg("Enter email and password.");
    return;
  }

  // Step 2: Get user data from localStorage
  const storedUser = JSON.parse(localStorage.getItem("userData"));
  if (!storedUser) {
    showMsg("No account found. Please sign up first.");
    window.location.href = "signup.html";
    return;
  }

  // Step 3: Match credentials
  if (storedUser.email === email && storedUser.password === password) {
    localStorage.setItem("isLoggedIn", "true");
    showMsg("Login successful!");
    window.location.href = "index.html";
  } else {
    showMsg("Invalid email or password.");
  }
}

/* ===== Logout ===== */
function logoutFunc() {
  localStorage.removeItem("isLoggedIn");
  showMsg("Logged out successfully!");
  window.location.href = "login.html";
}

/* ===== Auth state listener (like onAuthStateChanged) ===== */
document.addEventListener("DOMContentLoaded", () => {
  const onAuthPages =
    !!document.getElementById("login-form") ||
    !!document.getElementById("createAccForm");
  const onHomePage = !!document.getElementById("homePage");

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const userData = JSON.parse(localStorage.getItem("userData"));

  // If on home page and not logged in -> redirect to login
  if (!isLoggedIn && onHomePage) {
    window.location.href = "login.html";
  }

  // If logged in and currently on login/signup, redirect to home
  if (isLoggedIn && onAuthPages) {
    window.location.href = "index.html";
  }

  // If on home page and logged in, show user info
  if (isLoggedIn && onHomePage && userData) {
    const el = document.getElementById("userEmail");
    if (el) el.textContent = userData.name || userData.email || "";
  }

  // ===== Attach form listeners =====
  const createForm = document.getElementById("createAccForm");
  if (createForm) createForm.addEventListener("submit", signupFunc);

  const loginForm = document.getElementById("login-form");
  if (loginForm) loginForm.addEventListener("submit", loginFunc);

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logoutFunc);
});
