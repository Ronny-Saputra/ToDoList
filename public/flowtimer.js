// File: public/flowtimer.js

// Listener utama: Pastikan DOM sudah dimuat sebelum menjalankan script
document.addEventListener("DOMContentLoaded", function () {
    
  // --- UTILITY: Format Duration Milis to String (Local to flowtimer.js) ---
  // Mengkonversi durasi dari milidetik menjadi string format (e.g., "1h 30m 5s")
  function formatDurationToString(millis) {
    const MILLIS_IN_HOUR = 3600000;
    const MILLIS_IN_MINUTE = 60000;
    const MILLIS_IN_SECOND = 1000;

    // Menghitung Jam
    const durationHours = Math.floor(millis / MILLIS_IN_HOUR);
    const remainingAfterHours = millis % MILLIS_IN_HOUR;
    
    // Menghitung Menit
    const durationMinutes = Math.floor(remainingAfterHours / MILLIS_IN_MINUTE);
    
    // Menghitung Detik
    const durationSeconds = Math.floor(
      (remainingAfterHours % MILLIS_IN_MINUTE) / MILLIS_IN_SECOND,
    );

    let parts = [];
    if (durationHours > 0) parts.push(`${durationHours}h`);
    if (durationMinutes > 0) parts.push(`${durationMinutes}m`);
    if (durationSeconds > 0) parts.push(`${durationSeconds}s`);

    // Menggabungkan bagian-bagian atau mengembalikan "0s" jika durasi nol
    return parts.join(" ") || "0s";
  }

  // --- UTILITY: SHOW CUSTOM DIALOG (Global function) ---
  // Fungsi untuk menampilkan dialog kustom (modal) dengan opsi tombol yang dapat dikonfigurasi
  window.showCustomDialog = function (message, buttons) {
    // Mendapatkan elemen-elemen dialog dari DOM
    const dialogOverlay = document.getElementById("custom-dialog-overlay");
    const dialogMessage = dialogOverlay
      ? dialogOverlay.querySelector("#custom-dialog-message")
      : null;
    const dialogActions = dialogOverlay
      ? dialogOverlay.querySelector("#custom-dialog-actions")
      : null;

    // Penanganan jika elemen dialog tidak ditemukan
    if (!dialogOverlay || !dialogMessage || !dialogActions) {
      console.error(
        "Custom dialog elements not found in the DOM. Cannot display complex dialog.",
      );
      alert(message); // Kembali menggunakan alert native sebagai fallback
      return;
    }

    // Mengatur pesan dan membersihkan tombol lama
    dialogMessage.textContent = message;
    dialogActions.innerHTML = "";

    // Membuat dan menambahkan tombol ke dialog
    buttons.forEach((btn, index) => {
      const buttonElement = document.createElement("button");
      buttonElement.textContent = btn.text;
      buttonElement.classList.add("dialog-btn");

      if (btn.isPrimary) {
        buttonElement.classList.add("primary"); // Menambahkan kelas CSS untuk tombol utama
      }

      // Menambahkan event listener saat tombol diklik
      buttonElement.addEventListener("click", () => {
        dialogOverlay.classList.remove("open"); // Menutup dialog
        if (btn.action) {
          btn.action(); // Menjalankan fungsi action yang didefinisikan
        }
      });

      // Styling tambahan untuk memisahkan tombol (kecuali tombol pertama)
      if (index > 0 && buttons.length > 1) {
        buttonElement.style.borderLeft = "1px solid #ddd";
      }

      dialogActions.appendChild(buttonElement);
    });

    // Menampilkan dialog
    dialogOverlay.classList.add("open");
  };

  // --- UTILITY: SHOW DURATION PICKER (For setting new duration) ---
  // Menampilkan modal untuk memilih durasi waktu baru
  function showDurationPicker(onSave) {
    // Mendapatkan elemen-elemen picker
    const pickerOverlay = document.getElementById("flow-timer-picker-overlay");
    const hoursInput = document.getElementById("flow-timer-hours-input");
    const minutesInput = document.getElementById("flow-timer-minutes-input");
    const secondsInput = document.getElementById("flow-timer-seconds-input");
    const cancelBtn = document.getElementById("flow-timer-cancel");
    const saveBtn = document.getElementById("flow-timer-save");

    if (!pickerOverlay) {
      // Jika elemen tidak ditemukan, berikan dialog error dan redirect
      window.showCustomDialog(
        "Failed to load duration picker. Returning to task list.",
        [
          {
            text: "OK",
            action: () => (window.location.href = "../pages/task.html"),
            isPrimary: true,
          },
        ],
      );
      return;
    }

    // Reset input ke nilai default (30 menit)
    hoursInput.value = "0";
    minutesInput.value = "30";
    secondsInput.value = "0";

    // Listener untuk tombol SIMPAN
    const saveListener = () => {
      // Mengambil nilai input dan mengkonversinya ke milidetik
      const hours = parseInt(hoursInput.value) || 0;
      const minutes = parseInt(minutesInput.value) || 0;
      const seconds = parseInt(secondsInput.value) || 0;

      const totalMillis = hours * 3600000 + minutes * 60000 + seconds * 1000;

      // Validasi durasi (tidak boleh nol)
      if (totalMillis <= 0) {
        window.showCustomDialog("Duration cannot be zero.", [
          { text: "OK", action: () => {}, isPrimary: true },
        ]);
        return;
      }

      removeListeners(); // Hapus listener sebelum menutup
      pickerOverlay.classList.remove("open");
      onSave(totalMillis); // Panggil callback dengan durasi baru
    };

    // Listener untuk tombol BATAL
    const cancelListener = () => {
      removeListeners();
      pickerOverlay.classList.remove("open");
      window.location.href = "../pages/task.html"; // Kembali ke halaman task
    };

    // Listener untuk klik di luar picker (untuk menutup)
    const overlayClickListener = (e) => {
      if (e.target === pickerOverlay) {
        cancelListener();
      }
    };

    // Fungsi untuk menghapus listener (mencegah duplikasi event)
    function removeListeners() {
      saveBtn.removeEventListener("click", saveBtn.listener);
      cancelBtn.removeEventListener("click", cancelBtn.listener);
      pickerOverlay.removeEventListener("click", pickerOverlay.listener);
    }

    // Simpan referensi listener di properti elemen (cara untuk mempermudah penghapusan)
    saveBtn.listener = saveListener;
    cancelBtn.listener = cancelListener;
    pickerOverlay.listener = overlayClickListener;

    removeListeners(); // Hapus listener lama (jika ada)

    // Pasang listener baru
    saveBtn.addEventListener("click", saveListener);
    cancelBtn.addEventListener("click", cancelListener);
    pickerOverlay.addEventListener("click", overlayClickListener);

    // Tampilkan picker
    pickerOverlay.classList.add("open");
  }

  // --- Variabel Global Timer ---
  // Referensi elemen DOM
  const activityTitleEl = document.getElementById("activityTitle");
  const timerDisplayEl = document.getElementById("timerDisplay");
  const controlBtn = document.getElementById("controlBtn");
  const controlIcon = controlBtn?.querySelector("i"); // Ikon Play/Pause/Redo

  // Audio Alarm
  const alarmAudio = new Audio("../assets/alarm_sound.mp3");

  // State Timer
  let totalDurationSeconds = 1800; // Durasi total (default 30 menit)
  let timeLeft = totalDurationSeconds; // Sisa waktu
  let timerInterval = null; // ID interval untuk mengontrol timer
  let isRunning = false; // Status running (Play/Pause)
  let activityName = ""; // Nama tugas yang sedang dikerjakan

  // --- UTILITY: Format Time ---
  // Memformat waktu dalam detik menjadi string MM:SS atau HH:MM:SS
  function formatTime(seconds) {
    // Jika durasi >= 1 jam
    if (seconds >= 3600) {
      const hrs = Math.floor(seconds / 3600);
      const min = Math.floor((seconds % 3600) / 60);
      const sec = seconds % 60;
      return `${String(hrs).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    }

    // Jika durasi < 1 jam
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  // --- DIALOG CHAIN LOGIC ---

  // Dialog yang muncul saat waktu habis
  function showCompletionDialog() {
    window.showCustomDialog("Time's up! Are you done with your task?", [
      {
        text: "No", // Jika belum selesai, tawarkan perpanjangan
        action: () => {
          showRescheduleDialog();
        },
        isPrimary: false,
      },
      {
        text: "Yes", // Jika selesai, tandai tugas sebagai completed
        action: async () => {
          alarmAudio.pause(); // Hentikan Alarm
          alarmAudio.currentTime = 0;
          
          await markTaskAsCompleted();
        },
        isPrimary: true,
      },
    ]);
  }
  
  // ✅ FUNCTION OPTIMIZED - PARALLEL API CALLS
async function markTaskAsCompleted() {

  // Tampilkan overlay loading saat operasi dimulai
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) loadingOverlay.style.display = 'flex';

  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      // Jika tidak login, tampilkan dialog dan redirect
      window.showCustomDialog("Please log in first.", [
        { text: "OK", action: () => window.location.href = "../pages/login.html", isPrimary: true }
      ]);
      return;
    }

    // Dapatkan ID tugas dari URL
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get("taskId");
    
    if (!taskId) {
      console.warn("No task ID found. Redirecting to task page.");
      window.location.href = "../pages/task.html";
      return;
    }

    console.log("🔍 Debug: Starting markTaskAsCompleted for taskId:", taskId);

    // Pastikan fungsi fetchData (dari file lain, seperti api.js) tersedia
    if (typeof window.fetchData !== 'function') {
      console.error("❌ window.fetchData is not available!");
      window.showCustomDialog("System error: fetchData not available.", [
        { text: "OK", action: () => window.location.href = "../pages/task.html", isPrimary: true }
      ]);
      return;
    }

    // Helper untuk memformat tanggal ke YYYY-MM-DD
    function formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    // ✅ OPTIMASI 1: Jalankan fetch task dan streak state SECARA PARALEL
    console.log("📡 Fetching data in parallel...");
    
    const [allTasksResult, initialStreakResult] = await Promise.allSettled([
      window.fetchData("/tasks?status=pending"), // Ambil daftar task untuk mencari data original
      window.fetchData("/stats/streak") // Ambil status streak saat ini
    ]);

    // Proses hasil fetch task
    let originalTask = null;
    if (allTasksResult.status === 'fulfilled') {
      const allTasks = allTasksResult.value;
      originalTask = Array.isArray(allTasks) ? allTasks.find(t => t.id === taskId) : null;
      console.log("✅ Original task fetched:", originalTask);
    } else {
      console.error("❌ Failed to fetch original task:", allTasksResult.reason);
    }

    // Proses hasil fetch streak
    let initialStreakState = { currentStreak: 0 };
    if (initialStreakResult.status === 'fulfilled') {
      initialStreakState = initialStreakResult.value || {};
      initialStreakState.currentStreak = initialStreakState.currentStreak || 0;
      console.log("✅ Streak state fetched:", initialStreakState);
    } else {
      console.error("❌ Failed to fetch streak state:", initialStreakResult.reason);
    }

    // 3. Data update untuk task
    const updateData = {
      done: true, // Tanda sudah selesai (legacy/redundant field)
      status: "completed", // Status tugas diubah
      date: formatDate(new Date()) // Tanggal penyelesaian hari ini
    };

    console.log("📡 Updating task and streak in parallel...");
    
    // ✅ OPTIMASI 2: Jalankan update task dan update streak SECARA PARALEL
    const [updateTaskResult, updateStreakResult] = await Promise.allSettled([
      window.fetchData(`/tasks/${taskId}`, { // Update status task
        method: "PUT",
        body: JSON.stringify(updateData),
      }),
      window.fetchData("/stats/streak/complete", { // Update streak
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    ]);

    // Cek hasil update task
    if (updateTaskResult.status === 'rejected') {
      throw new Error("Failed to update task: " + updateTaskResult.reason);
    }
    console.log("✅ Task updated successfully");

    // Proses hasil update streak
    let newStreakNumber = 0;
    let streakIncremented = false;

    if (updateStreakResult.status === 'fulfilled') {
      const updatedState = updateStreakResult.value;
      newStreakNumber = updatedState.currentStreak || 0;
      console.log("✅ Streak updated:", newStreakNumber);

      // Tentukan apakah streak bertambah
      if (newStreakNumber > initialStreakState.currentStreak) {
        streakIncremented = true;
      }
    } else {
      console.error("❌ Error updating streak:", updateStreakResult.reason);
    }

    // 4. Save to localStorage (SYNC - Cepat, untuk caching lokal)
    const taskData = {
      id: taskId,
      title: activityName,
      completedAt: new Date().toISOString(),
      date: formatDate(new Date()),
      time: originalTask?.time || "",
      location: originalTask?.location || ""
    };
    
    // Cek dan tambahkan ke array completedTasks di localStorage
    const completedTasks = JSON.parse(localStorage.getItem("completedTasks") || "[]");
    const existingIndex = completedTasks.findIndex((t) => t.id === taskId);
    if (existingIndex === -1) {
      completedTasks.push(taskData);
      localStorage.setItem("completedTasks", JSON.stringify(completedTasks));
      console.log("✅ Saved to completedTasks localStorage");
    }

    // 5. Trigger profile update (Memberi tahu halaman lain untuk refresh data profil/statistik)
    localStorage.setItem("profileUpdateTrigger", new Date().getTime().toString());

    // 6. Show dialog sukses
    let dialogMessage = "Task marked as done!";

    // Pesan spesial jika streak bertambah
    if (streakIncremented) {
      dialogMessage = `🎉 Yay, you're on fire! ${newStreakNumber} streak!`;
    }

    console.log("✅ All operations completed successfully");

  } catch (err) {
    console.error("❌ Error marking task as completed:", err);
    console.error("Error details:", err.message, err.stack);
    
    // Tampilkan dialog error jika terjadi kegagalan API
    window.showCustomDialog("Failed to update task status. Please try again.", [
      { 
        text: "OK", 
        action: () => window.location.href = "../pages/task.html", 
        isPrimary: true 
      }
    ]);
  } finally {
    // Sembunyikan overlay loading
    if (loadingOverlay) loadingOverlay.style.display = 'none';
  }
  
  // Dialog sukses/error yang dipindahkan ke luar try/catch, karena finally dipanggil juga saat throw
  if (!loadingOverlay || loadingOverlay.style.display !== 'flex') { // Pastikan loading sudah disembunyikan
    window.showCustomDialog(dialogMessage, [
      { 
        text: "OK", 
        action: () => window.location.href = "../pages/task.html", // Redirect ke halaman task
        isPrimary: true 
      }
    ]);
  }
}


  // Dialog untuk menawarkan perpanjangan waktu
  function showRescheduleDialog() {
    window.showCustomDialog(
      "Would you like to extend the Flow Timer duration?",
      [
        {
          text: "No", 
          action: () => {
            alarmAudio.pause(); // Stop Alarm
            alarmAudio.currentTime = 0;
            window.location.href = "../pages/task.html"; // Selesai dan kembali ke halaman task
          },
          isPrimary: false,
        },
        {
          text: "Yes", 
          action: () => {
            alarmAudio.pause(); // Stop Alarm saat Duration Picker muncul
            alarmAudio.currentTime = 0;

            // Tampilkan picker durasi
            showDurationPicker((newDurationMillis) => {
              // Update state timer dengan durasi baru
              totalDurationSeconds = Math.floor(newDurationMillis / 1000);
              timeLeft = totalDurationSeconds;

              // Reset tampilan dan kontrol
              if (timerDisplayEl)
                timerDisplayEl.textContent = formatTime(timeLeft);
              if (controlIcon) controlIcon.className = "fas fa-play"; // Set icon ke Play
              isRunning = false;

              // Tampilkan notifikasi bahwa timer direset
              window.showCustomDialog(
                "Flow Timer duration has been reset. Press Play to start.",
                [{ text: "OK", action: () => {}, isPrimary: true }],
              );
            });
          },
          isPrimary: true,
        },
      ],
    );
  }

  // --- MAIN FUNCTION: Update Timer (Dijalankan setiap 1 detik) ---
  function updateTimer() {
    if (timeLeft <= 0) {
      clearInterval(timerInterval); // Hentikan timer
      isRunning = false;
      
      // Ubah ikon ke mode Redo/Reset
      if (controlIcon) controlIcon.className = "fas fa-redo"; 
      if (timerDisplayEl) timerDisplayEl.textContent = formatTime(0);

      // START ALARM AND DIALOG CHAIN
      alarmAudio.loop = true; // Alarm di-loop
      alarmAudio
        .play() // Coba putar alarm
        .then(() => {
          console.log("Audio started successfully.");
        })
        .catch((error) => {
          // Penanganan jika pemutaran audio diblokir oleh browser
          console.warn(
            "Audio play blocked or failed. User interaction is required.",
            error,
          );
        });

      showCompletionDialog(); // Tampilkan dialog penyelesaian
      return;
    }

    timeLeft--; // Kurangi 1 detik
    if (timerDisplayEl) timerDisplayEl.textContent = formatTime(timeLeft); // Update tampilan
  }

  // --- MAIN FUNCTION: Toggle Timer (Play/Pause) ---
  function toggleTimer() {
    if (!controlIcon) return;

    // Pastikan alarm berhenti saat tombol kontrol ditekan
    alarmAudio.pause();
    alarmAudio.currentTime = 0;

    if (isRunning) {
      // Pause Logic
      clearInterval(timerInterval);
      isRunning = false;
      controlIcon.className = "fas fa-play"; // Ubah ikon ke Play
    } else {
      // Play (or Reset) Logic
      if (timeLeft <= 0) {
        // Jika waktu habis, reset ke durasi awal
        timeLeft = totalDurationSeconds;
        if (timerDisplayEl) timerDisplayEl.textContent = formatTime(timeLeft);
      }

      // Start Logic
      timerInterval = setInterval(updateTimer, 1000);
      isRunning = true;
      controlIcon.className = "fas fa-pause"; // Ubah ikon ke Pause
    }
  }

  // --- INITIALIZATION ---
  // Fungsi untuk menginisialisasi state awal timer
  function initFlowTimer() {
    const urlParams = new URLSearchParams(window.location.search);

    // Ambil durasi dan nama aktivitas dari URL query params
    let duration = urlParams.get("duration");
    const activity = urlParams.get("activity");

    let initialDuration = 1800; // Default 30 menit

    // Parsing durasi dari URL
    if (duration) {
      const parsedDuration = parseInt(duration);
      if (!isNaN(parsedDuration) && parsedDuration > 0) {
        initialDuration = parsedDuration;
      }
    }

    // Set state awal timer
    totalDurationSeconds = initialDuration;
    timeLeft = totalDurationSeconds;

    if (activity) {
      activityName = decodeURIComponent(activity);
    }

    if (activityTitleEl) activityTitleEl.textContent = activityName;
    if (timerDisplayEl) timerDisplayEl.textContent = formatTime(timeLeft);

    // Pasang event listener ke tombol kontrol
    controlBtn?.addEventListener("click", toggleTimer);

    // Cek status autentikasi Firebase
    if (typeof firebase !== "undefined" && firebase.auth) {
      firebase.auth().onAuthStateChanged((user) => {
        // Jika tidak ada user (belum login), redirect ke login page
        if (!user) {
          window.location.href = "../pages/login.html";
        }
      });
    }
  }

  initFlowTimer();
});