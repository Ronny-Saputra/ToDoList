// **1. Konfigurasi Firebase**
// Berisi detail unik proyek Firebase Anda.
const firebaseConfig = {
    apiKey: "AIzaSyCClI3DZCsdkyvmnp8YtcZmq8L4Ut0AmR0",
    authDomain: "todolist-43.firebaseapp.com",
    projectId: "todolist-43",
    storageBucket: "todolist-43.appspot.com",
    messagingSenderId: "795548747542",
    appId: "1:795548747542:web:deb1efc52ed1aa247af237",
    measurementId: "G-67K7H7XXWW",
};

// **2. Inisialisasi Firebase**
// Memastikan Firebase hanya diinisialisasi sekali (penting saat menggunakan hot-reloading atau modul).
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// **3. Definisi Halaman Publik**
// Mendapatkan path URL halaman saat ini.
const currentPage = window.location.pathname;
// Daftar halaman yang dapat diakses TANPA perlu login.
const publicPages = [
    '/login.html', 
    '/signup.html', 
    '/forgotpass.html', 
    '/newpass.html' 
];
// Memeriksa apakah halaman saat ini termasuk dalam daftar publik.
const isPublicPage = publicPages.some(page => currentPage.includes(page));

// **4. Listener Status Otentikasi**
// Fungsi utama untuk mengelola status login dan perlindungan rute.
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // **4a. PENGGUNA SUDAH LOGIN**
        // LOGIKA RESTRIKSI: Mencegah pengguna yang sudah login mengakses halaman publik.
        if (isPublicPage) {
            let shouldRedirect = true;
            // Halaman ini mungkin perlu diakses oleh pengguna yang *baru saja* mengklik link reset password (walaupun mereka sudah login di sesi lain)
            if (currentPage.includes('/newpass.html')) {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('oobCode')) {
                    shouldRedirect = false; // TIDAK dialihkan, biarkan pengguna menyelesaikan reset password.
                }
            }
            
            if (shouldRedirect) {
                // Dialihkan ke halaman beranda jika sedang di halaman publik (dan bukan pengecualian newpass.html)
                window.location.href = "../pages/home.html";
            }
        }
    } else {
        // **4b. PENGGUNA BELUM LOGIN**
        // LOGIKA PROTEKSI: Mencegah pengguna yang belum login mengakses halaman privat.
        if (!isPublicPage) {
            // Jika bukan halaman publik, dialihkan ke halaman login.
            window.location.href = "../pages/login.html";
        }
    }
});