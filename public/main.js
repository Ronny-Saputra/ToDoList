// File: public/main.js

// =========================================
// BASE API URL UNTUK BACKEND
// ... (Unchanged)
// =========================================
const API_BASE_URL = "https://api-backend-delta.vercel.app/api";

// =========================================
// SPLASH SCREEN LOGIC
// ... (Unchanged)
// =========================================
document.addEventListener("DOMContentLoaded", function () {
  const splash = document.querySelector(".splash-container");

  if (splash) {
    console.log("Splash screen found, starting fade out timer.");
    splash.classList.add("fade-out");

    // Tunggu 3 detik lalu pindah ke halaman login
    setTimeout(() => {
      window.location.href = "pages/login.html";
    }, 3000);
  } else {
    console.log("Not on splash screen page, skipping splash logic.");
  }
});

// =========================================
// CUSTOM DIALOG (PENGGANTI ALERT BAWAAN BROWSER)
// ... (Unchanged)
// =========================================
window.showCustomDialog = function (
  message,
  buttons = [{ text: "OK", action: () => {}, isPrimary: true }],
) {
  const dialogOverlay = document.getElementById("custom-dialog-overlay");
  const dialogMessage = dialogOverlay ? dialogOverlay.querySelector("#custom-dialog-message") : null;
  const dialogActions = dialogOverlay ? dialogOverlay.querySelector("#custom-dialog-actions") : null;

  // Jika elemen dialog tidak ditemukan → hentikan, JANGAN tampilkan alert bawaan
  if (!dialogOverlay || !dialogMessage || !dialogActions) {
    console.error(
      "Custom dialog elements not found. Cannot display dialog with message: " + message
    );
    return;
  }

  // Isi pesan
  dialogMessage.textContent = message;
  dialogActions.innerHTML = "";

  // Render tombol
  buttons.forEach((btn) => {
    const buttonElement = document.createElement("button");
    buttonElement.textContent = btn.text;
    buttonElement.classList.add("dialog-btn");

    if (btn.isPrimary) buttonElement.classList.add("primary");

    buttonElement.addEventListener("click", () => {
      dialogOverlay.classList.remove("open");
      if (btn.action) btn.action();
    });

    dialogActions.appendChild(buttonElement);
  });

  dialogOverlay.classList.add("open");
};

// =========================================
// HELPER: FIREBASE ERROR MAPPER (FINAL FIX)
// =========================================
function mapAuthError(error) {
  let errorCode = error.code;
  let errorMessage = error.message;

  // Check if the error is auth/internal-error containing INVALID_LOGIN_CREDENTIALS
  if (errorCode === "auth/internal-error" && errorMessage.includes("INVALID_LOGIN_CREDENTIALS")) {
      errorCode = "auth/invalid-login-credentials";
  }

  switch (errorCode) {
    case "auth/email-already-in-use":
      return "This email is already in use by another account. Please try logging in.";
    case "auth/invalid-email":
      return "The email format is invalid. Please check your email address.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters.";
    case "auth/user-not-found":
    case "auth/invalid-login-credentials": 
      // MAIN MESSAGE FOR WRONG EMAIL OR PASSWORD
      return "Incorrect email or password. Please check your credentials.";
    case "auth/wrong-password":
      return "Incorrect password. Please check your credentials.";
    case "auth/operation-not-allowed":
      return "Email/password login is not enabled.";
    case "auth/account-exists-with-different-credential":
      return "This email is already registered with a different login method (e.g., Google/Facebook).";
    case "auth/popup-closed-by-user":
      return "The pop-up window was closed by the user.";
    default:
      return "An unexpected error occurred. Please try again. (" + errorCode + ")";
  }
}

// =========================================
// EVENT DELEGATION UNTUK TASK CARD (Dipasang di luar DOMContentLoaded)
// =========================================
document.body.addEventListener("click", (e) => {
  const clickedCard = e.target.closest(".task-card-item"); // card task
  const isActionButton = e.target.closest(".action-btn"); // tombol action (Edit/Delete/Flow Timer)
  const isCheckbox = e.target.closest(".task-checkbox"); // checkbox bulat

  if (clickedCard) {
    // Klik tombol atau checkbox → jangan toggle card
    if (isActionButton || isCheckbox) return;

    const isAlreadyActive = clickedCard.classList.contains("active");

    // Hapus active di semua card
    document.querySelectorAll(".task-card-item").forEach((c) => c.classList.remove("active"));

    // Jika belum aktif → aktifkan
    if (!isAlreadyActive) clickedCard.classList.add("active");

  } else {
    // Klik di luar card → nonaktifkan semua
    document.querySelectorAll(".task-card-item").forEach((c) => c.classList.remove("active"));
  }
});

