// =======================================================
// ✅ cart.js — Firestore + LocalStorage + Sync + Delete + Merge + Summary + Coupons + Checkout (Fully Fixed)
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

/* ===== Render Order Summary + Coupon (Crash-Proof) ===== */
function renderOrderSummary() {
  const subtotalEl = document.getElementById("subtotal");
  const shippingEl = document.getElementById("shipping");
  const taxEl = document.getElementById("tax");
  const totalEl = document.getElementById("totalAmount");

  if (!subtotalEl || !shippingEl || !taxEl || !totalEl) return;

  const local = JSON.parse(localStorage.getItem("userData") || "{}");
  const cart = Array.isArray(local.cart) ? local.cart : [];

  // 🧾 Calculate subtotal
  let subtotal = 0;
  cart.forEach((item) => {
    subtotal += (Number(item.price) || 0) * (Number(item.qty) || 1);
  });

  const shipping = cart.length ? 250 : 0;
  const tax = cart.length ? 150 : 0;

  // 🎟️ Coupon
  const appliedCoupon = (localStorage.getItem("appliedCoupon") || "").toUpperCase();
  const coupons = { SAVE10: 10, SAVE15: 15, SAVE20: 20 };
  const discountPercent = coupons[appliedCoupon] || 0;

  const totalBeforeDiscount = subtotal + shipping + tax;
  const discount = totalBeforeDiscount * (discountPercent / 100);
  const total = totalBeforeDiscount - discount;

  // 🧮 Update UI
  subtotalEl.textContent = `PKR ${subtotal.toLocaleString()}`;
  shippingEl.textContent = `PKR ${shipping.toLocaleString()}`;
  taxEl.textContent = `PKR ${tax.toLocaleString()}`;
  totalEl.textContent = `PKR ${total.toLocaleString()}`;

  // 🟢 Discount row handling
  let discountRow = document.getElementById("discountRow");
  const summaryBox = subtotalEl.closest(".d-flex")?.parentElement;
  if (discount > 0 && !discountRow && summaryBox) {
    discountRow = document.createElement("div");
    discountRow.className = "d-flex justify-content-between mb-2 text-success";
    discountRow.id = "discountRow";
    discountRow.innerHTML = `<span>Discount (${appliedCoupon}):</span><span>-PKR ${discount.toFixed(0)}</span>`;
    summaryBox.insertBefore(discountRow, totalEl.closest(".d-flex"));
  } else if (discountRow) {
    if (discount > 0) {
      discountRow.innerHTML = `<span>Discount (${appliedCoupon}):</span><span>-PKR ${discount.toFixed(0)}</span>`;
    } else {
      discountRow.remove();
    }
  }

  // 💬 Coupon form logic
  const form = document.getElementById("couponForm");
  const input = document.getElementById("couponInput");
  const successMsg = document.getElementById("couponSuccess");
  const errorMsg = document.getElementById("couponError");

  if (form && input) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const code = input.value.trim().toUpperCase();
      if (coupons[code]) {
        localStorage.setItem("appliedCoupon", code);
        successMsg?.classList.remove("d-none");
        errorMsg?.classList.add("d-none");
      } else {
        localStorage.removeItem("appliedCoupon");
        successMsg?.classList.add("d-none");
        errorMsg?.classList.remove("d-none");
      }
      renderOrderSummary();
    };
  }
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
  renderOrderSummary();
});


// =======================================================
// ✅ Checkout Helpers
// =======================================================

function buildOrderSnapshot() {
  const local = getLocalUser();
  const cart = Array.isArray(local.cart) ? local.cart : [];

  let subtotal = 0;
  cart.forEach(item => {
    subtotal += (Number(item.price) || 0) * (Number(item.qty) || 1);
  });

  const shipping = cart.length ? 250 : 0;
  const tax = cart.length ? 150 : 0;
  const coupon = (localStorage.getItem("appliedCoupon") || "").toUpperCase();
  const coupons = { SAVE10: 10, SAVE15: 15, SAVE20: 20 };
  const totalBeforeDiscount = subtotal + shipping + tax;
  const discountPercent = coupons[coupon] || 0;
  const discount = Math.round(totalBeforeDiscount * (discountPercent / 100));
  const total = Math.round(totalBeforeDiscount - discount);

  return {
    cartItems: cart,
    subtotal,
    shipping,
    tax,
    coupon: coupon || null,
    discount,
    total,
    createdAt: new Date().toISOString()
  };
}

export function openPaymentForm() {
  const snapshot = buildOrderSnapshot();
  localStorage.setItem("pendingCheckout", JSON.stringify(snapshot));
  window.location.href = "../pages/contact.html#paymentForm";
}

// ===== clear cart after successful checkout (final) =====
export async function clearCartAfterCheckout() {
  const user = auth.currentUser;
  const local = getLocalUser();

  try {
    // 1) Clear local cart + storage keys
    local.cart = [];
    setLocalUser(local);
    if (user && user.email) localStorage.removeItem(`cart_${user.email}`);
    localStorage.removeItem("appliedCoupon");
    localStorage.removeItem("pendingCheckout");

    // 2) Clear Firestore: remove subcollection docs AND reset user's cart field
    if (user) {
      try {
        const { getDocs, collection, deleteDoc, updateDoc } = await import(
          "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js"
        );

        // delete docs in users/{uid}/cart subcollection (if any)
        const colRef = collection(db, "users", user.uid, "cart");
        const snap = await getDocs(colRef);
        const deletions = [];
        snap.forEach((d) => deletions.push(deleteDoc(d.ref)));
        if (deletions.length) await Promise.all(deletions);

        // also ensure the parent users/{uid} doc's cart field is emptied
        try {
          await updateDoc(doc(db, "users", user.uid), { cart: [], updatedAt: new Date().toISOString() });
        } catch (errUpdate) {
          // if update fails (doc missing), create it with empty cart
          await setDoc(doc(db, "users", user.uid), { cart: [], email: user.email || null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        }

        console.log("✅ Firestore cart cleared for:", user.email);
      } catch (errFire) {
        console.warn("⚠️ Could not fully clear Firestore cart:", errFire);
      }
    }

    // 3) UI refresh
    if (typeof renderCart === "function") renderCart();
    if (typeof renderUserCollection === "function") renderUserCollection([]);
    if (typeof renderOrderSummary === "function") renderOrderSummary();

    console.log("✅ All cart data cleared successfully.");
  } catch (err) {
    console.error("❌ Error clearing cart after checkout:", err);
  }
}

// expose for non-module usage too
window.clearCartAfterCheckout = clearCartAfterCheckout;

window.openPaymentForm = openPaymentForm;
