// =======================================================
// ✅ cart.js — Error-Free & Secure Version
// =======================================================

import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onAuthStateChanged
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

/* ===== Sync Firestore → Local ===== */
async function syncUserData() {
  const user = auth.currentUser;
  if (!user) return clearLocalUser();

  const cartSnap = await getUserCart(user.uid);
  setLocalUser({
    uid: user.uid,
    email: user.email,
    cart: cartSnap
  });
}

/* ===== Fetch Cart Subcollection ===== */
async function getUserCart(uid) {
  const cartItems = [];
  try {
    const { getDocs, collection, setDoc, doc } = await import(
      "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js"
    );

    // Ensure user doc exists
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

/* ===== Save Cart (Array → Subcollection) ===== */
async function saveCart(updatedCart) {
  const user = auth.currentUser;
  if (!user) return showMsg("Login required.");

  try {
    const {
      setDoc,
      deleteDoc,
      collection,
      doc: subDoc,
      getDocs,
    } = await import(
      "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js"
    );

    // Delete all old cart docs
    const oldSnap = await getDocs(collection(db, "users", user.uid, "cart"));
    const promises = [];
    oldSnap.forEach((d) => promises.push(deleteDoc(d.ref)));
    await Promise.all(promises);

    // Add each item back (force string id)
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

    const local = getLocalUser();
    local.cart = updatedCart;
    setLocalUser(local);
  } catch (error) {
    console.error("❌ Save cart error:", error);
    showMsg("Failed to save cart. Check console.");
  }
}

/* ===== Render Cart Table ===== */
function renderCart() {
  const cartTable = document.getElementById("cart-table-body");
  const summary = document.getElementById("order-summary");
  const local = getLocalUser();
  const cart = local.cart || [];

  if (!cart.length) {
    cartTable.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Your cart is empty.</td></tr>`;
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
        <td>$${item.price}</td>
        <td>
          <input type="number" min="1" value="${item.qty}" data-index="${i}" class="form-control qty-input" style="width:70px;">
        </td>
        <td>$${total.toFixed(2)}</td>
        <td><button class="btn btn-sm btn-danger remove-item" data-index="${i}">Delete</button></td>
      </tr>`;
    })
    .join("");

  const shipping = subtotal > 0 ? 10 : 0;
  const tax = subtotal * 0.05;
  const total = subtotal + shipping + tax;

  summary.innerHTML = `
    <p>Subtotal: $${subtotal.toFixed(2)}</p>
    <p>Shipping: $${shipping.toFixed(2)}</p>
    <p>Tax: $${tax.toFixed(2)}</p>
    <hr>
    <p class="fw-bold">Total: $${total.toFixed(2)}</p>
    <button id="proceedBtn" class="btn btn-primary w-100 mt-2">Proceed to Checkout</button>
  `;

  // --- Update Quantity ---
  document.querySelectorAll(".qty-input").forEach((inp) => {
    inp.addEventListener("change", async (e) => {
      const index = e.target.dataset.index;
      const cartData = getLocalUser().cart || [];
      cartData[index].qty = parseInt(e.target.value) || 1;
      await saveCart(cartData);
      renderCart();
    });
  });

  // --- Remove Item ---
  document.querySelectorAll(".remove-item").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const index = e.target.dataset.index;
      const cartData = getLocalUser().cart || [];
      cartData.splice(index, 1);
      await saveCart(cartData);
      renderCart();
    });
  });

  // --- Proceed Button ---
  document.getElementById("proceedBtn").addEventListener("click", () => {
    localStorage.setItem("checkoutTotal", total.toFixed(2));
    window.location.href = "../pages/contact.html#transferForm";
  });
}

/* ===== Add To Cart ===== */
export async function addToCart(product) {
  const user = auth.currentUser;
  if (!user) return showMsg("Please log in to add products.");

  const local = getLocalUser();
  const cart = local.cart || [];

  const existing = cart.find((p) => String(p.id) === String(product.id));

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: String(product.id || Date.now()),
      title: product.title,
      price: Number(product.price),
      thumbnail: product.thumbnail,
      qty: 1,
    });
  }

  await saveCart(cart);
  showMsg("Added to cart ✅");
}

/* ===== Auth State Sync ===== */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("✅ Logged in:", user.email);
    await syncUserData();
    if (document.getElementById("cart-table-body")) renderCart();
  } else {
    console.log("🚪 Logged out");
    clearLocalUser();
    if (document.getElementById("cart-table-body")) renderCart();
  }
});

/* ===== Initialize ===== */
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("cart-table-body")) renderCart();
});
