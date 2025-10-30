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
    
    // Check if main calendar elements exist on this page
    const isCalendarPage = mobileCalendarContainer || monthListContainer;
    
    if (!isCalendarPage) {
        return;
    }

    let currentYear = new Date().getFullYear(); 
    let currentMonthIndex = new Date().getMonth(); 
    const TOTAL_MONTHS = 12;
    const ENGLISH_LOCALE = 'en-US';
    const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    // Get today's date
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    
    // Store selected date
    let selectedDate = null;
    
    // Mobile swipe variables
    let touchStartX = 0;
    let touchEndX = 0;
    let isDragging = false;
    let currentTranslate = 0;
    let prevTranslate = 0;
    
    /**
     * Check if device is mobile
     */
    function isMobile() {
        return window.innerWidth <= 767;
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
            dates.push({ day: daysInPrevMonth - i + 1, outside: true });
        }

        // Add dates from current month
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            dates.push({ day: i, outside: false });
        }

        // Add dates from next month
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
            
            html += `<div class="date-box${outsideClass}${todayClass}${selectedClass}" 
                          data-year="${year}" 
                          data-month="${monthIndex}" 
                          data-day="${data.day}" 
                          data-outside="${data.outside}">${data.day}</div>`;
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
            
            const calendarDiv = document.createElement('div');
            calendarDiv.classList.add('month-calendar');
            calendarDiv.setAttribute('data-year', currentYear);
            calendarDiv.setAttribute('data-month', month);
            calendarDiv.innerHTML = createMonthCalendarHTML(currentYear, month, false);
            
            monthDiv.appendChild(calendarDiv);
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
            renderMobileCalendar();
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
            renderMobileCalendar();
            updateMobilePosition(false); 
            updateMobileTitle();
        }
    }
    
    /**
     * Add click event listeners to date boxes
     */
    function addDateClickListeners() {
        const dateBoxes = document.querySelectorAll('.date-box:not(.outside-month)');
        
        dateBoxes.forEach(box => {
            box.addEventListener('click', function() {
                const year = parseInt(this.getAttribute('data-year'));
                const month = parseInt(this.getAttribute('data-month'));
                const day = parseInt(this.getAttribute('data-day'));
                
                document.querySelectorAll('.date-box.selected').forEach(el => {
                    el.classList.remove('selected');
                });
                
                this.classList.add('selected');
                
                selectedDate = { year, month, day };
            });
        });
    }
    
    /**
     * Setup mobile swipe functionality
     */
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
    function init() {
        if (isMobile()) {
            currentMonthIndex = todayMonth; 
            renderMobileCalendar();
            setupMobileSwipe();
        } else {
            updateYearDisplay();
        }
    }
    
    /**
     * Handle window resize
     */
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            const isNowMobile = isMobile();
            
            // Re-render only if switching view modes
            if (mobileCalendarContainer && mobileCalendarContainer.style.display !== (isNowMobile ? 'flex' : 'none')) { 
                init();
            } else if (monthListContainer && monthListContainer.style.display !== (isNowMobile ? 'none' : 'flex')) {
                init();
            }
        }, 250);
    });
    
    // Desktop year navigation
    if (prevYearBtn) {
        prevYearBtn.addEventListener('click', function() {
            currentYear--;
            updateYearDisplay();
        });
    }
    
    if (nextYearBtn) {
        nextYearBtn.addEventListener('click', function() {
            currentYear++;
            updateYearDisplay();
        });
    }
    
    // Mobile month navigation
    if (prevMonthMobile) {
        prevMonthMobile.addEventListener('click', goToPrevMonth);
    }
    
    if (nextMonthMobile) {
        nextMonthMobile.addEventListener('click', goToNextMonth);
    }

    // Initial render
    init();
});







//drawer
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const addReminderBtn = document.getElementById('add-reminder-btn');
    const newReminderDrawer = document.getElementById('newReminderDrawer');
    const closeDrawerBtn = document.querySelector('.close-drawer-btn');
    const reminderForm = document.getElementById('reminder-form');
    
    // Time Picker elements
    const timeInput = document.getElementById('time-input');
    const timePickerOverlay = document.getElementById('time-picker-overlay');
    const startTimeInput = document.getElementById('start-time-input');
    const endTimeInput = document.getElementById('end-time-input');
    const timePickerCancelBtn = document.getElementById('time-picker-cancel');
    const timePickerSaveBtn = document.getElementById('time-picker-save');
    
    // Dialog elements
    const dialogOverlay = document.getElementById('custom-dialog-overlay');
    const dialogMessage = document.getElementById('custom-dialog-message');
    const dialogActions = document.getElementById('custom-dialog-actions');

    // Check if we're on calendar page
    if (!addReminderBtn) return;

    // Close Drawer Function
    const closeDrawer = () => {
        newReminderDrawer.classList.remove('open');
        document.body.style.overflow = '';
    }

    // Open Drawer when clicking Add Reminder
    addReminderBtn.addEventListener('click', () => {
        newReminderDrawer.classList.add('open');
        document.body.style.overflow = 'hidden';
    });

    // Close Drawer Button
    if (closeDrawerBtn) {
        closeDrawerBtn.addEventListener('click', closeDrawer);
    }

    // Close Drawer by clicking overlay
    if (newReminderDrawer) {
        newReminderDrawer.addEventListener('click', (event) => {
            if (event.target === newReminderDrawer) {
                closeDrawer();
            }
        });
    }

    // Custom Dialog Function (Global)
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

    // Time Picker Logic
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

    // Form Submit Handler with Firebase
    firebase.auth().onAuthStateChanged(user => {
        if (!user) {
            console.log("No user logged in");
            return;
        }

        console.log("User logged in:", user.email);
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
                        // Get selected date from calendar (if any)
                        const selectedDateBox = document.querySelector('.date-box.selected');
                        let dateString = new Date().toISOString().split("T")[0];
                        
                        if (selectedDateBox) {
                            const year = selectedDateBox.getAttribute('data-year');
                            const month = String(parseInt(selectedDateBox.getAttribute('data-month')) + 1).padStart(2, '0');
                            const day = String(selectedDateBox.getAttribute('data-day')).padStart(2, '0');
                            dateString = `${year}-${month}-${day}`;
                        }

                        await tasksRef.add({
                            title: activity,
                            time,
                            location,
                            done: false,
                            date: dateString,
                        });

                        reminderForm.reset();
                        closeDrawer();
                        
                        window.showCustomDialog(
                            "Success Add New Reminder",
                            [
                                { 
                                    text: 'Add more', 
                                    action: () => {
                                        newReminderDrawer.classList.add('open');
                                        document.body.style.overflow = 'hidden';
                                    },
                                    isPrimary: false
                                },
                                { 
                                    text: 'View Tasks', 
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