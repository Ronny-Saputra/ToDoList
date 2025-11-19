const API_BASE_URL = 'https://api-backend-delta.vercel.app/api';
document.addEventListener('DOMContentLoaded', function() {
  // BAGIAN INI HANYA AKAN BERJALAN JIKA ADA ELEMEN DENGAN CLASS .splash-container
  const splash = document.querySelector(".splash-container");
  if (splash) {
    console.log("Splash screen found, starting fade out timer.");
    splash.classList.add("fade-out");
    setTimeout(() => {
      window.location.href = "pages/login.html";
    }, 3000);
  } else {
    console.log("Not on splash screen page, skipping splash logic.");
  }
});

// SEMUA FUNGSI DI BAWAH INI TETAP ADA UNTUK DIGUNAKAN DI HALAMAN LAIN

// ✅ PERBAIKAN: EVENT DELEGATION UNTUK TASK CARD (.task-card-item) DIKEMBALIKAN
document.body.addEventListener("click", (e) => {
  // Temukan elemen terdekat dengan kelas .task-card-item
  const clickedCard = e.target.closest(".task-card-item");
  // Temukan elemen terdekat dengan kelas .action-btn (tombol Flow Timer/Edit/Delete)
  const isActionButton = e.target.closest(".action-btn");
  // Temukan elemen terdekat dengan kelas .task-checkbox (bulatan checklist)
  const isCheckbox = e.target.closest(".task-checkbox");


  if (clickedCard) {
    // JANGAN lakukan toggle jika yang diklik adalah Checkbox atau Tombol Aksi
    if (isActionButton || isCheckbox) {
        return; 
    }
      
    // Cek apakah card ini sudah aktif
    const isAlreadyActive = clickedCard.classList.contains("active");

    // Hapus 'active' dari SEMUA card
    document.querySelectorAll(".task-card-item").forEach(c => c.classList.remove("active"));

    // Jika card belum aktif, aktifkan card yang diklik
    if (!isAlreadyActive) {
      clickedCard.classList.add("active");
    }
  } else {
    // Jika mengklik di luar area task card, nonaktifkan semua task card
    document.querySelectorAll(".task-card-item").forEach(c => c.classList.remove("active"));
  }
});


function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then(result => alert(`Welcome, ${result.user.displayName}`))
    .catch(error => alert(`Error: ${error.message}`));
}

function facebookLogin() {
  const provider = new firebase.auth.FacebookAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then(result => alert(`Welcome, ${result.user.displayName}`))
    .catch(error => alert(`Error: ${error.message}`));
}

function emailLogin(event) {
  event.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      const user = userCredential.user;
      alert(`Welcome, ${user.email}!`);
      // ✅ Redirect to home after login
      setTimeout(() => {
        window.location.href = "../pages/home.html";
      }, 500);
    })
    .catch(error => {
      console.error("Login error:", error);
      alert(`Error: ${error.message}`);
    });

  return false;
}

function emailSignup(event) {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    alert("Password dan konfirmasi tidak cocok.");
    return false;
  }

  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then(userCredential => {
      alert(`Akun berhasil dibuat untuk ${userCredential.user.email}. Silakan login.`);
      window.location.href = "login.html";
    })
    .catch(error => {
      console.error("Error during sign-up:", error);
      alert(`Error: ${error.message}`);
    });
  return false;
}
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

// === NAVBAR LOGIC ===
document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.querySelector('.navbar');
  if (!navbar) {
    console.log('Navbar not found.');
    return;
  }

  // Use event delegation so clicks on the icon or its parent .nav-item both work
  navbar.addEventListener('click', (e) => {
    // Prefer nav-item wrapper (new markup). If absent, fall back to the <i> element.
    const navItem = e.target.closest('.nav-item');
    let icon = null;
    if (navItem) icon = navItem.querySelector('i');
    else icon = e.target.closest('i');

    if (!icon || !navbar.contains(icon)) return;

    // Toggle active class on nav-item elements (if present)
    const allItems = navbar.querySelectorAll('.nav-item');
    if (allItems.length) {
      allItems.forEach(item => item.classList.remove('active'));
      const toActivate = icon.closest('.nav-item');
      if (toActivate) toActivate.classList.add('active');
    }

    if (icon.classList.contains('fa-home')) window.location.href = '/pages/home.html';
    else if (icon.classList.contains('fa-list-ul')) window.location.href = '/pages/task.html';
    else if (icon.classList.contains('fa-user')) window.location.href = '/pages/profile.html';

  });

  console.log('Navbar delegation listener ready!');
});

async function fetchData(endpoint, options = {}) {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.error('Pengguna tidak login, membatalkan permintaan.');
        return;
    }

    try {
        const token = await user.getIdToken();

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };

        if (options.body) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: headers
        });

        if (!response.ok) {
            // ... (logika penanganan error)
            console.error(`Error ${response.status}: ${await response.text()}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Cek jika respons memiliki konten sebelum parsing JSON
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return await response.json();
        } else {
            return await response.text(); // Untuk respons non-JSON (misal: 'OK')
        }

    } catch (error) {
        console.error('Gagal mengambil data:', error);
        throw error;
    }
}

// NEW UTILITY: Format ISO Date to YYYY-MM-DD
function formatIsoToYyyyMmDd(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        if (isNaN(date)) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error("Error formatting date:", e);
        return '';
    }
}
window.TaskApp = window.TaskApp || {};
// Expose secara global via TaskApp untuk digunakan di search.js, dll.
window.TaskApp.formatIsoToYyyyMmDd = formatIsoToYyyyMmDd;