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
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
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

  const lastDate = normalizeDateToMidnight(
    new Date(lastDateStr.replace(/-/g, "/") + " 00:00:00"),
  );
  const today = normalizeDateToMidnight(
    new Date(todayStr.replace(/-/g, "/") + " 00:00:00"),
  );

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

  const existingDays = new Set(
    newStreakDays
      .split(",")
      .map((s) => parseInt(s))
      .filter((n) => !isNaN(n)),
  );

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
    newStreakDays = Array.from(existingDays)
      .sort((a, b) => a - b)
      .join(",");
  } else if (newStreak > 0 && lastDateStr === todayStr) {
    // Case 2 fallback: Ensure today is marked if the calculation was already run today
    if (!existingDays.has(currentDay)) {
      existingDays.add(currentDay);
      newStreakDays = Array.from(existingDays)
        .sort((a, b) => a - b)
        .join(",");
    }
  }

  const nextState = {
    currentStreak: newStreak,
    lastCompletionDate: newStreak > 0 && hasCompletedToday ? todayStr : null,
    streakDays: newStreakDays,
  };

  return {
    ...nextState,
    streakIncreased: streakIncreased,
    oldStreak: oldStreak,
  };
}

// ===================================================
// UI METRICS & UPDATE (FINAL CORRECTION)
// ===================================================

/**
 * Menghitung metrik yang diperlukan untuk progress bar mingguan.
 */
function calculateWeeklyMetrics(streakDaysStr, currentStreak) {
    // 1. Pastikan angka streak valid
    const numStreak = parseInt(currentStreak, 10) || 0;

    if (numStreak === 0) {
        return { streakStartInWeekIndex: -1, lastStreakDay: -1, streakDaysInWeek: 0 };
    }

    // 2. Tentukan Hari Terakhir Selesai (Completed Day)
    const streakDaysArray = (streakDaysStr || "").split(",").map(s => parseInt(s)).filter(n => !isNaN(n));
    
    let lastCompletedDay = -1;
    if (streakDaysArray.length > 0) {
        const sortedDays = Array.from(new Set(streakDaysArray)).sort((a, b) => a - b);
        lastCompletedDay = sortedDays[sortedDays.length - 1];
    } else {
        lastCompletedDay = getCurrentDayOfWeek();
    }
    
    // --- LOGIKA BARU: VISUAL MAJU 1 LANGKAH (TARGET BESOK) ---
    
    // Posisi Akhir Visual (Runner) = Hari Selesai + 1
    // Contoh: Selesai Rabu (2) -> Runner di Kamis (3)
    let visualEndDay = lastCompletedDay + 1;

    // Posisi Awal Visual = Akhir Visual - Jumlah Streak
    // Contoh 1: Streak 1 di Rabu. End=3(Kamis). Start = 3 - 1 = 2(Rabu). Garis R-K.
    // Contoh 2: Streak 2 di Rabu. End=3(Kamis). Start = 3 - 2 = 1(Selasa). Garis S-R-K.
    let calculatedStart = visualEndDay - numStreak;

    // Biarkan calculatedStart bernilai negatif (misal -1 untuk Minggu lalu)
    // agar garis terlihat masuk dari kiri layar ("terhubung dari minggu lalu")
    const streakStartInWeekIndex = calculatedStart;
    
    // Update lastStreakDay ke visualEndDay agar runner dirender di posisi baru
    return { 
        streakStartInWeekIndex: streakStartInWeekIndex, 
        lastStreakDay: visualEndDay, 
        streakDaysInWeek: numStreak
    };
}

