// =======================================================
// ✅ cart.js — Firestore + LocalStorage + Sync + Delete + Merge + Summary + Coupons (Fixed)
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

/* ===== Fetch Cart (from Firestore) ===== */
async function getUserCart(uid) {
  const cartItems = [];
  try {
    const { getDocs, collection } = await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js");
    const snap = await getDocs(collection(db, "users", uid, "cart"));
    snap.forEach((d) => cartItems.push({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("❌ Fetch cart error:", err);
  }
  return cartItems;
}

/* ===== Save Cart (to Firestore + LocalStorage) ===== */
async function saveCart(updatedCart) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const { setDoc, deleteDoc, collection, doc: subDoc, getDocs } = await import(
      "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js"
    );

    // Delete old docs before saving updated ones
    const oldSnap = await getDocs(collection(db, "users", user.uid, "cart"));
    const deletions = [];
    oldSnap.forEach((d) => deletions.push(deleteDoc(d.ref)));
    await Promise.all(deletions);

    // Save new docs
    for (const item of updatedCart) {
      const ref = subDoc(db, "users", user.uid, "cart", String(item.id));
      await setDoc(ref, {
        id: String(item.id),
        title: item.title,
        price: Number(item.price),
        thumbnail: item.thumbnail || "",
        qty: Number(item.qty),
        updatedAt: new Date().toISOString(),
      });
    }

    const local = getLocalUser();
    local.cart = updatedCart;
    setLocalUser(local);
    localStorage.setItem(`cart_${user.email}`, JSON.stringify(updatedCart));
  } catch (err) {
    console.error("❌ Save cart error:", err);
  }
}

/* ===== Delete Single Cart Item ===== */
async function deleteCartItem(itemId) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const { deleteDoc, doc: subDoc } = await import(
      "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js"
    );

    const ref = subDoc(db, "users", user.uid, "cart", itemId);
    await deleteDoc(ref);

    const local = getLocalUser();
    const updated = (local.cart || []).filter((i) => String(i.id) !== String(itemId));
    local.cart = updated;
    setLocalUser(local);
    localStorage.setItem(`cart_${user.email}`, JSON.stringify(updated));

    renderCart();
    renderUserCollection(updated);
  } catch (err) {
    console.error("❌ Delete item error:", err);
  }
}

/* ===== Merge Duplicates ===== */
function mergeCart(cart) {
  const merged = [];
  for (const item of cart) {
    const existing = merged.find((p) => String(p.id) === String(item.id));
    if (existing) existing.qty += Number(item.qty);
    else merged.push({ ...item, qty: Number(item.qty) });
  }
  return merged;
}

/* ===== Render Order Summary + Coupon ===== */
function renderOrderSummary() {
  const summary = document.getElementById("orderSummary");
  if (!summary) return; // ✅ no crash if section not found

  // 🛒 Get cart from localStorage
  const local = getLocalUser();
  const cart = Array.isArray(local.cart) ? local.cart : [];

  // 🧾 Calculate subtotal
  let subtotal = 0;
  cart.forEach((item) => {
    subtotal += (Number(item.price) || 0) * (Number(item.qty) || 1);
  });

  const shipping = cart.length ? 250 : 0;
  const tax = cart.length ? 150 : 0;

  const coupon = (localStorage.getItem("appliedCoupon") || "").toUpperCase();
  let discount = 0;

  if (coupon === "SAVE10") discount = (subtotal + shipping + tax) * 0.10;
  else if (coupon === "SAVE15") discount = (subtotal + shipping + tax) * 0.15;

  const total = subtotal + shipping + tax - discount;

  // 🧾 Update summary UI
  summary.innerHTML = `
    <h4 class="fw-bold mb-4 text-primary">Order Summary</h4>
    <div class="d-flex justify-content-between mb-2"><span class="text-muted">Subtotal:</span><span class="fw-semibold">PKR ${subtotal.toLocaleString()}</span></div>
    <div class="d-flex justify-content-between mb-2"><span class="text-muted">Shipping:</span><span class="fw-semibold">PKR ${shipping.toLocaleString()}</span></div>
    <div class="d-flex justify-content-between mb-2"><span class="text-muted">Tax:</span><span class="fw-semibold">PKR ${tax.toLocaleString()}</span></div>
    ${discount > 0
      ? `<div class="d-flex justify-content-between mb-2 text-success"><span>Discount (${coupon}):</span><span>-PKR ${discount.toFixed(0)}</span></div>`
      : ""}
    <hr>
    <div class="d-flex justify-content-between mb-4"><span class="fw-bold fs-5">Total:</span><span class="fw-bold fs-5 text-success">PKR ${total.toLocaleString()}</span></div>

    <section id="coupon-section" class="mt-3">
      <h5 class="fw-bold text-primary mb-2">Apply Coupon</h5>
      <form id="couponForm" class="d-flex gap-2">
        <input type="text" id="couponInput" class="form-control" placeholder="Enter coupon code" value="${coupon}">
        <button class="btn btn-success fw-bold" type="submit">Apply</button>
      </form>
      <div class="mt-2">
        <small id="couponSuccess" class="text-success d-none">Coupon applied successfully 🎉</small>
        <small id="couponError" class="text-danger d-none">Invalid coupon code ❌</small>
      </div>
    </section>

    <a href="checkout.html" class="btn btn-primary w-100 fw-bold mt-4">Proceed to Checkout</a>
    <a href="shop.html" class="btn btn-outline-secondary w-100 fw-semibold mt-2">Continue Shopping</a>
  `;

  // 🎟️ Coupon form
setTimeout(() => {
  const form = document.getElementById("couponForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("couponInput").value.trim().toUpperCase();
    const validCoupons = ["SAVE10", "SAVE15"];
    const success = document.getElementById("couponSuccess");
    const error = document.getElementById("couponError");

    if (validCoupons.includes(input)) {
      localStorage.setItem("appliedCoupon", input);
      success.classList.remove("d-none");
      error.classList.add("d-none");
    } else {
      localStorage.removeItem("appliedCoupon");
      error.classList.remove("d-none");
      success.classList.add("d-none");
    }

    // Re-render to update totals
    renderOrderSummary();
  });
}, 50);

}

