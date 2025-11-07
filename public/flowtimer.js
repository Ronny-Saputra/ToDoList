// File: public/flowtimer.js

document.addEventListener('DOMContentLoaded', function() {
    // Menggunakan activityTitleEl sesuai dengan ID di HTML
    const activityTitleEl = document.getElementById('activityTitle');
    const timerDisplayEl = document.getElementById('timerDisplay');
    const controlBtn = document.getElementById('controlBtn');
    const controlIcon = controlBtn?.querySelector('i');

    let totalDurationSeconds = 1800; // Default 30 minutes (30 * 60)
    let timeLeft = totalDurationSeconds;
    let timerInterval = null;
    let isRunning = false;
    let activityName = ""; // Default sesuai gambar

    // --- UTILITY: Format Waktu (MM:SS atau HH:MM:SS) ---
    function formatTime(seconds) {
        // Jika durasi lebih dari 60 menit, tampilkan HH:MM:SS
        if (seconds >= 3600) {
            const hrs = Math.floor(seconds / 3600);
            const min = Math.floor((seconds % 3600) / 60);
            const sec = seconds % 60;
            return `${String(hrs).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        }
        
        // Default MM:SS
        const min = Math.floor(seconds / 60);
            const sec = seconds % 60;
        return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    // --- FUNGSI UTAMA: Update Timer ---
    function updateTimer() {
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            isRunning = false;
            if (controlIcon) controlIcon.className = 'fas fa-redo'; // Ganti ikon menjadi Ulangi
            if (timerDisplayEl) timerDisplayEl.textContent = formatTime(0); 
            alert("Time's up! Flow Timer completed.");
            return;
        }

        timeLeft--;
        if (timerDisplayEl) timerDisplayEl.textContent = formatTime(timeLeft);
    }

    // --- FUNGSI UTAMA: Toggle Timer (Play/Pause) ---
    function toggleTimer() {
        if (!controlIcon) return;

        if (isRunning) {
            // Pause
            clearInterval(timerInterval);
            isRunning = false;
            controlIcon.className = 'fas fa-play';
        } else {
            // Play (atau Reset)
            if (timeLeft <= 0) {
                timeLeft = totalDurationSeconds;
                if (timerDisplayEl) timerDisplayEl.textContent = formatTime(timeLeft);
            }
            
            // Mulai
            timerInterval = setInterval(updateTimer, 1000);
            isRunning = true;
            controlIcon.className = 'fas fa-pause';
        }
    }

    // --- INISIALISASI ---
    function initFlowTimer() {
        const urlParams = new URLSearchParams(window.location.search);
        
        let duration = urlParams.get('duration'); // Durasi dalam detik
        const activity = urlParams.get('activity'); 
        
        let initialDuration = 1800; // Default 30 minutes (1800 seconds)

        if (duration) {
            const parsedDuration = parseInt(duration);
            // Hanya gunakan durasi yang dikirim jika > 0
            if (!isNaN(parsedDuration) && parsedDuration > 0) {
                initialDuration = parsedDuration;
            }
        }
        
        totalDurationSeconds = initialDuration;
        timeLeft = totalDurationSeconds;
        
        if (activity) {
            activityName = decodeURIComponent(activity);
        }

        // Update UI Awal
        // Gunakan activityName untuk activityTitleEl
        if (activityTitleEl) activityTitleEl.textContent = activityName;
        // Pastikan timer display menunjukkan waktu yang diformat dengan benar
        if (timerDisplayEl) timerDisplayEl.textContent = formatTime(timeLeft);
        
        controlBtn?.addEventListener('click', toggleTimer);
        
        // Cek jika user login 
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(user => {
                if (!user) {
                    window.location.href = "../pages/login.html";
                }
            });
        }
    }

    initFlowTimer();
});