function updateStreakUI(weeklyMetrics, currentStreak, streakDaysStr) {
  const progressFill = document.getElementById("progress-fill");
  const runnerIcon = document.getElementById("runner-icon");
  const streakNumber = document.getElementById("streak-number");
  const dotTrack = document.getElementById("dot-track");

  if (!progressFill || !runnerIcon || !streakNumber) return;

  const { streakStartInWeekIndex, lastStreakDay } = weeklyMetrics;
  const SEGMENTS = 6; // 0(Senin) sampai 6(Minggu) ada 6 segmen garis

  // 1. Update Angka
  streakNumber.textContent = currentStreak;

  // 2. Update Dots (Pastikan semua terlihat)
  if (dotTrack) {
    let dotElements = dotTrack.querySelectorAll(".dot");
    if (dotElements.length === 0) {
      dotTrack.innerHTML = `
                <div class="dot"></div><div class="dot"></div><div class="dot"></div>
                <div class="dot"></div><div class="dot"></div><div class="dot"></div>
                <div class="dot"></div>`;
      dotElements = dotTrack.querySelectorAll(".dot");
    }
    dotElements.forEach((dot) => (dot.style.opacity = "1"));
  }

  // 3. Update Visual Bar & Runner
  if (currentStreak > 0 && lastStreakDay >= 0) {
    // Hitung Persentase Posisi
    const fillStartPercent = (streakStartInWeekIndex / SEGMENTS) * 100;
    const runnerPositionPercent = (lastStreakDay / SEGMENTS) * 100;

    // Hitung Lebar (Selisih Akhir - Awal)
    // Math.max memastikan lebar tidak negatif
    const fillWidthPercent = Math.max(
      0,
      runnerPositionPercent - fillStartPercent,
    );

    // Terapkan CSS
    progressFill.style.left = `${fillStartPercent}%`;
    progressFill.style.width = `${fillWidthPercent}%`;
    progressFill.style.opacity = "1";

    runnerIcon.style.left = `${runnerPositionPercent}%`;
    runnerIcon.style.opacity = "1";
  } else {
    // Reset jika Streak 0
    progressFill.style.width = `0%`;
    progressFill.style.opacity = "0";
    runnerIcon.style.opacity = "0";
  }
}

// ===================================================
// MAIN LOGIC EXECUTION (Keep existing code)
// ===================================================

document.addEventListener("DOMContentLoaded", async () => {
  // Hanya jalankan di halaman home.html
  if (!window.location.pathname.includes("home.html")) return;

  if (typeof firebase === "undefined" || !firebase.auth || !window.fetchData) {
    console.error("Firebase atau window.fetchData tidak dimuat.");
    updateStreakUI(
      { streakStartInWeekIndex: -1, lastStreakDay: -1, streakDaysInWeek: 0 },
      0,
      "",
    );
    return;
  }

  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      updateStreakUI(
        { streakStartInWeekIndex: -1, lastStreakDay: -1, streakDaysInWeek: 0 },
        0,
        "",
      );
      return;
    }

    try {
      // --- 1. Persiapan Data ---
      const todayStr = dateToYyyyMmDd(new Date());

      // Fetch completed tasks for today
      const todayCompletedTasks = await window.fetchData(
        `/tasks?status=completed&date=${todayStr}`,
      );
      const hasCompletedToday =
        Array.isArray(todayCompletedTasks) && todayCompletedTasks.length > 0;

      // --- 2. Ambil Status Streak Saat Ini ---
      const fetchedState = await window.fetchData("/stats/streak");
      const initialState = {
        currentStreak: fetchedState.currentStreak || 0,
        lastCompletionDate: fetchedState.lastCompletionDate || null,
        streakDays: fetchedState.streakDays || "",
      };

      // --- 3. Hitung Status Baru (Logika mesin status) ---
      const { streakIncreased, oldStreak, ...newState } =
        calculateNewStreakState(initialState, hasCompletedToday);

      let finalState = initialState;

      // Cek apakah ada perubahan yang perlu disimpan/diproses
      if (
        newState.currentStreak !== initialState.currentStreak ||
        newState.lastCompletionDate !== initialState.lastCompletionDate ||
        newState.streakDays !== initialState.streakDays
      ) {
        // Jika logic lokal memutuskan ada perubahan DAN tugas selesai hari ini,
        // panggil API POST /complete. Backend akan menghitung ulang dan menyimpan.
        if (hasCompletedToday) {
          const updatedState = await window.fetchData(
            "/stats/streak/complete",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}), // Backend menggunakan waktu server
            },
          );
          finalState = {
            currentStreak: updatedState.currentStreak || 0,
            lastCompletionDate: updatedState.lastCompletionDate || null,
            streakDays: updatedState.streakDays || "",
          };

          // Cek popup: Jika streak bertambah, tampilkan popup
          if (updatedState.currentStreak > oldStreak) {
            window.showCustomDialog(
              `🎉 Yay, you're on fire! ${updatedState.currentStreak} streak!`,
              [{ text: "OK", action: () => {}, isPrimary: true }],
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
      const weeklyMetrics = calculateWeeklyMetrics(
        finalState.streakDays,
        finalState.currentStreak,
      );
      updateStreakUI(
        weeklyMetrics,
        finalState.currentStreak,
        finalState.streakDays,
      );
    } catch (err) {
      console.error("Error loading or updating streak:", err);
      updateStreakUI(
        { streakStartInWeekIndex: -1, lastStreakDay: -1, streakDaysInWeek: 0 },
        0,
        "",
      );
    }
  });
});

// Expose internal functions needed by task.js and potentially other files
window.TaskApp = window.TaskApp || {};
