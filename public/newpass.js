// ============================================
// FORGOT PASSWORD HANDLER
// ============================================

/**
 * Handle forgot password form submission
 * @param {Event} event - Form submit event
 * @returns {boolean} - Always returns false to prevent default form submission
 */
function forgetPasswordSubmit(event) {
  event.preventDefault();
  
  const emailInput = document.getElementById("email-username-forget");
  const email = emailInput.value.trim();

  // Validasi: Email tidak boleh kosong
  if (email === "") {
    window.showCustomDialog("Please enter your email address", [
      { text: "OK", action: () => {}, isPrimary: true }
    ]);
    return false;
  }

  // Validasi: Format email harus valid
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    window.showCustomDialog("Please enter a valid email address", [
      { text: "OK", action: () => {}, isPrimary: true }
    ]);
    return false;
  }

  // Disable button untuk prevent multiple clicks
  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Sending...";
  submitBtn.style.opacity = "0.6";
  submitBtn.style.cursor = "not-allowed";

  console.log(`Attempting to send password reset email to: ${email}`);

  // ✅ KIRIM EMAIL RESET PASSWORD VIA FIREBASE
  firebase.auth().sendPasswordResetEmail(email)
    .then(() => {
      // ✅ Berhasil mengirim email
      console.log("✅ Password reset email sent successfully to:", email);
      
      window.showCustomDialog(
        "Password reset email has been sent. Please check your email inbox (and spam folder).",
        [
          {
            text: "OK",
            action: () => {
              // Redirect ke login page setelah user klik OK
              window.location.href = "login.html";
            },
            isPrimary: true
          }
        ]
      );
    })
    .catch((error) => {
      // ❌ Gagal mengirim email
      console.error("❌ Error sending password reset email:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      let errorMessage = "Failed to send email. Please try again.";
      
      // ✅ Custom error messages berdasarkan error code
      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "No account found with this email address. Please check your email or sign up.";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email address format. Please enter a valid email.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many requests. Please try again in a few minutes.";
          break;
        case "auth/network-request-failed":
          errorMessage = "Network error. Please check your internet connection and try again.";
          break;
        case "auth/missing-email":
          errorMessage = "Email address is required.";
          break;
        default:
          errorMessage = `Failed to send email: ${error.message}`;
      }
      
      window.showCustomDialog(errorMessage, [
        { 
          text: "OK", 
          action: () => {
            // Re-enable button setelah user klik OK
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            submitBtn.style.opacity = "1";
            submitBtn.style.cursor = "pointer";
          }, 
          isPrimary: true 
        }
      ]);
    });

  return false;
}

// ============================================
// DEBUG: Check Firebase Auth Status (Optional)
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("Forgot Password page loaded");
  console.log("Firebase Auth available:", typeof firebase !== "undefined" && firebase.auth);
});