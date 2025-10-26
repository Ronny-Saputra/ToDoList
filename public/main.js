document.addEventListener('DOMContentLoaded', function() {
  // BAGIAN INI HANYA AKAN BERJALAN JIKA ADA ELEMEN DENGAN CLASS .splash-container
  const splash = document.querySelector(".splash-container");
  if (splash) {
    console.log("Splash screen found, starting fade out timer.");
    splash.classList.add("fade-out");
    setTimeout(() => {
      window.location.href = "pages/login.html";
    }, 3000);
  } else {
    console.log("Not on splash screen page, skipping splash logic.");
  }
});

// SEMUA FUNGSI DI BAWAH INI TETAP ADA UNTUK DIGUNAKAN DI HALAMAN LAIN
document.querySelectorAll(".task-card").forEach(card => {
      card.addEventListener("click", () => {
        // hapus active dari semua card
        document.querySelectorAll(".task-card").forEach(c => c.classList.remove("active"));
        // kasih active ke card yang diklik
        card.classList.add("active");
      });
    });


function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then(result => alert(`Welcome, ${result.user.displayName}`))
    .catch(error => alert(`Error: ${error.message}`));
}

function facebookLogin() {
  const provider = new firebase.auth.FacebookAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then(result => alert(`Welcome, ${result.user.displayName}`))
    .catch(error => alert(`Error: ${error.message}`));
}

function emailLogin(event) {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(userCredential => alert(`Welcome, ${userCredential.user.email}`))
    .catch(error => alert(`Error: ${error.message}`));
  return false;
}

function emailSignup(event) {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    alert("Password dan konfirmasi tidak cocok.");
    return false;
  }

  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then(userCredential => {
      alert(`Akun berhasil dibuat untuk ${userCredential.user.email}. Silakan login.`);
      window.location.href = "login.html";
    })
    .catch(error => {
      console.error("Error during sign-up:", error);
      alert(`Error: ${error.message}`);
    });
  return false;
}
  function isMobile() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }
  if (isMobile()) {
    console.log("Mobile");
    document.body.classList.add("mobile");
  } else {
    console.log("Desktop");
    document.body.classList.add("desktop");
  }

// === PRODUCTIVE STREAK SYSTEM ===
document.addEventListener("DOMContentLoaded", async () => {
  if (!window.location.pathname.includes("home.html")) return;
  console.log("Loading streak progress...");

  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      console.log("User not logged in, skip streak update.");
      return;
    }

    const db = firebase.firestore();
    const tasksRef = db.collection("users").doc(user.uid).collection("tasks");

    try {
      const snapshot = await tasksRef.where("done", "==", true).get();
      const doneDates = snapshot.docs.map(doc => doc.data().date);
      const streak = calculateStreak(doneDates);
      updateStreakUI(streak);
    } catch (err) {
      console.error("Error loading streak:", err);
    }
  });
});

// Hitung streak (berapa hari berturut-turut user menyelesaikan task)
function calculateStreak(dates) {
  const today = new Date();
  let streak = 0;

  for (let i = 0; i < 7; i++) {
    const checkDate = new Date();
    checkDate.setDate(today.getDate() - i);
    const dateStr = checkDate.toISOString().split("T")[0];
    if (dates.includes(dateStr)) streak++;
    else break;
  }
  return streak;
}

// Update tampilan bar dan ikon orang berjalan
function updateStreakUI(streak) {
  const progressFill = document.getElementById("progress-fill");
  const runnerIcon = document.getElementById("runner-icon");
  if (!progressFill || !runnerIcon) return;

  const percent = Math.min((streak / 7) * 100, 100);
  progressFill.style.width = `${percent}%`;
  runnerIcon.style.left = `${percent}%`;

  console.log(`Streak updated: ${streak} days`);
}

// === NAVBAR LOGIC ===
document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.querySelector('.navbar');
  if (!navbar) {
    console.log('Navbar not found.');
    return;
  }

  // Use event delegation so clicks on the icon or its parent .nav-item both work
  navbar.addEventListener('click', (e) => {
    // Prefer nav-item wrapper (new markup). If absent, fall back to the <i> element.
    const navItem = e.target.closest('.nav-item');
    let icon = null;
    if (navItem) icon = navItem.querySelector('i');
    else icon = e.target.closest('i');

    if (!icon || !navbar.contains(icon)) return;

    // Toggle active class on nav-item elements (if present)
    const allItems = navbar.querySelectorAll('.nav-item');
    if (allItems.length) {
      allItems.forEach(item => item.classList.remove('active'));
      const toActivate = icon.closest('.nav-item');
      if (toActivate) toActivate.classList.add('active');
    }

    if (icon.classList.contains('fa-home')) window.location.href = '/pages/home.html';
    else if (icon.classList.contains('fa-list-ul')) window.location.href = '/pages/task.html';
    else if (icon.classList.contains('fa-user')) window.location.href = '/pages/profile.html';

  });

  console.log('Navbar delegation listener ready!');
});
