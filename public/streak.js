// File: public/streak.js

// --- HELPER FUNCTIONS (Matching Kotlin/Java logic) ---

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
 * Normalisasi Date ke tengah malam (midnight) untuk perbandingan.
 * @param {Date} date
 * @returns {number} Timestamp tengah malam.
 */
function normalizeDateToMidnight(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Memeriksa apakah tanggal terakhir adalah tepat satu hari sebelum tanggal hari ini.
 * @param {string | null} lastDateStr - Tanggal terakhir yang selesai ("yyyy-MM-dd").
 * @param {string} todayStr - Tanggal hari ini ("yyyy-MM-dd").
 * @returns {boolean}
 */
function isYesterday(lastDateStr, todayStr) {
    if (!lastDateStr) return false;
    
    // Konversi string ke timestamp tengah malam
    const lastDate = normalizeDateToMidnight(new Date(lastDateStr.replace(/-/g, '/')));
    
    const today = normalizeDateToMidnight(new Date(todayStr.replace(/-/g, '/')));
    const yesterday = new Date(today);
    yesterday.setDate(new Date(today).getDate() - 1);
    
    return lastDate === yesterday.getTime();
}

/**
 * Mendapatkan indeks hari dalam seminggu sesuai konvensi Kotlin/Java (Senin=0 ... Minggu=6).
 * @returns {number} Indeks hari (0-6).
 */
function getCurrentDayOfWeek() {
    // JS: 0=Sun, 1=Mon, ..., 6=Sat
    const today = new Date();
    const jsDay = today.getDay(); 
    
    // Konversi ke indeks Kotlin: Senin=0, ..., Minggu=6
    return (jsDay + 6) % 7;
}

// --- STREAK STATE MACHINE (Matching Kotlin/Java HomeActivity/TaskActivity logic) ---

/**
 * Mengaplikasikan logika mesin status Streak Kotlin untuk menghitung status streak baru.
 *
 * @param {object} currentState - State streak yang diambil dari Firestore: { currentStreak: number, lastCompletionDate: string | null, streakDays: string }.
 * @param {boolean} hasCompletedToday - True jika ada tugas yang selesai hari ini.
 * @returns {object} Status streak baru dan flag streakIncreased.
 */
function calculateNewStreakState(currentState, hasCompletedToday) {
    const today = normalizeDateToMidnight(new Date());
    const todayStr = dateToYyyyMmDd(new Date(today));

    let oldStreak = currentState.currentStreak || 0;
    let lastDateStr = currentState.lastCompletionDate;
    
    let newStreak = oldStreak;
    let streakIncreased = false;

    // 1. Tentukan New Streak berdasarkan 4 Kasus Utama (Logika Kotlin)
    if (lastDateStr === null || lastDateStr === "") {
        // Case 1: Belum ada streak sama sekali
        if (hasCompletedToday) {
            newStreak = 1;
            streakIncreased = true;
        }
    } else if (lastDateStr === todayStr) {
        // Case 2: Sudah di-update hari ini - no change
    } else if (isYesterday(lastDateStr, todayStr)) {
        // Case 3: Beruntun (Kemarin adalah hari terakhir)
        if (hasCompletedToday) {
            newStreak = oldStreak + 1;
            streakIncreased = true;
        }
    } else {
        // Case 4: Streak putus / Mulai baru (Lebih dari satu hari berlalu)
        if (hasCompletedToday) {
            newStreak = 1;
            streakIncreased = true;
        } else {
            // Reset streak HANYA jika hari ini tidak ada task yang selesai
            newStreak = 0;
        }
    }

    // 2. Hitung newStreakDays (Logic untuk progress bar mingguan)
    let newStreakDays = currentState.streakDays || "";
    const currentDay = getCurrentDayOfWeek();

    if (newStreak > oldStreak) {
        // Streak bertambah, tambahkan hari ini ke streakDays jika belum ada
        const existingDays = new Set(newStreakDays.split(",").map(s => parseInt(s)).filter(n => !isNaN(n)));
        if (!existingDays.has(currentDay)) {
            newStreakDays = newStreakDays ? `${newStreakDays},${currentDay}` : `${currentDay}`;
        }
    } else if (newStreak === 1 && streakIncreased) {
        // Streak baru dimulai (reset hari ke hari ini saja)
        newStreakDays = `${currentDay}`;
    } else if (newStreak === 0) {
        // Streak putus, reset hari
        newStreakDays = "";
    } else if (newStreak > 0 && lastDateStr === todayStr) {
        // Jika sudah selesai hari ini, pastikan hari ini ada di streakDays
        const existingDays = new Set(newStreakDays.split(",").map(s => parseInt(s)).filter(n => !isNaN(n)));
         if (!existingDays.has(currentDay)) {
            newStreakDays = newStreakDays ? `${newStreakDays},${currentDay}` : `${currentDay}`;
        }
    }

    const nextState = {
        currentStreak: newStreak,
        lastCompletionDate: newStreak > 0 ? todayStr : null,
        streakDays: newStreakDays
    };
    
    return { 
        ...nextState,
        streakIncreased: streakIncreased,
        oldStreak: oldStreak // Termasuk oldStreak untuk logging/perbandingan
    };
}


// --- WEEKLY UI METRICS (Matching Kotlin/Java HomeActivity logic) ---

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
    
    // Indeks hari pertama streak dalam seminggu ini
    const minStreakDay = Math.min(...streakDaysArray);
    
    // Panjang streak dalam seminggu ini
    const streakDaysInWeek = new Set(streakDaysArray).size;
    
    return { 
        streakStartInWeekIndex: minStreakDay, 
        streakDaysInWeek: streakDaysInWeek 
    };
}


