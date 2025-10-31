document.addEventListener('DOMContentLoaded', function() {
    const calendarContainer = document.getElementById('calendar-cards-container');
    const monthYearDisplay = document.getElementById('month-year-display');
    const taskListContainer = document.getElementById('task-list-container');
    const reminderForm = document.getElementById('reminder-form');
    const ENGLISH_LOCALE = 'en-US';
    
    // State
    let tasksData = []; 
    let activeDate = new Date();
    activeDate.setHours(0, 0, 0, 0); 

    // --- UTILITY: Format Date ke string YYYY-MM-DD ---
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // --- EXPOSE: Global Task Loader (Digunakan oleh Task.html dan dipanggil oleh Calendar.js) ---
    window.loadTasksAndRenderCalendar = async function (user, startDate = new Date('2025-01-01'), numberOfDays = 365) {
        if (!user) return;
        const db = firebase.firestore();
        const tasksRef = db.collection("users").doc(user.uid).collection("tasks");
        
        try {
            const snapshot = await tasksRef.get();
            tasksData = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));
            
            // Logika untuk halaman task.html
            if (window.location.pathname.includes('task.html')) {
                activeDate = new Date();
                activeDate.setHours(0, 0, 0, 0);
                
                if (calendarContainer) {
                     generateCalendar(startDate, numberOfDays, tasksData);
                     setupCalendarScroll(calendarContainer); 
                }
                
                displayTasksForActiveDate(activeDate);
            }

        } catch (err) {
            console.error("Error loading tasks:", err);
        }
    }

    // --- EXPOSE: Global Form Handler (Digunakan oleh Calendar.js) ---
    window.setupTaskFormHandler = function(user, isCalendarPage = false) {
        if (!user) return;
        const db = firebase.firestore();
        const tasksRef = db.collection("users").doc(user.uid).collection("tasks");

        const formHandler = async function(event) {
            event.preventDefault();

            const activity = document.getElementById('activity-input').value.trim();
            const time = document.getElementById('time-input').value.trim();
            const location = document.getElementById('location-input').value.trim() || 'No Location'; 

            if (activity && time) {
                try {
                    let dateString;
                    
                    if (isCalendarPage) {
                        // Ambil tanggal dari state global di calendar.js
                        const selectedDate = window.getSelectedDateForTask();
                        dateString = formatDate(new Date(selectedDate.year, selectedDate.month, selectedDate.day)); 
                    } else {
                        // Ambil tanggal aktif dari task.js
                        dateString = formatDate(activeDate);
                    }

                    await tasksRef.add({
                        title: activity,
                        time,
                        location,
                        done: false,
                        date: dateString,
                    });

                    reminderForm.reset(); 
                    window.closeDrawer(); 
                    
                    // Panggil fungsi refresh yang relevan (global)
                    if (isCalendarPage) {
                        window.loadTasksAndRenderCalendar(user); 
                    } else {
                        window.loadTasksAndRenderCalendar(user, new Date('2025-01-01'), 365);
                    }

                    window.showCustomDialog(
                        "Success Add New Reminder",
                        [
                            { text: 'Add new task more', action: () => {
                                document.getElementById('newReminderDrawer').classList.add('open');
                                document.body.style.overflow = 'hidden';
                            }, isPrimary: false },
                            { text: 'View', action: () => {
                                window.location.href = 'task.html';
                            }, isPrimary: true }
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
        };

        if (reminderForm) {
            reminderForm.onsubmit = null; 
            reminderForm.addEventListener('submit', formHandler);
        }
    }


    // --- MEMBUAT FUNGSI DRAWER & DIALOG GLOBAL ---
    
    const timeInput = document.getElementById('time-input');
    const timePickerOverlay = document.getElementById('time-picker-overlay');
    const startTimeInput = document.getElementById('start-time-input');
    const endTimeInput = document.getElementById('end-time-input');
    const timePickerCancelBtn = document.getElementById('time-picker-cancel');
    const timePickerSaveBtn = document.getElementById('time-picker-save');
    
    const dialogOverlay = document.getElementById('custom-dialog-overlay');
    const dialogMessage = document.getElementById('custom-dialog-message');
    const dialogActions = document.getElementById('custom-dialog-actions');

    const newReminderDrawer = document.getElementById('newReminderDrawer');
    const closeDrawerBtn = document.querySelector('.close-drawer-btn');
    const newReminderBtn = document.querySelector('.new-reminder-btn'); // Tombol "New Reminder"

    
    const openDrawer = () => {
        if (newReminderDrawer) {
            newReminderDrawer.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }

    // EXPOSE Global closeDrawer function (needed by the form handler)
    window.closeDrawer = () => {
        if (newReminderDrawer) {
            newReminderDrawer.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    // ✅ FIX: Attach listener to open the drawer
    if (newReminderBtn) {
        newReminderBtn.addEventListener('click', openDrawer);
    }

    // Attach listener to close the drawer
    if (closeDrawerBtn) {
        closeDrawerBtn.addEventListener('click', window.closeDrawer);
    }
    
    if (newReminderDrawer) {
        newReminderDrawer.addEventListener('click', (event) => {
            if (event.target === newReminderDrawer) {
                window.closeDrawer();
            }
        });
    }


    // --- CUSTOM DIALOG FUNCTION (GLOBAL) ---
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
    
    // --- INIT ---
    firebase.auth().onAuthStateChanged(user => {
        if (!user) {
            window.location.href = "../pages/login.html";
            return;
        }
        
        // Panggil handler form untuk Halaman Task
        if (window.location.pathname.includes('task.html')) {
            window.setupTaskFormHandler(user, false);
            window.loadTasksAndRenderCalendar(user);
        }
    });

    // --- FUNGSI PENDUKUNG Halaman Task ---
    
    function generateCalendar(startDate, numberOfDays, tasks) {
        if (!calendarContainer) return;
        calendarContainer.innerHTML = ''; 
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); 

        const datesWithTasks = new Set(tasks.map(t => t.date));
        
        const dates = [];
        for (let i = 0; i < numberOfDays; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            dates.push(date);
        }

        dates.forEach((date, index) => {
            const dateString = formatDate(date);
            const isToday = date.toDateString() === today.toDateString();
            const hasTask = datesWithTasks.has(dateString); 

            const card = document.createElement('div');
            card.classList.add('date-card');
            card.id = `date-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
            card.setAttribute('data-date-index', index);
            card.setAttribute('data-date-string', dateString); 
            
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
                ${hasTask ? '<span class="dot-indicator"></span>' : ''} 
            `;
            
            calendarContainer.appendChild(card);
        });
        
        setupDateCardClicks(calendarContainer); 
    }
    
    function displayTasksForActiveDate(date) {
        if (!taskListContainer) return;
        taskListContainer.innerHTML = '';
        
        const dateString = formatDate(date);
        
        const tasksForDate = tasksData.filter(task => task.date === dateString);
        
        if (tasksForDate.length === 0) {
            taskListContainer.innerHTML = '<p style="text-align: center; color: #777; padding-top: 50px;">No reminders scheduled for this date.</p>';
        } else {
            tasksForDate.forEach(task => {
                const card = createTaskCard(task.title, task.time, task.location, task.id, task.done);
                taskListContainer.appendChild(card);
            });
        }
    }

    function createTaskCard(title, time, location, taskId, isDone) {
        const card = document.createElement('div');
        card.classList.add('task-card-item');
        
        if (isDone) {
            card.classList.add('done-task');
        }

        card.innerHTML = `
            <div class="task-checkbox" style="background-color: ${isDone ? '#3f67b5' : 'transparent'};"></div>
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

        const checkbox = card.querySelector('.task-checkbox');
        checkbox.addEventListener('click', async () => {
            const user = firebase.auth().currentUser;
            if (!user) return alert('Please log in first.');

            const db = firebase.firestore();
            try {
                const taskInState = tasksData.find(t => t.id === taskId);
                const currentDoneStatus = taskInState ? taskInState.done : false;
                const newDoneStatus = !currentDoneStatus; 
                
                await db.collection("users").doc(user.uid)
                    .collection("tasks").doc(taskId)
                    .update({
                        done: newDoneStatus,
                        date: newDoneStatus ? formatDate(new Date()) : taskInState.date 
                    });

                alert(`Task marked as ${newDoneStatus ? 'done' : 'undone'}!`);
                
                await window.loadTasksAndRenderCalendar(user); 
                
                displayTasksForActiveDate(activeDate);

            } catch (err) {
                console.error("Error updating task status:", err);
            }
        });

        return card;
    }
    
    function setupDateCardClicks(container) {
        container.querySelectorAll('.date-card').forEach(card => {
            card.addEventListener('click', () => {
                container.querySelectorAll('.date-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                
                const index = parseInt(card.getAttribute('data-date-index'));
                const startDate = new Date('2025-01-01');
                const selectedDate = new Date(startDate);
                selectedDate.setDate(startDate.getDate() + index); 
                selectedDate.setHours(0, 0, 0, 0); 
                
                activeDate = selectedDate;
                displayTasksForActiveDate(selectedDate);
            });
        });
    }

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
        }
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