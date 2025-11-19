document.addEventListener('DOMContentLoaded', function() {
    // Desktop elements
    const monthListContainer = document.getElementById('monthListContainer');
    const currentYearSpan = document.getElementById('currentYear');
    const prevYearBtn = document.getElementById('prevYear');
    const nextYearBtn = document.getElementById('nextYear');
    
    // Mobile elements
    const mobileCalendarContainer = document.getElementById('mobileCalendarContainer');
    const swipeWrapper = document.getElementById('swipeWrapper');
    const monthYearTitle = document.getElementById('monthYearTitle');
    const prevMonthMobile = document.getElementById('prevMonthMobile');
    const nextMonthMobile = document.getElementById('nextMonthMobile');
    
    // Tombol Add Reminder di Footer
    const addReminderBtn = document.getElementById('add-reminder-btn'); // <-- Variabel lokal yang benar

    const isCalendarPage = mobileCalendarContainer || monthListContainer;
    if (!isCalendarPage) return;

    // State & Constants
    let currentYear = new Date().getFullYear(); 
    let currentMonthIndex = new Date().getMonth(); 
    const TOTAL_MONTHS = 12;
    const ENGLISH_LOCALE = 'en-US';
    const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    
    let selectedDate = { year: todayYear, month: todayMonth, day: todayDate }; 
    let allTasksData = []; 
    let datesWithTasks = new Set(); 
    
    // Ambil elemen drawer
    const newReminderDrawer = window.TaskApp.newReminderDrawer;
    const reminderForm = window.TaskApp.reminderForm;
    
    // Ambil container task list untuk drawer (Sudah diset di task.js, tapi pastikan ada)
    const taskListForDrawer = document.getElementById('taskListForDrawer') || document.createElement('div');
    if (!document.getElementById('taskListForDrawer')) {
        taskListForDrawer.id = 'taskListForDrawer';
        taskListForDrawer.classList.add('scrollable-content'); 
        taskListForDrawer.style.padding = '0 24px';
        taskListForDrawer.style.flexGrow = '1';
        taskListForDrawer.style.display = 'none'; 
        const drawerContent = document.querySelector('.drawer-content');
        if (drawerContent && reminderForm) {
            drawerContent.insertBefore(taskListForDrawer, reminderForm); 
        }
    }
    
    // --- UTILITY: Format Date ke string YYYY-MM-DD ---
    function formatDate(year, month, day) {
        // PERBAIKAN: Gunakan month + 1 untuk mendapatkan nomor bulan (1-12)
        const m = String(month + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        // PASTIKAN menggunakan 'm' yang sudah diformat dan berbasis 1.
        return `${year}-${m}-${d}`;
    }
    
    // --- FUNGSI BARU: RELOAD CALENDAR VIEW ---
    async function reloadCalendarView() {
        const user = firebase.auth().currentUser;
        if (user) {
            await loadTasksAndRenderCalendar(user); 
            // Setelah reload, pastikan daftar tugas di drawer diperbarui
            if (selectedDate) {
                const dateString = formatDate(selectedDate.year, selectedDate.month, selectedDate.day);
                // Hanya perbarui drawer jika sedang dibuka DAN mode List Tasks
                if (newReminderDrawer && newReminderDrawer.classList.contains('open') && window.TaskApp.reminderForm.style.display === 'none') {
                    populateTaskDrawer(dateString); 
                }
            }
        }
    }


    // --- FUNGSI LOAD DATA DARI FIREBASE ---
    async function loadTasksAndRenderCalendar(user) {
        if (!user) return;
        
        try {
            const tasks = await window.fetchData('/tasks?status=pending');
            window.TaskApp.tasksData = Array.isArray(tasks) ? tasks : [];

            // Sinkronkan data ke variabel lokal (penting untuk dot indicator di kalender ini)
            allTasksData = window.TaskApp.tasksData;
            datesWithTasks = new Set(allTasksData.map(t => t.date));
            
            if (isMobile()) {
                renderMobileCalendar();
            } else {
                updateYearDisplay();
                setupDesktopScroll(); 
            }
            
            if (selectedDate) {
                 const activeBox = document.querySelector(`.date-box[data-year="${selectedDate.year}"][data-month="${selectedDate.month}"][data-day="${selectedDate.day}"]`);
                 if(activeBox) {
                     document.querySelectorAll('.date-box.selected').forEach(el => el.classList.remove('selected'));
                     activeBox.classList.add('selected');
                 }
            }

        } catch (err) {
            console.error("Error loading tasks for calendar:", err);
        }
    }

    /**
     * Get calendar dates for a month
     */
    function getCalendarDates(year, monthIndex) {
        const dates = [];
        
        const firstDayOfMonth = new Date(year, monthIndex, 1);
        const firstDayOfWeek = firstDayOfMonth.getDay();
        const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

        // Add dates from previous month
        for (let i = firstDayOfWeek; i > 0; i--) {
            dates.push({ day: daysInPrevMonth - i + 1, outside: true, empty: true });
        }

        // Add dates from current month
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            dates.push({ day: i, outside: false, empty: false });
        }

        // Add dates from next month
        const totalSlotsNeeded = Math.ceil(dates.length / 7) * 7;
        let nextDay = 1;
        while (dates.length < totalSlotsNeeded) {
            dates.push({ day: nextDay, outside: true, empty: true });
            nextDay++;
        }
        
        return dates;
    }

    /**
     * Create month calendar HTML
     */
    function createMonthCalendarHTML(year, monthIndex, includeTitleForDesktop = true) {
        let html = '';
        
        if (includeTitleForDesktop) {
            const monthTitle = new Date(year, monthIndex, 1).toLocaleDateString(ENGLISH_LOCALE, { month: 'long', year: 'numeric' });
            html += `<div class="month-title">${monthTitle}</div>`;
        }
        
        // Weekdays header
        html += '<div class="weekdays">';
        WEEKDAYS.forEach(day => {
            html += `<span>${day}</span>`;
        });
        html += '</div>';

        // Date boxes
        html += '<div class="dates">';
        const datesGenerated = getCalendarDates(year, monthIndex);
        datesGenerated.forEach(data => {
            
            // Render an empty box if data.empty is true
            if (data.empty) {
                html += `<div class="date-box empty"></div>`;
                return;
            }
            
            let dateString = '';
            // Hanya buat dateString yang valid untuk bulan saat ini (bukan outside)
            if (!data.outside) {
                dateString = formatDate(year, monthIndex, data.day); // YYYY-MM-DD
            }
            
            const outsideClass = data.outside ? ' outside-month' : '';
            
            const isTodayDate = !data.outside && 
                                year === todayYear && 
                                monthIndex === todayMonth && 
                                data.day === todayDate;
            const todayClass = isTodayDate ? ' today' : ''; 
            
            const isSelected = selectedDate && 
                               !data.outside &&
                               selectedDate.year === year && 
                               selectedDate.month === monthIndex && 
                               selectedDate.day === data.day;
            const selectedClass = isSelected ? ' selected' : '';
            
            // ✅ Menambahkan titik indikator jika ada tugas pada tanggal tersebut
            let dotIndicator = '';
            if (!data.outside && datesWithTasks.has(dateString)) {
                dotIndicator = '<span class="dot-indicator-calendar"></span>';
            }
            
            html += `<div class="date-box${outsideClass}${todayClass}${selectedClass}" 
                            data-year="${year}" 
                            data-month="${monthIndex}" 
                            data-day="${data.day}" 
                            data-outside="${data.outside}"
                            data-datestring="${dateString}">${data.day}${dotIndicator}</div>`;
        });
        html += '</div>';

        return html;
    }
    
    /**
     * Create month calendar element for desktop
     */
    function createMonthCalendar(year, monthIndex) {
        const monthDiv = document.createElement('div');
        monthDiv.classList.add('month-calendar');
        monthDiv.setAttribute('data-year', year);
        monthDiv.setAttribute('data-month', monthIndex);
        monthDiv.innerHTML = createMonthCalendarHTML(year, monthIndex, true);
        return monthDiv;
    }
    
    /**
     * Render full year for desktop
     */
    function renderDesktopYear() {
        if (!monthListContainer) return;
        
        monthListContainer.innerHTML = '';

        for (let month = 0; month < TOTAL_MONTHS; month++) {
            monthListContainer.appendChild(createMonthCalendar(currentYear, month));
        }
        
        addDateClickListeners();
    }
    
    /**
     * Render mobile swipe calendar
     */
    function renderMobileCalendar() {
        if (!swipeWrapper) {
             return;
        }
        
        swipeWrapper.innerHTML = '';
        
        for (let month = 0; month < TOTAL_MONTHS; month++) {
            const monthDiv = document.createElement('div');
            monthDiv.classList.add('swipe-month');
            
            const calendarCardMobile = document.createElement('div');
            calendarCardMobile.classList.add('calendar-card-mobile'); 

            const calendarDiv = document.createElement('div');
            calendarDiv.classList.add('month-calendar');
            calendarDiv.setAttribute('data-year', currentYear);
            calendarDiv.setAttribute('data-month', month);
            calendarDiv.innerHTML = createMonthCalendarHTML(currentYear, month, false);
            
            calendarCardMobile.appendChild(calendarDiv);
            monthDiv.appendChild(calendarCardMobile);
            swipeWrapper.appendChild(monthDiv); 
        }
        
        updateMobilePosition(false);
        updateMobileTitle();
        addDateClickListeners();
    }
    
    /**
     * Update mobile calendar position
     */
    function updateMobilePosition(animate = true) {
        if (!swipeWrapper) return;
        
        const offset = -currentMonthIndex * 100;
        
        if (animate) {
            swipeWrapper.style.transition = 'transform 0.3s ease';
        } else {
            swipeWrapper.style.transition = 'none';
        }
        
        swipeWrapper.style.transform = `translateX(${offset}%)`;
    }
    
    /**
     * Update mobile month title
     */
    function updateMobileTitle() {
        if (!monthYearTitle) return;
        
        const date = new Date(currentYear, currentMonthIndex, 1);
        monthYearTitle.textContent = date.toLocaleDateString(ENGLISH_LOCALE, { month: 'long', year: 'numeric' });
    }
    
    function setupDesktopScroll() {
        if (!monthListContainer) return;
        
        const currentMonthDiv = monthListContainer.querySelector(`.month-calendar[data-year="${currentYear}"][data-month="${todayMonth}"]`);

        if (currentMonthDiv) {
            currentMonthDiv.scrollIntoView({
                behavior: 'smooth',
                block: 'start' 
            });
        }
    }


    // --- FUNGSI BARU: Mengisi Drawer dengan Daftar Tugas (Diperbarui) ---
    function populateTaskDrawer(dateString) {
        const drawerHeaderTitle = window.TaskApp.drawerHeaderTitle; 
        
        if (!drawerHeaderTitle || !reminderForm || !taskListForDrawer) return;

        const tasksForDate = allTasksData.filter(task => task.date === dateString);
        
        const dateParts = dateString.split('-');
        // dateParts[1] sekarang adalah nomor bulan (1-12)
        const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]); 
        
        const dayName = date.toLocaleDateString(ENGLISH_LOCALE, { weekday: 'long' });
        const formattedDate = date.toLocaleDateString(ENGLISH_LOCALE, { day: '2-digit', month: 'long', year: 'numeric' });
        
        // 1. Update Header Title
        drawerHeaderTitle.textContent = `Tasks on ${dayName}, ${formattedDate}`;
        
        // 2. Tampilkan Task List dan Sembunyikan Form
        reminderForm.style.display = 'none';
        taskListForDrawer.style.display = 'flex'; 
        
        // 3. Isi Task List
        taskListForDrawer.style.flexDirection = 'column'; 
        taskListForDrawer.innerHTML = ''; 
        
        if (tasksForDate.length === 0) {
            // Ini seharusnya tidak tercapai karena sudah dicek di dateBoxClickHandler,
            // tetapi ini adalah fallback jika drawer dibuka manual tanpa tugas.
            taskListForDrawer.innerHTML = `
                <div style="text-align: center; color: #777; padding: 40px 0; width: 100%;">
                    <img src="../assets/timy3.png" alt="Timy Sad" style="width: 100px; margin-bottom: 20px;">
                    <p style="font-size: 16px; color: #666;">No reminders scheduled for this date.</p>
                </div>`;
        } else {
            tasksForDate.forEach(task => {
                // Panggil fungsi reusable dari task.js
                const card = window.TaskApp.createTaskCard(task, reloadCalendarView);
                taskListForDrawer.appendChild(card);
            });
        }
    }


    // --- FUNGSI KLIK KOTAK TANGGAL (Diperbarui) ---
    function dateBoxClickHandler() {
        const box = this;
        const year = parseInt(box.getAttribute('data-year'));
        const month = parseInt(box.getAttribute('data-month'));
        const day = parseInt(box.getAttribute('data-day'));
        // Menggunakan data-datestring yang sudah diformat dengan benar (YYYY-MM-DD berbasis 1)
        const dateString = box.getAttribute('data-datestring'); 
        
        // --- 1. SELECTION LOGIC (RUN ALWAYS) ---
        document.querySelectorAll('.date-box.selected').forEach(el => {
            el.classList.remove('selected');
        });
        box.classList.add('selected');
        
        selectedDate = { year, month, day };
        
        // Update activeDate (Global State) untuk sinkronisasi
        window.TaskApp.activeDate = new Date(year, month, day);
        window.TaskApp.activeDate.setHours(0, 0, 0, 0); // Pastikan tengah malam

        const tasksForDate = allTasksData.filter(task => task.date === dateString);
        
        // --- 2. DRAWER OPEN CHECK (Conditional) ---
        if (tasksForDate.length === 0) {
            // ✅ PERBAIKAN: JANGAN BUKA DRAWER JIKA TIDAK ADA TUGAS
            return; 
        }

        // ✅ PERBAIKAN: Buka drawer dalam mode List Tasks
        populateTaskDrawer(dateString); 
        window.TaskApp.openDrawer(); // Opens drawer if there are tasks
    }


    // --- MODIFIKASI: addDateClickListeners (Hanya tanggal yang tidak kosong) ---
    function addDateClickListeners() {
        const dateBoxes = document.querySelectorAll('.date-box:not(.empty)');
        
        dateBoxes.forEach(box => {
            box.removeEventListener('click', dateBoxClickHandler);
            box.addEventListener('click', dateBoxClickHandler);
        });
    }
    
    function isMobile() {
        return window.innerWidth <= 767;
    }
    
    /**
     * Navigate to previous month (mobile)
     */
    function goToPrevMonth() {
        if (currentMonthIndex > 0) {
            currentMonthIndex--;
            updateMobilePosition(true);
            updateMobileTitle();
        } else {
            currentYear--;
            currentMonthIndex = 11; 
            loadTasksAndRenderCalendar(firebase.auth().currentUser); 
            updateMobilePosition(false); 
            updateMobileTitle();
        }
    }
    
    /**
     * Navigate to next month (mobile)
     */
    function goToNextMonth() {
        if (currentMonthIndex < TOTAL_MONTHS - 1) {
            currentMonthIndex++;
            updateMobilePosition(true);
            updateMobileTitle();
        } else {
            currentYear++;
            currentMonthIndex = 0; 
            loadTasksAndRenderCalendar(firebase.auth().currentUser); 
            updateMobilePosition(false); 
            updateMobileTitle();
        }
    }
    
    
    /**
     * Setup mobile swipe functionality
     */
    let touchStartX, isDragging = false; 
    let currentTranslate = 0; // Inisialisasi ulang
    let prevTranslate = 0;     // Inisialisasi ulang

    function setupMobileSwipe() {
        if (!mobileCalendarContainer) return;
        
        // Cek jika sudah ada listener sebelum menambahkan yang baru
        if (mobileCalendarContainer.dataset.listenersAdded === 'true') return;
        mobileCalendarContainer.dataset.listenersAdded = 'true';

        mobileCalendarContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            isDragging = true;
            swipeWrapper.style.transition = 'none';
        });
        
        mobileCalendarContainer.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            const currentX = e.touches[0].clientX;
            const diff = currentX - touchStartX;
            const dragPercent = (diff / mobileCalendarContainer.offsetWidth) * 100;
            
            currentTranslate = prevTranslate + dragPercent;
            
            if (currentMonthIndex === 0 && diff > 0) {
                currentTranslate = prevTranslate + dragPercent * 0.3;
            } else if (currentMonthIndex === TOTAL_MONTHS - 1 && diff < 0) {
                currentTranslate = prevTranslate + dragPercent * 0.3;
            }
            
            swipeWrapper.style.transform = `translateX(${currentTranslate}%)`;
        });
        
        mobileCalendarContainer.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            
            isDragging = false;
            const touchEndX = e.changedTouches[0].clientX;
            
            const diff = touchEndX - touchStartX;
            const threshold = 50;
            
            if (Math.abs(diff) > threshold) {
                if (diff > 0 && currentMonthIndex > 0) {
                    goToPrevMonth();
                } else if (diff < 0 && currentMonthIndex < TOTAL_MONTHS - 1) {
                    goToNextMonth();
                } else {
                    updateMobilePosition(true);
                }
            } else {
                updateMobilePosition(true);
            }
            
            prevTranslate = -currentMonthIndex * 100; // Update prevTranslate setelah animasi
        });
    }

    
    /**
     * Update year display (desktop)
     */
    function updateYearDisplay() {
        if (currentYearSpan) currentYearSpan.textContent = currentYear;
        renderDesktopYear();
    }
    
    /**
     * Initialize calendar
     */
    function init(user) {
        loadTasksAndRenderCalendar(user).then(() => {
            const hash = window.location.hash;
            if (hash.startsWith('#date=')) {
                const urlParams = new URLSearchParams(hash.substring(1));
                const dateString = urlParams.get('date');
                const viewFlag = urlParams.get('view');
                
                if (dateString) {
                    // Update internal state from hash
                    const dateParts = dateString.split('-');
                    selectedDate = { 
                        year: parseInt(dateParts[0]), 
                        month: parseInt(dateParts[1]) - 1, // Bulan sudah berbasis 1 di hash
                        day: parseInt(dateParts[2]) 
                    };
                    
                    if (viewFlag === 'list') {
                        // 1. Set global activeDate
                        window.TaskApp.activeDate = new Date(selectedDate.year, selectedDate.month, selectedDate.day);
                        window.TaskApp.activeDate.setHours(0, 0, 0, 0);

                        // 2. Open the task list drawer for this date
                        populateTaskDrawer(dateString); 
                        window.TaskApp.openDrawer();
                        // ✅ PERBAIKAN: Pastikan form tersembunyi
                        window.TaskApp.reminderForm.style.display = 'none'; 
                        document.getElementById('taskListForDrawer').style.display = 'flex';
                        
                        // 3. Clear the hash after use
                        history.replaceState(null, null, window.location.pathname);
                        
                        // 4. Update calendar view to the correct month/year (Mobile Only)
                        if (isMobile()) {
                            currentYear = selectedDate.year;
                            currentMonthIndex = selectedDate.month;
                            loadTasksAndRenderCalendar(user); // Force reload to the correct year/month
                        }
                    }
                }
            }
        });

        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                const isNowMobile = isMobile();
                
                if (mobileCalendarContainer && mobileCalendarContainer.style.display !== (isNowMobile ? 'flex' : 'none')) { 
                    loadTasksAndRenderCalendar(user);
                } else if (monthListContainer && monthListContainer.style.display !== (isNowMobile ? 'none' : 'flex')) {
                    loadTasksAndRenderCalendar(user);
                }
            }, 250);
        });
        
        if (isMobile()) {
            currentMonthIndex = todayMonth; 
            setupMobileSwipe();
        }
    }
    
    // Desktop year navigation
    if (prevYearBtn) {
        prevYearBtn.addEventListener('click', function() {
            currentYear--;
            loadTasksAndRenderCalendar(firebase.auth().currentUser);
        });
    }
    
    if (nextYearBtn) {
        nextYearBtn.addEventListener('click', function() {
            currentYear++;
            loadTasksAndRenderCalendar(firebase.auth().currentUser);
        });
    }
    
    // Mobile month navigation
    if (prevMonthMobile) {
        prevMonthMobile.addEventListener('click', goToPrevMonth);
    }
    
    if (nextMonthMobile) {
        nextMonthMobile.addEventListener('click', goToNextMonth);
    }
    
    // --- INIT PENGGUNA ---
    firebase.auth().onAuthStateChanged(user => {
        if (!user) {
            window.location.href = "../pages/login.html";
            return;
        }
        
        // Inisialisasi activeDate global di sini untuk digunakan dalam save handler
        if (!window.TaskApp.activeDate) {
            window.TaskApp.activeDate = new Date();
            window.TaskApp.activeDate.setHours(0, 0, 0, 0);
        }
        
        init(user);
    });

    // --- DRAWER & DIALOG LOGIC LANJUTAN ---
    
    // ✅ PERBAIKAN PENTING: Tombol Add Reminder di Footer Calendar
    // Memastikan form terbuka saat Add Reminder ditekan (walau tidak ada tugas)
    if (addReminderBtn && window.TaskApp.startNewReminderFlow) { 
        addReminderBtn.addEventListener('click', () => {
            if (!selectedDate) {
                // Gunakan hari ini jika belum ada yang dipilih
                selectedDate = { year: todayYear, month: todayMonth, day: todayDate };
            }
            
            const dateToUse = new Date(selectedDate.year, selectedDate.month, selectedDate.day);
            
            // Panggil flow global dari task.js untuk memulai alur "New Reminder"
            window.TaskApp.startNewReminderFlow(dateToUse);
            
            // ✅ PERBAIKAN: Sembunyikan daftar tugas dan Tampilkan form
            if (taskListForDrawer) taskListForDrawer.style.display = 'none';
            if (reminderForm) reminderForm.style.display = 'flex';
        });
    }
    
    // ✅ EXPOSE GLOBAL REFRESH FUNCTION FOR task.js
    window.CalendarApp = window.CalendarApp || {};
    window.CalendarApp.reloadCalendarView = reloadCalendarView;
});