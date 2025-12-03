// Load navbar HTML dan CSS jika belum ada
async function loadNavbar() {
  try {
    // Cegah load ganda jika navbar sudah ada
    if (document.querySelector(".navbar")) {
      console.log("Navbar already exists, skipping load");
      initNavbar();
      return;
    }

    // Fetch file navbar.html
    const response = await fetch("../components/navbar.html");
    const navbarHTML = await response.text();

    // Insert navbar ke dalam document
    document.body.insertAdjacentHTML("beforeend", navbarHTML);

    // Load CSS navbar jika belum ditautkan
    loadNavbarCSS();

    // Initialize navbar
    initNavbar();

    console.log("Navbar loaded successfully");
  } catch (error) {
    console.error("Error loading navbar:", error);
  }
}

// Load file navbar.css secara dinamis
function loadNavbarCSS() {
  if (!document.querySelector('link[href="../css/navbar.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../css/navbar.css";
    document.head.appendChild(link);
    console.log("Navbar CSS loaded dynamically");
  } else {
    console.log("Navbar CSS already linked");
  }
}

// Inisialisasi navbar (set active page + buat event listener)
function initNavbar() {
  const navbar = document.querySelector(".navbar");
  if (!navbar) return;

  // Set halaman aktif berdasarkan URL
  setActivePage();

  // Tambahkan event listener untuk navigasi
  setupNavigation();
}

// Menandai halaman aktif di navbar
function setActivePage() {
  const currentPath = window.location.pathname;
  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach((item) => {
    const page = item.getAttribute("data-page");

    // Reset active
    item.classList.remove("active");

    // Aktifkan item sesuai halaman
    if (currentPath.includes(`${page}.html`)) {
      item.classList.add("active");
    }
  });
}

// Event delegation untuk navigasi antar halaman
function setupNavigation() {
  const navbar = document.querySelector(".navbar");
  if (!navbar) return;

  navbar.addEventListener("click", (e) => {
    const navItem = e.target.closest(".nav-item");
    if (!navItem) return;

    const page = navItem.getAttribute("data-page");

    // Jika item punya page, arahkan ke halaman tersebut
    if (page) {
      window.location.href = `../pages/${page}.html`;
    }
  });

  console.log("Navbar navigation ready");
}

// Auto-load navbar setelah DOM siap
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadNavbar);
} else {
  loadNavbar();
}
