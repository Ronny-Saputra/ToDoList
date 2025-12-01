// settings.js
document.addEventListener("DOMContentLoaded", function () {
  // === ELEMEN UMUM ===
  const backBtn = document.querySelector(".back-btn");
  // Ambil tautan Log Out (link pertama dengan kelas .danger)
  const logoutLink = document.querySelector("a.danger");
  // Ambil tautan Delete Account (link kedua dengan kelas .danger)
  const deleteLink = document.querySelectorAll("a.danger")[1];

  // === POPUP LOG OUT ===
  const logoutPopup = document.getElementById("logoutPopup");
  const cancelLogoutBtn = document.getElementById("cancelLogout");
  const confirmLogoutBtn = document.getElementById("confirmLogout");

  // === POPUP DELETE ACCOUNT ===
  const deletePopup = document.getElementById("deletePopup");
  const cancelDeleteBtn = document.getElementById("cancelDelete");
  const confirmDeleteBtn = document.getElementById("confirmDelete");

  // ========================================
  // 1. KEMBALI KE PROFILE
  // ========================================
  if (backBtn) {
    backBtn.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = "profile.html";
    });
  }

  // ========================================
  // 2. LOGIKA LOG OUT (TERHUBUNG FIREBASE)
  // ========================================
  if (logoutLink && logoutPopup) {
    logoutLink.addEventListener("click", function (e) {
      e.preventDefault();
      logoutPopup.classList.add("show");
    });
  }

  if (cancelLogoutBtn) {
    cancelLogoutBtn.addEventListener("click", function () {
      logoutPopup.classList.remove("show");
    });
  }

  // *** INI LOGIKA BARU UNTUK LOGOUT ***
  if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener("click", function () {
      // 1. Logout dari Firebase dulu
      localStorage.clear();
      firebase
        .auth()
        .signOut()
        .then(() => {
          console.log("User signed out.");
          logoutPopup.classList.remove("show");

          // 2. Baru pindah halaman setelah sukses logout
          setTimeout(() => {
            window.location.href = "login.html";
          }, 300);
        })
        .catch((error) => {
          console.error("Sign Out Error", error);
        });
    });
  }

  if (logoutPopup) {
    logoutPopup.addEventListener("click", function (e) {
      if (e.target === logoutPopup) {
        logoutPopup.classList.remove("show");
      }
    });
  }

  // ========================================
  // 3. LOGIKA DELETE ACCOUNT (TERHUBUNG FIREBASE)
  // ========================================
  if (deleteLink && deletePopup) {
    deleteLink.addEventListener("click", function (e) {
      e.preventDefault();
      deletePopup.classList.add("show");
    });
  }

  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener("click", function () {
      deletePopup.classList.remove("show");
    });
  }

  // *** INI LOGIKA BARU UNTUK DELETE ACCOUNT ***
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", function () {
      // Cek apakah firebase sudah dimuat
      if (typeof firebase === "undefined" || !firebase.auth) {
        alert("Error: Firebase belum dimuat. Cek Langkah 1.");
        return;
      }

      const user = firebase.auth().currentUser;

      if (user) {
        // Panggil fungsi delete dari Firebase Auth
        user
          .delete()
          .then(() => {
            // Sukses delete
            console.log("User account deleted.");
            deletePopup.classList.remove("show");
            alert("Akun Anda telah berhasil dihapus.");
            // Arahkan ke login SETELAH sukses delete
            setTimeout(() => {
              window.location.href = "login.html";
            }, 300);
          })
          .catch((error) => {
            // Gagal delete
            console.error("Delete account error", error);
            if (error.code === "auth/requires-recent-login") {
              // Error paling umum: pengguna harus login ulang
              alert(
                "Gagal menghapus akun. Sesi Anda sudah terlalu lama.\n\nSilakan Log Out, lalu Log In kembali, dan coba hapus akun lagi.",
              );
            } else {
              alert("Gagal menghapus akun: " + error.message);
            }
            deletePopup.classList.remove("show");
          });
      } else {
        alert("Tidak ada pengguna yang login.");
        deletePopup.classList.remove("show");
      }
    });
  }

  if (deletePopup) {
    deletePopup.addEventListener("click", function (e) {
      if (e.target === deletePopup) {
        deletePopup.classList.remove("show");
      }
    });
  }
});
