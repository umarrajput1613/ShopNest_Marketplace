// assets/js/app.js (COMBINED)
// Imports (Firestore, Storage, Auth helpers from CDN + local firebase-config)
import {
  getFirestore, collection, doc, setDoc, addDoc, getDoc, getDocs,
  updateDoc, serverTimestamp, query, orderBy, where, limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, updateProfile, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// firebase-config must export initialized auth, db, storage
import { auth, db, storage } from "./firebase-config.js";

/* ----------------- Small helper ----------------- */
function showMsg(msg) { alert(msg); }
function goTo(page) { window.location.href = `../pages/${page}`; }

/* ----------------- Default user template ----------------- */
const defaultUserData = {
  favorites: [], cart: [], buyHistory: [], sellList: [],
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
};

/* ========== AUTH: Signup / Login / Logout / Sync ========== */
async function signupFunc(e) {
  e.preventDefault();
  const name = document.getElementById("signup-name")?.value?.trim();
  const email = document.getElementById("signup-email")?.value?.trim();
  const password = document.getElementById("signup-password")?.value;
  const confirm = document.getElementById("confirm-password")?.value;

  if (!name || !email || !password || !confirm) return showMsg("Fill all fields.");
  if (password !== confirm) return showMsg("Passwords do not match.");

  try {
    const uc = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(uc.user, { displayName: name });
    await setDoc(doc(db, "users", uc.user.uid), { uid: uc.user.uid, name, email, ...defaultUserData });
    localStorage.setItem("userData", JSON.stringify({ uid: uc.user.uid, name, email, ...defaultUserData }));
    showMsg("Account created successfully!");
    goTo("home.html");
  } catch (err) {
    console.error(err);
    showMsg(err.message || "Signup error");
  }
}

async function loginFunc(e) {
  e.preventDefault();
  const email = document.getElementById("login-email")?.value?.trim();
  const password = document.getElementById("login-password")?.value;
  if (!email || !password) return showMsg("Enter email and password.");
  try {
    const uc = await signInWithEmailAndPassword(auth, email, password);
    const ref = doc(db, "users", uc.user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      localStorage.setItem("userData", JSON.stringify(snap.data()));
    } else {
      await setDoc(ref, { uid: uc.user.uid, email, ...defaultUserData });
      localStorage.setItem("userData", JSON.stringify({ uid: uc.user.uid, email, ...defaultUserData }));
    }
    showMsg("Login successful!");
    goTo("home.html");
  } catch (err) {
    console.error(err);
    showMsg(err.message || "Login error");
  }
}

async function logoutFunc() {
  await signOut(auth);
  localStorage.removeItem("userData");
  showMsg("Logged out.");
  goTo("login.html");
}

/* Sync local -> firestore when online */
async function syncUserData() {
  const user = auth.currentUser;
  if (!user) return;
  const local = JSON.parse(localStorage.getItem("userData") || "{}");
  if (!local || Object.keys(local).length === 0) return;
  try {
    await updateDoc(doc(db, "users", user.uid), { ...local, updatedAt: new Date().toISOString() });
    console.log("Synced user data ✅");
  } catch (err) {
    console.error("Sync failed:", err);
  }
}

/* restore user data from firestore */
async function restoreUserData(user) {
  try {
    const refUser = doc(db, "users", user.uid);
    const s = await getDoc(refUser);
    if (s.exists()) {
      localStorage.setItem("userData", JSON.stringify(s.data()));
      console.log("Restored data from Firestore.");
    }
  } catch (err) {
    console.error("Failed to restore:", err);
  }
}

/* Auth-state handling and redirects (keeps older logic intact) */
onAuthStateChanged(auth, async (user) => {
  const page = window.location.pathname.split("/").pop();
  const authPages = ["login.html", "signup.html"];
  const protectedPages = ["home.html", "cart.html", "about.html", "contact.html", "shop.html"];

  if (page === "index.html" || page === "") {
    const localUser = localStorage.getItem("userData");
    if (user) goTo("home.html");
    else if (!localUser) setTimeout(() => goTo("signup.html"), 2000);
    else setTimeout(() => goTo("login.html"), 2000);
    return;
  }

  if (!user && protectedPages.includes(page)) { goTo("login.html"); return; }
  if (user && authPages.includes(page)) { goTo("home.html"); return; }

  if (user) {
    if (!localStorage.getItem("userData")) await restoreUserData(user);
    const userEmailEl = document.getElementById("userEmail");
    if (userEmailEl) userEmailEl.textContent = user.displayName || user.email;
  }
});

/* ========== DOMContentLoaded: hook forms, login/signup etc ========== */
document.addEventListener("DOMContentLoaded", () => {
  // Auth forms
  document.getElementById("createAccForm")?.addEventListener("submit", signupFunc);
  document.getElementById("login-form")?.addEventListener("submit", loginFunc);
  document.getElementById("logoutBtn")?.addEventListener("click", logoutFunc);
  document.getElementById("login-form")?.addEventListener("submit", (e)=>{ e.preventDefault(); loginFunc(e); });

  // Periodic sync
  setInterval(syncUserData, 30000);
  window.addEventListener("beforeunload", syncUserData);

  // Initialize product / shop / filters if present
  initShopFeature();

  // Initialize contact & forms
  initContactForms();

  // Initialize withdraw table if present
  initWithdrawFeature();
});

/* =========================================================
   SHOP: Fetch products, render grid, filters & pagination
   ========================================================= */
function initShopFeature() {
  const productList = document.getElementById("productList");
  const pagination = document.getElementById("pagination");
  if (!productList || !pagination) return; // not on shop page

  let products = [];
  let currentPage = 1;
  const itemsPerPage = 20;

  const priceRangeEl = document.getElementById("priceRange");
  const currentPriceEl = document.getElementById("currentPrice");
  const sortSelect = document.getElementById("sortSelect");
  const applyFiltersBtn = document.getElementById("applyFilters");

  // fetch
  (async function fetchProducts() {
    try {
      const res = await fetch("https://dummyjson.com/products?limit=200");
      const data = await res.json();
      products = data.products || [];
      renderProducts();
      renderPagination();
    } catch (err) {
      console.error("❌ Error fetching products:", err);
      productList.innerHTML = `<p class="text-center text-danger py-4">Failed to load products.</p>`;
    }
  })();

  function renderProducts() {
    productList.innerHTML = "";
    const start = (currentPage - 1) * itemsPerPage;
    const pageProducts = products.slice(start, start + itemsPerPage);
    if (pageProducts.length === 0) {
      productList.innerHTML = `<p class="text-center text-muted py-5">No products found.</p>`;
      return;
    }
    pageProducts.forEach(p => {
      const div = document.createElement("div");
      div.className = "col";
      div.innerHTML = `
        <div class="card product-card h-100 shadow-sm border-1 rounded-4">
          <img src="${p.thumbnail}" class="card-img-top" alt="${p.title}"
               style="height:180px; object-fit:contain; background:#f8f9fa;">
          <div class="card-body text-center">
            <p class="mb-1 small text-primary fw-bold text-capitalize">${p.category}</p>
            <h5 class="product-title">${p.title}</h5>
            <p class="small text-muted">${(p.description||"").slice(0,70)}...</p>
            <p class="product-price fw-bold text-success mb-1">$${p.price} <span class="text-danger small">(-${p.discountPercentage||0}%)</span></p>
            <p class="mb-2">⭐ ${p.rating} / 5</p>
            <a href="#" class="btn btn-sm btn-add-to-cart text-white w-100" data-id="${p.id}" style="background:#0d6efd;">
              <i class="bi bi-cart-fill me-1"></i> Add to Cart
            </a>
          </div>
        </div>`;
      productList.appendChild(div);
    });
  }

  function renderPagination() {
    pagination.innerHTML = "";
    const totalPages = Math.ceil(products.length / itemsPerPage) || 1;

    const prevBtn = document.createElement("button");
    prevBtn.className = "btn btn-outline-secondary";
    prevBtn.textContent = "Previous";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { if (currentPage>1){ currentPage--; renderProducts(); renderPagination(); } };
    pagination.appendChild(prevBtn);

    // show first 4 pages as buttons (user requested)
    const pagesToShow = Math.min(totalPages, 4);
    for (let i=1;i<=pagesToShow;i++){
      const btn = document.createElement("button");
      btn.className = "btn btn-outline-primary mx-1";
      if (i===currentPage) btn.classList.add("active");
      btn.textContent = i;
      btn.onclick = () => { currentPage=i; renderProducts(); renderPagination(); };
      pagination.appendChild(btn);
    }

    const nextBtn = document.createElement("button");
    nextBtn.className = "btn btn-outline-secondary";
    nextBtn.textContent = "Next";
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.onclick = () => { if (currentPage<totalPages){ currentPage++; renderProducts(); renderPagination(); } };
    pagination.appendChild(nextBtn);
  }

  // Filter UI hookup
  if (priceRangeEl && currentPriceEl) {
    priceRangeEl.addEventListener("input", ()=> currentPriceEl.textContent = priceRangeEl.value);
  }

  // Apply Filters (when clicked, pagination UI clears and only filtered results display)
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // collect selected categories
      const selectedCats = [];
      if (document.getElementById("catElectronics")?.checked) selectedCats.push("smartphones","laptops");
      if (document.getElementById("catMen")?.checked) selectedCats.push("mens-shirts","mens-shoes","mens-watches");
      if (document.getElementById("catWomen")?.checked) selectedCats.push("womens-dresses","womens-shoes","womens-bags");
      if (document.getElementById("catHome")?.checked) selectedCats.push("furniture","home-decoration");
      if (document.getElementById("catBeauty")?.checked) selectedCats.push("beauty","fragrances");
      if (document.getElementById("catSports")?.checked) selectedCats.push("sports-accessories","motorcycle");
      if (document.getElementById("catGroceries")?.checked) selectedCats.push("groceries");
      if (document.getElementById("catFashion")?.checked) selectedCats.push("tops");

      const maxPrice = parseInt(priceRangeEl?.value || "1500", 10);
      const sortType = sortSelect?.value || "best";

      let filtered = products.filter(p => {
        const catOk = selectedCats.length === 0 || selectedCats.includes((p.category||"").toLowerCase());
        const priceOk = (p.price || 0) <= maxPrice;
        return catOk && priceOk;
      });

      if (sortType === "low-high") filtered.sort((a,b)=>a.price-b.price);
      else if (sortType === "high-low") filtered.sort((a,b)=>b.price-a.price);
      else if (sortType === "rating") filtered.sort((a,b)=>b.rating-a.rating);
      else if (sortType === "newest") filtered.sort((a,b)=>b.id-a.id);

      // disable pagination visually (clear)
      pagination.innerHTML = "";
      renderFilteredProducts(filtered);
    });
  }

  function renderFilteredProducts(arr) {
    productList.innerHTML = "";
    if (!arr || arr.length === 0) {
      productList.innerHTML = `<p class="text-center text-muted py-5">No products match your filters.</p>`;
      return;
    }
    arr.forEach(p => {
      const div = document.createElement("div");
      div.className = "col";
      div.innerHTML = `
        <div class="card product-card h-100 shadow-sm border-1 rounded-4">
          <img src="${p.thumbnail}" class="card-img-top" alt="${p.title}"
               style="height:180px; object-fit:contain; background:#f8f9fa;">
          <div class="card-body text-center">
            <p class="mb-1 small text-primary fw-bold">${p.category}</p>
            <h5 class="product-title">${p.title}</h5>
            <p class="small text-muted">${(p.description||"").slice(0,70)}...</p>
            <p class="product-price fw-bold text-success mb-1">$${p.price}</p>
            <p class="mb-2">⭐ ${p.rating} / 5</p>
            <a href="#" class="btn btn-sm btn-add-to-cart text-white w-100" data-id="${p.id}" style="background:#0d6efd;">
              <i class="bi bi-cart-fill me-1"></i> Add to Cart
            </a>
          </div>
        </div>`;
      productList.appendChild(div);
    });
  }
}

