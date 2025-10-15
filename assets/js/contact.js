// assets/js/contact.js
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
    generalForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // 1️⃣ Get form values
      const name = document.getElementById("gName").value.trim();
      const email = document.getElementById("gEmail").value.trim();
      const subject = document.getElementById("gSubject").value;
      const message = document.getElementById("gMessage").value.trim();

      if (!name || !email || !message) {
        alert("⚠️ Please fill all fields before submitting!");
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
        // 4️⃣ Save locally first (for quick restore)
        localStorage.setItem(`inquiry_${userId}`, JSON.stringify(inquiryData));
        console.log("✅ Inquiry saved locally:", inquiryData);

        // 5️⃣ Check if already exists in Firestore
        const docRef = doc(db, "inquiries", userId);
const existingSnap = await getDoc(docRef);

if (existingSnap.exists()) {
  // Merge new message with old (array)
  const prev = existingSnap.data().messages || [];
  const newMessage = {
    subject,
    message,
    createdAt: new Date().toISOString(), // ✅ use JS timestamp instead
  };

  await setDoc(docRef, {
    ...existingSnap.data(),
    messages: [...prev, newMessage],
    lastUpdated: new Date().toISOString(),
  });

  console.log("📝 Inquiry updated in Firestore");
} else {
  // New user inquiry doc
  const newMessage = {
    subject,
    message,
    createdAt: new Date().toISOString(),
  };

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
      }
    });
  }
});
