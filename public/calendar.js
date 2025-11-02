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

    // --- UTILITY: Format Date ke string YYYY-MM-DD ---
    function formatDate(year, month, day) {
        // month adalah 0-indexed, jadi harus ditambah 1
        const m = String(month + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${year}-${m}-${d}`;
    }
    
    // --- UTILITY: Format Date object ke string YYYY-MM-DD (Tambahan) ---
    function formatDateObject(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // --- FUNGSI BARU: SCROLL DESKTOP KE BULAN AKTIF ---
    /**
     * Scroll the desktop month list vertically to the current month.
     */
    function setupDesktopScroll() {
        if (!monthListContainer) return;
        
        // Cari elemen bulan saat ini menggunakan atribut data-month
        const currentMonthDiv = monthListContainer.querySelector(`.month-calendar[data-year="${currentYear}"][data-month="${todayMonth}"]`);

        if (currentMonthDiv) {
            // Gunakan scrollIntoView untuk membawa elemen ke tampilan,
            // memposisikan bagian atas elemen di bagian atas kontainer.
            currentMonthDiv.scrollIntoView({
                behavior: 'smooth',
                block: 'start' 
            });
        }
    }


    // --- FUNGSI LOAD DATA DARI FIREBASE ---
    async function loadTasksAndRenderCalendar(user) {
        if (!user) return;
        const db = firebase.firestore();
        const tasksRef = db.collection("users").doc(user.uid).collection("tasks");

        try {
            const snapshot = await tasksRef.get();
            allTasksData = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));
            
            // Populate Set of dates with tasks
            datesWithTasks = new Set(allTasksData.map(t => t.date));
            
            // Re-render calendar based on view mode (Desktop/Mobile)
            if (isMobile()) {
                renderMobileCalendar();
            } else {
                updateYearDisplay();
                // ✅ Panggil fungsi scroll desktop setelah rendering
                setupDesktopScroll(); 
            }
            
            // Perbarui visual tanggal yang sedang aktif setelah reload
            if (selectedDate) {
                 // Cari dan tambahkan kelas 'selected' ke tanggal yang aktif
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
     * FIX: Add empty: true property to outside month dates.
     */
    function getCalendarDates(year, monthIndex) {
        const dates = [];
        
        const firstDayOfMonth = new Date(year, monthIndex, 1);
        const firstDayOfWeek = firstDayOfMonth.getDay();
        const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

        // Add dates from previous month
        for (let i = firstDayOfWeek; i > 0; i--) {
            // MARK as empty: true
            dates.push({ day: daysInPrevMonth - i + 1, outside: true, empty: true });
        }

        // Add dates from current month
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            // MARK as empty: false
            dates.push({ day: i, outside: false, empty: false });
        }

        // Add dates from next month
        const totalSlotsNeeded = Math.ceil(dates.length / 7) * 7;
        let nextDay = 1;
        while (dates.length < totalSlotsNeeded) {
            // MARK as empty: true
            dates.push({ day: nextDay, outside: true, empty: true });
            nextDay++;
        }
        
        return dates;
    }

    /**
     * Create month calendar HTML
     * FIX: Render empty div if data.empty is true.
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
            // FIX: Tambahkan kelas 'selected' jika hari ini belum dipilih (agar tetap disorot)
            const todayClass = isTodayDate ? ' today selected' : ''; 
            
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
            
            // FIX: Tambahkan wrapper untuk kotak biru muda
            const calendarCardMobile = document.createElement('div');
            calendarCardMobile.classList.add('calendar-card-mobile'); 

            const calendarDiv = document.createElement('div');
            calendarDiv.classList.add('month-calendar');
            calendarDiv.setAttribute('data-year', currentYear);
            calendarDiv.setAttribute('data-month', month);
            calendarDiv.innerHTML = createMonthCalendarHTML(currentYear, month, false);
            
            // Susun: calendarDiv -> calendarCardMobile -> monthDiv
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
    
    
    // --- DRAWER & DIALOG LOGIC ---
    const addReminderBtn = document.getElementById('add-reminder-btn');
    const newReminderDrawer = document.getElementById('newReminderDrawer');
    const closeDrawerBtn = document.querySelector('.close-drawer-btn');
    const reminderForm = document.getElementById('reminder-form');
    
    // TEMBAKAN PERBAIKAN: Dapatkan elemen drawer header title
    const drawerHeaderTitle = newReminderDrawer ? newReminderDrawer.querySelector('.drawer-header h2') : null; 
    
    // TEMBAKAN PERBAIKAN: Buat container baru untuk daftar tugas
    const taskListForDrawer = document.createElement('div'); 
    taskListForDrawer.id = 'taskListForDrawer';
    taskListForDrawer.classList.add('scrollable-content'); 
    taskListForDrawer.style.padding = '0 24px';
    taskListForDrawer.style.flexGrow = '1';
    taskListForDrawer.style.display = 'none'; 
    
    // Sisipkan container daftar tugas baru di bawah header dan sebelum form
    const drawerContent = document.querySelector('.drawer-content');
    if (drawerContent && reminderForm) {
        const existingTaskList = drawerContent.querySelector('#taskListForDrawer');
        if (existingTaskList) existingTaskList.remove();
        drawerContent.insertBefore(taskListForDrawer, reminderForm); 
    }
    
    // FUNGSI UNTUK MEMBUKA DRAWER
    const openDrawer = () => {
        if (newReminderDrawer) {
            newReminderDrawer.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }
    
    // FUNGSI UNTUK MENUTUP DRAWER (MODIFIKASI: Reset tampilan)
    const closeDrawer = () => {
        if (newReminderDrawer) {
            newReminderDrawer.classList.remove('open');
            document.body.style.overflow = '';
            
            // Reset ke tampilan "New Reminder"
            if (drawerHeaderTitle) drawerHeaderTitle.textContent = 'New Reminder';
            if (reminderForm) reminderForm.style.display = 'flex'; 
            if (taskListForDrawer) {
                taskListForDrawer.innerHTML = ''; 
                taskListForDrawer.style.display = 'none'; 
            }
        }
    }

    // FUNGSI BARU: Membuat elemen Task Card untuk ditampilkan di Drawer
    function createTaskCardForDrawer(task) {
        const card = document.createElement('div');
        card.classList.add('task-card-item'); 
        card.style.backgroundColor = task.done ? '#d6eaff' : '#eaf3ff'; 
        card.style.height = 'auto'; 
        card.style.marginBottom = '10px';
        card.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.05)'; 
        card.style.padding = '15px'; 

        card.innerHTML = `
            <div class="task-checkbox" 
                 style="background-color: ${task.done ? '#3f67b5' : 'transparent'}; 
                 border-color: ${task.done ? '#3f67b5' : '#a8b0c6'};">
            </div>
            <div class="task-details">
                <span class="task-title-reminder" style="color: ${task.done ? '#777' : '#333'}; text-decoration: ${task.done ? 'line-through' : 'none'};">
                    ${task.title}
                </span>
                <div class="task-meta">
                    <span class="dot-indicator"></span>
                    <span class="task-location-small">${task.location || 'No Location'}</span>
                </div>
            </div>
            <div class="task-time-box">
                <span class="task-time-large">${task.time}</span>
            </div>
            <i class="fas fa-chevron-right task-arrow"></i>
        `;
        
         const checkbox = card.querySelector('.task-checkbox');
         checkbox.addEventListener('click', async () => {
            const user = firebase.auth().currentUser;
            if (!user) return alert('Please log in first.');

            const db = firebase.firestore();
            try {
                const taskInState = allTasksData.find(t => t.id === task.id);
                const currentDoneStatus = taskInState ? taskInState.done : false;
                const newDoneStatus = !currentDoneStatus; 
                
                await db.collection("users").doc(user.uid)
                    .collection("tasks").doc(task.id)
                    .update({
                        done: newDoneStatus,
                        date: newDoneStatus ? formatDateObject(new Date()) : taskInState.date 
                    });

                await loadTasksAndRenderCalendar(user); 
                populateTaskDrawer(task.date); 
                
            } catch (err) {
                console.error("Error updating task status:", err);
            }
        });

        return card;
    }
    
    // FUNGSI BARU: Mengisi Drawer dengan Daftar Tugas
    function populateTaskDrawer(dateString) {
        if (!drawerHeaderTitle || !reminderForm || !taskListForDrawer) return;

        const tasksForDate = allTasksData.filter(task => task.date === dateString);
        
        const dateParts = dateString.split('-');
        const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]); 
        
        const dayName = date.toLocaleDateString(ENGLISH_LOCALE, { weekday: 'long' });
        const formattedDate = date.toLocaleDateString(ENGLISH_LOCALE, { day: '2-digit', month: 'long', year: 'numeric' });
        
        drawerHeaderTitle.textContent = `Tasks on ${dayName}, ${formattedDate}`;
        
        reminderForm.style.display = 'none';
        
        taskListForDrawer.style.display = 'flex'; 
        taskListForDrawer.style.flexDirection = 'column'; 
        taskListForDrawer.innerHTML = ''; 
        
        if (tasksForDate.length === 0) {
            taskListForDrawer.innerHTML = `
                <div style="text-align: center; color: #777; padding: 40px 0; width: 100%;">
                    <img src="../assets/timy3.png" alt="Timy Sad" style="width: 100px; margin-bottom: 20px;">
                    <p style="font-size: 16px; color: #666;">No reminders scheduled for this date.</p>
                </div>`;
        } else {
            tasksForDate.forEach(task => {
                taskListForDrawer.appendChild(createTaskCardForDrawer(task));
            });
        }
    }


    // FUNGSI KLIK KOTAK TANGGAL (MODIFIKASI)
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
        
        // 3. Panggil fungsi baru untuk menampilkan daftar tugas & buka drawer
        populateTaskDrawer(dateString); 
        openDrawer();
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
    let touchStartX, isDragging = false, currentTranslate = 0, prevTranslate = 0; 
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
        loadTasksAndRenderCalendar(user);

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
        init(user);
    });

    // --- DRAWER & DIALOG LOGIC LANJUTAN ---
    
    const timeInput = document.getElementById('time-input');
    const timePickerOverlay = document.getElementById('time-picker-overlay');
    const startTimeInput = document.getElementById('start-time-input');
    const endTimeInput = document.getElementById('end-time-input');
    const timePickerCancelBtn = document.getElementById('time-picker-cancel');
    const timePickerSaveBtn = document.getElementById('time-picker-save');
    
    const dialogOverlay = document.getElementById('custom-dialog-overlay');
    const dialogMessage = document.getElementById('custom-dialog-message');
    const dialogActions = document.getElementById('custom-dialog-actions');


    if (addReminderBtn) {
        addReminderBtn.addEventListener('click', () => {
            if (!selectedDate) {
                selectedDate = { year: todayYear, month: todayMonth, day: todayDate };
                document.querySelector(`.date-box[data-year="${todayYear}"][data-month="${todayMonth}"][data-day="${todayDate}"]`)?.classList.add('selected');
            }
            
            if (drawerHeaderTitle) drawerHeaderTitle.textContent = 'New Reminder';
            if (taskListForDrawer) taskListForDrawer.style.display = 'none';
            if (reminderForm) reminderForm.style.display = 'flex';
            
            openDrawer();
        });
    }

    if (closeDrawerBtn) {
        closeDrawerBtn.addEventListener('click', closeDrawer);
    }

    if (newReminderDrawer) {
        newReminderDrawer.addEventListener('click', (event) => {
            if (event.target === newReminderDrawer) {
                closeDrawer();
            }
        });
    }

    window.showCustomDialog = function(message, buttons) {
        if (!dialogOverlay || !dialogMessage || !dialogActions) {
            console.error("Custom dialog elements not found in the DOM.");
            alert(message);
            return;
        }

        dialogMessage.textContent = message;
        dialogActions.innerHTML = '';
        
        buttons.forEach((btn, index) => {
            const buttonElement = document.createElement('button');
            buttonElement.textContent = btn.text;
            buttonElement.classList.add('dialog-btn');
            
            if (btn.isPrimary) {
                buttonElement.classList.add('primary');
            }
            
            buttonElement.addEventListener('click', () => {
                dialogOverlay.classList.remove('open');
                if (btn.action) {
                    btn.action();
                }
            });
            
            if (index === 0 && buttons.length > 1) {
                buttonElement.style.borderRight = '1px solid #ddd';
            }
            
            dialogActions.appendChild(buttonElement);
        });
        
        dialogOverlay.classList.add('open');
    }

    if (timeInput) {
        timeInput.addEventListener('click', () => {
            timePickerOverlay.classList.add('open');
            const currentValue = timeInput.value.split(' - ');
            if (currentValue.length === 2) {
                startTimeInput.value = currentValue[0].trim();
                endTimeInput.value = currentValue[1].trim();
            }
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

    firebase.auth().onAuthStateChanged(user => {
        if (!user) return;

        const db = firebase.firestore();
        const tasksRef = db.collection("users").doc(user.uid).collection("tasks");

        if (reminderForm) {
            reminderForm.addEventListener('submit', async function(event) {
                event.preventDefault();

                const activity = document.getElementById('activity-input').value.trim();
                const time = document.getElementById('time-input').value.trim();
                const location = document.getElementById('location-input').value.trim() || 'No Location';

                if (activity && time) {
                    try {
                        const dateString = formatDate(selectedDate.year, selectedDate.month, selectedDate.day);
                        
                        await tasksRef.add({
                            title: activity,
                            time,
                            location,
                            done: false,
                            date: dateString,
                        });

                        reminderForm.reset();
                        closeDrawer();
                        
                        await loadTasksAndRenderCalendar(user);

                        window.showCustomDialog(
                            "Success Add New Reminder",
                            [
                                { 
                                    text: 'Add new task more', 
                                    action: () => {
                                        if (drawerHeaderTitle) drawerHeaderTitle.textContent = 'New Reminder';
                                        if (taskListForDrawer) taskListForDrawer.style.display = 'none';
                                        if (reminderForm) reminderForm.style.display = 'flex';
                                        
                                        newReminderDrawer.classList.add('open');
                                        document.body.style.overflow = 'hidden';
                                    },
                                    isPrimary: false
                                },
                                { 
                                    text: 'View', 
                                    action: () => {
                                        window.location.href = 'task.html'; 
                                    },
                                    isPrimary: true
                                }
                            ]
                        );
                    } catch (err) {
                        console.error("Error adding task:", err);
                        window.showCustomDialog(
                            "Failed to save task. Please try again.",
                            [{ text: 'OK', action: () => {}, isPrimary: true }]
                        );
                    }
                } else {
                    window.showCustomDialog(
                        "Activity and Time are required!",
                        [{ text: 'OK', action: () => {}, isPrimary: true }]
                    );
                }
            });
        }
    });
});