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
    
    // Default selectedDate ke hari ini
    let selectedDate = { year: todayYear, month: todayMonth, day: todayDate }; 
    let allTasksData = []; // Menyimpan semua tugas dari Firebase
    let datesWithTasks = new Set(); // Menyimpan tanggal (YYYY-MM-DD) yang memiliki tugas

    // --- EXPOSE: Fungsi untuk mendapatkan tanggal yang dipilih (dipanggil oleh task.js) ---
    window.getSelectedDateForTask = () => selectedDate;

    // --- UTILITY: Format Date ke string YYYY-MM-DD ---
    function formatDate(year, month, day) {
        const m = String(month + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${year}-${m}-${d}`;
    }

    // --- EXPOSE: FUNGSI LOAD DATA UTAMA (Dipanggil oleh Task.js setelah Form Submit) ---
    window.loadTasksAndRenderCalendar = async function(user) {
        if (!user) return;
        const db = firebase.firestore();
        const tasksRef = db.collection("users").doc(user.uid).collection("tasks");

        try {
            const snapshot = await tasksRef.get();
            allTasksData = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));
            
            datesWithTasks = new Set(allTasksData.map(t => t.date));
            
            // Re-render calendar based on view mode (Desktop/Mobile)
            if (isMobile()) {
                renderMobileCalendar();
            } else {
                updateYearDisplay();
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

        for (let i = firstDayOfWeek; i > 0; i--) {
            dates.push({ day: daysInPrevMonth - i + 1, outside: true });
        }

        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            dates.push({ day: i, outside: false });
        }

        const totalSlotsNeeded = Math.ceil(dates.length / 7) * 7;
        let nextDay = 1;
        while (dates.length < totalSlotsNeeded) {
            dates.push({ day: nextDay, outside: true });
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
            const dateString = formatDate(year, monthIndex, data.day); 
            
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
            const calendarDiv = document.createElement('div');
            calendarDiv.classList.add('month-calendar');
            calendarDiv.setAttribute('data-year', currentYear);
            calendarDiv.setAttribute('data-month', month);
            calendarDiv.innerHTML = createMonthCalendarHTML(currentYear, month, false);
            
            swipeWrapper.appendChild(calendarDiv); 
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
        currentTranslate = offset;
        prevTranslate = offset;
    }
    
    /**
     * Update mobile month title
     */
    function updateMobileTitle() {
        if (!monthYearTitle) return;
        
        const date = new Date(currentYear, currentMonthIndex, 1);
        monthYearTitle.textContent = date.toLocaleDateString(ENGLISH_LOCALE, { month: 'long', year: 'numeric' });
    }
    
    // Tambahkan fungsi untuk membuka drawer
    const openDrawer = () => {
        const newReminderDrawer = document.getElementById('newReminderDrawer');
        if (newReminderDrawer) {
            newReminderDrawer.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }
    
    function dateBoxClickHandler() {
        const box = this;
        const year = parseInt(box.getAttribute('data-year'));
        const month = parseInt(box.getAttribute('data-month'));
        const day = parseInt(box.getAttribute('data-day'));
        const dateString = formatDate(year, month, day); 
        
        // 1. Atur status 'selected'
        document.querySelectorAll('.date-box.selected').forEach(el => {
            el.classList.remove('selected');
        });
        box.classList.add('selected');
        
        // 2. Simpan tanggal yang dipilih ke state global
        selectedDate = { year, month, day };
        
        // 3. LOGIKA BARU: Jika tanggal memiliki tugas, buka drawer
        if (datesWithTasks.has(dateString)) {
            openDrawer();
        }
    }


    // --- MODIFIKASI: addDateClickListeners (Simpan selectedDate & Buka Drawer jika ada Tugas) ---
    function addDateClickListeners() {
        const dateBoxes = document.querySelectorAll('.date-box:not(.outside-month)');
        
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
            window.loadTasksAndRenderCalendar(firebase.auth().currentUser); 
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
            window.loadTasksAndRenderCalendar(firebase.auth().currentUser); 
            updateMobilePosition(false); 
            updateMobileTitle();
        }
    }
    
    
    /**
     * Setup mobile swipe functionality
     */
    let touchStartX = 0;
    let touchEndX = 0;
    let isDragging = false;
    let currentTranslate = 0;
    let prevTranslate = 0;
    
    function setupMobileSwipe() {
        if (!mobileCalendarContainer) return;
        
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
            touchEndX = e.changedTouches[0].clientX;
            
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
        // Panggil fungsi load tasks di sini
        window.loadTasksAndRenderCalendar(user);

        // Tambahkan fungsi resize handling (asli)
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                const isNowMobile = isMobile();
                
                // Re-render only if switching view modes
                if (mobileCalendarContainer && mobileCalendarContainer.style.display !== (isNowMobile ? 'flex' : 'none')) { 
                    window.loadTasksAndRenderCalendar(user);
                } else if (monthListContainer && monthListContainer.style.display !== (isNowMobile ? 'none' : 'flex')) {
                    window.loadTasksAndRenderCalendar(user);
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
            window.loadTasksAndRenderCalendar(firebase.auth().currentUser);
        });
    }
    
    if (nextYearBtn) {
        nextYearBtn.addEventListener('click', function() {
            currentYear++;
            window.loadTasksAndRenderCalendar(firebase.auth().currentUser);
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
        // ✅ Panggil setupTaskFormHandler dari task.js untuk menangani submit form
        if (window.setupTaskFormHandler) {
            window.setupTaskFormHandler(user, true); // true = isCalendarPage
        }
        init(user);
    });

    // --- DRAWER & DIALOG LOGIC UI ---
    const addReminderBtn = document.getElementById('add-reminder-btn');
    const timeInput = document.getElementById('time-input');
    const timePickerOverlay = document.getElementById('time-picker-overlay');
    const timePickerCancelBtn = document.getElementById('time-picker-cancel');
    const timePickerSaveBtn = document.getElementById('time-picker-save');
    const startTimeInput = document.getElementById('start-time-input');
    const endTimeInput = document.getElementById('end-time-input');
    const closeDrawerBtn = document.querySelector('.close-drawer-btn');
    const newReminderDrawer = document.getElementById('newReminderDrawer');

    if (addReminderBtn) {
        addReminderBtn.addEventListener('click', () => {
            if (!selectedDate) {
                selectedDate = { year: todayYear, month: todayMonth, day: todayDate };
                document.querySelector(`.date-box[data-year="${todayYear}"][data-month="${todayMonth}"][data-day="${todayDate}"]`)?.classList.add('selected');
            }
            openDrawer();
        });
    }

    const closeDrawerUI = () => {
        if (newReminderDrawer) {
            newReminderDrawer.classList.remove('open');
            document.body.style.overflow = '';
        }
    }
    
    window.closeDrawer = closeDrawerUI; 

    if (closeDrawerBtn) {
        closeDrawerBtn.addEventListener('click', closeDrawerUI);
    }

    if (newReminderDrawer) {
        newReminderDrawer.addEventListener('click', (event) => {
            if (event.target === newReminderDrawer) {
                closeDrawerUI();
            }
        });
    }

    // Time Picker Logic 
    if (timeInput) {
        timeInput.addEventListener('click', () => {
            timePickerOverlay.classList.add('open');
            const currentValue = timeInput.value.split(' - ');
            const [start, end] = currentValue.length === 2 ? [currentValue[0].trim(), currentValue[1].trim()] : ['10:00', '11:00'];
            startTimeInput.value = start;
            endTimeInput.value = end;
        });
        
        timePickerCancelBtn.addEventListener('click', () => {
            timePickerOverlay.classList.remove('open');
        });

        timePickerSaveBtn.addEventListener('click', () => {
            const start = startTimeInput.value;
            const end = endTimeInput.value;

            if (start && end) {
                const startDate = new Date(`2000/01/01 ${start}`);
                const endDate = new Date(`2000/01/01 ${end}`);
                
                if (startDate.getTime() >= endDate.getTime()) {
                    window.showCustomDialog(
                        "Start time must be before end time.",
                        [{ text: 'OK', action: () => {}, isPrimary: true }]
                    );
                    return;
                }
                
                timeInput.value = `${start} - ${end}`;
                timePickerOverlay.classList.remove('open'); 
            }
        });
        
        timePickerOverlay.addEventListener('click', (event) => {
            if (event.target === timePickerOverlay) {
                timePickerOverlay.classList.remove('open');
            }
        });
    }
});