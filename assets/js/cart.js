import { auth, db, doc, getDoc, updateDoc } from "./firebase.js";

/* ===== Helper ===== */
function showMsg(msg) {
  alert(msg);
}

/* ===== Get Logged-In User Data ===== */
function getLocalUser() {
  return JSON.parse(localStorage.getItem("userData") || "{}");
}

/* ===== Save to Local + Firestore ===== */
async function saveCart(updatedCart) {
  const user = auth.currentUser;
  if (!user) return showMsg("Login required.");

  const userRef = doc(db, "users", user.uid);
  await updateDoc(userRef, { cart: updatedCart, updatedAt: new Date().toISOString() });

  const local = getLocalUser();
  local.cart = updatedCart;
  localStorage.setItem("userData", JSON.stringify(local));
}

/* ===== Render Cart ===== */
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
  cartTable.innerHTML = cart.map((item, i) => {
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
  }).join("");

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

  // Update quantity
  document.querySelectorAll(".qty-input").forEach(inp => {
    inp.addEventListener("change", async (e) => {
      const index = e.target.dataset.index;
      const cartData = getLocalUser().cart || [];
      cartData[index].qty = parseInt(e.target.value) || 1;
      await saveCart(cartData);
      renderCart();
    });
  });

  // Remove item
  document.querySelectorAll(".remove-item").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const index = e.target.dataset.index;
      const cartData = getLocalUser().cart || [];
      cartData.splice(index, 1);
      await saveCart(cartData);
      renderCart();
    });
  });

  // Proceed button
  document.getElementById("proceedBtn").addEventListener("click", () => {
    localStorage.setItem("checkoutTotal", total.toFixed(2));
    window.location.href = "../pages/contact.html#transferForm";
  });
}

/* ===== Add To Cart Logic (called from app.js) ===== */
export async function addToCart(product) {
  const user = auth.currentUser;
  if (!user) return showMsg("Please log in to add products.");

  const local = getLocalUser();
  const cart = local.cart || [];

  const existing = cart.find(p => p.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      title: product.title,
      price: product.price,
      thumbnail: product.thumbnail,
      qty: 1
    });
  }

  await saveCart(cart);
  showMsg("Added to cart ✅");
}

/* ===== Initialize Cart Page ===== */
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("cart-table-body")) {
    renderCart();
  }
});
