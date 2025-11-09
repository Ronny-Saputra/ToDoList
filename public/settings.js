// settings.js
document.addEventListener('DOMContentLoaded', function () {
    // === ELEMEN UMUM ===
    const backBtn = document.querySelector('.back-btn');
    const logoutLink = document.querySelector('a.danger'); // Log Out (yang pertama)
    const deleteLink = document.querySelectorAll('a.danger')[1]; // Delete Account (yang kedua)

    // === POPUP LOG OUT ===
    const logoutPopup = document.getElementById('logoutPopup');
    const cancelLogoutBtn = document.getElementById('cancelLogout');
    const confirmLogoutBtn = document.getElementById('confirmLogout');

    // === POPUP DELETE ACCOUNT ===
    const deletePopup = document.getElementById('deletePopup');
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    const confirmDeleteBtn = document.getElementById('confirmDelete');

    // ========================================
    // 1. KEMBALI KE PROFILE
    // ========================================
    if (backBtn) {
        backBtn.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = 'profile.html';
        });
    }

    // ========================================
    // 2. POPUP LOG OUT
    // ========================================
    if (logoutLink && logoutPopup) {
        logoutLink.addEventListener('click', function (e) {
            e.preventDefault();
            logoutPopup.classList.add('show');
        });
    }

    if (cancelLogoutBtn) {
        cancelLogoutBtn.addEventListener('click', function () {
            logoutPopup.classList.remove('show');
        });
    }

    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', function () {
            logoutPopup.classList.remove('show');
            setTimeout(() => {
                window.location.href = 'login.html'; // Arahkan ke login
            }, 300);
        });
    }

    // Tutup popup saat klik luar
    if (logoutPopup) {
        logoutPopup.addEventListener('click', function (e) {
            if (e.target === logoutPopup) {
                logoutPopup.classList.remove('show');
            }
        });
    }

    // ========================================
    // 3. POPUP DELETE ACCOUNT
    // ========================================
    if (deleteLink && deletePopup) {
        deleteLink.addEventListener('click', function (e) {
            e.preventDefault();
            deletePopup.classList.add('show');
        });
    }

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', function () {
            deletePopup.classList.remove('show');
        });
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function () {
            deletePopup.classList.remove('show');
            setTimeout(() => {
                alert('Akun telah dihapus.'); // Ganti nanti dengan API
                // window.location.href = 'login.html'; // Uncomment saat sudah siap
            }, 300);
        });
    }

    // Tutup popup delete saat klik luar
    if (deletePopup) {
        deletePopup.addEventListener('click', function (e) {
            if (e.target === deletePopup) {
                deletePopup.classList.remove('show');
            }
        });
    }
});