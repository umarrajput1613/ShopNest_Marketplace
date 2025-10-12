import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

import { auth } from "./firebase-config.js";

const db = getFirestore();
const storage = getStorage();

/* --------------------------------------------------
   1️⃣ GENERAL INQUIRY FORM
-------------------------------------------------- */
const generalForm = document.getElementById("form-general");
if (generalForm) {
  generalForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("gName").value.trim();
    const email = document.getElementById("gEmail").value.trim();
    const subject = document.getElementById("gSubject").value;
    const message = document.getElementById("gMessage").value.trim();

    if (!name || !email || !message) return alert("Please fill all fields.");

    await addDoc(collection(db, "inquiries"), {
      name,
      email,
      subject,
      message,
      timestamp: serverTimestamp(),
    });

    alert("Message sent successfully!");
    generalForm.reset();
  });
}

/* --------------------------------------------------
   2️⃣ BECOME A SELLER FORM
-------------------------------------------------- */
const sellerForm = document.getElementById("form-seller");
if (sellerForm) {
  sellerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert("Please log in first!");

    const businessName = sellerForm.querySelector('input[name="shopName"]').value;
    const email = sellerForm.querySelector('input[type="email"]').value;
    const phone = sellerForm.querySelector('input[type="tel"]').value;
    const category = sellerForm.querySelector("select").value;
    const account = sellerForm.querySelector('input[placeholder*="Account"]').value;

    await setDoc(doc(db, "users", user.uid, "sellerProfile", "info"), {
      businessName,
      email,
      phone,
      category,
      account,
      status: "active",
      createdAt: serverTimestamp(),
    });

    alert("Seller account registered successfully!");
    sellerForm.reset();

    const sellBtn = document.getElementById("btnSellProduct");
    if (sellBtn) sellBtn.style.display = "inline-block";
  });
}

/* --------------------------------------------------
   3️⃣ SELLER - ADD PRODUCT (MODAL FORM)
-------------------------------------------------- */
const productForm = document.getElementById("form-add-product");
if (productForm) {
  productForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert("Please log in first!");

    const name = document.getElementById("pName").value;
    const desc = document.getElementById("pDesc").value;
    const category = document.getElementById("pCategory").value;
    const price = parseFloat(document.getElementById("pPrice").value);
    const file = document.getElementById("pImage").files[0];

    if (!file) return alert("Please select a product image!");

    const imgRef = ref(storage, `products/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(imgRef, file);
    const imgUrl = await getDownloadURL(imgRef);

    await addDoc(collection(db, "products"), {
      sellerId: user.uid,
      name,
      desc,
      category,
      price,
      imgUrl,
      timestamp: serverTimestamp(),
    });

    alert("Product added successfully!");
    productForm.reset();
  });
}

/* --------------------------------------------------
   4️⃣ BUYER ACCOUNT FORM
-------------------------------------------------- */
const buyerForm = document.getElementById("form-buyer");
if (buyerForm) {
  buyerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert("Please log in first!");

    const fullName = buyerForm.querySelector('input[name="fullName"]').value;
    const email = buyerForm.querySelector('input[type="email"]').value;
    const address = buyerForm.querySelector("textarea").value;
    const phone = buyerForm.querySelector('input[type="tel"]').value;

    await setDoc(doc(db, "users", user.uid, "buyerAccount", "info"), {
      fullName,
      email,
      address,
      phone,
      createdAt: serverTimestamp(),
    });

    alert("Buyer account registered successfully!");
    buyerForm.reset();
  });
}

/* --------------------------------------------------
   5️⃣ PAYMENT DETAILS FORM
-------------------------------------------------- */
const paymentForm = document.getElementById("form-payment");
if (paymentForm) {
  paymentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert("Please log in first!");

    const accountTitle = paymentForm.querySelector('input[name="accountTitle"]').value;
    const iban = paymentForm.querySelector('input[name="iban"]').value;
    const bankName = paymentForm.querySelector('input[name="bankName"]').value;
    const branchCode = paymentForm.querySelector('input[name="branchCode"]').value;
    const cnic = paymentForm.querySelector('input[name="cnic"]').value;

    await setDoc(doc(db, "users", user.uid, "paymentDetails", "bankInfo"), {
      accountTitle,
      iban,
      bankName,
      branchCode,
      cnic,
      createdAt: serverTimestamp(),
    });

    alert("Payment details saved!");
    paymentForm.reset();
  });
}

/* --------------------------------------------------
   6️⃣ BUY & SELL FUND TRANSFER FORM
-------------------------------------------------- */
const transferForm = document.getElementById("form-transfer");
if (transferForm) {
  transferForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert("Please log in first!");

    const txId = transferForm.querySelector('input[name="txId"]').value;
    const amount = parseFloat(transferForm.querySelector('input[name="amount"]').value);
    const buyer = transferForm.querySelector('input[name="buyer"]').value;
    const seller = transferForm.querySelector('input[name="seller"]').value;
    const bankDetails = transferForm.querySelector('input[name="bankDetails"]').value;
    const file = transferForm.querySelector('input[type="file"]').files[0];

    let proofUrl = "";
    if (file) {
      const proofRef = ref(storage, `proofs/${txId}_${file.name}`);
      await uploadBytes(proofRef, file);
      proofUrl = await getDownloadURL(proofRef);
    }

    await addDoc(collection(db, "transactions"), {
      txId,
      amount,
      buyer,
      seller,
      bankDetails,
      proofUrl,
      timestamp: serverTimestamp(),
    });

    alert("Transaction submitted successfully!");
    transferForm.reset();
  });
}

/* --------------------------------------------------
   7️⃣ WITHDRAW FORM (Seller Wallet System)
-------------------------------------------------- */
const withdrawForm = document.getElementById("form-withdraw");
if (withdrawForm) {
  withdrawForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert("Please log in first!");

    const amount = parseFloat(withdrawForm.querySelector('input[name="amount"]').value);
    const bank = withdrawForm.querySelector('input[name="bank"]').value;
    const iban = withdrawForm.querySelector('input[name="iban"]').value;
    const proof = withdrawForm.querySelector('input[type="file"]').files[0];

    let proofUrl = "";
    if (proof) {
      const proofRef = ref(storage, `withdrawProofs/${user.uid}_${Date.now()}_${proof.name}`);
      await uploadBytes(proofRef, proof);
      proofUrl = await getDownloadURL(proofRef);
    }

    await addDoc(collection(db, "users", user.uid, "wallet"), {
      amount,
      bank,
      iban,
      proofUrl,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    alert("Withdrawal request submitted successfully!");
    withdrawForm.reset();

    // Update Withdraw Table
    loadWithdrawTable();
  });

  async function loadWithdrawTable() {
    const user = auth.currentUser;
    if (!user) return;
    const tableBody = document.getElementById("withdraw-table-body");
    if (!tableBody) return;

    tableBody.innerHTML = "";
    const querySnap = await getDocs(collection(db, "users", user.uid, "wallet"));
    querySnap.forEach((docSnap) => {
      const data = docSnap.data();
      const row = `
        <tr>
          <td>${data.amount} PKR</td>
          <td>${data.bank}</td>
          <td>${data.iban}</td>
          <td>${data.status}</td>
          <td>${data.proofUrl ? `<a href="${data.proofUrl}" target="_blank">View</a>` : "N/A"}</td>
        </tr>`;
      tableBody.insertAdjacentHTML("beforeend", row);
    });
  }

  // Auto-load table on page ready
  auth.onAuthStateChanged((user) => {
    if (user) loadWithdrawTable();
  });
}
