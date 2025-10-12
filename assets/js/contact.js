// ====== CONTACT PAGE SCRIPT ======

// Helper function for showing alerts
function showAlert(message, type = "success") {
  const alertBox = document.createElement("div");
  alertBox.className = `alert alert-${type} text-center fw-bold mt-3`;
  alertBox.textContent = message;

  document.querySelector(".tab-pane.active form").appendChild(alertBox);

  setTimeout(() => alertBox.remove(), 3000);
}

// ===== General Inquiry Form =====
document.getElementById("form-general")?.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("gName").value.trim();
  const email = document.getElementById("gEmail").value.trim();
  const message = document.getElementById("gMessage").value.trim();

  if (!name || !email || !message) {
    showAlert("Please fill in all required fields.", "danger");
    return;
  }

  // Example success message
  showAlert("✅ Your inquiry has been submitted successfully!");
  e.target.reset();
});

// ===== Seller Form =====
document.getElementById("form-seller")?.addEventListener("submit", (e) => {
  e.preventDefault();

  showAlert("✅ Seller application submitted successfully! Our team will contact you soon.", "success");
  e.target.reset();
});

// ===== Buyer Form =====
document.getElementById("form-buyer")?.addEventListener("submit", (e) => {
  e.preventDefault();

  const passFields = e.target.querySelectorAll('input[type="password"]');
  if (passFields[0].value !== passFields[1].value) {
    showAlert("❌ Passwords do not match!", "danger");
    return;
  }

  showAlert("✅ Buyer account registered successfully!", "success");
  e.target.reset();
});

// ===== Payment Form =====
document.getElementById("form-payment")?.addEventListener("submit", (e) => {
  e.preventDefault();

  const cardNumber = e.target.querySelector('input[placeholder="MM/YY"]');
  if (!cardNumber) {
    showAlert("Please enter valid card details.", "danger");
    return;
  }

  showAlert("✅ Payment submitted securely!", "success");
  e.target.reset();
});

// ===== Fund Transfer Form =====
document.getElementById("form-transfer")?.addEventListener("submit", (e) => {
  e.preventDefault();

  showAlert("✅ Fund transfer request submitted successfully!", "success");
  e.target.reset();
});

console.log("📩 Contact page JS loaded successfully");
