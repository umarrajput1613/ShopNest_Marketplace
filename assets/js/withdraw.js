import { getFirestore, doc, getDocs, updateDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth } from "./firebase-config.js"; // assuming Firebase is initialized elsewhere

const db = getFirestore();
const withdrawSection = document.getElementById("withdrawSection");
const walletTableBody = document.getElementById("walletTableBody");
const walletBalance = document.getElementById("walletBalance");

auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  // Show Withdraw Section for seller
  withdrawSection.style.display = "block";

  const walletRef = collection(db, "users", user.uid, "wallet");
  const snapshot = await getDocs(walletRef);

  let totalBalance = 0;
  let rows = "";
  let index = 1;

  snapshot.forEach((docSnap) => {
    const t = docSnap.data();
    totalBalance += t.status === "Pending" ? Number(t.amount) : 0;

    rows += `
      <tr>
        <td>${index++}</td>
        <td>${t.productName}</td>
        <td>${t.buyerName}</td>
        <td>${t.amount}</td>
        <td>
          <span class="badge ${t.status === "Pending" ? "bg-warning text-dark" : "bg-success"}">
            ${t.status}
          </span>
        </td>
        <td>${new Date(t.timestamp?.seconds * 1000 || Date.now()).toLocaleDateString()}</td>
        <td>
          ${
            t.status === "Pending"
              ? `<button class="btn btn-sm btn-primary" onclick="withdrawMoney('${docSnap.id}')">Withdraw</button>`
              : "-"
          }
        </td>
      </tr>
    `;
  });

  walletTableBody.innerHTML = rows;
  walletBalance.textContent = totalBalance;
});

// ===== Withdraw Function =====
window.withdrawMoney = async (transactionId) => {
  const user = auth.currentUser;
  if (!user) return;

  const transactionRef = doc(db, "users", user.uid, "wallet", transactionId);
  const transactionSnap = await getDocs(collection(db, "users", user.uid, "wallet"));
  const tx = transactionSnap.docs.find(d => d.id === transactionId)?.data();

  if (!tx) return alert("Transaction not found!");

  // Move to withdrawals collection
  const withdrawRef = collection(db, "users", user.uid, "withdrawals");
  await addDoc(withdrawRef, {
    ...tx,
    status: "Withdrawn",
    withdrawnAt: new Date()
  });

  // Update status in wallet
  await updateDoc(transactionRef, { status: "Withdrawn" });

  alert("Withdrawal successful!");
  location.reload();
};
