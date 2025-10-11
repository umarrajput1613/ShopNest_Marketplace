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

/* ===== Path-Safe Redirect Helper ===== */
function goTo(page) {
  window.location.href = `../pages/${page}`;
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
    goTo("home.html");
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
    goTo("home.html");
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
  goTo("login.html");
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

/* ===== Restore Data from Firestore ===== */
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

  // ✅ 1. Handle index.html logic
  if (page === "index.html" || page === "") {
    const localUser = localStorage.getItem("userData");

    if (user) {
      goTo("home.html");
    } else if (!localUser) {
      // first-time visitor → signup
      setTimeout(() => goTo("signup.html"), 2000);
    } else {
      // returning visitor → login
      setTimeout(() => goTo("login.html"), 2000);
    }
    return;
  }

  // ✅ 2. Handle protected + auth pages
  if (!user && protectedPages.includes(page)) {
    goTo("login.html");
    return;
  }

  if (user && authPages.includes(page)) {
    goTo("home.html");
    return;
  }

  // ✅ 3. Auto-restore user data
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

  setInterval(syncUserData, 30000);
  window.addEventListener("beforeunload", syncUserData);
});
// Section for API Fetch
/*======================== sectionforapifetcsystemfunctionality =====================================*/

// Section for API Fetch
/*======================== sectionforapifetcsystemfunctionality =====================================*/

document.addEventListener("DOMContentLoaded", async () => {
  const bestSellerContainer = document.getElementById("best-sellers");
  const categoryCards = document.querySelectorAll(".category-card");
  let allProducts = [];
  let currentCategory = "all";

  // ===== Fetch All Products from Fake API =====
  try {
    const res = await fetch("https://fakestoreapi.com/products"); // no limit
    allProducts = await res.json();
    renderProducts(allProducts); // show all initially
  } catch (err) {
    console.error("Best sellers load error:", err);
    bestSellerContainer.innerHTML = `<p class="text-center text-danger w-100">Failed to load products.</p>`;
  }

  // ===== Render Products =====
  function renderProducts(products) {
    if (!products.length) {
      bestSellerContainer.innerHTML = `<p class="text-center text-muted w-100">No products found for this category.</p>`;
      return;
    }

    bestSellerContainer.innerHTML = products
      .map(
        (p) => `
      <div class="col">
        <div class="card product-card h-100 shadow-sm border-1 rounded-4">
          <img src="${p.image}" class="card-img-top" alt="${p.title}"
               style="height:180px; object-fit:contain; background:#f8f9fa;">
          <div class="card-body text-center">
            <p class="mb-1 small text-primary fw-bold text-capitalize">${p.category}</p>
            <h5 class="product-title">${p.title}</h5>
            <p class="small text-muted">${p.description.substring(0, 70)}...</p>
            <p class="product-price fw-bold text-success mb-1">$${p.price}</p>
            <p class="mb-2">⭐ ${(Math.random() * 2 + 3).toFixed(1)} / 5</p>
            <a href="#" class="btn btn-sm btn-add-to-cart text-white w-100" style="background:#0d6efd;">
              <i class="bi bi-cart-fill me-1"></i> Add to Cart
            </a>
          </div>
        </div>
      </div>`
      )
      .join("");
  }

  // ===== Category Filter Logic =====
  categoryCards.forEach((card) => {
    card.addEventListener("click", (e) => {
      e.preventDefault();

      const selectedCategory = card.querySelector("h5").textContent.trim().toLowerCase();
      currentCategory = selectedCategory;

      // Normalize spelling (handle "jewelery" vs "jewelry")
      const normalizeCategory = (cat) => {
        if (cat.includes("jewelery") || cat.includes("jewelry")) return "jewelery";
        return cat;
      };

      const normalizedSelected = normalizeCategory(selectedCategory);

      if (normalizedSelected === "all" || normalizedSelected === "") {
        renderProducts(allProducts);
      } else {
        const filtered = allProducts.filter((p) => {
          const normalizedAPIcat = normalizeCategory(p.category.toLowerCase());
          return normalizedAPIcat.includes(normalizedSelected);
        });
        renderProducts(filtered);
      }

      // Smooth scroll to product section
      document.querySelector("#best-sellers-section").scrollIntoView({ behavior: "smooth" });
    });
  });
});
