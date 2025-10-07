/* ============================
   Local Storage Auth System
   ============================ */

// Utility: show alert
function showMsg(msg) {
  alert(msg);
}

/* ===== Signup Logic ===== */
function signupFunc(e) {
  e.preventDefault();

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

  let users = JSON.parse(localStorage.getItem("users")) || [];

  // Check if user already exists
  if (users.some((u) => u.email === email)) {
    showMsg("User already exists! Please login.");
    window.location.href = "login.html";
    return;
  }

  // Add new user
  const newUser = { name, email, password };
  users.push(newUser);
  localStorage.setItem("users", JSON.stringify(users));

  showMsg("Account created successfully!");
  e.target.reset();
  window.location.href = "login.html";
}

/* ===== Login Logic ===== */
function loginFunc(e) {
  e.preventDefault();

  const email = document.getElementById("login-email")?.value.trim();
  const password = document.getElementById("login-password")?.value;

  if (!email || !password) {
    showMsg("Please enter email and password.");
    return;
  }

  const users = JSON.parse(localStorage.getItem("users")) || [];
  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    showMsg("Invalid email or password.");
    return;
  }

  // Save logged in user
  localStorage.setItem("loggedInUser", JSON.stringify(user));
  showMsg(`Welcome, ${user.name}!`);
  window.location.href = "home.html";
}

/* ===== Logout Logic ===== */
function logoutFunc() {
  localStorage.removeItem("loggedInUser");
  showMsg("You have been logged out.");
  window.location.href = "login.html";
}

/* ===== Auth Guard ===== */
function checkAuth() {
  const loggedUser = JSON.parse(localStorage.getItem("loggedInUser"));
  const currentPage = window.location.pathname.split("/").pop();

  const authPages = ["login.html", "signup.html"];
  const protectedPages = [
    "home.html",
    "cart.html",
    "contact.html",
    "about.html",
    "shop.html"
  ];

  // If not logged in & on protected page → redirect to login
  if (!loggedUser && protectedPages.includes(currentPage)) {
    window.location.href = "login.html";
  }

  // If logged in & on auth page → redirect to home
  if (loggedUser && authPages.includes(currentPage)) {
    window.location.href = "home.html";
  }

  // Display username on home page if logged in
  if (loggedUser && document.getElementById("userEmail")) {
    document.getElementById("userEmail").textContent = loggedUser.name;
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

  checkAuth(); // Always run on load
});
