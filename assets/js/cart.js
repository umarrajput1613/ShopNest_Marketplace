// =======================================================
// ✅ cart.js — Firestore + LocalStorage + Sync + Delete + Merge Duplicates (Final Fixed)
// =======================================================

import { auth, db, doc, getDoc, setDoc, onAuthStateChanged } from "./firebase.js";

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

/* ===== Fetch Cart (Firestore Subcollection) ===== */
async function getUserCart(uid) {
  const cartItems = [];
  try {
    const { getDocs, collection } = await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js");
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

    // 🔄 Clear old Firestore cart
    const oldSnap = await getDocs(collection(db, "users", user.uid, "cart"));
    const deletions = [];
    oldSnap.forEach((d) => deletions.push(deleteDoc(d.ref)));
    await Promise.all(deletions);

    // 💾 Save new merged cart
    for (const item of updatedCart) {
      const ref = subDoc(db, "users", user.uid, "cart", String(item.id));
      await setDoc(ref, {
        id: String(item.id),
        title: item.title || "Untitled",
        price: Number(item.price) || 0,
        thumbnail: item.thumbnail || "",
        qty: Number(item.qty) || 1,
        updatedAt: new Date().toISOString(),
      });
    }

    // 🧠 Update localStorage
    const userKey = `cart_${user.email}`;
    localStorage.setItem(userKey, JSON.stringify(updatedCart));
    const local = getLocalUser();
    local.cart = updatedCart;
    setLocalUser(local);
  } catch (error) {
    console.error("❌ Save cart error:", error);
  }
}

/* ===== Delete Single Item (Firestore + LocalStorage) ===== */
async function deleteCartItem(itemId) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const { deleteDoc, doc: subDoc } = await import(
      "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js"
    );
    const ref = subDoc(db, "users", user.uid, "cart", itemId);
    await deleteDoc(ref);

    // Local delete
    const local = getLocalUser();
    const updatedCart = (local.cart || []).filter((i) => String(i.id) !== String(itemId));
    local.cart = updatedCart;
    setLocalUser(local);
    localStorage.setItem(`cart_${user.email}`, JSON.stringify(updatedCart));

    renderCart();
    renderUserCollection(updatedCart);
  } catch (err) {
    console.error("❌ Delete item error:", err);
  }
}

/* ===== Load Cart From Local ===== */
function loadLocalCart() {
  const user = auth.currentUser;
  if (!user) return [];
  const userKey = `cart_${user.email}`;
  return JSON.parse(localStorage.getItem(userKey) || "[]");
}

/* ===== Merge Duplicate Products (Fix Qty + Total) ===== */
function mergeCart(cart) {
  const merged = [];
  for (const item of cart) {
    const existing = merged.find((p) => String(p.id) === String(item.id));
    if (existing) {
      existing.qty += Number(item.qty);
      existing.title = existing.title || item.title;
      existing.price = Number(existing.price || item.price);
    } else {
      merged.push({ ...item, qty: Number(item.qty) });
    }
  }
  return merged;
}