/* ===== Render Cart ===== */
function renderCart() {
  const cartTable = document.getElementById("cart-table-body");
  if (!cartTable) return; // ✅ Safe if element not found

  const local = getLocalUser();
  let cart = local.cart?.length ? local.cart : [];
  cart = mergeCart(cart);

  if (!cart.length) {
    cartTable.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Your cart is empty.</td></tr>`;
    renderOrderSummary();
    return;
  }

  cartTable.innerHTML = cart.map((item, i) => {
    const price = Number(item.price);
    const qty = Number(item.qty);
    const total = price * qty;
    return `
      <tr>
        <td>${item.title}</td>
        <td>PKR ${price.toLocaleString()}</td>
        <td><input type="number" min="1" value="${qty}" data-index="${i}" class="form-control qty-input" style="width:70px;"></td>
        <td>PKR ${total.toLocaleString()}</td>
        <td><button class="btn btn-sm btn-danger remove-item" data-id="${item.id}">🗑</button></td>
      </tr>`;
  }).join("");

  renderOrderSummary();

  // 🔄 Update quantity
  document.querySelectorAll(".qty-input").forEach((inp) => {
    inp.addEventListener("change", async (e) => {
      const index = e.target.dataset.index;
      cart[index].qty = Math.max(1, parseInt(e.target.value));
      await saveCart(cart);
      renderCart();
    });
  });

  // 🗑 Remove item
  document.querySelectorAll(".remove-item").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      await deleteCartItem(e.currentTarget.dataset.id);
    });
  });
}

/* ===== Render User Collection ===== */
function renderUserCollection(cartItems = []) {
  const tbody = document.querySelector("#yourCollection tbody");
  if (!tbody) return;

  if (!cartItems.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Your collection is empty.</td></tr>`;
    return;
  }

  const merged = mergeCart(cartItems);
  tbody.innerHTML = merged.map((item) => `
    <tr>
      <td><div class="d-flex align-items-center">
        <img src="${item.thumbnail || "https://via.placeholder.com/80"}" class="me-3 rounded" width="80">
        <span>${item.title}</span>
      </div></td>
      <td>PKR ${Number(item.price).toLocaleString()}</td>
      <td><input type="number" value="${Number(item.qty)}" class="form-control w-50" readonly></td>
      <td>PKR ${(Number(item.price) * Number(item.qty)).toLocaleString()}</td>
      <td><button class="btn btn-sm btn-outline-danger remove-item" data-id="${item.id}"><i class="bi bi-trash"></i></button></td>
    </tr>
  `).join("");

  tbody.querySelectorAll(".remove-item").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      await deleteCartItem(e.currentTarget.dataset.id);
    })
  );
}

/* ===== Add To Cart ===== */
export async function addToCart(product) {
  const user = auth.currentUser;
  if (!user) return showMsg("Please log in to add products.");

  const local = getLocalUser();
  const cart = local.cart || [];
  const existing = cart.find((p) => String(p.id) === String(product.id));

  if (existing) existing.qty += 1;
  else {
    cart.push({
      id: String(product.id),
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

/* ===== Auth State Sync ===== */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const cartItems = await getUserCart(user.uid);
    const merged = mergeCart(cartItems);
    setLocalUser({ uid: user.uid, email: user.email, cart: merged });
    renderCart();
    renderUserCollection(merged);
  } else {
    clearLocalUser();
    renderCart();
    renderUserCollection([]);
  }
});

/* ===== Init ===== */
document.addEventListener("DOMContentLoaded", () => {
  renderCart();
});
