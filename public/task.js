// File: public/task.js (Kode Lengkap dengan Logic Flow Timer Text Update dan New Task Design)

document.addEventListener('DOMContentLoaded', function() {
    // === EXPOSE GLOBAL STATE & FUNCTIONS ===
    window.TaskApp = window.TaskApp || {};
    window.TaskApp.tasksData = []; 
    window.TaskApp.editingTaskId = null; 
    
    // NEW: Variable untuk menyimpan durasi Flow Timer dalam milidetik (Kotlin parity)
    window.TaskApp.flowDurationMillis = 30 * 60 * 1000; // 30 menit default
    
    // Hapus baris ini: const STORAGE_KEY_PRIORITY = 'LAST_PRIORITY_SELECTION'; 

    const calendarContainer = document.getElementById('calendar-cards-container');
    const monthYearDisplay = document.getElementById('month-year-display');
    const taskListContainer = document.getElementById('task-list-container');
    const ENGLISH_LOCALE = 'en-US';
    
    // EXPOSE DRAWER ELEMENTS GLOBALLY (dapat digunakan oleh calendar.js dan search.js)
    window.TaskApp.newReminderDrawer = document.getElementById('newReminderDrawer');
    window.TaskApp.closeDrawerBtn = document.querySelector('.close-drawer-btn');
    window.TaskApp.newReminderBtn = document.querySelector('.new-reminder-btn');
    window.TaskApp.drawerHeaderTitle = document.querySelector('.drawer-header h2');
    window.TaskApp.reminderForm = document.getElementById('reminder-form');
    
    // INISIALISASI SEMUA INPUT DRAWER KE GLOBAL
    // ✅ Memastikan semua input diakses dengan aman
    window.TaskApp.activityInput = document.getElementById('activity-input'); 
    window.TaskApp.dateInputEdit = document.getElementById('date-input-edit');
    window.TaskApp.timeInput = document.getElementById('time-input');
    window.TaskApp.locationInput = document.getElementById('location-input');
    
    window.TaskApp.timePickerOverlay = document.getElementById('time-picker-overlay');
    window.TaskApp.startTimeInput = document.getElementById('start-time-input');
    window.TaskApp.endTimeInput = document.getElementById('end-time-input');
    window.TaskApp.timePickerCancelBtn = document.getElementById('time-picker-cancel');
    window.TaskApp.timePickerSaveBtn = document.getElementById('time-picker-save');
    window.TaskApp.dialogOverlay = document.getElementById('custom-dialog-overlay');
    window.TaskApp.dialogMessage = document.getElementById('custom-dialog-message');
    window.TaskApp.dialogActions = document.getElementById('custom-dialog-actions');
    window.TaskApp.saveBtn = document.querySelector('.save-btn');
    
    // NEW: FLOW TIMER PICKER ELEMENTS
    window.TaskApp.flowTimerLink = document.querySelector('.flow-timer-link');
    window.TaskApp.flowTimerPickerOverlay = document.getElementById('flow-timer-picker-overlay');
    window.TaskApp.flowTimerHoursInput = document.getElementById('flow-timer-hours-input');
    window.TaskApp.flowTimerMinutesInput = document.getElementById('flow-timer-minutes-input');
    window.TaskApp.flowTimerSecondsInput = document.getElementById('flow-timer-seconds-input');
    window.TaskApp.flowTimerCancelBtn = document.getElementById('flow-timer-cancel');
    window.TaskApp.flowTimerSaveBtn = document.getElementById('flow-timer-save');
    
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
    
    // --- UTILITY: Format Durasi Milis ke String (Kotlin parity) ---
    window.TaskApp.formatDurationToString = function(millis) {
        const MILLIS_IN_HOUR = 3600000;
        const MILLIS_IN_MINUTE = 60000;
        const MILLIS_IN_SECOND = 1000;

        const durationHours = Math.floor(millis / MILLIS_IN_HOUR);
        const remainingAfterHours = millis % MILLIS_IN_HOUR;
        const durationMinutes = Math.floor(remainingAfterHours / MILLIS_IN_MINUTE);
        const durationSeconds = Math.floor((remainingAfterHours % MILLIS_IN_MINUTE) / MILLIS_IN_SECOND);

        let parts = [];
        if (durationHours > 0) parts.push(`${durationHours}h`);
        if (durationMinutes > 0) parts.push(`${durationMinutes}m`);
        if (durationSeconds > 0) parts.push(`${durationSeconds}s`);

        return parts.join(' ') || '0s';
    }

    // --- FUNGSI BUKA DRAWER BARU (Global) ---
    window.TaskApp.openDrawer = function() {
        if (window.TaskApp.newReminderDrawer) {
            window.TaskApp.newReminderDrawer.classList.add('open');
            document.body.style.overflow = 'hidden';
            
            // Perbarui teks Flow Timer saat membuka drawer
            updateFlowTimerLinkText();
            
            // ✅ PERBAIKAN LOGIC 1: SELALU SET PRIORITAS KE 'None' UNTUK MODE ADD/NEW
            if (window.TaskApp.editingTaskId === null) {
                const selectorSpan = window.TaskApp.prioritySelector?.querySelector('span');
                if (selectorSpan) {
                    selectorSpan.textContent = 'None'; 
                    // Update tampilan dropdown secara visual agar 'None' terpilih
                    updatePriorityDropdownSelection('None');
                }
            }
        }
    }
    
    // --- FUNGSI TUTUP DRAWER BARU (Global) ---
    window.TaskApp.closeDrawer = function() {
        if (window.TaskApp.newReminderDrawer) {
            window.TaskApp.newReminderDrawer.classList.remove('open');
            document.body.style.overflow = '';
            
            // Reset state edit
            window.TaskApp.editingTaskId = null;
            
            // [PERBAIKAN IKON HEADER]
            // Hapus ikon
            if (window.TaskApp.drawerHeaderTitle) window.TaskApp.drawerHeaderTitle.innerHTML = 'New Reminder';
            
            if (window.TaskApp.saveBtn) window.TaskApp.saveBtn.textContent = 'Save';
            if (window.TaskApp.reminderForm) window.TaskApp.reminderForm.reset();

            // Sembunyikan task list (khusus untuk tampilan kalender)
            const taskListForDrawer = document.getElementById('taskListForDrawer');
            if (taskListForDrawer) {
                taskListForDrawer.innerHTML = ''; 
                taskListForDrawer.style.display = 'none'; 
            }
            
            // Tutup priority dropdown
            if (window.TaskApp.priorityWrapper) {
                 window.TaskApp.priorityWrapper.classList.remove('open');
            }
            
            // Hapus data-end-millis yang disimpan
            if (window.TaskApp.timeInput) window.TaskApp.timeInput.removeAttribute('data-end-millis');
        }
    }

    // --- FUNGSI BARU: BUKA DRAWER UNTUK EDIT (Global) ---
    window.TaskApp.openDrawerForEdit = function(task) {
        window.TaskApp.editingTaskId = task.id;
        
        // Gunakan referensi global yang aman
        if (window.TaskApp.activityInput) window.TaskApp.activityInput.value = task.title || '';
        if (window.TaskApp.timeInput) {
            window.TaskApp.timeInput.value = task.time || ''; 
            
            // Set data-end-millis untuk time range jika ada
            if (task.endTimeMillis && task.endTimeMillis > 0) {
                 window.TaskApp.timeInput.setAttribute('data-end-millis', task.endTimeMillis.toString());
            } else {
                 window.TaskApp.timeInput.removeAttribute('data-end-millis');
            }
        }
        
        if (window.TaskApp.locationInput) window.TaskApp.locationInput.value = task.location || '';
        if (window.TaskApp.dateInputEdit) window.TaskApp.dateInputEdit.value = task.date; 
        
        // Set Flow Timer state
        if (task.flowDurationMillis && task.flowDurationMillis > 0) {
             window.TaskApp.flowDurationMillis = task.flowDurationMillis;
        } else {
             window.TaskApp.flowDurationMillis = 30 * 60 * 1000;
        }
        
        // ✅ PERBAIKAN LOGIC 2: LOAD PRIORITAS DARI TASK YANG DIEDIT
        const taskPriority = task.priority || 'None';
        const selectorSpan = window.TaskApp.prioritySelector?.querySelector('span');
        if (selectorSpan) {
            selectorSpan.textContent = taskPriority;
            // Panggil fungsi update seleksi
            updatePriorityDropdownSelection(taskPriority);
        }
        
        // [PERBAIKAN IKON HEADER]
        // Hapus ikon
        if (window.TaskApp.drawerHeaderTitle) window.TaskApp.drawerHeaderTitle.innerHTML = 'Edit Reminder';
        
        if (window.TaskApp.saveBtn) window.TaskApp.saveBtn.textContent = 'Update';
        
        // Pastikan list disembunyikan dan form ditampilkan
        const taskListForDrawer = document.getElementById('taskListForDrawer');
        if (taskListForDrawer) taskListForDrawer.style.display = 'none';
        
        if (window.TaskApp.reminderForm) {
            window.TaskApp.reminderForm.style.display = 'flex';
        }
        
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
                            // UPDATE status ke "deleted" (seperti di Kotlin TaskRepository.kt)
                            await tasksRef.doc(taskId).update({
                                status: "deleted",
                                deletedAt: firebase.firestore.Timestamp.now()
                            });
                            
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
        const { title, time, location, id: taskId, done: isDone, priority, endTimeMillis, flowDurationMillis } = taskObject;
        
        // --- LOGIKA PRIORITY ICON ---
        let priorityIconHtml = '';
        if (priority && priority !== 'None') {
            const priorityClass = priority.toLowerCase(); // low, medium, high
            // *[PERBAIKAN IKON]* Menggunakan fa-solid untuk memastikan ikon termuat
            priorityIconHtml = `<i class="fa-solid fa-circle-exclamation priority-icon priority-${priorityClass}"></i>`;
        }

        // --- LOGIKA DETAIL TUGAS ---
        // Jika flowDurationMillis > 0, Flow Timer dianggap aktif
        const isFlowTimerOnly = flowDurationMillis > 0 && time.includes('(Flow)');
        const hasTimeRange = endTimeMillis && endTimeMillis > 0;
        const hasLocation = location && location.trim() !== '';
        
        const card = document.createElement('div');
        card.classList.add('task-card-item');
        card.setAttribute('data-task-id', taskId); 
        
        if (isDone) {
            card.classList.add('done-task');
        }

        // --- Perubahan Struktur HTML Task Card ---
        card.innerHTML = `
            <div class="task-checkbox" style="background-color: ${isDone ? '#3f67b5' : 'transparent'};"></div>
            
            <div class="task-details">
                <span class="task-title-reminder" style="text-decoration: ${isDone ? 'line-through' : 'none'}; color: ${isDone ? '#777' : '#333'};">
                    ${title}
                    ${priorityIconHtml}
                </span>
                
                <div class="task-meta">
                    </div>
            </div>
            
            <div class="task-meta-right">
                ${(hasTimeRange || (time && !isFlowTimerOnly)) ? `<span class="task-time-large">${time}</span>` : ''}
                ${hasLocation ? `<span class="task-location-small">${location}</span>` : ''}
            </div>
            
            <i class="fas fa-chevron-right task-arrow"></i>

            <div class="task-actions">
                <button class="action-btn flow-timer-btn" ${flowDurationMillis <= 0 ? 'disabled' : ''}>
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
            
        // Handle Tombol Flow Timer (NEW)
        const flowTimerBtn = card.querySelector('.flow-timer-btn');
        flowTimerBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            
            // Gunakan flowDurationMillis dari task object atau default 30 menit
            const durationInSeconds = Math.floor((flowDurationMillis || (30 * 60 * 1000)) / 1000); 
            
            // Arahkan ke halaman flowtimer dengan parameter
            const encodedActivity = encodeURIComponent(taskObject.title);
            window.location.href = `flowtimer.html?activity=${encodedActivity}&duration=${durationInSeconds}`;
        });
        
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
                        completedAt: newDoneStatus ? firebase.firestore.Timestamp.now() : null, // Set completedAt
                        // Jika selesai, pindahkan tanggalnya ke hari ini (Sesuai logic Kotlin)
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
            // Hanya ambil task dengan status "pending"
            const snapshot = await tasksRef.where("status", "==", "pending").get();
            window.TaskApp.tasksData = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));
        } catch (err) {
            console.error("Error loading tasks:", err);
            // Pastikan tasksData disetel ke array kosong jika gagal
            window.TaskApp.tasksData = []; 
        }
        
        activeDate = new Date();
        activeDate.setHours(0, 0, 0, 0);
        
        // Memindahkan rendering ke luar try/catch agar kalender selalu muncul
        if (calendarContainer) {
            generateCalendar(startDate, numberOfDays, window.TaskApp.tasksData);
            setupCalendarScroll(calendarContainer); 
            displayTasksForActiveDate(activeDate);
        }
    }


    // --- FUNGSI BANTUAN HALAMAN TASK ---
    function findAndActivateDateCard(dateString) {
        // Hapus hash dari URL setelah digunakan
        if (window.location.hash.startsWith('#date=')) {
            history.replaceState(null, null, ' ');
        }
        
        const card = calendarContainer.querySelector(`[data-date-string="${dateString}"]`);
        
        if (card) {
            calendarContainer.querySelectorAll('.date-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            const dateParts = dateString.split('-');
            // Perhatikan: Bulan di Date() dimulai dari 0 (Januari = 0)
            const newActiveDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            newActiveDate.setHours(0, 0, 0, 0);
            activeDate = newActiveDate;

            updateMonthYearDisplay(monthYearDisplay, activeDate);
            
            // Gulir ke kartu yang ditemukan
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
            // [PERBAIKAN] Mengganti <p style="..."> dengan div class="empty-task-message"
            taskListContainer.innerHTML = '<div class="empty-task-message"><p>No reminders scheduled for this date.</p></div>';
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
            const scrollPos = todayCard.offsetLeft - (container.offsetWidth / 2) + (container.offsetWidth / 2);
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
            if (!timePickerOverlay || !startTimeInput || !endTimeInput) return;

            timePickerOverlay.classList.add('open');
            const currentValue = timeInput.value.split(' - ');
            if (currentValue.length === 2) {
                startTimeInput.value = currentValue[0].trim();
                endTimeInput.value = currentValue[1].trim();
            }
        });
        
        if (timePickerCancelBtn) timePickerCancelBtn.addEventListener('click', () => {
            if (timePickerOverlay) timePickerOverlay.classList.remove('open');
        });

        if (timePickerSaveBtn) timePickerSaveBtn.addEventListener('click', () => {
            if (!startTimeInput || !endTimeInput || !timeInput || !timePickerOverlay) return;

            const start = startTimeInput.value;
            const end = endTimeInput.value;

            if (!start || !end) return;

            // Dapatkan activeDate sebagai base date untuk perhitungan
            let baseDate = new Date(activeDate.getTime());
            
            // 1. Hitung Milis dari Waktu Mulai pada Base Date
            const [startHour, startMinute] = start.split(':').map(Number);
            baseDate.setHours(startHour, startMinute, 0, 0);
            const startMillis = baseDate.getTime();
            
            // 2. Hitung Milis dari Waktu Akhir pada Base Date
            const [endHour, endMinute] = end.split(':').map(Number);
            baseDate.setHours(endHour, endMinute, 0, 0);
            let endMillis = baseDate.getTime();

            // 3. Atasi Roll-over Tanggal (Seperti di Kotlin)
            if (endMillis <= startMillis) {
                // Waktu Akhir <= Waktu Mulai, maju 1 hari
                endMillis += 24 * 60 * 60 * 1000;
                
                // Update activeDate (Global State) untuk mencerminkan tanggal roll-over
                let newDate = new Date(activeDate.getTime());
                newDate.setDate(newDate.getDate() + 1);
                activeDate = newDate;
                
                // Perbarui tampilan Date Input di Drawer (agar user melihat perubahan tanggal)
                if (window.TaskApp.dateInputEdit) {
                    window.TaskApp.dateInputEdit.value = formatDate(activeDate);
                }
            }
            
            // 4. Set input value (string) dan simpan endMillis di atribut data
            timeInput.value = `${start} - ${end}`;
            timeInput.setAttribute('data-end-millis', endMillis.toString());
            
            timePickerOverlay.classList.remove('open'); 
        });
        
        if (timePickerOverlay) timePickerOverlay.addEventListener('click', (event) => {
            if (event.target === timePickerOverlay) {
                timePickerOverlay.classList.remove('open');
            }
        });
    }

    // ====================================================
    // NEW: FLOW TIMER DURATION LOGIC
    // ====================================================
    
    function updateFlowTimerLinkText() {
        if(window.TaskApp.flowTimerLink) {
            const durationText = window.TaskApp.formatDurationToString(window.TaskApp.flowDurationMillis);
            window.TaskApp.flowTimerLink.textContent = `+ Add Flow Timer (${durationText})`;
        }
    }

    const flowTimerLink = window.TaskApp.flowTimerLink;
    const flowTimerPickerOverlay = window.TaskApp.flowTimerPickerOverlay;
    const flowTimerHoursInput = window.TaskApp.flowTimerHoursInput;
    const flowTimerMinutesInput = window.TaskApp.flowTimerMinutesInput;
    const flowTimerSecondsInput = window.TaskApp.flowTimerSecondsInput;
    const flowTimerCancelBtn = window.TaskApp.flowTimerCancelBtn;
    const flowTimerSaveBtn = window.TaskApp.flowTimerSaveBtn;

    // Panggil saat DOMContentLoaded untuk inisialisasi teks
    updateFlowTimerLinkText();

    if (flowTimerLink) {
        flowTimerLink.addEventListener('click', (e) => {
            e.preventDefault(); 
            if (flowTimerPickerOverlay) {
                // Tampilkan overlay flow timer
                flowTimerPickerOverlay.classList.add('open');
            }
            // Hapus baris ini: Logic to clear timeInput is removed, preserving existing value.
        });
    }

    if (flowTimerPickerOverlay) {
        // Logika penutupan
        if (flowTimerCancelBtn) flowTimerCancelBtn.addEventListener('click', () => {
            flowTimerPickerOverlay.classList.remove('open');
        });

        flowTimerPickerOverlay.addEventListener('click', (event) => {
            if (event.target === flowTimerPickerOverlay) {
                flowTimerPickerOverlay.classList.remove('open');
            }
        });

        // Logika simpan durasi
        if (flowTimerSaveBtn) flowTimerSaveBtn.addEventListener('click', () => {
            if (!flowTimerHoursInput || !flowTimerMinutesInput || !flowTimerSecondsInput) return;

            const hours = parseInt(flowTimerHoursInput.value) || 0;
            const minutes = parseInt(flowTimerMinutesInput.value) || 0;
            const seconds = parseInt(flowTimerSecondsInput.value) || 0;

            const totalMillis = (hours * 3600000) + (minutes * 60000) + (seconds * 1000);

            if (totalMillis <= 0) {
                 window.showCustomDialog(
                    "Duration cannot be zero.",
                    [{ text: 'OK', action: () => {}, isPrimary: true }]
                );
                return;
            }

            // 1. UPDATE GLOBAL MILLIS STATE (Kotlin parity)
            window.TaskApp.flowDurationMillis = totalMillis;

            // 2. UPDATE TEXT LINK
            updateFlowTimerLinkText(); // Memanggil fungsi update teks

            // 3. Clear data-end-millis (Flow Timer override Time Range)
            if (window.TaskApp.timeInput) window.TaskApp.timeInput.removeAttribute('data-end-millis');
            
            // Tutup overlay
            flowTimerPickerOverlay.classList.remove('open');
        });
    }
    
    // ====================================================
    // NEW: PRIORITY SELECTOR LOGIC (FINAL)
    // ====================================================
    window.TaskApp.prioritySelector = document.querySelector('.priority-selector');
    window.TaskApp.priorityWrapper = document.createElement('div');
    window.TaskApp.priorityWrapper.classList.add('priority-dropdown-wrapper');
    window.TaskApp.priorityWrapper.id = 'priorityDropdownWrapper';

    const priorityFormSection = window.TaskApp.prioritySelector?.closest('.form-section');

    if (priorityFormSection) {
        // Sisipkan wrapper sebagai anak terakhir dari form-section
        priorityFormSection.appendChild(window.TaskApp.priorityWrapper);
    }
    
    const priorityLevels = ['None', 'Low', 'Medium', 'High'];

    /**
     * Memperbarui tampilan opsi dropdown agar yang terpilih memiliki tanda centang.
     * @param {string} selectedLevel - Level prioritas yang aktif (misalnya 'Medium').
     */
    function updatePriorityDropdownSelection(selectedLevel) {
        const priorityDropdown = window.TaskApp.priorityWrapper.querySelector('.priority-dropdown');
        if (!priorityDropdown) return;

        priorityDropdown.querySelectorAll('.priority-option').forEach(option => {
            const isSelected = option.getAttribute('data-value') === selectedLevel;
            const checkIcon = option.querySelector('.fa-check');
            if (checkIcon) {
                checkIcon.style.visibility = isSelected ? 'visible' : 'hidden';
            }
        });
    }

    function createPriorityDropdown() {
        if (!window.TaskApp.priorityWrapper || !window.TaskApp.prioritySelector) return;
        
        const currentLevel = window.TaskApp.prioritySelector.querySelector('span').textContent;
        
        let dropdownHtml = '<div class="priority-dropdown">';

        priorityLevels.forEach(level => {
            const isSelected = currentLevel === level;
            // [PERBAIKAN IKON] Menggunakan fa-solid
            const checkIconHtml = isSelected 
                ? '<i class="fa-solid fa-check"></i>' 
                : '<i class="fa-solid fa-check" style="visibility: hidden;"></i>';
            
            dropdownHtml += `<div class="priority-option" data-value="${level}">${checkIconHtml} ${level}</div>`;
        });
        
        dropdownHtml += '</div>';
        
        window.TaskApp.priorityWrapper.innerHTML = dropdownHtml; 
    }

    if (window.TaskApp.prioritySelector) {
        window.TaskApp.prioritySelector.addEventListener('click', function(e) {
            e.stopPropagation();
            
            createPriorityDropdown(); // Buat ulang dropdown dengan status saat ini
            
            window.TaskApp.priorityWrapper.classList.toggle('open');
            
            window.TaskApp.timePickerOverlay?.classList.remove('open');
            window.TaskApp.flowTimerPickerOverlay?.classList.remove('open');
        });
    }

    window.TaskApp.priorityWrapper.addEventListener('click', function(e) {
        const option = e.target.closest('.priority-option');
        if (option) {
            const selectedLevel = option.getAttribute('data-value');
            const selectorSpan = window.TaskApp.prioritySelector.querySelector('span');
            
            if (selectorSpan) {
                selectorSpan.textContent = selectedLevel;
                // **PENTING: Hapus persistence ke localStorage sesuai permintaan**
                // localStorage.setItem(STORAGE_KEY_PRIORITY, selectedLevel); 
            }
            
            // Update tampilan visual segera setelah klik
            updatePriorityDropdownSelection(selectedLevel);
            
            window.TaskApp.priorityWrapper.classList.remove('open');
        }
    });

    document.addEventListener('click', function(e) {
        if (window.TaskApp.priorityWrapper && window.TaskApp.priorityWrapper.classList.contains('open') && 
            !window.TaskApp.prioritySelector.contains(e.target) && 
            !window.TaskApp.priorityWrapper.contains(e.target)) {
            window.TaskApp.priorityWrapper.classList.remove('open');
        }
    });
    
    // --- MODIFIKASI: Form Submit Handler (Handle Edit/Update) ---
    const taskPageFormSubmitHandler = async function(event, user) {
        event.preventDefault(); 
        const db = firebase.firestore();
        const tasksRef = db.collection("users").doc(user.uid).collection("tasks");
        
        // Mengambil nilai input dengan aman
        const activity = window.TaskApp.activityInput ? window.TaskApp.activityInput.value.trim() : '';
        const timeInput = window.TaskApp.timeInput;
        const location = window.TaskApp.locationInput ? window.TaskApp.locationInput.value.trim() : ''; 
        let dateToUse = window.TaskApp.dateInputEdit ? window.TaskApp.dateInputEdit.value : '';
        const priority = window.TaskApp.prioritySelector ? window.TaskApp.prioritySelector.querySelector('span').textContent : 'None';

        if (activity && dateToUse) {
            
            // --- START KOTLIN SYNC LOGIC ---
            const inputTimeText = timeInput ? timeInput.value.trim() : '';
            const endMillisAttr = timeInput ? timeInput.getAttribute('data-end-millis') : null;

            const isTimeRangeSet = endMillisAttr && parseInt(endMillisAttr) > 0;
            const isFlowTimerSet = window.TaskApp.flowDurationMillis > 0;
            
            let finalTime = inputTimeText; 
            let finalEndTimeMillis = 0;
            let finalFlowDurationMillis = 0;
            
            if (isTimeRangeSet) {
                finalEndTimeMillis = parseInt(endMillisAttr);
                finalFlowDurationMillis = window.TaskApp.flowDurationMillis; 
                finalTime = inputTimeText; 
                
                // BARIS PENGGANTI YANG DIHAPUS: dateToUse = window.TaskApp.formatDate(activeDate);

            } else if (isFlowTimerSet) {
                finalEndTimeMillis = 0;
                finalFlowDurationMillis = window.TaskApp.flowDurationMillis;
                
                if (inputTimeText.length === 0) {
                    const durationText = window.TaskApp.formatDurationToString(finalFlowDurationMillis);
                    finalTime = `${durationText} (Flow)`;
                } else {
                    finalTime = inputTimeText; 
                }

            } else {
                finalEndTimeMillis = 0;
                finalFlowDurationMillis = 0;
                finalTime = inputTimeText; 
            }
            
            const taskData = {
                title: activity,
                time: finalTime,
                location: location, 
                date: dateToUse, // Tanggal yang akan digunakan untuk navigasi
                priority: priority,
                endTimeMillis: finalEndTimeMillis,      
                flowDurationMillis: finalFlowDurationMillis, 
                dueDate: firebase.firestore.Timestamp.fromDate(new Date(dateToUse + (finalEndTimeMillis > 0 ? '' : ' 23:59:59'))), 
                status: "pending"
            };
            // --- END KOTLIN SYNC LOGIC ---

            try {
                const isEditing = window.TaskApp.editingTaskId;

                if (isEditing) {
                    await tasksRef.doc(isEditing).update(taskData);
                } else {
                    taskData.done = false;
                    await tasksRef.add(taskData);
                }

                if (window.TaskApp.reminderForm) window.TaskApp.reminderForm.reset(); 
                
                if (timeInput) timeInput.removeAttribute('data-end-millis');

                // Tentukan tombol dialog setelah Add/Edit sukses
                const dialogButtons = [
                    { 
                        text: 'Add more', 
                        action: () => {
                            window.TaskApp.editingTaskId = null;
                            // [PERBAIKAN IKON HEADER] - Hapus ikon
                            if (window.TaskApp.drawerHeaderTitle) window.TaskApp.drawerHeaderTitle.innerHTML = 'New Reminder';
                            if (window.TaskApp.saveBtn) window.TaskApp.saveBtn.textContent = 'Save';
                            
                            const taskListForDrawer = document.getElementById('taskListForDrawer');
                            if (taskListForDrawer) taskListForDrawer.style.display = 'none';
                            if (window.TaskApp.reminderForm) window.TaskApp.reminderForm.style.display = 'flex';

                            if (window.TaskApp.dateInputEdit) window.TaskApp.dateInputEdit.value = formatDate(activeDate);
                            
                            // ✅ PERBAIKAN: PASTIKAN PRIORITAS KEMBALI KE NONE SAAT ADD MORE
                            const selectorSpan = window.TaskApp.prioritySelector?.querySelector('span');
                            if (selectorSpan) {
                                selectorSpan.textContent = 'None'; 
                                updatePriorityDropdownSelection('None');
                            }
                            
                            window.TaskApp.openDrawer();
                        }, 
                        isPrimary: false 
                    },
                    { 
                        text: 'View', 
                        action: () => {
                            window.TaskApp.closeDrawer();
                            // LOGIKA REDIREKSI KE TASK.HTML DENGAN HASH TANGGAL
                            // dateToUse sudah berisi YYYY-MM-DD
                            window.location.href = `../pages/task.html#date=${dateToUse}`;
                        }, 
                        isPrimary: true 
                    }
                ];
                
                window.showCustomDialog(
                    isEditing ? "Success Update Reminder" : "Success Add New Reminder",
                    dialogButtons
                );

                // Jika di halaman Task, refresh data lokal untuk memastikan tampilan Task sudah update
                if (window.location.pathname.includes("task.html")) {
                    await loadTasksAndRenderCalendar(user, new Date('2025-01-01'), 365);
                    displayTasksForActiveDate(activeDate);
                } else if (window.location.pathname.includes("search.html")) {
                    if (window.SearchApp?.reloadTasks) {
                        await window.SearchApp.reloadTasks(user);
                    }
                }
                
            } catch (err) {
                console.error(`Error ${isEditing ? 'updating' : 'adding'} task:`, err);
                window.showCustomDialog(
                    `Failed to ${isEditing ? 'update' : 'save'} task. Please try again.`,
                    [{ text: 'OK', action: () => {}, isPrimary: true }]
                );
            }
        } else {
            window.showCustomDialog(
                "Activity and Date are required!",
                [{ text: 'OK', action: () => {}, isPrimary: true }]
            );
        }
    };

    // --- Tombol New Reminder (Reset mode ke Add) ---
    const newReminderBtn = window.TaskApp.newReminderBtn;
    if (newReminderBtn) {
        newReminderBtn.addEventListener('click', () => {
            window.TaskApp.editingTaskId = null;
            
            // [PERBAIKAN IKON HEADER] - Hapus ikon
            if (window.TaskApp.drawerHeaderTitle) window.TaskApp.drawerHeaderTitle.innerHTML = 'New Reminder';
            
            if (window.TaskApp.saveBtn) window.TaskApp.saveBtn.textContent = 'Save';
            if (window.TaskApp.reminderForm) window.TaskApp.reminderForm.reset();
            
            // Tambahkan logika ini untuk memastikan form terlihat
            const taskListForDrawer = document.getElementById('taskListForDrawer');
            if (taskListForDrawer) taskListForDrawer.style.display = 'none';
            if (window.TaskApp.reminderForm) window.TaskApp.reminderForm.style.display = 'flex';
            
            if (window.TaskApp.dateInputEdit) window.TaskApp.dateInputEdit.value = formatDate(activeDate);
            
            // Reset Flow Timer State
            window.TaskApp.flowDurationMillis = 30 * 60 * 1000;
            updateFlowTimerLinkText();
            if (window.TaskApp.timeInput) window.TaskApp.timeInput.removeAttribute('data-end-millis');
            
            // ✅ PERBAIKAN: PASTIKAN PRIORITAS KEMBALI KE NONE SAAT KLIK TOMBOL 'New Reminder'
            const selectorSpan = window.TaskApp.prioritySelector?.querySelector('span');
            if (selectorSpan) {
                selectorSpan.textContent = 'None'; 
                updatePriorityDropdownSelection('None');
            }
            
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

        // Hanya panggil loadTasksAndRenderCalendar jika di halaman task.html/calendar.html
        if (window.location.pathname.includes("task.html") || window.location.pathname.includes("calendar.html")) {
            loadTasksAndRenderCalendar(user, new Date('2025-01-01'), 365)
                .then(() => {
                    const hash = window.location.hash;
                    if (hash.startsWith('#date=')) {
                        const dateString = hash.substring(6); 
                        if (dateString) {
                            window.findAndActivateDateCard(dateString);
                        }
                    }
                });
        }
        
        // PENTING: Lampirkan submit handler hanya jika form ada (di task.html, calendar.html, search.html)
        if (window.TaskApp.reminderForm) {
            window.TaskApp.reminderForm.onsubmit = null; 
            window.TaskApp.reminderForm.addEventListener('submit', (event) => taskPageFormSubmitHandler(event, user));
        }
    });
});