/* ===== Render Cart (Main Page) ===== */
function renderCart() {
  const cartTable = document.getElementById("cart-table-body");
  const summary = document.getElementById("order-summary");
  if (!cartTable || !summary) return;

  const local = getLocalUser();
  let cart = local.cart?.length ? local.cart : loadLocalCart();

  cart = mergeCart(cart);

  if (!cart.length) {
    cartTable.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Your cart is empty.</td></tr>`;
    summary.innerHTML = "";
    return;
  }

  let subtotal = 0;
  cartTable.innerHTML = cart
    .map((item, i) => {
      const price = Number(item.price);
      const qty = Number(item.qty);
      const total = price * qty;
      subtotal += total;
      return `
        <tr>
          <td>${item.title}</td>
          <td>Rs. ${price.toLocaleString()}</td>
          <td>
            <input type="number" min="1" value="${qty}" data-index="${i}" class="form-control qty-input" style="width:70px;">
          </td>
          <td>Rs. ${total.toLocaleString()}</td>
          <td><button class="btn btn-sm btn-danger remove-item" data-id="${item.id}">🗑</button></td>
        </tr>`;
    })
    .join("");

  const shipping = subtotal > 0 ? 250 : 0;
  const tax = subtotal * 0.02;
  const total = subtotal + shipping + tax;

  summary.innerHTML = `
    <p>Subtotal: Rs. ${subtotal.toLocaleString()}</p>
    <p>Shipping: Rs. ${shipping}</p>
    <p>Tax: Rs. ${tax.toFixed(0)}</p>
    <hr>
    <p class="fw-bold">Total: Rs. ${total.toLocaleString()}</p>
  `;

  // --- Quantity Update ---
  document.querySelectorAll(".qty-input").forEach((inp) => {
    inp.addEventListener("change", async (e) => {
      const index = e.target.dataset.index;
      cart[index].qty = Math.max(1, parseInt(e.target.value));
      await saveCart(cart);
      renderCart();
    });
  });

  // --- Delete Buttons ---
  document.querySelectorAll(".remove-item").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const itemId = e.currentTarget.dataset.id;
      await deleteCartItem(itemId);
    });
  });
}

/* ===== Render "Your Collection" Section ===== */
function renderUserCollection(cartItems = []) {
  const tableBody = document.querySelector("#yourCollection tbody");
  if (!tableBody) return;

  if (!cartItems.length) {
    tableBody.innerHTML = `
      <tr><td colspan="5" class="text-center text-muted py-4">Your collection is empty.</td></tr>`;
    return;
  }

  const mergedItems = mergeCart(cartItems);

  tableBody.innerHTML = mergedItems
    .map(
      (item) => `
      <tr>
        <td>
          <div class="d-flex align-items-center">
            <img src="${item.thumbnail || "https://via.placeholder.com/80"}" class="me-3 rounded" width="80" alt="">
            <span>${item.title}</span>
          </div>
        </td>
        <td>Rs. ${Number(item.price).toLocaleString()}</td>
        <td><input type="number" value="${Number(item.qty)}" class="form-control w-50" readonly></td>
        <td>Rs. ${(Number(item.price) * Number(item.qty)).toLocaleString()}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger remove-item" data-id="${item.id}">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>`
    )
    .join("");

  // --- Delete for Collection ---
  tableBody.querySelectorAll(".remove-item").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const itemId = e.currentTarget.dataset.id;
      await deleteCartItem(itemId);
    });
  });
}

/* ===== Add To Cart (Final Fixed Version) ===== */
export async function addToCart(product) {
  const user = auth.currentUser;
  if (!user) return showMsg("Please log in to add products.");

  const local = getLocalUser();
  const cart = local.cart || [];

  // 🔍 Check if product already exists
  const existing = cart.find((p) => String(p.id) === String(product.id));

  if (existing) {
    existing.qty += 1; // ✅ increase quantity
  } else {
    cart.push({
      id: String(product.id), // ✅ fixed: no Date.now()
      title: product.title,
      price: Number(product.price),
      thumbnail: product.thumbnail || "",
      qty: 1,
    });
  }

  const merged = mergeCart(cart);
  await saveCart(merged);
  renderCart();
  renderUserCollection(merged);
  showMsg(existing ? "Quantity updated 🛒" : "Added to cart ✅");
}

/* ===== Auth State ===== */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("✅ Logged in:", user.email);
    const cartItems = await getUserCart(user.uid);
    const merged = mergeCart(cartItems);
    setLocalUser({ uid: user.uid, email: user.email, cart: merged });
    renderCart();
    renderUserCollection(merged);
  } else {
    console.log("🚪 Logged out");
    clearLocalUser();
    renderCart();
    renderUserCollection([]);
  }
});

/* ===== Init ===== */
document.addEventListener("DOMContentLoaded", () => {
  const local = getLocalUser();
  if (document.getElementById("cart-table-body")) renderCart();
  if (document.querySelector("#yourCollection tbody")) renderUserCollection(local.cart || []);
});
