// feedback.js - MIRIP REPORT.JS
document.addEventListener('DOMContentLoaded', function () {
    const backBtn = document.querySelector('.back-btn');
    const form = document.querySelector('.feedback-form');
    const stars = document.querySelectorAll('.rating-stars i');
    const ratingInput = document.getElementById('rating');

    // Kembali ke settings
    if (backBtn) {
        backBtn.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = 'settings.html';
        });
    }

    // Handle rating bintang
    stars.forEach(star => {
        star.addEventListener('click', function () {
            const value = this.dataset.value;
            ratingInput.value = value;
            stars.forEach(s => {
                s.classList.toggle('selected', s.dataset.value <= value);
            });
        });
    });

    // Submit (testing, alert saja)
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            alert('Feedback telah dikirim. Terima kasih!');
            // Nanti: kirim ke API dengan rating & komentar
        });
    }
});