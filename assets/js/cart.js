// =======================================================
// ✅ cart.js — Firestore + LocalStorage + Coupon + Sync + Your Collection Display
// =======================================================

import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onAuthStateChanged,
} from "./firebase.js";

/* ===== Helper ===== */
function showMsg(msg) {
  alert(msg);
}

/* ===== Local User Data ===== */
function getLocalUser() {
  return JSON.parse(localStorage.getItem("userData") || "{}");
}
function setLocalUser(data) {
  localStorage.setItem("userData", JSON.stringify(data));
}
function clearLocalUser() {
  localStorage.removeItem("userData");
}

/* ===== Firestore → Local Sync ===== */
async function syncUserData() {
  const user = auth.currentUser;
  if (!user) return clearLocalUser();
  const cartSnap = await getUserCart(user.uid);
  setLocalUser({ uid: user.uid, email: user.email, cart: cartSnap });
}

/* ===== Fetch Cart (Firestore Subcollection) ===== */
async function getUserCart(uid) {
  const cartItems = [];
  try {
    const { getDocs, collection } = await import(
      "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js"
    );
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: auth.currentUser.email,
        createdAt: new Date().toISOString(),
      });
    }
    const cartSnap = await getDocs(collection(db, "users", uid, "cart"));
    cartSnap.forEach((d) => cartItems.push({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("❌ Fetch cart error:", err);
  }
  return cartItems;
}

/* ===== Save Cart (Firestore + LocalStorage) ===== */
async function saveCart(updatedCart) {
  const user = auth.currentUser;
  if (!user) return showMsg("Login required.");

  try {
    const { setDoc, deleteDoc, collection, doc: subDoc, getDocs } = await import(
      "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js"
    );
    const oldSnap = await getDocs(collection(db, "users", user.uid, "cart"));
    const promises = [];
    oldSnap.forEach((d) => promises.push(deleteDoc(d.ref)));
    await Promise.all(promises);

    for (const item of updatedCart) {
      const itemId = String(item.id || Date.now());
      const ref = subDoc(db, "users", user.uid, "cart", itemId);
      await setDoc(ref, {
        id: itemId,
        title: item.title || "Untitled",
        price: Number(item.price) || 0,
        thumbnail: item.thumbnail || "",
        qty: Number(item.qty) || 1,
        updatedAt: new Date().toISOString(),
        userId: user.uid,
      });
    }

    const userKey = `cart_${user.email}`;
    localStorage.setItem(userKey, JSON.stringify(updatedCart));
    const local = getLocalUser();
    local.cart = updatedCart;
    setLocalUser(local);
  } catch (error) {
    console.error("❌ Save cart error:", error);
    showMsg("Failed to save cart. Check console.");
  }
}

/* ===== Load Cart From Local ===== */
function loadLocalCart() {
  const user = auth.currentUser;
  if (!user) return [];
  const userKey = `cart_${user.email}`;
  return JSON.parse(localStorage.getItem(userKey) || "[]");
}

/* ===== Coupon System ===== */
let appliedCoupon = null;
function applyCoupon(subtotal) {
  if (appliedCoupon === "SHOP15") {
    return subtotal * 0.85; // 15% discount
  }
  return subtotal;
}

/* ===== Render Cart Table (Main Cart Page) ===== */
function renderCart() {
  const cartTable = document.getElementById("cart-table-body");
  const summary = document.getElementById("order-summary");
  const couponInput = document.getElementById("coupon-input");
  const applyBtn = document.getElementById("apply-btn");

  const local = getLocalUser();
  const cart = local.cart?.length ? local.cart : loadLocalCart();

  if (!cartTable || !summary) return;

  if (!cart.length) {
    cartTable.innerHTML =
      `<tr><td colspan="5" class="text-center text-muted">Your cart is empty.</td></tr>`;
    summary.innerHTML = "";
    return;
  }

  let subtotal = 0;
  cartTable.innerHTML = cart
    .map((item, i) => {
      const total = item.price * item.qty;
      subtotal += total;
      return `
        <tr>
          <td>${item.title}</td>
          <td>Rs. ${item.price.toLocaleString()}</td>
          <td>
            <input type="number" min="1" value="${item.qty}" data-index="${i}" class="form-control qty-input" style="width:70px;">
          </td>
          <td>Rs. ${(item.price * item.qty).toLocaleString()}</td>
          <td><button class="btn btn-sm btn-danger remove-item" data-index="${i}">🗑</button></td>
        </tr>`;
    })
    .join("");

  const shipping = subtotal > 0 ? 250 : 0;
  const tax = subtotal * 0.02;
  let total = subtotal + shipping + tax;

  // Apply coupon if any
  if (appliedCoupon === "SHOP15") {
    total = applyCoupon(subtotal + shipping + tax);
  }

  summary.innerHTML = `
    <p>Subtotal: Rs. ${subtotal.toLocaleString()}</p>
    <p>Shipping: Rs. ${shipping.toLocaleString()}</p>
    <p>Tax: Rs. ${tax.toFixed(0)}</p>
    ${appliedCoupon ? `<p class="text-success">Coupon (15% off): -${(subtotal * 0.15).toFixed(0)}</p>` : ""}
    <hr>
    <p class="fw-bold">Total: Rs. ${total.toLocaleString()}</p>
    <button id="proceedBtn" class="btn btn-primary w-100 mt-2">Proceed to Checkout</button>
  `;

  // --- Quantity Update ---
  document.querySelectorAll(".qty-input").forEach((inp) => {
    inp.addEventListener("change", async (e) => {
      const index = e.target.dataset.index;
      cart[index].qty = parseInt(e.target.value) || 1;
      await saveCart(cart);
      renderCart();
    });
  });

  // --- Remove Item ---
  document.querySelectorAll(".remove-item").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const index = e.target.dataset.index;
      cart.splice(index, 1);
      await saveCart(cart);
      renderCart();
    });
  });

  // --- Apply Coupon ---
  applyBtn?.addEventListener("click", () => {
    const code = couponInput.value.trim().toUpperCase();
    if (code === "SHOP15") {
      appliedCoupon = code;
      showMsg("Coupon applied! 15% discount.");
    } else {
      appliedCoupon = null;
      showMsg("Invalid coupon code.");
    }
    renderCart();
  });

  // --- Proceed Button ---
  document.getElementById("proceedBtn").addEventListener("click", () => {
    localStorage.setItem("checkoutTotal", total.toFixed(2));
    window.location.href = "../pages/contact.html#transferForm";
  });
}

