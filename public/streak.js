// File: public/streak.js

// ===================================================
// HELPER FUNCTIONS 
// ===================================================

/**
 * Mengonversi objek Date menjadi string format "yyyy-MM-dd".
 * @param {Date} date
 * @returns {string}
 */
function dateToYyyyMmDd(date) {
    const d = new Date(date.getTime());
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Normalisasi Date ke tengah malam (midnight) di zona waktu lokal untuk perbandingan yang andal.
 */
function normalizeDateToMidnight(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Memeriksa apakah tanggal terakhir adalah tepat satu hari sebelum tanggal hari ini.
 */
function isYesterday(lastDateStr, todayStr) {
    if (!lastDateStr || lastDateStr === "") return false;

    const lastDate = normalizeDateToMidnight(new Date(lastDateStr.replace(/-/g, '/') + ' 00:00:00'));
    const today = normalizeDateToMidnight(new Date(todayStr.replace(/-/g, '/') + ' 00:00:00'));
    
    const yesterday = new Date(today.getTime());
    yesterday.setDate(today.getDate() - 1);

    return lastDate.getTime() === yesterday.getTime();
}

/**
 * Mendapatkan indeks hari dalam seminggu sesuai konvensi (Senin=0 ... Minggu=6).
 */
function getCurrentDayOfWeek() {
    // JS: 0=Sun, 1=Mon, ..., 6=Sat
    const jsDay = new Date().getDay(); 
    
    // Konversi ke indeks: Senin=0, ..., Minggu=6
    return (jsDay + 6) % 7;
}

/**
 * Mengaplikasikan logika mesin status Streak.
 */
function calculateNewStreakState(currentState, hasCompletedToday) {
    const todayStr = dateToYyyyMmDd(new Date());

    let oldStreak = currentState.currentStreak || 0;
    let lastDateStr = currentState.lastCompletionDate;
    
    let newStreak = oldStreak;
    let streakIncreased = false;

    when: {
        if (!lastDateStr || lastDateStr === "") {
            // Case 1: Belum ada streak sama sekali
            if (hasCompletedToday) {
                newStreak = 1;
                streakIncreased = true;
            }
            break when;
        } 
        
        if (lastDateStr === todayStr) {
            // Case 2: Sudah di-update hari ini - no change
            newStreak = oldStreak;
            break when;
        } 
        
        if (isYesterday(lastDateStr, todayStr)) {
            // Case 3: Beruntun (Kemarin adalah hari terakhir)
            if (hasCompletedToday) {
                newStreak = oldStreak + 1;
                streakIncreased = true;
            }
            break when;
        } 
        
        // Case 4: Jeda lebih dari satu hari (Streak putus)
        if (hasCompletedToday) {
            newStreak = 1; // Mulai streak baru
            streakIncreased = true;
        } else {
            // Reset streak HANYA jika hari ini tidak ada task yang selesai
            newStreak = 0;
        }
    }

    // Hitung newStreakDays
    let newStreakDays = currentState.streakDays || "";
    const currentDay = getCurrentDayOfWeek(); // 0=Mon ... 6=Sun

    const existingDays = new Set(newStreakDays.split(",").map(s => parseInt(s)).filter(n => !isNaN(n)));
    
    if (newStreak === 1 && streakIncreased) {
        // Streak baru dimulai hari ini (Case 1 atau Case 4 dengan hasCompletedToday)
        newStreakDays = String(currentDay);
    } else if (newStreak === 0 && oldStreak > 0 && !hasCompletedToday) {
        // Streak putus (Case 4 tanpa hasCompletedToday)
        newStreakDays = "";
    } else if (streakIncreased) {
        // Streak berlanjut (Case 3)
        if (!existingDays.has(currentDay)) {
            existingDays.add(currentDay);
        }
        newStreakDays = Array.from(existingDays).sort((a, b) => a - b).join(',');
    } else if (newStreak > 0 && lastDateStr === todayStr) {
         // Case 2 fallback: Ensure today is marked if the calculation was already run today 
         if (!existingDays.has(currentDay)) {
            existingDays.add(currentDay);
            newStreakDays = Array.from(existingDays).sort((a, b) => a - b).join(',');
         }
    }


    const nextState = {
        currentStreak: newStreak,
        lastCompletionDate: newStreak > 0 && hasCompletedToday ? todayStr : null, 
        streakDays: newStreakDays
    };
    
    return { 
        ...nextState,
        streakIncreased: streakIncreased,
        oldStreak: oldStreak 
    };
}


// ===================================================
// UI METRICS & UPDATE (FINAL CORRECTION)
// ===================================================

/**
 * Menghitung metrik yang diperlukan untuk progress bar mingguan.
 */
function calculateWeeklyMetrics(streakDaysStr, currentStreak) {
    if (currentStreak === 0 || !streakDaysStr) {
        return { streakStartInWeekIndex: -1, lastStreakDay: -1, streakDaysInWeek: 0 };
    }

    const streakDaysArray = streakDaysStr.split(",").map(s => parseInt(s)).filter(n => !isNaN(n));
    if (streakDaysArray.length === 0) {
        return { streakStartInWeekIndex: -1, lastStreakDay: -1, streakDaysInWeek: 0 };
    }
    
    const sortedDays = Array.from(new Set(streakDaysArray)).sort((a, b) => a - b);
    
    // Indeks hari pertama streak dalam seminggu ini (0=Mon)
    const streakStartInWeekIndex = sortedDays[0];
    
    // Panjang streak yang divisualisasikan dalam seminggu ini
    const streakDaysInWeek = sortedDays.length;
    
    // Hari terakhir yang selesai di minggu ini (untuk posisi runner)
    const lastStreakDay = sortedDays[sortedDays.length - 1];
    
    return { 
        streakStartInWeekIndex, 
        lastStreakDay, 
        streakDaysInWeek
    };
}


function updateStreakUI(weeklyMetrics, currentStreak, streakDaysStr) {
    const progressFill = document.getElementById("progress-fill");
    const runnerIcon = document.getElementById("runner-icon");
    const streakNumber = document.getElementById("streak-number");
    const dotTrack = document.getElementById("dot-track"); 

    if (!progressFill || !runnerIcon || !streakNumber) return;

    const { streakStartInWeekIndex, lastStreakDay, streakDaysInWeek } = weeklyMetrics;
    const totalSegments = 7;
    const SEGMENTS = 6; // Jumlah segmen penuh antara M dan S (0 ke 6)

    // 1. Update Streak Number
    streakNumber.textContent = currentStreak;

    // 2. Update Dots (Mon-Sun)
    if (dotTrack) {
        let dotElements = dotTrack.querySelectorAll(".dot");
        
        if (dotElements.length === 0) {
             dotTrack.innerHTML = `
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>`;
             dotElements = dotTrack.querySelectorAll(".dot");
        }
        
        const streakDaysArray = streakDaysStr.split(",").map(s => parseInt(s)).filter(n => !isNaN(n));
        
        dotElements.forEach((dot, i) => {
            // Titik disembunyikan HANYA untuk Sabtu (5) dan Minggu (6)
            // Ini adalah visualisasi FIX untuk S ke S.
            if (currentStreak > 0 && (i === 5 || i === 6)) {
                 dot.style.opacity = "0"; 
            } else {
                 // Titik hari lainnya (M, T, W, T, F) harus selalu terlihat.
                 dot.style.opacity = "1";
            }
        });
    }

    // 3. Calculate runner position and fill width (Mon=0, Tue=1, ..., Sun=6)
    if (currentStreak > 0 && streakDaysInWeek > 0) {
        
        // **LOGIKA VISUAL KUSUS (S ke S):**
        // Target: Fill dari S(5) ke S(6), Runner di S(6).
        
        const VISUAL_START_DOT_INDEX = 5; // Sabtu (indeks 5)
        const VISUAL_END_DOT_INDEX = 6; // Minggu (indeks 6)
        
        let visualStartDayIndex = VISUAL_START_DOT_INDEX;
        let visualWidthDays = 1; // Hanya 1 segmen (Satu hari penuh)
        let runnerDayIndex = VISUAL_END_DOT_INDEX; 

        // 1. Fill Start: Posisi dot Sabtu (index 5 / 6)
        const fillStartPercent = (VISUAL_START_DOT_INDEX / SEGMENTS) * 100;
        
        // 2. Fill Width: 1 Segmen (1 / 6)
        const fillWidthPercent = (1 / SEGMENTS) * 100;
        
        // 3. Runner Position: Posisi dot Minggu (index 6 / 6 = 100%)
        const runnerPositionPercent = (VISUAL_END_DOT_INDEX / SEGMENTS) * 100; 

        // Terapkan style
        progressFill.style.left = `${fillStartPercent}%`;
        progressFill.style.width = `${fillWidthPercent}%`;
        
        // Runner diposisikan 100% (tepat di titik Minggu)
        runnerIcon.style.left = `${runnerPositionPercent}%`; 
        
        // Tampilkan elemen
        progressFill.style.opacity = "1";
        runnerIcon.style.opacity = "1";

    } else {
        // Streak 0
        progressFill.style.left = `0%`;
        progressFill.style.width = `0%`;
        runnerIcon.style.left = `0%`;
        
        // Sembunyikan elemen
        progressFill.style.opacity = "0";
        runnerIcon.style.opacity = "0";
        // Pastikan semua dot terlihat jika streak 0 (default)
        if (dotTrack) {
             dotTrack.querySelectorAll(".dot").forEach(dot => dot.style.opacity = "1");
        }
    }
}


// ===================================================
// MAIN LOGIC EXECUTION (Keep existing code)
// ===================================================

document.addEventListener("DOMContentLoaded", async () => {
    // Hanya jalankan di halaman home.html
    if (!window.location.pathname.includes("home.html")) return;
    
    if (typeof firebase === 'undefined' || !firebase.auth || !window.fetchData) {
        console.error("Firebase atau window.fetchData tidak dimuat.");
        updateStreakUI({ streakStartInWeekIndex: -1, lastStreakDay: -1, streakDaysInWeek: 0 }, 0, "");
        return;
    }

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            updateStreakUI({ streakStartInWeekIndex: -1, lastStreakDay: -1, streakDaysInWeek: 0 }, 0, "");
            return;
        }

        try {
            // --- 1. Persiapan Data ---
            const todayStr = dateToYyyyMmDd(new Date());
            
            // Fetch completed tasks for today
            const todayCompletedTasks = await window.fetchData(`/tasks?status=completed&date=${todayStr}`);
            const hasCompletedToday = Array.isArray(todayCompletedTasks) && todayCompletedTasks.length > 0;
            
            // --- 2. Ambil Status Streak Saat Ini ---
            const fetchedState = await window.fetchData('/stats/streak');
            const initialState = { 
                 currentStreak: fetchedState.currentStreak || 0,
                 lastCompletionDate: fetchedState.lastCompletionDate || null,
                 streakDays: fetchedState.streakDays || ""
            };
            
            // --- 3. Hitung Status Baru (Logika mesin status) ---
            const { streakIncreased, oldStreak, ...newState } = calculateNewStreakState(initialState, hasCompletedToday);
            
            let finalState = initialState; 

            // Cek apakah ada perubahan yang perlu disimpan/diproses 
            if (newState.currentStreak !== initialState.currentStreak || newState.lastCompletionDate !== initialState.lastCompletionDate || newState.streakDays !== initialState.streakDays) {
                
                // Jika logic lokal memutuskan ada perubahan DAN tugas selesai hari ini,
                // panggil API POST /complete. Backend akan menghitung ulang dan menyimpan.
                if (hasCompletedToday) {
                     const updatedState = await window.fetchData('/stats/streak/complete', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({}) // Backend menggunakan waktu server
                     });
                     finalState = {
                          currentStreak: updatedState.currentStreak || 0,
                          lastCompletionDate: updatedState.lastCompletionDate || null,
                          streakDays: updatedState.streakDays || ""
                     };
                     
                    // Cek popup: Jika streak bertambah, tampilkan popup
                    if (updatedState.currentStreak > oldStreak) {
                        window.showCustomDialog(
                            `🎉 YAY, you on fire ${updatedState.currentStreak} streak!`,
                            [{ text: 'OK', action: () => {}, isPrimary: true }]
                        );
                    }
                } else if (newState.currentStreak === 0 && oldStreak > 0) {
                     // Kasus 4: Streak putus. Kita tampilkan 0 di frontend
                     finalState = newState;
                } else {
                     // State tidak berubah (Case 2, atau Kasus lain yang tidak memerlukan pembaruan eksplisit)
                     finalState = initialState;
                }
            } else {
                 // Tidak ada perubahan yang terdeteksi
                 finalState = initialState;
            }

            // --- 4. Hitung Metrik Mingguan & Update UI ---
            const weeklyMetrics = calculateWeeklyMetrics(finalState.streakDays, finalState.currentStreak);
            updateStreakUI(weeklyMetrics, finalState.currentStreak, finalState.streakDays);

        } catch (err) {
            console.error("Error loading or updating streak:", err);
            updateStreakUI({ streakStartInWeekIndex: -1, lastStreakDay: -1, streakDaysInWeek: 0 }, 0, "");
        }
    });
});

// Expose internal functions needed by task.js and potentially other files
window.TaskApp = window.TaskApp || {};