// scripts/streak_badge.js
document.addEventListener('DOMContentLoaded', function() {
    const backBtn = document.querySelector('.back-btn');
    
    if (backBtn) {
        backBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Jika streak_badge.html dan settings.html di folder yang SAMA (pages/)
            window.location.href = 'settings.html';
            
            // Jika streak_badge.html di subfolder lain, sesuaikan:
            // window.location.href = '../pages/settings.html';
        });
    }
});