/* ===== Render “Your Collection” Section ===== */
function renderUserCollection(cartItems = []) {
  const tableBody = document.querySelector("#yourCollection tbody");
  if (!tableBody) return;

  if (!cartItems.length) {
    tableBody.innerHTML = `
      <tr><td colspan="5" class="text-center text-muted py-4">Your collection is empty.</td></tr>`;
    return;
  }

  tableBody.innerHTML = cartItems
    .map((item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 1;
      const subtotal = price * qty;
      return `
        <tr>
          <td>
            <div class="d-flex align-items-center">
              <img src="${item.thumbnail || "https://via.placeholder.com/80"}" class="me-3 rounded" width="80" alt="">
              <span>${item.title || "Untitled"}</span>
            </div>
          </td>
          <td>Rs. ${price.toLocaleString()}</td>
          <td><input type="number" value="${qty}" class="form-control w-50" readonly></td>
          <td>Rs. ${subtotal.toLocaleString()}</td>
          <td><button class="btn btn-sm btn-outline-danger" data-id="${item.id}"><i class="bi bi-trash"></i></button></td>
        </tr>`;
    })
    .join("");
}

/* ===== Add To Cart ===== */
export async function addToCart(product) {
  const user = auth.currentUser;
  if (!user) return showMsg("Please log in to add products.");

  const local = getLocalUser();
  const cart = local.cart || [];
  const existing = cart.find((p) => String(p.id) === String(product.id));
  if (existing) existing.qty += 1;
  else
    cart.push({
      id: String(product.id || Date.now()),
      title: product.title,
      price: Number(product.price),
      thumbnail: product.thumbnail,
      qty: 1,
    });
  await saveCart(cart);
  showMsg("Added to cart ✅");
}

/* ===== Auth State ===== */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("✅ Logged in:", user.email);
    await syncUserData();

    // Render both sections
    renderCart();

    const local = getLocalUser();
    renderUserCollection(local.cart || []);
  } else {
    console.log("🚪 Logged out");
    clearLocalUser();
    renderCart();
    renderUserCollection([]);
  }
});

/* ===== Init ===== */
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("cart-table-body")) renderCart();
  const local = getLocalUser();
  if (document.querySelector("#yourCollection tbody"))
    renderUserCollection(local.cart || []);
});
