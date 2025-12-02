document.addEventListener("DOMContentLoaded", function () {
  
  // =========================================================
  // 1. LOGIC TOMBOL BACK (Ke settings.html)
  // =========================================================
  const backBtn = document.querySelector(".back-btn");

  if (backBtn) {
    backBtn.addEventListener("click", function (e) {
      e.preventDefault();
      // Redirect ke settings.html sesuai permintaan
      window.location.href = "settings.html";
    });
  }

  // Jalankan logika badge setelah halaman siap
  initStreakPage();
});


// =========================================================
// 2. LOGIC STREAK BADGE SYSTEM
// =========================================================

// Konfigurasi: 
// 'mainSrc' = Gambar Bintang untuk tampilan ATAS (star_*.png)
// 'gridId'  = ID gambar icon kecil di BAWAH (sesuai HTML)
const BADGE_TIERS = [
  { days: 7,   gridId: "badge-7",   mainSrc: "../assets/star_7.png",   title: "7-Day Warrior" },
  { days: 15,  gridId: "badge-15",  mainSrc: "../assets/star_15.png",  title: "15-Day Champion" },
  { days: 30,  gridId: "badge-30",  mainSrc: "../assets/star_30.png",  title: "Monthly Master" },
  { days: 50,  gridId: "badge-50",  mainSrc: "../assets/star_50.png",  title: "50-Day Legend" },
  { days: 100, gridId: "badge-100", mainSrc: "../assets/star_100.png", title: "Century Icon" }
];

// Gambar placeholder default (jika streak < 7 hari)
const DEFAULT_MAIN_IMAGE = "../assets/star_7.png"; 

async function initStreakPage() {
  const mainImage = document.getElementById("main-badge-image");
  const mainTitle = document.getElementById("badge-title");
  const infoText = document.getElementById("badge-info");

  // Safety check: Pastikan elemen HTML ada (ID harus sudah ditambahkan di HTML)
  if (!mainImage || !mainTitle || !infoText) {
      console.warn("Elemen badge tidak ditemukan. Pastikan ID (main-badge-image, dll) sudah ada di HTML.");
      return;
  }

  // --- A. Ambil Data Streak ---
  let currentStreak = 0;
  
  if (typeof window.fetchData === "function") {
    try {
      const data = await window.fetchData("/stats/streak");
      currentStreak = data.currentStreak || 0;
    } catch (e) {
      console.error("Error fetching streak:", e);
    }
  } else {
    // Fallback jika tidak ada backend / testing
    console.log("Mode Offline: Menggunakan Streak 0");
    currentStreak = 0; 
  }

  // --- B. Logika Penentuan Badge ---
  let highestBadge = null; 
  let nextBadge = null;    

  // Langkah 1: Reset semua grid visual ke "Locked" (Hitam/Abu) dulu
  BADGE_TIERS.forEach(tier => {
    const el = document.getElementById(tier.gridId);
    if(el) {
        el.classList.add("locked-badge"); // Tambah class biar hitam putih
        el.style.filter = ""; // Reset inline style
        el.style.opacity = "";
    }
  });

  // Langkah 2: Cek setiap tier berdasarkan streak user
  for (let i = 0; i < BADGE_TIERS.length; i++) {
    const tier = BADGE_TIERS[i];
    const el = document.getElementById(tier.gridId);

    if (currentStreak >= tier.days) {
      // UNLOCKED: Hapus class locked, buat berwarna
      if(el) {
        el.classList.remove("locked-badge");
        el.style.filter = "none"; 
        el.style.opacity = "1";
      }
      highestBadge = tier;
    } else {
      // LOCKED: Tetap hitam (sudah direset di atas)
      // Jika ini badge pertama yang gagal didapat, berarti ini target berikutnya
      if (!nextBadge) {
        nextBadge = tier;
      }
    }
  }

  // --- C. Update Tampilan Utama (Gambar Besar di Atas) ---
  if (highestBadge) {
    // KASUS 1: User punya badge (Minimal 7 hari)
    mainImage.src = highestBadge.mainSrc; // Ganti gambar (star_XX.png)
    mainImage.classList.remove("locked-badge"); // Warnanya normal (Full Color)
    
    // Set Title Text
    if (currentStreak >= 100) mainTitle.innerText = "Century Icon";
    else if (currentStreak >= 50) mainTitle.innerText = "You're a Legend";
    else if (currentStreak >= 30) mainTitle.innerText = "Great Streak";
    else if (currentStreak >= 15) mainTitle.innerText = "Keep Going Strong";
    else mainTitle.innerText = "You're Doing Great";

    // Info Text
    if (nextBadge) {
      const diff = nextBadge.days - currentStreak;
      infoText.innerText = `Next: ${nextBadge.title} in ${diff} days`;
    } else {
      infoText.innerText = "All badges unlocked! well done!";
    }

  } else {
    // KASUS 2: Streak < 7 (Belum dapat badge apapun atau Reset)
    mainImage.src = DEFAULT_MAIN_IMAGE; // Pakai gambar default (misal star_7)
    mainImage.classList.add("locked-badge"); // TAPI gelapkan (Hitam/Abu)
    
    mainTitle.innerText = "Start Your Journey";
    
    const firstTier = BADGE_TIERS[0];
    const diff = firstTier.days - currentStreak;
    infoText.innerText = `Complete ${diff} more day${diff > 1 ? 's' : ''} to unlock your first badge!`;
  }
}