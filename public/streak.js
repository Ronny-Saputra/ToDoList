// File: public/streak.js

// ===================================================
// HELPER FUNCTIONS (Mencocokkan Logika Kotlin/Java)
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
 * (Penting: Gunakan waktu lokal agar konsisten dengan `SimpleDateFormat("yyyy-MM-dd")` di Kotlin)
 * @param {Date} date
 * @returns {Date} Objek Date yang dinormalisasi ke 00:00:00 hari itu.
 */
function normalizeDateToMidnight(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Memeriksa apakah tanggal terakhir adalah tepat satu hari sebelum tanggal hari ini.
 * (Mencocokkan logika `isYesterday` di HomeActivity.kt)
 * @param {string | null} lastDateStr - Tanggal terakhir yang selesai ("yyyy-MM-dd").
 * @param {string} todayStr - Tanggal hari ini ("yyyy-MM-dd").
 * @returns {boolean}
 */
function isYesterday(lastDateStr, todayStr) {
    if (!lastDateStr || lastDateStr === "") return false;

    // Membuat objek Date dari string yyyy-MM-dd pada midnight lokal
    const lastDate = normalizeDateToMidnight(new Date(lastDateStr.replace(/-/g, '/') + ' 00:00:00'));
    const today = normalizeDateToMidnight(new Date(todayStr.replace(/-/g, '/') + ' 00:00:00'));
    
    // Hitung tanggal kemarin dari hari ini
    const yesterday = new Date(today.getTime());
    yesterday.setDate(today.getDate() - 1);

    // Bandingkan timestamp tengah malam
    return lastDate.getTime() === yesterday.getTime();
}

/**
 * Mendapatkan indeks hari dalam seminggu sesuai konvensi Kotlin/ISO (Senin=0 ... Minggu=6).
 * (Mencocokkan konvensi Calendar.DAY_OF_WEEK: Senin=2, ... Minggu=1, lalu disesuaikan di Kotlin/Java)
 * Kita menggunakan konvensi ISO/Kotlin: 0=Senin, 6=Minggu.
 * @returns {number} Indeks hari (0-6).
 */
function getCurrentDayOfWeek() {
    // JS: 0=Sun, 1=Mon, ..., 6=Sat
    const jsDay = new Date().getDay(); 
    
    // Konversi ke indeks Kotlin/ISO: Senin=0, ..., Minggu=6
    // (jsDay + 6) % 7 -> Sun(0) -> 6, Mon(1) -> 0, Sat(6) -> 5
    return (jsDay + 6) % 7;
}

// ===================================================
// STREAK STATE MACHINE (Mencocokkan Logika HomeActivity.kt)
// ===================================================

/**
 * Mengaplikasikan logika mesin status Streak Kotlin.
 * Dijalankan di klien untuk menentukan apakah perlu memanggil API POST.
 *
 * @param {object} currentState - State streak saat ini: { currentStreak: number, lastCompletionDate: string | null, streakDays: string }.
 * @param {boolean} hasCompletedToday - True jika ada tugas yang selesai hari ini.
 * @returns {object} Status streak baru dan flag streakIncreased.
 */
function calculateNewStreakState(currentState, hasCompletedToday) {
    const todayStr = dateToYyyyMmDd(new Date());

    let oldStreak = currentState.currentStreak || 0;
    let lastDateStr = currentState.lastCompletionDate;
    
    let newStreak = oldStreak;
    let streakIncreased = false;

    // 1. Tentukan New Streak berdasarkan 4 Kasus Utama (Logika Kotlin)
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

    // 2. Hitung newStreakDays (Logic untuk progress bar mingguan)
    let newStreakDays = currentState.streakDays || "";
    const currentDay = getCurrentDayOfWeek(); // 0=Mon ... 6=Sun

    // Ubah string "1,2,5" menjadi Set [1, 2, 5]
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
        // Update lastCompletionDate hanya jika streak > 0 dan tugas selesai hari ini
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
// UI METRICS & UPDATE
// ===================================================

/**
 * Menghitung metrik yang diperlukan untuk progress bar mingguan.
 * @param {string} streakDaysStr - String hari-hari streak dalam seminggu (0=Mon...6=Sun).
 * @param {number} currentStreak - Panjang streak saat ini.
 * @returns {{streakStartInWeekIndex: number, streakDaysInWeek: number}}
 */
function calculateWeeklyMetrics(streakDaysStr, currentStreak) {
    if (currentStreak === 0 || !streakDaysStr) {
        return { streakStartInWeekIndex: -1, streakDaysInWeek: 0 };
    }

    const streakDaysArray = streakDaysStr.split(",").map(s => parseInt(s)).filter(n => !isNaN(n));
    if (streakDaysArray.length === 0) {
        return { streakStartInWeekIndex: -1, streakDaysInWeek: 0 };
    }
    
    const uniqueSortedDays = Array.from(new Set(streakDaysArray)).sort((a, b) => a - b);
    
    // Indeks hari pertama streak dalam seminggu ini (0=Mon)
    const minStreakDay = uniqueSortedDays[0];
    
    // Panjang streak dalam seminggu ini (jumlah hari unik yang ditandai)
    const streakDaysInWeek = uniqueSortedDays.length;
    
    return { 
        streakStartInWeekIndex: minStreakDay, 
        streakDaysInWeek: streakDaysInWeek 
    };
}


function updateStreakUI(weeklyMetrics, currentStreak, streakDaysStr) {
    const progressFill = document.getElementById("progress-fill");
    const runnerIcon = document.getElementById("runner-icon");
    const streakNumber = document.getElementById("streak-number");
    const dotTrack = document.getElementById("dot-track"); 

    if (!progressFill || !runnerIcon || !streakNumber) return;

    const { streakStartInWeekIndex, streakDaysInWeek } = weeklyMetrics;

    // 1. Update Streak Number
    streakNumber.textContent = currentStreak;

    // 2. Calculate runner position and fill width
    if (currentStreak > 0 && streakStartInWeekIndex !== -1 && streakDaysInWeek > 0) {
        const totalSegments = 7;
        
        // Lebar fill = jumlah hari streak di minggu ini / total hari * 100
        const widthPercent = (streakDaysInWeek / totalSegments) * 100;
        
        // Posisi mulai = hari pertama streak di minggu ini / total hari * 100
        const startPercent = (streakStartInWeekIndex / totalSegments) * 100;
        
        // Posisi ikon lari = posisi mulai + lebar fill
        const runnerPositionPercent = startPercent + widthPercent;
        
        // Terapkan style (Membuat warna terlihat)
        progressFill.style.left = `${startPercent}%`;
        progressFill.style.width = `${widthPercent}%`;
        runnerIcon.style.left = `${runnerPositionPercent}%`;
        
        // Pastikan elemen terlihat
        runnerIcon.style.opacity = "1";
        progressFill.style.opacity = "1";

    } else {
        // Streak 0 atau tidak aktif (Membuat tidak ada warna)
        progressFill.style.left = `0%`;
        progressFill.style.width = `0%`;
        runnerIcon.style.left = `0%`;
        
        // Sembunyikan elemen
        runnerIcon.style.opacity = "0";
        progressFill.style.opacity = "0";
    }
    
    // 3. Update visibility of dots 
    if (dotTrack) {
        let dotElements = dotTrack.querySelectorAll(".dot");
        
        if (dotElements.length === 0) {
             // Buat dotElements jika belum ada (sesuai markup home.html)
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
            // Sembunyikan penanda hari yang sudah dicapai
            if (streakDaysArray.includes(i)) {
                dot.style.opacity = "0"; 
            } else {
                // Tampilkan titik di hari yang belum dicapai (streak kosong = semua tampil)
                dot.style.opacity = "1";
            }
        });
    }

    console.log(`Streak UI updated: Current Streak=${currentStreak}, Streak Days=${streakDaysStr}`);
}


// ===================================================
// MAIN LOGIC EXECUTION
// ===================================================

document.addEventListener("DOMContentLoaded", async () => {
    // Hanya jalankan di halaman home.html
    if (!window.location.pathname.includes("home.html")) return;
    
    if (typeof firebase === 'undefined' || !firebase.auth || !window.fetchData) {
        console.error("Firebase atau window.fetchData tidak dimuat.");
        updateStreakUI({ streakStartInWeekIndex: -1, streakDaysInWeek: 0 }, 0, "");
        return;
    }

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            updateStreakUI({ streakStartInWeekIndex: -1, streakDaysInWeek: 0 }, 0, "");
            return;
        }

        try {
            // --- 1. Persiapan Data ---
            const todayStr = dateToYyyyMmDd(new Date());
            
            // Fetch completed tasks for today: GET /api/tasks?status=completed&date=YYYY-MM-DD
            const todayCompletedTasks = await window.fetchData(`/tasks?status=completed&date=${todayStr}`);
            const hasCompletedToday = Array.isArray(todayCompletedTasks) && todayCompletedTasks.length > 0;
            
            // --- 2. Ambil Status Streak Saat Ini ---
            const fetchedState = await window.fetchData('/stats/streak');
            const initialState = { 
                 currentStreak: fetchedState.currentStreak || 0,
                 lastCompletionDate: fetchedState.lastCompletionDate || null,
                 streakDays: fetchedState.streakDays || ""
            };
            
            // --- 3. Hitung Status Baru (Menggunakan logika Kotlin/mesin status) ---
            const { streakIncreased, oldStreak, ...newState } = calculateNewStreakState(initialState, hasCompletedToday);
            
            let finalState = initialState; 

            // Cek apakah ada perubahan yang perlu disimpan/diproses (SAMA SEPERTI LOGIKA KOTLIN)
            if (newState.currentStreak !== initialState.currentStreak || newState.lastCompletionDate !== initialState.lastCompletionDate || newState.streakDays !== initialState.streakDays) {
                
                // Jika logic lokal memutuskan ada perubahan DAN tugas selesai hari ini,
                // panggil API POST /complete. Backend akan menghitung ulang dan menyimpan.
                // Ini mencakup Case 1 (Start) dan Case 3 (Increment).
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
                } else if (newState.currentStreak === 0 && oldStreak > 0) {
                     // Kasus 4: Streak putus. Kita tampilkan 0 di frontend
                     // dan andalkan logic backend (GET /stats/streak) untuk mengoreksi di hari berikutnya.
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
            updateStreakUI({ streakStartInWeekIndex: -1, streakDaysInWeek: 0 }, 0, "");
        }
    });
});