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