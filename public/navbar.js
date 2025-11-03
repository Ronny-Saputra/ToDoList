// navbar.js - Load navbar via fetch dan setup event listener

// Function untuk load navbar HTML dan CSS jika perlu
async function loadNavbar() {
  try {
    // Cek jika navbar sudah ada (hindari double insert)
    if (document.querySelector('.navbar')) {
      console.log('✅ Navbar already exists, skipping load');
      initNavbar();
      return;
    }

    // Fetch navbar.html
    const response = await fetch('../components/navbar.html');
    const navbarHTML = await response.text();
    
    // Insert navbar ke body (sebelum end)
    document.body.insertAdjacentHTML('beforeend', navbarHTML);
    
    // Load CSS dynamically jika belum ada (opsional, tapi aman)
    loadNavbarCSS();
    
    // Setup active page dan event listener
    initNavbar();
    
    console.log('✅ Navbar loaded successfully');
  } catch (error) {
    console.error('❌ Error loading navbar:', error);
  }
}

// Function untuk load navbar.css dynamically (jika belum di-link manual)
function loadNavbarCSS() {
  if (!document.querySelector('link[href="../css/navbar.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '../css/navbar.css';
    document.head.appendChild(link);
    console.log('✅ Navbar CSS loaded dynamically');
  } else {
    console.log('✅ Navbar CSS already linked');
  }
}

// Function untuk initialize navbar (set active + event listener)
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  
  // 1. Set active page berdasarkan URL
  setActivePage();
  
  // 2. Setup event listener untuk navigasi
  setupNavigation();
}

// Function untuk set halaman aktif
function setActivePage() {
  const currentPath = window.location.pathname;
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    const page = item.getAttribute('data-page');
    
    // Remove active dari semua
    item.classList.remove('active');
    
    // Tambah active ke halaman current
    if (currentPath.includes(`${page}.html`)) {
      item.classList.add('active');
    }
  });
}

// Function untuk setup click navigation
function setupNavigation() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  
  // Event delegation - 1 listener untuk semua nav items
  navbar.addEventListener('click', (e) => {
    const navItem = e.target.closest('.nav-item');
    if (!navItem) return;
    
    const page = navItem.getAttribute('data-page');
    if (page) {
      window.location.href = `../pages/${page}.html`;  // Sesuaikan path jika perlu
    }
  });
  
  console.log('✅ Navbar navigation ready');
}

// Auto-load saat DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadNavbar);
} else {
  loadNavbar();
}