function updateStreakUI(weeklyMetrics, currentStreak) {
    const progressFill = document.getElementById("progress-fill");
    const runnerIcon = document.getElementById("runner-icon");
    const streakNumber = document.querySelector(".streak-number");
    // Mencoba mendapatkan elemen dotTrack, anggap ini adalah container penanda hari
    const dotTrack = document.getElementById("dot-track"); 

    if (!progressFill || !runnerIcon || !streakNumber) return;

    const { streakStartInWeekIndex, streakDaysInWeek } = weeklyMetrics;

    // 1. Update Streak Number
    streakNumber.textContent = currentStreak;

    // 2. Calculate runner position and fill width
    if (currentStreak > 0 && streakStartInWeekIndex !== -1) {
        // Hitung persentase awal dan lebar berdasarkan hari dalam seminggu
        const startPercent = (streakStartInWeekIndex / 7) * 100;
        const widthPercent = (streakDaysInWeek / 7) * 100;
        const fillPercent = startPercent + widthPercent;
        
        progressFill.style.left = `${startPercent}%`;
        progressFill.style.width = `${widthPercent}%`;
        runnerIcon.style.left = `${fillPercent}%`;
        
        // Pastikan elemen terlihat
        runnerIcon.style.opacity = "1";
        progressFill.style.opacity = "1";

    } else {
        // Streak 0 atau tidak aktif
        progressFill.style.left = `0%`;
        progressFill.style.width = `0%`;
        runnerIcon.style.left = `0%`;
        
        // Sembunyikan elemen
        runnerIcon.style.opacity = "0";
        progressFill.style.opacity = "0";
    }
    
    // 3. Update visibility of dots (assuming dots are children of dotTrack)
    if (dotTrack) {
        // Buat dotElements jika belum ada (karena di home.html, dotElements tidak dibuat via JS)
        let dotElements = dotTrack.querySelectorAll(".dot");
        
        // JIKA dotElements kosong, buat ulang berdasarkan markup di home.html
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
        
        dotElements.forEach((dot, i) => {
            // Indeks 'i' (0-6)
            if (currentStreak > 0 && streakStartInWeekIndex !== -1 && i >= streakStartInWeekIndex && i < streakStartInWeekIndex + streakDaysInWeek) {
                dot.style.opacity = "0"; // Sembunyikan penanda hari yang sudah dicapai
            } else {
                dot.style.opacity = "1"; // Tampilkan penanda hari yang belum dicapai
            }
        });
    }


    console.log(`Streak UI updated: Start Index=${streakStartInWeekIndex}, Days this week=${streakDaysInWeek}, Current Streak=${currentStreak}`);
}


