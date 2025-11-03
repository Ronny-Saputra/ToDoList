document.addEventListener('DOMContentLoaded', function() {
    // === EXPOSE GLOBAL STATE & FUNCTIONS ===
    window.TaskApp = window.TaskApp || {};
    window.TaskApp.tasksData = []; 
    window.TaskApp.editingTaskId = null; 

    const calendarContainer = document.getElementById('calendar-cards-container');
    const monthYearDisplay = document.getElementById('month-year-display');
    const taskListContainer = document.getElementById('task-list-container');
    const ENGLISH_LOCALE = 'en-US';
    
    // EXPOSE DRAWER ELEMENTS GLOBALLY (dapat digunakan oleh calendar.js)
    window.TaskApp.newReminderDrawer = document.getElementById('newReminderDrawer');
    window.TaskApp.closeDrawerBtn = document.querySelector('.close-drawer-btn');
    window.TaskApp.newReminderBtn = document.querySelector('.new-reminder-btn');
    window.TaskApp.drawerHeaderTitle = document.querySelector('.drawer-header h2');
    window.TaskApp.reminderForm = document.getElementById('reminder-form');
    window.TaskApp.dateInputEdit = document.getElementById('date-input-edit');
    window.TaskApp.timeInput = document.getElementById('time-input');
    window.TaskApp.timePickerOverlay = document.getElementById('time-picker-overlay');
    window.TaskApp.startTimeInput = document.getElementById('start-time-input');
    window.TaskApp.endTimeInput = document.getElementById('end-time-input');
    window.TaskApp.timePickerCancelBtn = document.getElementById('time-picker-cancel');
    window.TaskApp.timePickerSaveBtn = document.getElementById('time-picker-save');
    window.TaskApp.dialogOverlay = document.getElementById('custom-dialog-overlay');
    window.TaskApp.dialogMessage = document.getElementById('custom-dialog-message');
    window.TaskApp.dialogActions = document.getElementById('custom-dialog-actions');
    window.TaskApp.saveBtn = document.querySelector('.save-btn');
    
    let activeDate = new Date();
    activeDate.setHours(0, 0, 0, 0); 

    // --- UTILITY: Format Date ke string YYYY-MM-DD (Global) ---
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    window.TaskApp.formatDate = formatDate;
    
    // --- FUNGSI BUKA DRAWER BARU (Global) ---
    window.TaskApp.openDrawer = function() {
        if (window.TaskApp.newReminderDrawer) {
            window.TaskApp.newReminderDrawer.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }
    
    // --- FUNGSI TUTUP DRAWER BARU (Global) ---
    window.TaskApp.closeDrawer = function() {
        if (window.TaskApp.newReminderDrawer) {
            window.TaskApp.newReminderDrawer.classList.remove('open');
            document.body.style.overflow = '';
            
            // Reset state edit
            window.TaskApp.editingTaskId = null;
            if (window.TaskApp.drawerHeaderTitle) window.TaskApp.drawerHeaderTitle.textContent = 'New Reminder';
            if (window.TaskApp.saveBtn) window.TaskApp.saveBtn.textContent = 'Save';
            if (window.TaskApp.reminderForm) window.TaskApp.reminderForm.reset();

            // Sembunyikan task list (khusus untuk tampilan kalender)
            const taskListForDrawer = document.getElementById('taskListForDrawer');
            if (taskListForDrawer) {
                taskListForDrawer.innerHTML = ''; 
                taskListForDrawer.style.display = 'none'; 
            }
        }
    }

    // --- FUNGSI BARU: BUKA DRAWER UNTUK EDIT (Global) ---
    window.TaskApp.openDrawerForEdit = function(task) {
        window.TaskApp.editingTaskId = task.id;
        
        // Isi form dengan data tugas
        document.getElementById('activity-input').value = task.title || '';
        document.getElementById('time-input').value = task.time || ''; 
        document.getElementById('location-input').value = task.location || '';
        window.TaskApp.dateInputEdit.value = task.date; 
        
        // Perbarui judul drawer dan teks tombol
        if (window.TaskApp.drawerHeaderTitle) window.TaskApp.drawerHeaderTitle.textContent = 'Edit Reminder';
        window.TaskApp.saveBtn.textContent = 'Update';
        
        // ====== PERBAIKAN INTI: Pastikan list disembunyikan dan form ditampilkan ======
        const taskListForDrawer = document.getElementById('taskListForDrawer');
        if (taskListForDrawer) taskListForDrawer.style.display = 'none';
        
        if (window.TaskApp.reminderForm) {
            window.TaskApp.reminderForm.style.display = 'flex'; // Form harus terlihat untuk diedit
        }
        // =============================================================================

        // Buka drawer
        window.TaskApp.openDrawer();
    }
    
    // --- FUNGSI BARU: DELETE TASK (Global) ---
    /**
     * @param {string} taskId - ID tugas yang akan dihapus
     * @param {firebase.User} user - Objek pengguna Firebase
     * @param {function} reloadFn - Fungsi untuk me-reload tampilan (spesifik per halaman)
     */
    window.TaskApp.deleteTask = async function(taskId, user, reloadFn) {
        const db = firebase.firestore();
        const tasksRef = db.collection("users").doc(user.uid).collection("tasks");

        window.showCustomDialog(
            "Are you sure you want to delete this reminder?",
            [
                { text: 'Cancel', action: () => {}, isPrimary: false },
                { 
                    text: 'Delete', 
                    action: async () => {
                        try {
                            await tasksRef.doc(taskId).delete();
                            
                            window.showCustomDialog(
                                "Reminder deleted successfully!",
                                [
                                    { text: 'OK', action: async () => {
                                        window.TaskApp.closeDrawer();
                                        // Panggil fungsi reload spesifik dari halaman pemanggil
                                        if (typeof reloadFn === 'function') {
                                            await reloadFn();
                                        } else {
                                            // Fallback reload untuk halaman task.html
                                            await loadTasksAndRenderCalendar(user, new Date('2025-01-01'), 365);
                                            displayTasksForActiveDate(activeDate);
                                        }
                                    }, isPrimary: true }
                                ]
                            );
                        } catch (err) {
                            console.error("Error deleting task:", err);
                            window.showCustomDialog(
                                "Failed to delete task. Please try again.",
                                [{ text: 'OK', action: () => {}, isPrimary: true }]
                            );
                        }
                    }, 
                    isPrimary: true 
                }
            ]
        );
    }

    // --- CREATE TASK CARD (Global & Reusable) ---
    /**
     * @param {object} taskObject - Objek data tugas
     * @param {function} reloadFn - Fungsi untuk me-reload tampilan (spesifik per halaman)
     */
    window.TaskApp.createTaskCard = function(taskObject, reloadFn) {
        const { title, time, location, id: taskId, done: isDone } = taskObject;
        const card = document.createElement('div');
        card.classList.add('task-card-item');
        card.setAttribute('data-task-id', taskId); 
        
        if (isDone) {
            card.classList.add('done-task');
        }

        card.innerHTML = `
            <div class="task-checkbox" style="background-color: ${isDone ? '#3f67b5' : 'transparent'};"></div>
            <div class="task-details">
                <span class="task-title-reminder" style="text-decoration: ${isDone ? 'line-through' : 'none'}; color: ${isDone ? '#777' : '#333'};">${title}</span>
                <div class="task-meta">
                    <span class="dot-indicator"></span>
                    <span class="task-location-small">${location}</span>
                </div>
            </div>
            <div class="task-time-box">
                <span class="task-time-large">${time}</span>
            </div>
            <i class="fas fa-chevron-right task-arrow"></i>

            <div class="task-actions">
                <button class="action-btn flow-timer-btn">
                    <i class="fas fa-stopwatch"></i>
                    Flow Timer
                </button>
                <button class="action-btn edit-btn">
                    <i class="fas fa-edit"></i>
                    Edit
                </button>
                <button class="action-btn delete-btn">
                    <i class="fas fa-trash-alt"></i>
                    Delete
                </button>
            </div>
            `;
        
        // Handle Tombol Edit
        const editBtn = card.querySelector('.edit-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            document.querySelectorAll(".task-card-item").forEach(c => c.classList.remove("active"));
            window.TaskApp.openDrawerForEdit(taskObject);
        });
        
        // Handle Tombol Delete
        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            const user = firebase.auth().currentUser;
            if (!user) return alert('Please log in first.');
            
            window.TaskApp.deleteTask(taskId, user, reloadFn);
        });

        // Handle "mark as done"
        const checkbox = card.querySelector('.task-checkbox');
        checkbox.addEventListener('click', async (e) => {
            e.stopPropagation(); 
            
            const user = firebase.auth().currentUser;
            if (!user) return alert('Please log in first.');

            const db = firebase.firestore();
            try {
                const taskInState = window.TaskApp.tasksData.find(t => t.id === taskId) || taskObject;
                const currentDoneStatus = taskInState.done;
                const newDoneStatus = !currentDoneStatus; 
                
                await db.collection("users").doc(user.uid)
                    .collection("tasks").doc(taskId)
                    .update({
                        done: newDoneStatus,
                        // Jika selesai, pindahkan tanggalnya ke hari ini
                        date: newDoneStatus ? formatDate(new Date()) : taskInState.date 
                    });

                alert(`Task marked as ${newDoneStatus ? 'done' : 'undone'}!`);
                
                if (typeof reloadFn === 'function') {
                    await reloadFn();
                } else {
                    await loadTasksAndRenderCalendar(user, new Date('2025-01-01'), 365);
                    displayTasksForActiveDate(activeDate);
                }

            } catch (err) {
                console.error("Error updating task status:", err);
            }
        });
        
        return card;
    }


    // --- FUNGSI UTAMA: LOAD TASKS & RENDER CALENDAR ---
    async function loadTasksAndRenderCalendar(user, startDate, numberOfDays) {
        if (!user) return;
        const db = firebase.firestore();
        const tasksRef = db.collection("users").doc(user.uid).collection("tasks");

        try {
            const snapshot = await tasksRef.get();
            window.TaskApp.tasksData = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));
            
            activeDate = new Date();
            activeDate.setHours(0, 0, 0, 0);
            
            if (calendarContainer) {
                generateCalendar(startDate, numberOfDays, window.TaskApp.tasksData);
                setupCalendarScroll(calendarContainer); 
                displayTasksForActiveDate(activeDate);
            }

        } catch (err) {
            console.error("Error loading tasks:", err);
        }
    }


    // --- FUNGSI BANTUAN HALAMAN TASK ---
    function findAndActivateDateCard(dateString) {
        const card = calendarContainer.querySelector(`[data-date-string="${dateString}"]`);
        
        if (card) {
            calendarContainer.querySelectorAll('.date-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            const dateParts = dateString.split('-');
            const newActiveDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            newActiveDate.setHours(0, 0, 0, 0);
            activeDate = newActiveDate;

            updateMonthYearDisplay(monthYearDisplay, activeDate);
            
            const scrollPos = card.offsetLeft - (calendarContainer.offsetWidth / 2) + (card.offsetWidth / 2);
            calendarContainer.scrollTo({
                left: scrollPos,
                behavior: 'smooth'
            });

            displayTasksForActiveDate(activeDate);
        } else {
            console.error(`Date card for ${dateString} not found in the displayed range.`);
            const dateParts = dateString.split('-');
            const newActiveDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            newActiveDate.setHours(0, 0, 0, 0);
            activeDate = newActiveDate;
            displayTasksForActiveDate(activeDate);
        }
    }
    window.findAndActivateDateCard = findAndActivateDateCard; // Expose to window scope

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
                // Hapus penambahan kelas 'active' di sini. Biarkan setupCalendarScroll yang menanganinya.
                card.classList.add('today');  
            }
            
            const monthText = date.toLocaleDateString(ENGLISH_LOCALE, { month: 'short' });
            const dayText = date.toLocaleDateString(ENGLISH_LOCALE, { weekday: 'short' });
            const dateNumber = date.getDate();
            
            card.innerHTML = `
                <span class="month-text">${monthText.toUpperCase()}</span>
                <span class="day-text">${dayText.charAt(0).toUpperCase() + dayText.slice(1)}</span>
                <span class="date-number">${dateNumber}</span>
                ${hasTask ? '<span class="dot-indicator"></span>' : ''} `;
            
            calendarContainer.appendChild(card);
        });
        
        setupDateCardClicks(calendarContainer); 
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
                
                updateMonthYearDisplay(monthYearDisplay, selectedDate);
                
                displayTasksForActiveDate(selectedDate);
            });
        });
    }

    function displayTasksForActiveDate(date) {
        if (!taskListContainer) return;
        taskListContainer.innerHTML = '';
        
        const dateString = formatDate(date);
        
        const tasksForDate = window.TaskApp.tasksData.filter(task => task.date === dateString);
        
        if (tasksForDate.length === 0) {
            taskListContainer.innerHTML = '<p style="text-align: center; color: #777; padding-top: 50px;">No reminders scheduled for this date.</p>';
        } else {
            tasksForDate.forEach(task => {
                const reloadFn = () => loadTasksAndRenderCalendar(firebase.auth().currentUser, new Date('2025-01-01'), 365);
                const card = window.TaskApp.createTaskCard(task, reloadFn);
                taskListContainer.appendChild(card);
            });
        }
    }
    
    function setupCalendarScroll(container) {
        const today = new Date();
        const todayId = `#date-${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
        const todayCard = container.querySelector(todayId);
        
        if (todayCard) {
            // 1. Hapus kelas 'active' dari semua kartu
            container.querySelectorAll('.date-card').forEach(c => c.classList.remove('active'));
            
            // 2. Tambahkan kelas 'active' ke kartu hari ini
            todayCard.classList.add('active');

            // 3. Gulir ke kartu hari ini (berpusat)
            const scrollPos = todayCard.offsetLeft - (container.offsetWidth / 2) + (todayCard.offsetWidth / 2);
            container.scrollTo({
                left: scrollPos,
                behavior: 'smooth'
            });

            updateMonthYearDisplay(monthYearDisplay, today);
        }
    }
    
    function updateMonthYearDisplay(displayElement, date) {
        if (displayElement) {
            const monthYear = date.toLocaleDateString(ENGLISH_LOCALE, { year: 'numeric', month: 'long' });
            displayElement.textContent = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
        }
    }
    
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
    
    if (calendarContainer && monthYearDisplay) {
        calendarContainer.addEventListener('scroll', throttle(handleScroll, 100)); 
    }

    // --- Time Picker & Custom Dialog Logic (Global) ---
    window.showCustomDialog = function(message, buttons) {
        const dialogOverlay = window.TaskApp.dialogOverlay;
        const dialogMessage = window.TaskApp.dialogMessage;
        const dialogActions = window.TaskApp.dialogActions;
        
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
            
            dialogActions.appendChild(buttonElement);
        });
        
        dialogOverlay.classList.add('open');
    }
    
    const timeInput = window.TaskApp.timeInput;
    const timePickerOverlay = window.TaskApp.timePickerOverlay;
    const startTimeInput = window.TaskApp.startTimeInput;
    const endTimeInput = window.TaskApp.endTimeInput;
    const timePickerCancelBtn = window.TaskApp.timePickerCancelBtn;
    const timePickerSaveBtn = window.TaskApp.timePickerSaveBtn;

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

    // --- MODIFIKASI: Form Submit Handler (Handle Edit/Update) ---
    const taskPageFormSubmitHandler = async function(event, user) {
        event.preventDefault(); 
        const db = firebase.firestore();
        const tasksRef = db.collection("users").doc(user.uid).collection("tasks");
        
        const activity = document.getElementById('activity-input').value.trim();
        const time = document.getElementById('time-input').value.trim(); 
        const location = document.getElementById('location-input').value.trim() || 'No Location'; 
        const dateToUse = window.TaskApp.dateInputEdit.value;

        if (activity && time && dateToUse) {
            try {
                const taskData = {
                    title: activity,
                    time, 
                    location,
                    date: dateToUse, 
                };

                const isEditing = window.TaskApp.editingTaskId;

                if (isEditing) {
                    await tasksRef.doc(isEditing).update(taskData);
                } else {
                    taskData.done = false;
                    await tasksRef.add(taskData);
                }

                window.TaskApp.reminderForm.reset(); 
                window.TaskApp.closeDrawer();
                
                await loadTasksAndRenderCalendar(user, new Date('2025-01-01'), 365);

                window.showCustomDialog(
                    isEditing ? "Success Update Reminder" : "Success Add New Reminder",
                    [
                        { 
                            text: 'Add more', 
                            action: () => {
                                window.TaskApp.editingTaskId = null;
                                if (window.TaskApp.drawerHeaderTitle) window.TaskApp.drawerHeaderTitle.textContent = 'New Reminder';
                                window.TaskApp.saveBtn.textContent = 'Save';
                                window.TaskApp.dateInputEdit.value = formatDate(activeDate);
                                window.TaskApp.openDrawer();
                            }, 
                            isPrimary: false 
                        },
                        { 
                            text: 'View', 
                            action: () => {
                                if (window.location.pathname.includes("task.html")) {
                                    window.findAndActivateDateCard(dateToUse); 
                                } else {
                                    window.location.reload(); 
                                }
                            }, 
                            isPrimary: true 
                        }
                    ]
                );
            } catch (err) {
                console.error(`Error ${isEditing ? 'updating' : 'adding'} task:`, err);
                window.showCustomDialog(
                    `Failed to ${isEditing ? 'update' : 'save'} task. Please try again.`,
                    [{ text: 'OK', action: () => {}, isPrimary: true }]
                );
            }
        } else {
            window.showCustomDialog(
                "Activity, Time, and Date are required!",
                [{ text: 'OK', action: () => {}, isPrimary: true }]
            );
        }
    };

    // --- Tombol New Reminder (Reset mode ke Add) ---
    const newReminderBtn = window.TaskApp.newReminderBtn;
    if (newReminderBtn) {
        newReminderBtn.addEventListener('click', () => {
            window.TaskApp.editingTaskId = null;
            if (window.TaskApp.drawerHeaderTitle) window.TaskApp.drawerHeaderTitle.textContent = 'New Reminder';
            if (window.TaskApp.saveBtn) window.TaskApp.saveBtn.textContent = 'Save';
            if (window.TaskApp.reminderForm) window.TaskApp.reminderForm.reset();
            
            // Tambahkan logika ini untuk memastikan form terlihat
            const taskListForDrawer = document.getElementById('taskListForDrawer');
            if (taskListForDrawer) taskListForDrawer.style.display = 'none';
            if (window.TaskApp.reminderForm) window.TaskApp.reminderForm.style.display = 'flex';
            
            if (window.TaskApp.dateInputEdit) window.TaskApp.dateInputEdit.value = formatDate(activeDate);
            
            window.TaskApp.openDrawer();
        });
    }

    // Listener untuk tombol panah kembali
    const closeDrawerBtn = window.TaskApp.closeDrawerBtn;
    if (closeDrawerBtn) {
        closeDrawerBtn.addEventListener('click', window.TaskApp.closeDrawer);
    }
    
    // Listener untuk menutup drawer saat klik backdrop
    const newReminderDrawer = window.TaskApp.newReminderDrawer;
    if (newReminderDrawer) {
        newReminderDrawer.addEventListener('click', (event) => {
            if (event.target === newReminderDrawer) {
                window.TaskApp.closeDrawer();
            }
        });
    }

    // --- INIT: Panggil loadTasksAndRenderCalendar saat user login ---
    firebase.auth().onAuthStateChanged(user => {
        if (!user) {
            window.location.href = "../pages/login.html";
            return;
        }

        loadTasksAndRenderCalendar(user, new Date('2025-01-01'), 365);

        if (window.TaskApp.reminderForm && taskListContainer) {
            window.TaskApp.reminderForm.onsubmit = null; 
            window.TaskApp.reminderForm.addEventListener('submit', (event) => taskPageFormSubmitHandler(event, user));
        }
    });
});