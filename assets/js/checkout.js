import { auth, db, doc, updateDoc, getDoc } from "./firebase.js";

function showMsg(msg) {
  alert(msg);
}

async function submitTransfer(e) {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return showMsg("Login required.");

  const local = JSON.parse(localStorage.getItem("userData") || "{}");
  const total = localStorage.getItem("checkoutTotal") || 0;

  const txnId = document.getElementById("txnId").value.trim();
  const bank = document.getElementById("bank").value.trim();

  if (!txnId || !bank) return showMsg("Fill all fields.");

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  const data = snap.data();

  const newOrder = {
    id: Date.now(),
    txnId,
    amount: Number(total),
    date: new Date().toISOString(),
    seller: "ShopNest",
    status: "Processing"
  };

  const updatedHistory = [...(data.buyHistory || []), newOrder];
  await updateDoc(userRef, { buyHistory: updatedHistory, cart: [] });

  local.buyHistory = updatedHistory;
  local.cart = [];
  localStorage.setItem("userData", JSON.stringify(local));

  showMsg("Transfer submitted successfully!");
  window.location.href = "../pages/home.html";
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("transferForm")?.addEventListener("submit", submitTransfer);
});