// --- MAIN LOGIC EXECUTION ---

document.addEventListener("DOMContentLoaded", async () => {
    // Hanya jalankan di halaman home.html (sesuai konteks file)
    if (!window.location.pathname.includes("home.html")) return;
    
    if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
        console.error("Firebase atau Firestore tidak dimuat.");
        updateStreakUI({ streakStartInWeekIndex: -1, streakDaysInWeek: 0 }, 0);
        return;
    }

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            updateStreakUI({ streakStartInWeekIndex: -1, streakDaysInWeek: 0 }, 0);
            return;
        }

        const db = firebase.firestore();
        const tasksRef = db.collection("users").doc(user.uid).collection("tasks");
        // Asumsi path Firestore sesuai dengan Kotlin (users/{uid}/stats/streak)
        const streakRef = db.collection("users").doc(user.uid).collection("stats").doc("streak");

        try {
            // --- 1. Tentukan apakah task selesai HARI INI ---
            // Asumsi: Task yang completed memiliki field `done: true` dan `date` yang sama dengan hari ini.
            // PERHATIAN: Logika Kotlin menggunakan `completedAt` timestamp. Jika Anda tidak punya `completedAt` timestamp di Firestore, 
            // Anda harus menggunakan field `date` dan membandingkannya dengan hari ini. 
            // Saya menggunakan logika Kotlin (completedAt) karena ini lebih akurat untuk mendeteksi penyelesaian HARI INI.
            // Namun, karena kode Anda tidak menunjukkan field `completedAt`, saya akan menggunakan query yang lebih defensif
            // berdasarkan field `date` (format YYYY-MM-DD).

            const todayStr = dateToYyyyMmDd(new Date());
            
            const todayCompletedSnapshot = await tasksRef
                 .where("done", "==", true) // Task harus ditandai selesai
                 .where("date", "==", todayStr) // Dan tanggal penyelesaiannya (date) adalah hari ini
                 .limit(1)  
                 .get();

            const hasCompletedToday = !todayCompletedSnapshot.empty;
            
            // --- 2. Ambil Status Streak Saat Ini ---
            const streakDoc = await streakRef.get();
            const currentState = streakDoc.exists ? streakDoc.data() : { currentStreak: 0, lastCompletionDate: null, streakDays: "" };
            
            // --- 3. Hitung Status Baru & Update Firestore (LOGIKA KOTLIN) ---
            const { streakIncreased, oldStreak, ...newState } = calculateNewStreakState(currentState, hasCompletedToday);
            
            let finalState = currentState; 

            if (newState.currentStreak !== currentState.currentStreak || newState.lastCompletionDate !== currentState.lastCompletionDate || newState.streakDays !== currentState.streakDays) {
                await streakRef.set(newState, { merge: true }); // Menggunakan merge
                finalState = newState;
                
                if (streakIncreased) {
                    console.log(`STREAK INCREASED! Current streak: ${finalState.currentStreak}`);
                    // Jika Anda ingin menampilkan dialog sukses di sini, gunakan window.showCustomDialog
                }
            } else {
                finalState = currentState;
            }

            // --- 4. Hitung Metrik Mingguan & Update UI ---
            const weeklyMetrics = calculateWeeklyMetrics(finalState.streakDays, finalState.currentStreak);
            updateStreakUI(weeklyMetrics, finalState.currentStreak);

        } catch (err) {
            console.error("Error loading or updating streak:", err);
            updateStreakUI({ streakStartInWeekIndex: -1, streakDaysInWeek: 0 }, 0);
        }
    });
});