/* =========================================================
   CONTACT & FORMS: General Inquiry, Seller, Product Add,
   Buyer account, Payment details, Transfer, Withdraw
   All Firestore + Storage ops centralized here
   ========================================================= */
function initContactForms() {
  // If no forms present, return
  if (!document.getElementById("form-general") &&
      !document.getElementById("form-seller") &&
      !document.getElementById("form-add-product") &&
      !document.getElementById("form-buyer") &&
      !document.getElementById("form-payment") &&
      !document.getElementById("form-transfer") &&
      !document.getElementById("form-withdraw")) return;

  /* ---------- General Inquiry ---------- */
  const generalForm = document.getElementById("form-general");
  if (generalForm) {
    generalForm.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const name = document.getElementById("gName").value.trim();
      const email = document.getElementById("gEmail").value.trim();
      const subject = document.getElementById("gSubject").value;
      const message = document.getElementById("gMessage").value.trim();
      if (!name || !email || !message) return alert("Please fill all fields.");
      await addDoc(collection(db, "inquiries"), { name, email, subject, message, timestamp: serverTimestamp() });
      alert("Message sent successfully!");
      generalForm.reset();
    });
  }

  /* ---------- Become a Seller ---------- */
  const sellerForm = document.getElementById("form-seller");
  if (sellerForm) {
    sellerForm.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return alert("Please log in first!");
      // pick inputs by name if present, fallback to first text/email/tel/select
      const businessName = sellerForm.querySelector('input[name="shopName"]')?.value || sellerForm.querySelector('input[type="text"]')?.value;
      const email = sellerForm.querySelector('input[type="email"]')?.value;
      const phone = sellerForm.querySelector('input[type="tel"]')?.value;
      const category = sellerForm.querySelector("select")?.value;
      const account = sellerForm.querySelector('input[placeholder*="Account"]')?.value || "";
      await setDoc(doc(db, "users", user.uid, "sellerProfile", "info"), {
        businessName, email, phone, category, account, status: "active", createdAt: serverTimestamp()
      });
      alert("Seller account registered successfully!");
      sellerForm.reset();
      const sellBtn = document.getElementById("btnSellProduct");
      if (sellBtn) sellBtn.style.display = "inline-block";
    });
  }

  /* ---------- Seller Add Product (modal) ---------- */
  const productForm = document.getElementById("form-add-product");
  if (productForm) {
    productForm.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return alert("Please log in first!");
      const name = document.getElementById("pName").value;
      const desc = document.getElementById("pDesc").value;
      const category = document.getElementById("pCategory").value;
      const price = parseFloat(document.getElementById("pPrice").value);
      const fileEl = document.getElementById("pImage");
      const file = fileEl?.files?.[0];
      if (!file) return alert("Please select a product image!");
      const imgRef = storageRef(storage, `products/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(imgRef, file);
      const imgUrl = await getDownloadURL(imgRef);
      const productDoc = await addDoc(collection(db, "products"), {
        sellerId: user.uid, name, desc, category, price, imgUrl, timestamp: serverTimestamp()
      });
      // reference in user's products subcollection (optional)
      await addDoc(collection(db, "users", user.uid, "products"), { productId: productDoc.id, name, price, imgUrl, timestamp: serverTimestamp() });
      alert("Product added successfully!");
      productForm.reset();
    });
  }

  /* ---------- Buyer Account ---------- */
  const buyerForm = document.getElementById("form-buyer");
  if (buyerForm) {
    buyerForm.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return alert("Please log in first!");
      const fullName = buyerForm.querySelector('input[name="fullName"]')?.value || buyerForm.querySelector('input[type="text"]')?.value;
      const email = buyerForm.querySelector('input[type="email"]')?.value;
      const address = buyerForm.querySelector("textarea")?.value;
      const phone = buyerForm.querySelector('input[type="tel"]')?.value;
      await setDoc(doc(db, "users", user.uid, "buyerAccount", "info"), { fullName, email, address, phone, createdAt: serverTimestamp() });
      alert("Buyer account registered successfully!");
      buyerForm.reset();
    });
  }

  /* ---------- Payment Details ---------- */
  const paymentForm = document.getElementById("form-payment");
  if (paymentForm) {
    paymentForm.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return alert("Please log in first!");
      const accountTitle = paymentForm.querySelector('input[name="accountTitle"]')?.value || paymentForm.querySelectorAll("input")[0]?.value;
      const iban = paymentForm.querySelector('input[name="iban"]')?.value || paymentForm.querySelectorAll("input")[1]?.value;
      const bankName = paymentForm.querySelector('input[name="bankName"]')?.value || "";
      const branchCode = paymentForm.querySelector('input[name="branchCode"]')?.value || "";
      const cnic = paymentForm.querySelector('input[name="cnic"]')?.value || "";
      await setDoc(doc(db, "users", user.uid, "paymentDetails", "bankInfo"), { accountTitle, iban, bankName, branchCode, cnic, createdAt: serverTimestamp() });
      alert("Payment details saved!");
      paymentForm.reset();
    });
  }

  /* ---------- Buy & Sell Fund Transfer ---------- */
  const transferForm = document.getElementById("form-transfer");
  if (transferForm) {
    transferForm.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return alert("Please log in first!");
      const txId = transferForm.querySelector('input[name="txId"]')?.value || transferForm.querySelectorAll("input")[0]?.value;
      const amount = parseFloat(transferForm.querySelector('input[name="amount"]')?.value || transferForm.querySelectorAll("input")[1]?.value || "0");
      const buyer = transferForm.querySelector('input[name="buyer"]')?.value || "";
      const seller = transferForm.querySelector('input[name="seller"]')?.value || "";
      const bankDetails = transferForm.querySelector('input[name="bankDetails"]')?.value || "";
      const file = transferForm.querySelector('input[type="file"]')?.files?.[0];
      let proofUrl = "";
      if (file) {
        const proofRef = storageRef(storage, `proofs/${txId}_${file.name}`);
        await uploadBytes(proofRef, file);
        proofUrl = await getDownloadURL(proofRef);
      }
      await addDoc(collection(db, "transactions"), { txId, amount, buyer, seller, bankDetails, proofUrl, timestamp: serverTimestamp() });
      alert("Transaction submitted successfully!");
      transferForm.reset();
    });
  }

  /* ---------- Withdraw Form (seller) ---------- */
  const withdrawForm = document.getElementById("form-withdraw");
  if (withdrawForm) {
    withdrawForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return alert("Please log in first!");
      const amount = parseFloat(withdrawForm.querySelector('input[name="amount"]').value || "0");
      const bank = withdrawForm.querySelector('input[name="bank"]').value || "";
      const iban = withdrawForm.querySelector('input[name="iban"]').value || "";
      const proof = withdrawForm.querySelector('input[type="file"]')?.files?.[0];
      let proofUrl = "";
      if (proof) {
        const pRef = storageRef(storage, `withdrawProofs/${user.uid}_${Date.now()}_${proof.name}`);
        await uploadBytes(pRef, proof);
        proofUrl = await getDownloadURL(pRef);
      }
      await addDoc(collection(db, "users", user.uid, "wallet"), { amount, bank, iban, proofUrl, status: "Pending", createdAt: serverTimestamp() });
      alert("Withdrawal request submitted successfully!");
      withdrawForm.reset();
      // reload withdraw table (if present)
      if (typeof loadWithdrawTable === "function") loadWithdrawTable();
    });
  }
}

/* =========================================================
   Withdraw UI loader (shows seller's wallet table & balance)
   ========================================================= */
function initWithdrawFeature() {
  const withdrawSection = document.getElementById("withdrawSection");
  const walletTableBody = document.getElementById("walletTableBody");
  const walletBalance = document.getElementById("walletBalance");
  if (!withdrawSection || !walletTableBody || !walletBalance) return;

  // expose loadWithdrawTable globally for reuse
  window.loadWithdrawTable = async function () {
    const user = auth.currentUser;
    if (!user) return;
    withdrawSection.style.display = "block";
    walletTableBody.innerHTML = "<tr><td colspan='7'>Loading...</td></tr>";
    const snap = await getDocs(collection(db, "users", user.uid, "wallet"));
    let rows = "";
    let index = 1;
    let totalPending = 0;
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const status = d.status || "Pending";
      if (status.toLowerCase() === "pending") totalPending += Number(d.amount || 0);
      rows += `<tr>
        <td>${index++}</td>
        <td>${d.productName || "-"}</td>
        <td>${d.buyerName || "-"}</td>
        <td>${d.amount || 0}</td>
        <td><span class="badge ${status.toLowerCase()==="pending" ? "bg-warning text-dark" : "bg-success"}">${status}</span></td>
        <td>${d.createdAt ? new Date(d.createdAt.seconds*1000).toLocaleDateString() : "-"}</td>
        <td>${status.toLowerCase()==="pending" ? `<button class="btn btn-sm btn-primary" onclick="withdrawMoney('${docSnap.id}')">Withdraw</button>` : "-"}</td>
      </tr>`;
    });
    walletTableBody.innerHTML = rows || `<tr><td colspan='7'>No transactions.</td></tr>`;
    walletBalance.textContent = totalPending;
  };

  // wire auth state to load the table
  onAuthStateChanged(auth, user => { if (user) window.loadWithdrawTable(); else { withdrawSection.style.display = "none"; } });
}

/* =========================================================
   Withdraw helper: moves wallet item to withdrawals and updates
   ========================================================= */
window.withdrawMoney = async function(transactionId) {
  const user = auth.currentUser;
  if (!user) return alert("Please log in first!");
  const txRef = doc(db, "users", user.uid, "wallet", transactionId);

  // read the doc to ensure it exists
  const snapCol = await getDocs(collection(db, "users", user.uid, "wallet"));
  const txDoc = snapCol.docs.find(d=>d.id===transactionId);
  if (!txDoc) return alert("Transaction not found!");
  const txData = txDoc.data();

  // add to withdrawals subcollection
  await addDoc(collection(db, "users", user.uid, "withdrawals"), { ...txData, status: "Withdrawn", withdrawnAt: serverTimestamp() });

  // update original wallet item
  await updateDoc(txRef, { status: "Withdrawn" });

  alert("Withdrawal successful!");
  window.loadWithdrawTable?.();
};
