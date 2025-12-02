// report.js - UNTUK BACK BUTTON (MIRIP SETTINGS.JS)
document.addEventListener("DOMContentLoaded", function () {
  const backBtn = document.querySelector(".back-btn");
  const form = document.querySelector(".report-form");

  // Kembali ke settings
  if (backBtn) {
    backBtn.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = "settings.html";
    });
  }

  // Handle submit (untuk testing, alert saja - ganti nanti dengan API)
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      alert("Report sent. Thank you!");
      // Later: send data to API via fetch()
      // form.reset();
    });
  }
});
