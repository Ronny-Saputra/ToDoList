document.addEventListener("DOMContentLoaded", function () {

  // --- ELEMEN DOM (Desktop) ---
  const monthListContainer = document.getElementById("monthListContainer"); // Container untuk kalender desktop (tampilan 1 tahun)
  const currentYearSpan = document.getElementById("currentYear"); // Elemen untuk menampilkan tahun saat ini (desktop)
  const prevYearBtn = document.getElementById("prevYear"); // Tombol navigasi tahun sebelumnya
  const nextYearBtn = document.getElementById("nextYear"); // Tombol navigasi tahun berikutnya

  // --- ELEMEN DOM (Mobile) ---
  const mobileCalendarContainer = document.getElementById(
    "mobileCalendarContainer",
  ); // Container utama kalender mobile
  const swipeWrapper = document.getElementById("swipeWrapper"); // Wrapper untuk mekanisme swipe/geser bulan
  const monthYearTitle = document.getElementById("monthYearTitle"); // Judul bulan dan tahun (mobile)
  const prevMonthMobile = document.getElementById("prevMonthMobile"); // Tombol navigasi bulan sebelumnya (mobile)
  const nextMonthMobile = document.getElementById("nextMonthMobile"); // Tombol navigasi bulan berikutnya (mobile)

  // --- ELEMEN DOM (Lain-lain) ---
  const addReminderBtn = document.getElementById("add-reminder-btn"); // Tombol Add Reminder di footer

  const isCalendarPage = mobileCalendarContainer || monthListContainer;
  if (!isCalendarPage) return; // Keluar jika tidak berada di halaman kalender

  // --- STATE & KONSTANTA ---
  let currentYear = new Date().getFullYear(); // Tahun yang sedang ditampilkan
  let currentMonthIndex = new Date().getMonth(); // Indeks bulan yang sedang ditampilkan (0-11)
  const TOTAL_MONTHS = 12; // Total bulan dalam setahun
  const ENGLISH_LOCALE = "en-US"; // Locale untuk format tanggal
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; // Nama-nama hari

  const today = new Date(); // Objek tanggal hari ini
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  let selectedDate = { year: todayYear, month: todayMonth, day: todayDate }; // Tanggal yang saat ini dipilih
  
  let allTasksData = []; // Cache data semua tugas/reminder yang belum selesai
  let datesWithTasks = new Set(); // Set berisi string tanggal (YYYY-MM-DD) yang memiliki tugas

  // Ambil elemen drawer
  const newReminderDrawer = window.TaskApp.newReminderDrawer;
  const reminderForm = window.TaskApp.reminderForm;

  // Ambil container task list untuk drawer 
  const taskListForDrawer =
    document.getElementById("taskListForDrawer") ||
    document.createElement("div"); // Container untuk daftar tugas di dalam drawer
  if (!document.getElementById("taskListForDrawer")) {
    taskListForDrawer.id = "taskListForDrawer";
    taskListForDrawer.classList.add("scrollable-content");
    taskListForDrawer.style.padding = "0 24px";
    taskListForDrawer.style.flexGrow = "1";
    taskListForDrawer.style.display = "none";
    const drawerContent = document.querySelector(".drawer-content");
    if (drawerContent && reminderForm) {
      drawerContent.insertBefore(taskListForDrawer, reminderForm); // Sisipkan task list sebelum form reminder
    }
  }

  // --- UTILITY: Format Date ke string YYYY-MM-DD ---
  /**
   * Memformat tanggal (year, monthIndex, day) menjadi string YYYY-MM-DD.
   * @param {number} year Tahun (4 digit).
   * @param {number} month Bulan berbasis 0 (0-11).
   * @param {number} day Tanggal (1-31).
   * @returns {string} String tanggal dalam format YYYY-MM-DD.
   */
  function formatDate(year, month, day) {
    // month + 1 untuk mendapatkan nomor bulan (1-12)
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  }

  // --- FUNGSI BARU: RELOAD CALENDAR VIEW ---
  /**
   * Memuat ulang data tugas dan merender ulang kalender, serta memperbarui drawer jika terbuka.
   */
  async function reloadCalendarView() {
    const user = firebase.auth().currentUser;
    if (user) {
      await loadTasksAndRenderCalendar(user);
      // Setelah reload, pastikan daftar tugas di drawer diperbarui
      if (selectedDate) {
        const dateString = formatDate(
          selectedDate.year,
          selectedDate.month,
          selectedDate.day,
        );
        // Hanya perbarui drawer jika sedang dibuka DAN mode List Tasks
        if (
          newReminderDrawer &&
          newReminderDrawer.classList.contains("open") &&
          window.TaskApp.reminderForm.style.display === "none"
        ) {
          populateTaskDrawer(dateString);
        }
      }
    }
  }

  // --- FUNGSI LOAD DATA DARI FIREBASE ---
  /**
   * Mengambil data tugas yang belum selesai dari server dan merender kalender.
   * @param {object} user Objek pengguna Firebase.
   */
  async function loadTasksAndRenderCalendar(user) {
    if (!user) return;

    try {
      const tasks = await window.fetchData("/tasks?status=pending");
      window.TaskApp.tasksData = Array.isArray(tasks) ? tasks : [];

      // Sinkronkan data ke variabel lokal
      allTasksData = window.TaskApp.tasksData;
      datesWithTasks = new Set(allTasksData.map((t) => t.date)); // Perbarui set tanggal dengan tugas

      // Tentukan render kalender berdasarkan mode (mobile/desktop)
      if (isMobile()) {
        renderMobileCalendar();
      } else {
        updateYearDisplay(); // Merender kalender desktop
        setupDesktopScroll(); // Scroll ke bulan saat ini
      }

      // Pastikan tanggal yang dipilih tetap disorot
      if (selectedDate) {
        const activeBox = document.querySelector(
          `.date-box[data-year="${selectedDate.year}"][data-month="${selectedDate.month}"][data-day="${selectedDate.day}"]`,
        );
        if (activeBox) {
          document
            .querySelectorAll(".date-box.selected")
            .forEach((el) => el.classList.remove("selected"));
          activeBox.classList.add("selected");
        }
      }
    } catch (err) {
      console.error("Error loading tasks for calendar:", err);
    }
  }

  /**
    * Mendapatkan array objek tanggal untuk tampilan kalender 6 baris (termasuk tanggal bulan sebelumnya dan berikutnya).
    * @param {number} year Tahun.
    * @param {number} monthIndex Indeks bulan (0-11).
    * @returns {Array<object>} Array objek tanggal.
    */
  function getCalendarDates(year, monthIndex) {
    const dates = [];

    const firstDayOfMonth = new Date(year, monthIndex, 1);
    const firstDayOfWeek = firstDayOfMonth.getDay(); // Hari dalam seminggu (0=Minggu, 6=Sabtu)
    const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

    // Tambahkan tanggal dari bulan sebelumnya
    for (let i = firstDayOfWeek; i > 0; i--) {
      dates.push({ day: daysInPrevMonth - i + 1, outside: true, empty: true });
    }

    // Tambahkan tanggal dari bulan saat ini
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push({ day: i, outside: false, empty: false });
    }

    // Tambahkan tanggal dari bulan berikutnya untuk mengisi 6 baris penuh
    const totalSlotsNeeded = Math.ceil(dates.length / 7) * 7;
    let nextDay = 1;
    while (dates.length < totalSlotsNeeded) {
      dates.push({ day: nextDay, outside: true, empty: true });
      nextDay++;
    }

    return dates;
  }

  /**
    * Membuat struktur HTML untuk satu bulan kalender.
    * @param {number} year Tahun.
    * @param {number} monthIndex Indeks bulan (0-11).
    * @param {boolean} includeTitleForDesktop Menentukan apakah judul bulan perlu disertakan (true untuk desktop).
    * @returns {string} String HTML kalender bulan.
    */
  function createMonthCalendarHTML(
    year,
    monthIndex,
    includeTitleForDesktop = true,
  ) {
    let html = "";

    // Judul bulan (hanya untuk desktop)
    if (includeTitleForDesktop) {
      const monthTitle = new Date(year, monthIndex, 1).toLocaleDateString(
        ENGLISH_LOCALE,
        { month: "long", year: "numeric" },
      );
      html += `<div class="month-title">${monthTitle}</div>`;
    }

    // Header Hari dalam Seminggu
    html += '<div class="weekdays">';
    WEEKDAYS.forEach((day) => {
      html += `<span>${day}</span>`;
    });
    html += "</div>";

    // Kotak Tanggal
    html += '<div class="dates">';
    const datesGenerated = getCalendarDates(year, monthIndex);
    datesGenerated.forEach((data) => {
      // Kotak kosong (untuk tanggal bulan lain)
      if (data.empty && data.outside) {
        html += `<div class="date-box empty"></div>`;
        return;
      }

      let dateString = "";
      // Hanya buat dateString yang valid untuk bulan saat ini
      if (!data.outside) {
        dateString = formatDate(year, monthIndex, data.day); // YYYY-MM-DD
      }

      const outsideClass = data.outside ? " outside-month" : "";

      // Tandai hari ini
      const isTodayDate =
        !data.outside &&
        year === todayYear &&
        monthIndex === todayMonth &&
        data.day === todayDate;
      const todayClass = isTodayDate ? " today" : "";

      // Tandai tanggal yang dipilih
      const isSelected =
        selectedDate &&
        !data.outside &&
        selectedDate.year === year &&
        selectedDate.month === monthIndex &&
        selectedDate.day === data.day;
      const selectedClass = isSelected ? " selected" : "";

      // Menambahkan titik indikator jika ada tugas pada tanggal tersebut
      let dotIndicator = "";
      if (!data.outside && datesWithTasks.has(dateString)) {
        dotIndicator = '<span class="dot-indicator-calendar"></span>';
      }

      // Tambahkan elemen kotak tanggal ke HTML
      html += `<div class="date-box${outsideClass}${todayClass}${selectedClass}" 
                        data-year="${year}" 
                        data-month="${monthIndex}" 
                        data-day="${data.day}" 
                        data-outside="${data.outside}"
                        data-datestring="${dateString}">${data.day}${dotIndicator}</div>`;
    });
    html += "</div>";

    return html;
  }

  /**
    * Membuat elemen div kalender bulan untuk desktop.
    * @param {number} year Tahun.
    * @param {number} monthIndex Indeks bulan (0-11).
    * @returns {HTMLElement} Elemen div kalender bulan.
    */
  function createMonthCalendar(year, monthIndex) {
    const monthDiv = document.createElement("div");
    monthDiv.classList.add("month-calendar");
    monthDiv.setAttribute("data-year", year);
    monthDiv.setAttribute("data-month", monthIndex);
    monthDiv.innerHTML = createMonthCalendarHTML(year, monthIndex, true);
    return monthDiv;
  }

  /**
    * Merender semua 12 bulan untuk tampilan desktop.
    */
  function renderDesktopYear() {
    if (!monthListContainer) return;

    monthListContainer.innerHTML = "";

    // Loop untuk 12 bulan
    for (let month = 0; month < TOTAL_MONTHS; month++) {
      monthListContainer.appendChild(createMonthCalendar(currentYear, month));
    }

    addDateClickListeners();
  }

  /**
    * Merender 12 bulan untuk mekanisme swipe di tampilan mobile.
    */
  function renderMobileCalendar() {
    if (!swipeWrapper) {
      return;
    }

    swipeWrapper.innerHTML = "";

    // Loop untuk 12 bulan, masing-masing dalam div swipe-month
    for (let month = 0; month < TOTAL_MONTHS; month++) {
      const monthDiv = document.createElement("div");
      monthDiv.classList.add("swipe-month");

      const calendarCardMobile = document.createElement("div");
      calendarCardMobile.classList.add("calendar-card-mobile");

      const calendarDiv = document.createElement("div");
      calendarDiv.classList.add("month-calendar");
      calendarDiv.setAttribute("data-year", currentYear);
      calendarDiv.setAttribute("data-month", month);
      calendarDiv.innerHTML = createMonthCalendarHTML(
        currentYear,
        month,
        false, // Tidak menyertakan judul bulan untuk mobile
      );

      calendarCardMobile.appendChild(calendarDiv);
      monthDiv.appendChild(calendarCardMobile);
      swipeWrapper.appendChild(monthDiv);
    }

    updateMobilePosition(false); // Atur posisi awal (langsung ke bulan saat ini)
    updateMobileTitle(); // Perbarui judul bulan/tahun
    addDateClickListeners(); // Tambahkan listener klik tanggal
  }

  /**
    * Memperbarui posisi geser (transform X) wrapper kalender mobile.
    * @param {boolean} animate Mengaktifkan atau menonaktifkan transisi.
    */
  function updateMobilePosition(animate = true) {
    if (!swipeWrapper) return;

    const offset = -currentMonthIndex * 100; // Hitung offset dalam persentase

    if (animate) {
      swipeWrapper.style.transition = "transform 0.3s ease";
    } else {
      swipeWrapper.style.transition = "none";
    }

    swipeWrapper.style.transform = `translateX(${offset}%)`;
  }

  /**
    * Memperbarui teks judul bulan/tahun pada tampilan mobile.
    */
  function updateMobileTitle() {
    if (!monthYearTitle) return;

    const date = new Date(currentYear, currentMonthIndex, 1);
    monthYearTitle.textContent = date.toLocaleDateString(ENGLISH_LOCALE, {
      month: "long",
      year: "numeric",
    });
  }

  /**
    * Menggulirkan tampilan kalender desktop ke bulan saat ini saat inisialisasi.
    */
  function setupDesktopScroll() {
    if (!monthListContainer) return;

    const currentMonthDiv = monthListContainer.querySelector(
      `.month-calendar[data-year="${currentYear}"][data-month="${todayMonth}"]`,
    );

    if (currentMonthDiv) {
      currentMonthDiv.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  // --- FUNGSI BARU: Mengisi Drawer dengan Daftar Tugas (Diperbarui) ---
  /**
    * Mengisi konten drawer dengan daftar tugas untuk tanggal tertentu.
    * @param {string} dateString Tanggal dalam format YYYY-MM-DD.
    */
  function populateTaskDrawer(dateString) {
    const drawerHeaderTitle = window.TaskApp.drawerHeaderTitle;

    if (!drawerHeaderTitle || !reminderForm || !taskListForDrawer) return;

    const tasksForDate = allTasksData.filter(
      (task) => task.date === dateString,
    );

    const dateParts = dateString.split("-");
    // dateParts[1] sekarang adalah nomor bulan (1-12), perlu dikurangi 1 untuk Date()
    const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

    // Format tanggal untuk judul drawer
    const dayName = date.toLocaleDateString(ENGLISH_LOCALE, {
      weekday: "long",
    });
    const formattedDate = date.toLocaleDateString(ENGLISH_LOCALE, {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    // 1. Update Header Title
    drawerHeaderTitle.textContent = `Tasks on ${dayName}, ${formattedDate}`;

    // 2. Tampilkan Task List dan Sembunyikan Form
    reminderForm.style.display = "none";
    taskListForDrawer.style.display = "flex";

    // 3. Isi Task List
    taskListForDrawer.style.flexDirection = "column";
    taskListForDrawer.innerHTML = "";

    if (tasksForDate.length === 0) {
      // Tampilkan pesan "No reminders" jika tidak ada tugas
      taskListForDrawer.innerHTML = `
                <div style="text-align: center; color: #777; padding: 40px 0; width: 100%;">
                    <img src="../assets/timy3.png" alt="Timy Sad" style="width: 100px; margin-bottom: 20px;">
                    <p style="font-size: 16px; color: #666;">No reminders scheduled for this date.</p>
                </div>`;
    } else {
      // Buat dan tampilkan task card untuk setiap tugas
      tasksForDate.forEach((task) => {
        // Panggil fungsi reusable dari task.js untuk membuat card tugas
        const card = window.TaskApp.createTaskCard(task, reloadCalendarView);
        taskListForDrawer.appendChild(card);
      });
    }
  }

  // --- FUNGSI KLIK KOTAK TANGGAL (Diperbarui) ---
  /**
    * Handler untuk event klik pada kotak tanggal kalender.
    */
  function dateBoxClickHandler() {
    const box = this;
    const year = parseInt(box.getAttribute("data-year"));
    const month = parseInt(box.getAttribute("data-month"));
    const day = parseInt(box.getAttribute("data-day"));
    const dateString = box.getAttribute("data-datestring");

    // --- 1. SELECTION LOGIC (RUN ALWAYS) ---
    // Hapus seleksi dari semua kotak dan tambahkan ke kotak yang diklik
    document.querySelectorAll(".date-box.selected").forEach((el) => {
      el.classList.remove("selected");
    });
    box.classList.add("selected");

    selectedDate = { year, month, day };

    // Update activeDate (Global State) untuk sinkronisasi
    window.TaskApp.activeDate = new Date(year, month, day);
    window.TaskApp.activeDate.setHours(0, 0, 0, 0);

    const tasksForDate = allTasksData.filter(
      (task) => task.date === dateString,
    );

    // --- 2. DRAWER OPEN CHECK (Conditional) ---
    // JANGAN BUKA DRAWER JIKA TIDAK ADA TUGAS
    if (tasksForDate.length === 0) {
      return;
    }

    // Buka drawer dalam mode List Tasks jika ada tugas
    populateTaskDrawer(dateString);
    window.TaskApp.openDrawer(); // Buka drawer
  }

  // --- MODIFIKASI: addDateClickListeners (Hanya tanggal yang tidak kosong) ---
  /**
    * Menambahkan event listener 'click' ke semua kotak tanggal yang valid (bukan .empty).
    */
  function addDateClickListeners() {
    const dateBoxes = document.querySelectorAll(".date-box:not(.empty)");

    dateBoxes.forEach((box) => {
      box.removeEventListener("click", dateBoxClickHandler); // Hapus listener lama
      box.addEventListener("click", dateBoxClickHandler); // Tambahkan listener baru
    });
  }

  /**
    * Mengecek apakah tampilan saat ini adalah mobile (lebar <= 767px).
    * @returns {boolean} True jika mobile, False jika desktop.
    */
  function isMobile() {
    return window.innerWidth <= 767;
  }

  /**
    * Navigasi ke bulan sebelumnya (khusus mobile).
    */
  function goToPrevMonth() {
    if (currentMonthIndex > 0) {
      currentMonthIndex--;
      updateMobilePosition(true); // Geser bulan saat ini
      updateMobileTitle();
    } else {
      // Pindah ke tahun sebelumnya
      currentYear--;
      currentMonthIndex = 11;
      // Muat ulang kalender karena tahun berubah
      loadTasksAndRenderCalendar(firebase.auth().currentUser);
      updateMobilePosition(false); // Geser tanpa animasi
      updateMobileTitle();
    }
  }

  /**
    * Navigasi ke bulan berikutnya (khusus mobile).
    */
  function goToNextMonth() {
    if (currentMonthIndex < TOTAL_MONTHS - 1) {
      currentMonthIndex++;
      updateMobilePosition(true); // Geser bulan saat ini
      updateMobileTitle();
    } else {
      // Pindah ke tahun berikutnya
      currentYear++;
      currentMonthIndex = 0;
      // Muat ulang kalender karena tahun berubah
      loadTasksAndRenderCalendar(firebase.auth().currentUser);
      updateMobilePosition(false); // Geser tanpa animasi
      updateMobileTitle();
    }
  }

  /**
    * Mengatur fungsionalitas swipe (geser) pada kalender mobile.
    */
  let touchStartX,
    isDragging = false;
  let currentTranslate = 0;
  let prevTranslate = 0;

  function setupMobileSwipe() {
    if (!mobileCalendarContainer) return;

    // Mencegah penambahan listener berkali-kali
    if (mobileCalendarContainer.dataset.listenersAdded === "true") return;
    mobileCalendarContainer.dataset.listenersAdded = "true";

    // Event saat sentuhan dimulai
    mobileCalendarContainer.addEventListener("touchstart", (e) => {
      touchStartX = e.touches[0].clientX;
      isDragging = true;
      swipeWrapper.style.transition = "none"; // Hentikan transisi saat drag
    });

    // Event saat sentuhan digerakkan
    mobileCalendarContainer.addEventListener("touchmove", (e) => {
      if (!isDragging) return;

      const currentX = e.touches[0].clientX;
      const diff = currentX - touchStartX;
      const dragPercent = (diff / mobileCalendarContainer.offsetWidth) * 100;

      currentTranslate = prevTranslate + dragPercent;

      // Efek pantulan pada batas awal dan akhir
      if (currentMonthIndex === 0 && diff > 0) {
        currentTranslate = prevTranslate + dragPercent * 0.3;
      } else if (currentMonthIndex === TOTAL_MONTHS - 1 && diff < 0) {
        currentTranslate = prevTranslate + dragPercent * 0.3;
      }

      swipeWrapper.style.transform = `translateX(${currentTranslate}%)`;
    });

    // Event saat sentuhan berakhir
    mobileCalendarContainer.addEventListener("touchend", (e) => {
      if (!isDragging) return;

      isDragging = false;
      const touchEndX = e.changedTouches[0].clientX;

      const diff = touchEndX - touchStartX;
      const threshold = 50; // Jarak swipe minimum untuk navigasi

      if (Math.abs(diff) > threshold) {
        if (diff > 0 && currentMonthIndex > 0) {
          goToPrevMonth(); // Swipe kanan
        } else if (diff < 0 && currentMonthIndex < TOTAL_MONTHS - 1) {
          goToNextMonth(); // Swipe kiri
        } else {
          updateMobilePosition(true); // Kembali ke posisi semula jika di batas
        }
      } else {
        updateMobilePosition(true); // Kembali ke posisi semula jika swipe kurang dari threshold
      }

      prevTranslate = -currentMonthIndex * 100; // Perbarui posisi awal swipe berikutnya
    });
  }

  /**
    * Memperbarui tampilan tahun (desktop) dan memicu rendering kalender desktop.
    */
  function updateYearDisplay() {
    if (currentYearSpan) currentYearSpan.textContent = currentYear;
    renderDesktopYear();
  }

  /**
    * Fungsi inisialisasi utama kalender. Memuat tugas dan menangani parameter URL/hash.
    * @param {object} user Objek pengguna Firebase.
    */
  function init(user) {
    // 1. Muat tugas dan render kalender
    loadTasksAndRenderCalendar(user).then(() => {
      const hash = window.location.hash;
      // 2. Tangani hash URL (misalnya dari notifikasi)
      if (hash.startsWith("#date=")) {
        const urlParams = new URLSearchParams(hash.substring(1));
        const dateString = urlParams.get("date");
        const viewFlag = urlParams.get("view");

        if (dateString) {
          // Update state dari hash
          const dateParts = dateString.split("-");
          selectedDate = {
            year: parseInt(dateParts[0]),
            month: parseInt(dateParts[1]) - 1, // Bulan dari hash berbasis 1, ubah ke basis 0
            day: parseInt(dateParts[2]),
          };

          if (viewFlag === "list") {
            // Logika untuk menampilkan daftar tugas dari hash
            window.TaskApp.activeDate = new Date(
              selectedDate.year,
              selectedDate.month,
              selectedDate.day,
            );
            window.TaskApp.activeDate.setHours(0, 0, 0, 0);

            populateTaskDrawer(dateString); // Isi drawer dengan daftar tugas
            window.TaskApp.openDrawer();
            
            // Pastikan form tersembunyi dan daftar tugas terlihat
            window.TaskApp.reminderForm.style.display = "none";
            document.getElementById("taskListForDrawer").style.display = "flex";

            // Hapus hash
            history.replaceState(null, null, window.location.pathname);

            // Perbarui kalender mobile ke bulan yang benar
            if (isMobile()) {
              currentYear = selectedDate.year;
              currentMonthIndex = selectedDate.month;
              loadTasksAndRenderCalendar(user); 
            }
          }
        }
      }
    });

    // 3. Penanganan resize layar (transisi mobile/desktop)
    let resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        const isNowMobile = isMobile();

        // Muat ulang kalender jika terjadi perubahan mode tampilan
        if (
          mobileCalendarContainer &&
          mobileCalendarContainer.style.display !==
            (isNowMobile ? "flex" : "none")
        ) {
          loadTasksAndRenderCalendar(user);
        } else if (
          monthListContainer &&
          monthListContainer.style.display !== (isNowMobile ? "none" : "flex")
        ) {
          loadTasksAndRenderCalendar(user);
        }
      }, 250);
    });

    // 4. Inisialisasi swipe mobile
    if (isMobile()) {
      currentMonthIndex = todayMonth; // Atur bulan mobile ke bulan saat ini
      setupMobileSwipe();
    }
  }

  // --- EVENT LISTENER: Navigasi Desktop ---
  if (prevYearBtn) {
    prevYearBtn.addEventListener("click", function () {
      currentYear--;
      loadTasksAndRenderCalendar(firebase.auth().currentUser); // Muat ulang kalender saat tahun berubah
    });
  }

  if (nextYearBtn) {
    nextYearBtn.addEventListener("click", function () {
      currentYear++;
      loadTasksAndRenderCalendar(firebase.auth().currentUser); // Muat ulang kalender saat tahun berubah
    });
  }

  // --- EVENT LISTENER: Navigasi Mobile ---
  if (prevMonthMobile) {
    prevMonthMobile.addEventListener("click", goToPrevMonth);
  }

  if (nextMonthMobile) {
    nextMonthMobile.addEventListener("click", goToNextMonth);
  }

  // --- INIT PENGGUNA (FIREBASE AUTH) ---
  // Memantau status otentikasi pengguna
  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "../pages/login.html"; // Arahkan ke halaman login jika tidak ada pengguna
      return;
    }

    // Inisialisasi activeDate global jika belum diatur
    if (!window.TaskApp.activeDate) {
      window.TaskApp.activeDate = new Date();
      window.TaskApp.activeDate.setHours(0, 0, 0, 0);
    }

    init(user); // Mulai inisialisasi kalender
  });

  // --- EVENT LISTENER: Tombol Add Reminder di Footer ---
  if (addReminderBtn && window.TaskApp.startNewReminderFlow) {
    addReminderBtn.addEventListener("click", () => {
      if (!selectedDate) {
        // Gunakan hari ini jika belum ada tanggal yang dipilih
        selectedDate = { year: todayYear, month: todayMonth, day: todayDate };
      }

      const dateToUse = new Date(
        selectedDate.year,
        selectedDate.month,
        selectedDate.day,
      );

      // Panggil fungsi global dari task.js untuk memulai alur "New Reminder"
      window.TaskApp.startNewReminderFlow(dateToUse);

      // Sembunyikan daftar tugas dan Tampilkan form
      if (taskListForDrawer) taskListForDrawer.style.display = "none";
      if (reminderForm) reminderForm.style.display = "flex";
    });
  }

  // --- EXPOSE GLOBAL REFRESH FUNCTION FOR task.js ---
  // Ekspos fungsi reloadCalendarView agar dapat dipanggil dari file lain (task.js)
  window.CalendarApp = window.CalendarApp || {};
  window.CalendarApp.reloadCalendarView = reloadCalendarView;
});