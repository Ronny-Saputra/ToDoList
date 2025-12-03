document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("searchInput");
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  const filterPillsContainer = document.querySelector(
    ".filter-pills-container",
  );
  const taskListContainer = document.getElementById("taskListContainer");
  const emptyState = document.getElementById("emptyState");

  let allTasksData = []; // Variabel untuk menyimpan semua data tugas

  const STORAGE_KEY_FILTER = "search_active_filter";
  const STORAGE_KEY_QUERY = "search_query";

  // Inisialisasi state awal (akan di-override di loadTasks)
  let currentActiveFilter = "all"; // Mulai dari 'all'
  let currentSearchQuery = "";

  // Dapatkan fungsi create card dari TaskApp global (dari task.js)
  const createTaskCard = window.TaskApp?.createTaskCard;

  if (!createTaskCard) {
    console.error(
      "Dependency Error: window.TaskApp.createTaskCard not found. Ensure task.js is loaded first.",
    );
    return;
  }

  // styling untuk scrollable filter pills
  if (filterPillsContainer) {
    filterPillsContainer.style.overflowX = "auto";
    filterPillsContainer.style.overflowY = "hidden";
    filterPillsContainer.style.display = "flex";
    filterPillsContainer.style.gap = "8px";
    filterPillsContainer.style.padding = "4px 0";
    filterPillsContainer.style.scrollbarWidth = "thin"; 
    filterPillsContainer.style.webkitOverflowScrolling = "touch"; 
    
    // Tambahkan custom scrollbar styling untuk Webkit browsers
    const style = document.createElement('style');
    style.textContent = `
      .filter-pills-container::-webkit-scrollbar {
        height: 6px;
      }
      .filter-pills-container::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.05);
        border-radius: 3px;
      }
      .filter-pills-container::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
      }
      .filter-pills-container::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.3);
      }
      .filter-pill {
        flex-shrink: 0; /* Mencegah pills menyusut */
        white-space: nowrap; /* Mencegah text wrapping */
      }
    `;
    document.head.appendChild(style);
  }

  // Inisialisasi status tampilan: Sembunyikan daftar, tampilkan status kosong
  if (taskListContainer) taskListContainer.style.display = "none";
  if (emptyState) emptyState.style.display = "flex";

  // --- FUNGSI UTAMA: RENDER TASK LIST ---
  function renderTasks(tasksToRender) {
    taskListContainer.innerHTML = "";
    console.log(`[Search] Rendering ${tasksToRender.length} tasks.`); // <-- LOG: Jumlah tugas yang akan dirender

    if (tasksToRender.length === 0) {
      emptyState.style.display = "flex";
      taskListContainer.style.display = "none";
    } else {
      emptyState.style.display = "none";
      taskListContainer.style.display = "grid"; // Menggunakan grid

      // Urutkan berdasarkan tanggal (paling dekat duluan)
      tasksToRender.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1; // Push 'a' (missing date) to the end
        if (!b.date) return -1; // Keep 'a' (has date) in place, push 'b' (missing date) to the end

        const dateA = new Date(a.date.replace(/-/g, "/"));
        const dateB = new Date(b.date.replace(/-/g, "/"));

        return dateA - dateB;
      });

      tasksToRender.forEach((task) => {
        // Definisikan fungsi reload spesifik untuk halaman search (memuat ulang data dari Firebase)
        // Ini akan memicu refresh tampilan search setelah aksi (delete/complete)
        const reloadFn = () => loadTasks(firebase.auth().currentUser);

        // Gunakan fungsi global createTaskCard dari task.js
        const card = createTaskCard(task, reloadFn);

        // Hapus kelas .active secara eksplisit pada saat rendering
        card.classList.remove("active");
        taskListContainer.appendChild(card);
      });
    }
  }

  // --- LOGIKA PENCARIAN & FILTER (Kombinasi Keywords dan Bulan) ---
  function performSearchAndFilter(query, filter) {
    let filteredTasks = allTasksData;
    // 1. Filter berdasarkan filter pill (bulan)
    // Jika filter adalah 'all', blok ini dilewati, dan filteredTasks tetap berisi semua tugas.
    if (filter !== "all") {
      const monthFilters = [
        "jan",
        "feb",
        "mar",
        "apr",
        "may",
        "jun",
        "jul",
        "aug",
        "sep",
        "oct",
        "nov",
        "dec",
      ];
      const monthIndex = monthFilters.indexOf(filter);

      if (monthIndex > -1) {
        filteredTasks = filteredTasks.filter((task) => {
          if (!task.date) return false;

          const taskDate = new Date(task.date.replace(/-/g, "/"));

          return taskDate.getMonth() === monthIndex;
        });
      }
    }

    // 2. Filter berdasarkan string pencarian (judul/lokasi)
    if (query) {
      const lowerCaseQuery = query.toLowerCase();
      filteredTasks = filteredTasks.filter(
        (task) =>
          (task.title && task.title.toLowerCase().includes(lowerCaseQuery)) ||
          (task.location &&
            task.location.toLowerCase().includes(lowerCaseQuery)),
      );
    }
    renderTasks(filteredTasks);
  }

  // Fungsi untuk dipanggil oleh listener keyup/input (menggunakan filter aktif saat ini)
  const performSearchThrottled = () => {
    const query = searchInput.value.trim();

    currentSearchQuery = query;
    if (query) {
      sessionStorage.setItem(STORAGE_KEY_QUERY, query);
    } else {
      sessionStorage.removeItem(STORAGE_KEY_QUERY);
    }

    // Gunakan state filter yang tersimpan
    performSearchAndFilter(query, currentActiveFilter);
  };

  // Fungsi untuk dipanggil oleh listener filter pill
  const performFilter = (filter) => {
    //  STATE FILTER DAN SIMPAN KE sessionStorage
    currentActiveFilter = filter;
    sessionStorage.setItem(STORAGE_KEY_FILTER, filter);

    let query = searchInput ? searchInput.value.trim() : "";

    // >> START PERBAIKAN: LOGIKA TOMBOL 'ALL'
    if (filter === "all") {
      // Reset query secara eksplisit (seperti saat load)
      query = "";
      currentSearchQuery = "";
      // Hapus query dari UI dan storage
      if (searchInput) searchInput.value = "";
      sessionStorage.removeItem(STORAGE_KEY_QUERY);
      if (clearSearchBtn) clearSearchBtn.style.display = "none";
    }
    // << END PERBAIKAN

    // Simpan query saat ini (jika tidak direset oleh tombol 'All')
    if (filter !== "all" && query) {
      currentSearchQuery = query;
      sessionStorage.setItem(STORAGE_KEY_QUERY, query);
    } else if (filter !== "all" && !query) {
      currentSearchQuery = "";
      sessionStorage.removeItem(STORAGE_KEY_QUERY);
    }

    performSearchAndFilter(query, currentActiveFilter);
  };

  // --- FUNGSI UTAMA: LOAD TASK DARI FIREBASE ---
  async function loadTasks(user) {
    if (!user) return;

    try {
      // ✅ PERBAIKAN: Panggil Backend API (Ganti Firestore)
      const tasks = await window.fetchData("/tasks?status=pending");

      // Pastikan respons berupa array dan map dengan benar
      allTasksData = Array.isArray(tasks)
        ? tasks.map((task) => ({
            ...task,
            //  Pastikan task.date sesuai dengan task.dueDate dari Firebase
            date: window.TaskApp.formatIsoToYyyyMmDd(task.dueDate), // Menggunakan dueDate dari server
          }))
        : [];

      console.log(`[Search] Loaded ${allTasksData.length} pending tasks.`); // <-- LOG: Jumlah total task dimuat

      // 1. TENTUKAN STATE AWAL YANG DIINGINKAN
      currentActiveFilter = "all"; // PAKSA FILTER 'ALL' SAAT MEMUAT
      currentSearchQuery = "";
      sessionStorage.removeItem(STORAGE_KEY_QUERY);

      // 2.  UI Search Input Selalu Kosong
      if (searchInput) {
        searchInput.value = "";
        if (clearSearchBtn) {
          clearSearchBtn.style.display = "none";
        }
      }

      // 3. Restore active pill ke 'all'
      restoreActivePill(currentActiveFilter);

      // 4. Filter & Render (dengan query kosong dan filter ALL)
      performSearchAndFilter(currentSearchQuery, currentActiveFilter);
    } catch (err) {
      console.error("Error loading tasks:", err);
      renderTasks([]);
    }
  }

  // Fungsi untuk restore active pill berdasarkan filter
  function restoreActivePill(filter) {
    // Hapus class 'active' dan ikon centang dari semua pill
    document.querySelectorAll(".filter-pill.active").forEach((pill) => {
      pill.classList.remove("active");
      const checkIcon = pill.querySelector(".check-icon");
      if (checkIcon) pill.removeChild(checkIcon);
    });

    // Tambahkan kembali ke pill yang sesuai
    const targetPill = document.querySelector(
      `.filter-pill[data-filter="${filter}"]`,
    );
    if (targetPill) {
      updateActivePill(targetPill);
      // Auto-scroll ke pill yang aktif
      scrollToPill(targetPill);
    }
  }

  // Fungsi untuk scroll ke pill yang aktif
  function scrollToPill(pill) {
    if (filterPillsContainer && pill) {
      // Tunggu sedikit untuk memastikan layout sudah selesai
      setTimeout(() => {
        const containerRect = filterPillsContainer.getBoundingClientRect();
        const pillRect = pill.getBoundingClientRect();
        
        // Hitung posisi scroll yang dibutuhkan
        const scrollLeft = filterPillsContainer.scrollLeft;
        const pillLeft = pillRect.left - containerRect.left + scrollLeft;
        const pillCenter = pillLeft - (containerRect.width / 2) + (pillRect.width / 2);
        
        // Smooth scroll ke posisi pill
        filterPillsContainer.scrollTo({
          left: pillCenter,
          behavior: 'smooth'
        });
      }, 100);
    }
  }

  // Ekspos fungsi loadTasks ke global agar task.js dapat memanggilnya
  window.SearchApp = window.SearchApp || {};
  window.SearchApp.reloadTasks = loadTasks;

  // --- INISIALISASI & LISTENERS ---

  // 1. Inisialisasi Firebase Auth dan Load Data
  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      taskListContainer.innerHTML = "";
      emptyState.style.display = "flex";
      taskListContainer.style.display = "none";
      return;
    }
    loadTasks(user);
  });

  // 2. Listeners untuk Search Input
  if (searchInput) {
    searchInput.addEventListener("keyup", performSearchThrottled);
  }

  // 3. Listeners untuk Filter Pills
  if (filterPillsContainer) {
    filterPillsContainer.addEventListener("click", (event) => {
      const pill = event.target.closest(".filter-pill");
      if (pill && !pill.classList.contains("active")) {
        const filterValue = pill.getAttribute("data-filter");
        updateActivePill(pill);
        scrollToPill(pill);
        // Panggil performFilter yang akan mengupdate state currentActiveFilter
        performFilter(filterValue);
      }
    });
  }

  // 4. Logika Clear Button
  if (clearSearchBtn && searchInput) {
    const toggleClearButton = () => {
      clearSearchBtn.style.display =
        searchInput.value.length > 0 ? "flex" : "none";
    };

    searchInput.addEventListener("input", toggleClearButton);

    clearSearchBtn.addEventListener("click", () => {
      searchInput.value = "";
      // Reset state dan sessionStorage
      currentSearchQuery = "";
      sessionStorage.removeItem(STORAGE_KEY_QUERY);
      toggleClearButton();
      // Gunakan state filter yang ada saat ini
      performSearchAndFilter("", currentActiveFilter);
    });

    // Dipanggil saat load untuk inisialisasi tampilan
    toggleClearButton();
  }

  // --- FUNGSI UTAMA UNTUK MENGELOLA ICON CENTANG ---
  function updateActivePill(newActivePill) {
    let currentActivePill = document.querySelector(".filter-pill.active");

    if (currentActivePill) {
      currentActivePill.classList.remove("active");
      const checkIcon = currentActivePill.querySelector(".check-icon");
      if (checkIcon) {
        currentActivePill.removeChild(checkIcon);
      }
    }

    if (newActivePill) {
      newActivePill.classList.add("active");
      const checkIcon = document.createElement("i");
      checkIcon.classList.add("fas", "fa-check", "check-icon");
      const spanElement = newActivePill.querySelector("span");
      if (spanElement) {
        newActivePill.insertBefore(checkIcon, spanElement);
      } else {
        newActivePill.prepend(checkIcon);
      }
    }
  }

  // Atur centang pada pill berdasarkan filter 'all'
  const initialActivePill = document.querySelector(
    `.filter-pill[data-filter="all"]`,
  );
  if (initialActivePill) {
    // Panggil updateActivePill agar ikon centang muncul pada filter 'all'
    updateActivePill(initialActivePill);
  }
});