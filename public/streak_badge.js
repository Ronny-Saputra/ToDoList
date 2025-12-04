document.addEventListener("DOMContentLoaded", function () {
  // 1. Logic Back Button
  const backBtn = document.querySelector(".back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = "settings.html";
    });
  }
  
  // PENTING: Jangan panggil initStreakPage() disini. Biarkan kosong.
});

// 2. Logic Deteksi User (Anti-Balapan)
// Kita pasang "Satpam" yang menunggu Firebase siap
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    // HORE! Firebase sudah siap dan User ada.
    console.log("User detected:", user.email);
    
    // Baru kita jalankan fungsi utama
    initStreakPage(); 
  } else {
    // Firebase sudah siap, TAPI tidak ada user yang login.
    console.log("No user detected.");
    
    // Opsi A: Redirect paksa (jika halaman ini wajib login)
    // window.location.href = "../pages/login.html"; 

    // Opsi B: Tampilkan data kosong (agar tidak mental)
    initStreakPage(); // Nanti di dalam fungsi ini dia akan baca streak = 0
  }
});

// =========================================================
// PENGGANTI FETCHDATA (Karena main.js dihapus)
// =========================================================
// Fungsi ini mengambil data langsung dari Firestore tanpa lewat API Backend
async function getStreakDataManual() {
  return new Promise((resolve) => {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        // Ambil data dari koleksi 'users' dokumen ID user
        firebase.firestore().collection("users").doc(user.uid).get()
          .then((doc) => {
            if (doc.exists) {
              const data = doc.data();
              // Kembalikan streak (default 0 jika tidak ada)
              resolve({ currentStreak: data.streak || 0 });
            } else {
              console.log("User doc not found");
              resolve({ currentStreak: 0 });
            }
          })
          .catch((error) => {
            console.error("Error getting streak:", error);
            resolve({ currentStreak: 0 });
          });
      } else {
        // User belum login / session habis
        console.log("User not logged in");
        resolve({ currentStreak: 0 });
      }
    });
  });
}

// =========================================================
// 2. LOGIC STREAK BADGE SYSTEM
// =========================================================

const BADGE_TIERS = [
  { days: 7,   gridId: "badge-7",   mainSrc: "../assets/star_7.png",   title: "7-Day Warrior" },
  { days: 15,  gridId: "badge-15",  mainSrc: "../assets/star_15.png",  title: "15-Day Champion" },
  { days: 30,  gridId: "badge-30",  mainSrc: "../assets/star_30.png",  title: "Monthly Master" },
  { days: 50,  gridId: "badge-50",  mainSrc: "../assets/star_50.png",  title: "50-Day Legend" },
  { days: 100, gridId: "badge-100", mainSrc: "../assets/star_100.png", title: "Century Icon" }
];

const DEFAULT_MAIN_IMAGE = "../assets/star_7.png"; 

async function initStreakPage() {
  const mainImage = document.getElementById("main-badge-image");
  const mainTitle = document.getElementById("badge-title");
  const infoText = document.getElementById("badge-info");

  if (!mainImage || !mainTitle || !infoText) return;

  // --- A. Ambil Data Streak (GUNAKAN FUNGSI MANUAL BARU) ---
  let currentStreak = 0;
  
  try {
    // Kita panggil fungsi manual yang kita buat di atas
    const data = await getStreakDataManual();
    currentStreak = data.currentStreak || 0;
    console.log("Streak loaded:", currentStreak);
  } catch (e) {
    console.error("Error fetching streak:", e);
    currentStreak = 0;
  }

  // --- B. Logika Penentuan Badge ---
  let highestBadge = null; 
  let nextBadge = null;    

  // Reset visual ke Locked
  BADGE_TIERS.forEach(tier => {
    const el = document.getElementById(tier.gridId);
    if(el) {
        el.classList.add("locked-badge");
        el.style.filter = "";
        el.style.opacity = "";
    }
  });

  // Cek Tier
  for (let i = 0; i < BADGE_TIERS.length; i++) {
    const tier = BADGE_TIERS[i];
    const el = document.getElementById(tier.gridId);

    if (currentStreak >= tier.days) {
      if(el) {
        el.classList.remove("locked-badge");
        el.style.filter = "none"; 
        el.style.opacity = "1";
      }
      highestBadge = tier;
    } else {
      if (!nextBadge) {
        nextBadge = tier;
      }
    }
  }

  // --- C. Update Tampilan Utama ---
  if (highestBadge) {
    mainImage.src = highestBadge.mainSrc;
    mainImage.classList.remove("locked-badge");
    
    if (currentStreak >= 100) mainTitle.innerText = "Century Icon";
    else if (currentStreak >= 50) mainTitle.innerText = "You're a Legend";
    else if (currentStreak >= 30) mainTitle.innerText = "Great Streak";
    else if (currentStreak >= 15) mainTitle.innerText = "Keep Going Strong";
    else mainTitle.innerText = "You're Doing Great";

    if (nextBadge) {
      const diff = nextBadge.days - currentStreak;
      infoText.innerText = `Next: ${nextBadge.title} in ${diff} days`;
    } else {
      infoText.innerText = "All badges unlocked! Well done!";
    }

  } else {
    // Belum dapat badge
    mainImage.src = DEFAULT_MAIN_IMAGE;
    mainImage.classList.add("locked-badge");
    mainTitle.innerText = "Start Your Journey";
    
    const firstTier = BADGE_TIERS[0];
    const diff = firstTier.days - currentStreak;
    infoText.innerText = `Complete ${diff} more day${diff > 1 ? 's' : ''} to unlock your first badge!`;
  }
}