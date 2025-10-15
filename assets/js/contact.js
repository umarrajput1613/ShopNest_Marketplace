// assets/js/contact.js

import {
  db,
  auth,
  doc,
  setDoc,
  collection,
  addDoc,
} from "./firebase.js";
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

/* =====================================================
   📨 1️⃣ General Inquiry Form Submission (Working)
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const generalForm = document.getElementById("form-general");

  if (generalForm) {
    generalForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("gName").value.trim();
      const email = document.getElementById("gEmail").value.trim();
      const subject = document.getElementById("gSubject").value;
      const message = document.getElementById("gMessage").value.trim();

      if (!name || !email || !message) {
        alert("⚠️ Please fill all fields before submitting!");
        return;
      }

      try {
        // If user is logged in, attach UID for reference
        const user = auth.currentUser;

        await addDoc(collection(db, "inquiries"), {
          name,
          email,
          subject,
          message,
          uid: user ? user.uid : null,
          createdAt: serverTimestamp(),
        });

        alert("✅ Your message has been sent successfully!");
        generalForm.reset();
      } catch (err) {
        console.error("❌ Inquiry submission failed:", err);
        alert("Error sending message. Please try again later.");
      }
    });
  }
});
