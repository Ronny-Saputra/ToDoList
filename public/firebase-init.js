// File: public/firebase-init.js
// Import Firebase SDK (gunakan <script> di HTML, bukan di JS file)

// Konfigurasi Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCClI3DZCsdkyvmnp8YtcZmq8L4Ut0AmR0",
  authDomain: "todolist-43.firebaseapp.com",
  projectId: "todolist-43",
  storageBucket: "todolist-43.appspot.com",
  messagingSenderId: "795548747542",
  appId: "1:795548747542:web:deb1efc52ed1aa247af237",
  measurementId: "G-67K7H7XXWW",
};

// Inisialisasi Firebase jika belum diinisialisasi
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// 1. Definisikan halaman publik (ditambahkan 'newpass.html')
const currentPage = window.location.pathname;
const publicPages = [
  '/login.html', 
  '/signup.html', 
  '/forgotpass.html', 
  '/newpass.html' // ✅ Ditambahkan
];
const isPublicPage = publicPages.some(page => currentPage.includes(page));

firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    // 2. LOGIKA RESTRIKSI: Jika sudah login, redirect ke home (kecuali newpass.html yang mungkin butuh action code)
    if (isPublicPage) {
        let shouldRedirect = true;
        // Pengecualian newpass.html hanya jika ada oobCode (untuk konfirmasi reset)
        if (currentPage.includes('/newpass.html')) {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('oobCode')) {
                shouldRedirect = false; // Biarkan di halaman newpass jika ada oobCode
            }
        }
        
        if (shouldRedirect) {
             window.location.href = "../pages/home.html";
        }
    }
  } else {
    // 3. LOGIKA PROTEKSI: Jika belum login, redirect ke login page (kecuali sedang di halaman publik)
    if (!isPublicPage) {
      window.location.href = "../pages/login.html";
    }
  }
});