// =========================================
// LOGIN GOOGLE (TETAP GLOBAL)
// =========================================
function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();

  firebase.auth().signInWithPopup(provider)
    .then((result) => {
      sessionStorage.setItem('justLoggedIn', 'true'); // flag: baru selesai login
      window.showCustomDialog(`Welcome, ${result.user.displayName}!`);
      
      setTimeout(() => {
        window.location.href = "../pages/home.html";
      }, 500);
    })
    .catch((error) => {
        console.error("Google Login error:", error);
        window.showCustomDialog(mapAuthError(error));
    });
}

// =========================================
// LOGIN FACEBOOK (TETAP GLOBAL)
// =========================================
function facebookLogin() {
  const provider = new firebase.auth.FacebookAuthProvider();

  firebase.auth().signInWithPopup(provider)
    .then((result) => {
      sessionStorage.setItem('justLoggedIn', 'true');
      window.showCustomDialog(`Welcome, ${result.user.displayName}!`);

      setTimeout(() => {
        window.location.href = "../pages/home.html";
      }, 500);
    })
    .catch((error) => {
        console.error("Facebook Login error:", error);
        window.showCustomDialog(mapAuthError(error));
    });
}

// =========================================
// LOGIN EMAIL + PASSWORD (TETAP GLOBAL)
// =========================================
function emailLogin(event) {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      sessionStorage.setItem('justLoggedIn', 'true');

      window.showCustomDialog(`Welcome, ${user.email}!`);

      setTimeout(() => {
        window.location.href = "../pages/home.html";
      }, 500);
    })
    .catch((error) => {
      console.error("Login error:", error);
      // ✅ MENAMPILKAN POPUP DIALOG SAAT LOGIN GAGAL
      window.showCustomDialog(mapAuthError(error));
    });

  return false;
}

// =========================================
// SIGNUP EMAIL (TETAP GLOBAL)
// =========================================
function emailSignup(event) {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  // Cek password sama
  if (password !== confirmPassword) {
    window.showCustomDialog("Password and confirmation do not match.");
    return false;
  }

  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // ✅ TAMPILKAN POPUP DIALOG SAAT SUKSES SIGN UP
      window.showCustomDialog(
        `Account successfully created for ${userCredential.user.email}. Please log in.`,
        [{ text: "OK", action: () => { window.location.href = "login.html"; }, isPrimary: true }]
      );
      
    })
    .catch((error) => {
      console.error("Error during sign-up:", error);
      // ✅ TAMPILKAN POPUP DIALOG SAAT SIGN UP GAGAL (Termasuk Email Already in Use)
      window.showCustomDialog(mapAuthError(error));
    });

  return false;
}

// =========================================
// DETECTION: MOBILE VS DESKTOP
// ... (Unchanged)
// =========================================
function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

if (isMobile()) {
  console.log("Mobile");
  document.body.classList.add("mobile");
} else {
  console.log("Desktop");
  document.body.classList.add("desktop");
}

// =========================================
// FETCH DATA KE API BACKEND (DENGAN AUTH TOKEN)
// ... (Unchanged)
// =========================================
async function fetchData(endpoint, options = {}) {
  const user = firebase.auth().currentUser;

  // Jika user belum login → stop
  if (!user) {
    console.error("Pengguna tidak login, membatalkan permintaan.");
    // Ganti window.location.href menjadi login.html jika bukan di halaman publik
    if (!['/login.html', '/signup.html', '/forgotpass.html', '/newpass.html'].some(page => window.location.pathname.includes(page))) {
        window.location.href = "../pages/login.html";
    }
    throw new Error("User not logged in.");
  }

  try {
    const token = await user.getIdToken();

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`, // Token Firebase
    };

    if (options.body) headers["Content-Type"] = "application/json";

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: headers,
    });

    if (!response.ok) {
      console.error(`Error ${response.status}: ${await response.text()}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");

    if (contentType && contentType.indexOf("application/json") !== -1) {
      return await response.json(); // Jika JSON
    } else {
      return await response.text(); // Jika text
    }

  } catch (error) {
    console.error("Gagal mengambil data:", error);
    throw error;
  }
}

// =========================================
// FORMAT TANGGAL ISO → YYYY-MM-DD
// ... (Unchanged)
// =========================================
function formatIsoToYyyyMmDd(isoString) {
  if (!isoString) return "";

  try {
    const date = new Date(isoString);
    if (isNaN(date)) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;

  } catch (e) {
    console.error("Error formatting date:", e);
    return "";
  }
}

// Expose global untuk digunakan di file lain (search.js, task.js, dll.)
window.TaskApp = window.TaskApp || {};
window.TaskApp.formatIsoToYyyyMmDd = formatIsoToYyyyMmDd;