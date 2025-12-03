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

// Redirect HANYA jika BUKAN di halaman login, signup, atau forgot password
const currentPage = window.location.pathname;
const publicPages = ['/login.html', '/signup.html', '/forgotpass.html'];
const isPublicPage = publicPages.some(page => currentPage.includes(page));

if (!isPublicPage) {
  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "../pages/login.html";
    }
  });
}
