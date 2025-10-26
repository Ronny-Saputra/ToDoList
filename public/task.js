document.addEventListener('DOMContentLoaded', function() {
    const calendarContainer = document.getElementById('calendar-cards-container');
    const monthYearDisplay = document.getElementById('month-year-display');
    const ENGLISH_LOCALE = 'en-US';

    const taskListContainer = document.getElementById('task-list-container');
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

    if (calendarContainer && monthYearDisplay) {
        generateCalendar(new Date('2025-01-01'), 365); 
        setupCalendarScroll(calendarContainer);
        updateMonthYearDisplay(monthYearDisplay, new Date());
        calendarContainer.addEventListener('scroll', throttle(handleScroll, 100)); 
        setupDateCardClicks(calendarContainer);
    }
    
    // KOSONGKAN LIST TASK SECARA DEFAULT
    if (taskListContainer) {
        taskListContainer.innerHTML = ''; 
    }
    
    // --- CUSTOM DIALOG FUNCTION (GLOBAL) ---
    /**
     * Shows a custom popup dialog, replacing standard alert/confirm.
     * Dibuat global (window.showCustomDialog) agar dapat digunakan di main.js
     * @param {string} message - The message to display.
     * @param {Array<Object>} buttons - Array of button objects: [{text: 'Button Text', action: () => { ... }, isPrimary: true/false}].
     */
    window.showCustomDialog = function(message, buttons) {
        if (!dialogOverlay || !dialogMessage || !dialogActions) {
            console.error("Custom dialog elements not found in the DOM.");
            // Fallback to alert if elements are missing
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
            
            // Tambahkan pemisah untuk multi-button dialog (seperti Add more | View)
            if (index === 0 && buttons.length > 1) {
                 buttonElement.style.borderRight = '1px solid #ddd';
            }
            
            dialogActions.appendChild(buttonElement);
        });
        
        dialogOverlay.classList.add('open');
    }

    // --- TIME PICKER LOGIC ---
    if (timeInput) {
        timeInput.addEventListener('click', () => {
            timePickerOverlay.classList.add('open');
            // Set initial values from input, or default if empty
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
                // Check if start time is before end time (basic check)
                const startDate = new Date(`2000/01/01 ${start}`);
                const endDate = new Date(`2000/01/01 ${end}`);
                
                if (startDate.getTime() >= endDate.getTime()) {
                    // Show error dialog. Dialog ini akan muncul di atas Time Picker.
                    // Aksi OK kosong, sehingga hanya menutup dialog error dan kembali ke Time Picker.
                    showCustomDialog(
                        "Start time must be before end time.",
                        [{ text: 'OK', action: () => { 
                            // Time Picker remains open
                        }, isPrimary: true }]
                    );
                    return;
                }
                
                // Jika sukses
                timeInput.value = `${start} - ${end}`;
                timePickerOverlay.classList.remove('open'); 
            }
        });
        
        // Tutup Time Picker saat overlay diklik, tapi hindari saat error dialog muncul
        timePickerOverlay.addEventListener('click', (event) => {
            // Periksa apakah target klik adalah overlay itu sendiri
            if (event.target === timePickerOverlay) {
                timePickerOverlay.classList.remove('open');
            }
        });
    }

    // --- DRAWER LOGIC ---
    const newReminderBtn = document.querySelector('.new-reminder-btn');
    const newReminderDrawer = document.getElementById('newReminderDrawer');
    const closeDrawerBtn = document.querySelector('.close-drawer-btn');

    const closeDrawer = () => {
        newReminderDrawer.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (newReminderBtn) {
        newReminderBtn.addEventListener('click', () => {
            newReminderDrawer.classList.add('open');
            document.body.style.overflow = 'hidden';
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


    /**
     * Membuat elemen task card baru
     */
    function createTaskCard(title, time, location, taskId) {
    const card = document.createElement('div');
    card.classList.add('task-card-item');
    card.innerHTML = `
        <div class="task-checkbox"></div>
        <div class="task-details">
            <span class="task-title-reminder">${title}</span>
            <div class="task-meta">
                <span class="dot-indicator"></span>
                <span class="task-location-small">${location}</span>
            </div>
        </div>
        <div class="task-time-box">
            <span class="task-time-large">${time}</span>
        </div>
        <i class="fas fa-chevron-right task-arrow"></i>
    `;

    // ✅ Handle "mark as done"
    const checkbox = card.querySelector('.task-checkbox');
    checkbox.addEventListener('click', async () => {
        const user = firebase.auth().currentUser;
        if (!user) return alert('Please log in first.');

        const db = firebase.firestore();
        try {
        await db.collection("users").doc(user.uid)
            .collection("tasks").doc(taskId)
            .update({
            done: true,
            date: new Date().toISOString().split("T")[0]
            });

        checkbox.style.backgroundColor = "#3f67b5"; // visual feedback
        alert("Task marked as done!");
        } catch (err) {
        console.error("Error marking task:", err);
        }
    });

    return card;
    }



    // Handler untuk Submit Form Reminder
    if (reminderForm && taskListContainer) {
        reminderForm.addEventListener('submit', function(event) {
            event.preventDefault(); 

            const activity = document.getElementById('activity-input').value.trim();
            const time = document.getElementById('time-input').value.trim();
            const location = document.getElementById('location-input').value.trim() || 'No Location'; 

            if (activity && time) {
                const newCard = createTaskCard(activity, time, location);
                taskListContainer.appendChild(newCard);

                reminderForm.reset(); 
                closeDrawer();
                
                // Show Success Dialog
                window.showCustomDialog(
                    "Success Add New Reminder",
                    [
                        { 
                            text: 'Add more', 
                            action: () => {
                                // Re-open drawer
                                newReminderDrawer.classList.add('open');
                                document.body.style.overflow = 'hidden';
                            },
                            isPrimary: false
                        },
                        { 
                            text: 'View', 
                            action: () => {
                                // Logic to scroll/highlight the new task (optional)
                            },
                            isPrimary: true
                        }
                    ]
                );

            } else {
                // Show Error Dialog
                window.showCustomDialog(
                    "Activity and Time are required!",
                    [{ text: 'OK', action: () => {}, isPrimary: true }]
                );
            }
        });
    }


    /**
     * Generates date cards...
     */
    function generateCalendar(startDate, numberOfDays) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        
        const dates = [];
        for (let i = 0; i < numberOfDays; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            dates.push(date);
        }

        dates.forEach((date, index) => {
            const isToday = date.toDateString() === today.toDateString();
            const isMarkedDate = (index % 5 === 0) && !isToday; 

            const card = document.createElement('div');
            card.classList.add('date-card');
            card.id = `date-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
            card.setAttribute('data-date-index', index);
            
            if (isToday) {
                card.classList.add('active'); 
                card.classList.add('today');  
            }
            
            const monthText = date.toLocaleDateString(ENGLISH_LOCALE, { month: 'short' });
            const dayText = date.toLocaleDateString(ENGLISH_LOCALE, { weekday: 'short' });
            const dateNumber = date.getDate();
            
            card.innerHTML = `
                <span class="month-text">${monthText.toUpperCase()}</span>
                <span class="day-text">${dayText.charAt(0).toUpperCase() + dayText.slice(1)}</span>
                <span class="date-number">${dateNumber}</span>
                ${(isMarkedDate || isToday) ? '<span class="dot-indicator"></span>' : ''}
            `;
            
            calendarContainer.appendChild(card);
        });
    }
    
    /**
     * Sets initial scroll position...
     */
    function setupCalendarScroll(container) {
        const today = new Date();
        const todayId = `#date-${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
        const todayCard = container.querySelector(todayId);
        
        if (todayCard) {
            const scrollPos = todayCard.offsetLeft - (container.offsetWidth / 2) + (todayCard.offsetWidth / 2);
            container.scrollTo({
                left: scrollPos,
                behavior: 'smooth'
            });

            updateMonthYearDisplay(monthYearDisplay, today);
        }
    }
    
    /**
     * Updates month/year display...
     */
    function updateMonthYearDisplay(displayElement, date) {
        if (displayElement) {
            const monthYear = date.toLocaleDateString(ENGLISH_LOCALE, { year: 'numeric', month: 'long' });
            displayElement.textContent = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
        }
    }

    /**
     * Scroll handler for header update...
     */
    function handleScroll() {
        const cards = calendarContainer.querySelectorAll('.date-card');
        let closestCard = null;
        let minDistance = Infinity;
        const containerCenter = calendarContainer.offsetWidth / 2;

        cards.forEach(card => {
            const cardCenter = card.offsetLeft + card.offsetWidth / 2 - calendarContainer.scrollLeft;
            const distance = Math.abs(cardCenter - containerCenter);

            if (distance < minDistance) {
                minDistance = distance;
                closestCard = card;
            }
        });

        if (closestCard) {
            const index = parseInt(closestCard.getAttribute('data-date-index'));
            
            const startDate = new Date('2025-01-01');
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + index); 
            
            updateMonthYearDisplay(monthYearDisplay, date);
        }
    }
    
    /**
     * Sets up date card click listeners...
     */
    function setupDateCardClicks(container) {
        container.querySelectorAll('.date-card').forEach(card => {
            card.addEventListener('click', () => {
                container.querySelectorAll('.date-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                
                const index = parseInt(card.getAttribute('data-date-index'));
                const startDate = new Date('2025-01-01');
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + index); 
                updateMonthYearDisplay(monthYearDisplay, date);
            });
        });
    }

    /**
     * Utility function for throttling...
     */
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
});