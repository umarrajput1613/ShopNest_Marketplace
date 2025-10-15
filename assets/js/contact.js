// =======================================================
// ✅ assets/js/contact.js (Final Optimized Version)
// Prevents double submit + local + Firestore sync
// =======================================================

import {
  db,
  auth,
  doc,
  setDoc,
  getDoc,
} from "./firebase.js";
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const generalForm = document.getElementById("form-general");

  if (generalForm) {
    let isSubmitting = false; // 🧩 prevent double submits

    generalForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // ⛔ If already submitting, ignore further clicks
      if (isSubmitting) {
        console.warn("⚠️ Submission already in progress...");
        return;
      }
      isSubmitting = true; // lock form

      // 1️⃣ Get form values
      const name = document.getElementById("gName").value.trim();
      const email = document.getElementById("gEmail").value.trim();
      const subject = document.getElementById("gSubject").value;
      const message = document.getElementById("gMessage").value.trim();

      if (!name || !email || !message) {
        alert("⚠️ Please fill all fields before submitting!");
        isSubmitting = false;
        return;
      }

      // 2️⃣ Get current user or create guest ID
      const user = auth.currentUser;
      const userId = user ? user.uid : `guest_${Date.now()}`;

      // 3️⃣ Create data object
      const inquiryData = {
        name,
        email,
        subject,
        message,
        uid: userId,
        createdAt: new Date().toISOString(),
      };

      try {
        // 4️⃣ Save locally first
        localStorage.setItem(`inquiry_${userId}`, JSON.stringify(inquiryData));
        console.log("✅ Inquiry saved locally:", inquiryData);

        // 5️⃣ Firestore update or create
        const docRef = doc(db, "inquiries", userId);
        const existingSnap = await getDoc(docRef);

        const newMessage = {
          subject,
          message,
          createdAt: new Date().toISOString(),
        };

        if (existingSnap.exists()) {
          const prev = existingSnap.data().messages || [];
          await setDoc(docRef, {
            ...existingSnap.data(),
            messages: [...prev, newMessage],
            lastUpdated: new Date().toISOString(),
          });
          console.log("📝 Inquiry updated in Firestore");
        } else {
          await setDoc(docRef, {
            name,
            email,
            messages: [newMessage],
            createdAt: new Date().toISOString(),
          });
          console.log("🆕 Inquiry created in Firestore");
        }

        alert("✅ Message submitted successfully!");
        generalForm.reset();
      } catch (err) {
        console.error("❌ Error saving inquiry:", err);
        alert("Something went wrong. Try again later.");
      } finally {
        isSubmitting = false; // 🔓 unlock form
      }
    });
  }
});
