// about_us.js - MIRIP STREAK_BADGE.JS (HANYA BACK BUTTON)
document.addEventListener('DOMContentLoaded', function () {
    const backBtn = document.querySelector('.back-btn');

    // Kembali ke settings
    if (backBtn) {
        backBtn.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = 'settings.html';
        });
    }
});