// File: public/task.js (Full Code)

document.addEventListener('DOMContentLoaded', function() {

    // ===================================================
    // HELPER FUNCTIONS (COPIED FROM STREAK.JS FOR TASK.JS)
    // ===================================================

    /**
     * Mengonversi objek Date menjadi string format "yyyy-MM-dd".
     */
    function dateToYyyyMmDd(date) {
        const d = new Date(date.getTime());
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${d}`;
    }

    /**
     * Normalisasi Date ke tengah malam (midnight) di zona waktu lokal.
     */
    function normalizeDateToMidnight(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    /**
     * Memeriksa apakah tanggal terakhir adalah tepat satu hari sebelum tanggal hari ini.
     */
    function isYesterday(lastDateStr, todayStr) {
        if (!lastDateStr || lastDateStr === "") return false;

        const lastDate = normalizeDateToMidnight(new Date(lastDateStr.replace(/-/g, '/') + ' 00:00:00'));
        const today = normalizeDateToMidnight(new Date(todayStr.replace(/-/g, '/') + ' 00:00:00'));
        
        const yesterday = new Date(today.getTime());
        yesterday.setDate(today.getDate() - 1);

        return lastDate.getTime() === yesterday.getTime();
    }

    /**
     * Mengaplikasikan logika mesin status Streak.
     */
    function calculateNewStreakState(currentState, hasCompletedToday) {
        const todayStr = dateToYyyyMmDd(new Date());

        let oldStreak = currentState.currentStreak || 0;
        let lastDateStr = currentState.lastCompletionDate;
        
        let newStreak = oldStreak;
        let streakIncreased = false;

        when: {
            if (!lastDateStr || lastDateStr === "") {
                if (hasCompletedToday) {
                    newStreak = 1;
                    streakIncreased = true;
                }
                break when;
            } 
            
            if (lastDateStr === todayStr) {
                // Case 2: Already updated today - no change
                newStreak = oldStreak;
                break when;
            } 
            
            if (isYesterday(lastDateStr, todayStr)) {
                // Case 3: Beruntun dari kemarin
                if (hasCompletedToday) {
                    newStreak = oldStreak + 1;
                    streakIncreased = true;
                }
                break when;
            } 
            
            // Case 4: Streak terputus lebih dari 1 hari yang lalu
            if (hasCompletedToday) {
                newStreak = 1; 
                streakIncreased = true;
            } else {
                newStreak = 0;
            }
        }
        
        return { 
            currentStreak: newStreak,
            lastCompletionDate: newStreak > 0 && hasCompletedToday ? todayStr : null, 
            streakIncreased: streakIncreased,
            oldStreak: oldStreak 
        };
    }
    
    // ===================================================
    // END: HELPER FUNCTIONS
    // ===================================================

    // Fungsi untuk menyimpan completed task ke localStorage
    function saveCompletedTask(taskData) {
        const completedTasks = JSON.parse(localStorage.getItem('completedTasks') || '[]');
        
        const completedTask = {
            id: taskData.id,
            title: taskData.title,
            completedAt: new Date().toISOString(),
            date: taskData.date,
            time: taskData.time,
            location: taskData.location
        };
        
        const existingIndex = completedTasks.findIndex(t => t.id === taskData.id);
        if (existingIndex === -1) {
            completedTasks.push(completedTask);
            localStorage.setItem('completedTasks', JSON.stringify(completedTasks));
        }
    }

    function removeCompletedTask(taskId) {
        let completedTasks = JSON.parse(localStorage.getItem('completedTasks') || '[]');
        completedTasks = completedTasks.filter(t => t.id !== taskId);
        localStorage.setItem('completedTasks', JSON.stringify(completedTasks));
    }

    function saveDeletedTask(taskData) {
        const deletedTasks = JSON.parse(localStorage.getItem('deletedTasks') || '[]');
        
        const deletedTask = {
            id: taskData.id,
            title: taskData.title,
            deletedAt: new Date().toISOString(),
            date: taskData.date,
            time: taskData.time,
            location: taskData.location
        };
        
        const existingIndex = deletedTasks.findIndex(t => t.id === taskData.id);
        if (existingIndex === -1) {
            deletedTasks.push(deletedTask);
            localStorage.setItem('deletedTasks', JSON.stringify(deletedTasks));
        }
    }

    // FUNGSI BARU: SIMPAN MISSED TASK
    function saveMissedTask(taskData) {
        const missedTasks = JSON.parse(localStorage.getItem('missedTasks') || '[]');
        
        const missedTask = {
            id: taskData.id,
            title: taskData.title,
            missedAt: new Date().toISOString(),
            date: taskData.date,
            time: taskData.time,
            location: taskData.location
        };
        
        const existingIndex = missedTasks.findIndex(t => t.id === taskData.id);
        if (existingIndex === -1) {
            missedTasks.push(missedTask);
            localStorage.setItem('missedTasks', JSON.stringify(missedTasks));
        }
    }

    function triggerProfileUpdate() {
        localStorage.setItem('profileUpdateTrigger', new Date().getTime().toString());
    }

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

    // === START: LOGIC BARU UNTUK TASK LIST DI DRAWER (Wajib untuk sinkronisasi) ===
    const taskListForDrawer = document.createElement('div'); 
    taskListForDrawer.id = 'taskListForDrawer';
    taskListForDrawer.classList.add('scrollable-content'); 
    taskListForDrawer.style.padding = '0 24px';
    taskListForDrawer.style.flexGrow = '1';
    taskListForDrawer.style.display = 'none'; 
    
    const drawerContent = document.querySelector('.drawer-content');
    if (drawerContent && window.TaskApp.reminderForm) {
        // Sisipkan taskListForDrawer tepat sebelum form
        drawerContent.insertBefore(taskListForDrawer, window.TaskApp.reminderForm); 
    }
    // === END: LOGIC BARU UNTUK TASK LIST DI DRAWER ===
    
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
    
    // Variable untuk menyimpan mode operasi drawer
    window.TaskApp.editMode = null; // Bisa: null, 'edit', 'restore', 'reschedule'
    let activeDate = new Date();
    activeDate.setHours(0, 0, 0, 0); 
    window.TaskApp.activeDate = activeDate; // Expose to global scope for the drawer

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
        
        // Reset state edit dan mode
        window.TaskApp.editingTaskId = null;
        window.TaskApp.editMode = null; // TAMBAHKAN INI
        
        // Hapus ikon
        if (window.TaskApp.drawerHeaderTitle) window.TaskApp.drawerHeaderTitle.innerHTML = 'New Reminder';
        
        if (window.TaskApp.saveBtn) window.TaskApp.saveBtn.textContent = 'Save';
        if (window.TaskApp.reminderForm) window.TaskApp.reminderForm.reset();

        // Sembunyikan task list
        const taskListForDrawer = document.getElementById('taskListForDrawer');
        if (taskListForDrawer) {
            taskListForDrawer.innerHTML = ''; 
            taskListForDrawer.style.display = 'none'; 
        }
        
        // Tutup priority dropdown
        if (window.TaskApp.priorityWrapper) {
             window.TaskApp.priorityWrapper.classList.remove('open');
        }
        
        // Hapus data-end-millis dan batasan min date
        if (window.TaskApp.timeInput) window.TaskApp.timeInput.removeAttribute('data-end-millis');
        if (window.TaskApp.dateInputEdit) window.TaskApp.dateInputEdit.removeAttribute('min');
    }
}

    // --- FUNGSI BARU: BUKA DRAWER UNTUK EDIT/RESTORE/RESCHEDULE (Global) ---
window.TaskApp.openDrawerForEdit = function(task) {
    window.TaskApp.editingTaskId = task.id;
    
    // Tentukan mode berdasarkan window.TaskApp.editMode
    const mode = window.TaskApp.editMode || 'edit';
    
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
    
    // ----------------------------------------------------
    // LOGIC TANGGAL: SAMA PERSIS DENGAN TASK DAN CALENDAR
    // ----------------------------------------------------
    const dateInput = window.TaskApp.dateInputEdit;
    
    if (dateInput) {
        const taskDateValue = task.date || ''; // Dapatkan YYYY-MM-DD string
        
        if (mode === 'restore' || mode === 'reschedule') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const taskDate = new Date(taskDateValue + ' 00:00:00');
            taskDate.setHours(0, 0, 0, 0);
            
            // Karena sekarang logika Missed Tasks ditangani di submit handler, 
            // kita HANYA perlu memastikan tanggal ditampilkan DENGAN BENAR.
            // Biarkan user memilih tanggal lampau; submit handler yang akan menentukan statusnya.
            dateInput.value = taskDateValue; 
            dateInput.removeAttribute('min'); 
            
        } else {
            // Mode edit biasa (Task, Calendar, Search: Edit)
            // ✅ Mengisi input dengan YYYY-MM-DD yang tersimpan
            dateInput.value = taskDateValue; 
            dateInput.removeAttribute('min'); 
        }
    }
    // ----------------------------------------------------

    
    // Set Flow Timer state
    if (task.flowDurationMillis && task.flowDurationMillis > 0) {
         window.TaskApp.flowDurationMillis = task.flowDurationMillis;
    } else {
         window.TaskApp.flowDurationMillis = 30 * 60 * 1000;
    }
    
    // Load prioritas dari task yang diedit
    const taskPriority = task.priority || 'None';
    const selectorSpan = window.TaskApp.prioritySelector?.querySelector('span');
    if (selectorSpan) {
        selectorSpan.textContent = taskPriority;
        updatePriorityDropdownSelection(taskPriority);
    }
    
    // Update Header dan Button berdasarkan mode
    if (window.TaskApp.drawerHeaderTitle) {
        if (mode === 'restore') {
            window.TaskApp.drawerHeaderTitle.innerHTML = 'Restore Task';
        } else if (mode === 'reschedule') {
            window.TaskApp.drawerHeaderTitle.innerHTML = 'Reschedule Task';
        } else {
            window.TaskApp.drawerHeaderTitle.innerHTML = 'Edit Reminder';
        }
    }
    
    if (window.TaskApp.saveBtn) {
        if (mode === 'restore' || mode === 'reschedule') {
            window.TaskApp.saveBtn.textContent = 'Restore & Reschedule';
        } else {
            window.TaskApp.saveBtn.textContent = 'Update';
        }
    }
    
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
        // [FIXED] Menggunakan Custom Dialog untuk Konfirmasi Delete
        window.showCustomDialog(
            "Are you sure you want to delete this reminder?",
            [
                { text: 'Cancel', action: () => {}, isPrimary: false },
                { 
                    text: 'Delete', 
                    action: async () => {
                        try {
                            // Panggil Backend: DELETE /api/tasks/:id
                            await window.fetchData(`/tasks/${taskId}`, {
                                method: 'DELETE'
                            });

                            // Simpan info ke localStorage (untuk riwayat deleted di profile)
                            // Kita ambil data dari state lokal karena data di server sudah dihapus/soft-delete
                            const taskToDelete = window.TaskApp.tasksData.find(t => t.id === taskId);
                            if (taskToDelete) saveDeletedTask(taskToDelete);

                            triggerProfileUpdate();
                            
                            // [FIXED] Menggunakan Custom Dialog untuk Pesan Sukses
                            window.showCustomDialog(
                                "Reminder deleted successfully!",
                                [
                                    { text: 'OK', action: async () => {
                                        window.TaskApp.closeDrawer();
                                        if (typeof reloadFn === 'function') {
                                            await reloadFn();
                                        } else {
                                            // Reload manual
                                            await loadTasksAndRenderCalendar(user, new Date('2025-01-01'), 365);
                                            displayTasksForActiveDate(activeDate);
                                        }
                                    }, isPrimary: true }
                                ]
                            );
                        } catch (err) {
                            console.error("Error deleting task:", err);
                            window.showCustomDialog(
                                "Failed to delete task.",
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
            
            const user = firebase.auth().currentUser;
            if (!user) return window.showCustomDialog('Please log in first.');
            
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
            if (!user) return window.showCustomDialog('Please log in first.');
            
            // Memanggil fungsi deleteTask yang menggunakan Custom Dialog
            window.TaskApp.deleteTask(taskId, user, reloadFn);
        });

        // Handle "mark as done"
        const checkbox = card.querySelector('.task-checkbox');
        checkbox.addEventListener('click', async (e) => {
            e.stopPropagation(); 
            
            const user = firebase.auth().currentUser;
            if (!user) return window.showCustomDialog('Please log in first.');

            try {
                const currentDoneStatus = taskObject.done;
                const newDoneStatus = !currentDoneStatus; 
                
                // Siapkan data update
                const updateData = {
                    done: newDoneStatus,
                    status: newDoneStatus ? "completed" : "pending",
                    // Jika selesai, pindahkan tanggalnya ke hari ini (opsional, sesuai selera)
                    date: newDoneStatus ? formatDate(new Date()) : taskObject.date
                };

                // Panggil Backend: PUT /api/tasks/:id
                await window.fetchData(`/tasks/${taskId}`, {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                });

                // Update localStorage (untuk statistik profile)
                if (newDoneStatus) {
                    saveCompletedTask(taskObject);
                } else {
                    removeCompletedTask(taskId);
                }

                // ====================================================
                // START: LOGIC STREAK CHECK FOR POPUP (CORRECTED)
                // ====================================================
                let isStreakIncreased = false;
                let newStreakNumber = 0;
                
                if (newDoneStatus) {
                    // 1. Ambil status streak saat ini
                    const currentStreakState = await window.fetchData('/stats/streak');

                    // **FIX:** Gunakan TRUE karena aksi yang dilakukan adalah menyelesaikan tugas hari ini.
                    let hasCompletedToday = true; 
                    
                    // 2. Hitung status baru secara lokal
                    const { streakIncreased: streakDidIncrease, currentStreak: newStreak } = calculateNewStreakState(
                        { 
                            currentStreak: currentStreakState.currentStreak || 0,
                            lastCompletionDate: currentStreakState.lastCompletionDate || null,
                            streakDays: currentStreakState.streakDays || ""
                        }, 
                        hasCompletedToday
                    );

                    // 3. Tentukan apakah perlu update di server
                    if (streakDidIncrease) {
                        // Panggil API POST /complete untuk menyimpan streak baru
                        // Server (API) akan melakukan kalkulasi final dan menyimpan.
                        await window.fetchData('/stats/streak/complete', {
                             method: 'POST',
                             headers: { 'Content-Type': 'application/json' },
                             body: JSON.stringify({}) // Body kosong, server menggunakan waktu server.
                        });
                        isStreakIncreased = true;
                    }
                    
                    if (isStreakIncreased) {
                         // Lakukan fetch lagi untuk memastikan angka yang ditampilkan di dialog akurat
                         // NOTE: Ini opsional, tapi memastikan dialog menampilkan angka yang sudah di commit ke DB.
                         const updatedStreakState = await window.fetchData('/stats/streak');
                         newStreakNumber = updatedStreakState.currentStreak || 0;
                    }
                }
                // ====================================================
                // END: LOGIC STREAK CHECK FOR POPUP (CORRECTED)
                // ====================================================


                triggerProfileUpdate();

                // [FIXED] Mengganti alert dengan showCustomDialog
                let dialogMessage = `Task marked as ${newDoneStatus ? 'done' : 'undone'}!`;
                
                if (isStreakIncreased) {
                    dialogMessage = `🎉 Selamat! Streak Anda sekarang mencapai ${newStreakNumber} hari!`;
                }

                window.showCustomDialog(
                    dialogMessage,
                    [{ text: 'OK', action: async () => {
                         // Reload tampilan
                        if (typeof reloadFn === 'function') {
                            await reloadFn();
                        } else {
                            await loadTasksAndRenderCalendar(user, new Date('2025-01-01'), 365);
                            displayTasksForActiveDate(activeDate);
                        }
                    }, isPrimary: true }]
                );

            } catch (err) {
                console.error("Error updating task status:", err);
                window.showCustomDialog("Failed to update task status.");
            }
        });
        
        return card;
    }


    // --- FUNGSI UTAMA: LOAD TASKS & RENDER CALENDAR ---
    async function loadTasksAndRenderCalendar(user, startDate, numberOfDays) {
        if (!user) return;

        try {
            // 1. Panggil Backend Vercel (Ganti Firestore)
            // Ambil tugas yang statusnya 'pending'
            const tasks = await window.fetchData('/tasks?status=pending');
            
            // Pastikan respons berupa array
            window.TaskApp.tasksData = Array.isArray(tasks) ? tasks : [];

            // ✨ CEK DAN PINDAHKAN MISSED TASKS
            // (Kita tetap panggil fungsi ini untuk update status jika ada yang terlewat)
            await checkAndMoveMissedTasks(user, window.TaskApp.tasksData);

        } catch (err) {
            console.error("Error loading tasks:", err);
            window.TaskApp.tasksData = []; 
        }
        
        // Reset active date ke hari ini saat load awal
        activeDate = new Date();
        activeDate.setHours(0, 0, 0, 0); 
        window.TaskApp.activeDate = activeDate;
        
        // Render Kalender
        if (calendarContainer) {
            generateCalendar(startDate, numberOfDays, window.TaskApp.tasksData);
            setupCalendarScroll(calendarContainer); 
            displayTasksForActiveDate(activeDate);
        }
    }

        // ✨ FUNGSI BARU: CEK DAN PINDAHKAN MISSED TASKS
    async function checkAndMoveMissedTasks(user, tasks) {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Set ke awal hari ini
        
        for (const task of tasks) {
            if (task.done) continue;
            
            // Parse tanggal task
            const taskDate = new Date(task.date + ' 00:00:00');
            taskDate.setHours(0, 0, 0, 0);
            
            // Jika tanggal task < hari ini, tandai sebagai missed
            if (taskDate < now) {
                try {
                    console.log(`Moving task ${task.title} to missed...`);
                    
                    // Panggil Backend: PUT /api/tasks/:id
                    await window.fetchData(`/tasks/${task.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({ status: "missed" })
                    });
                    
                    // Simpan ke localStorage (untuk keperluan profile.js yang masih baca storage)
                    // (Opsional: Jika profile.js nanti sudah full API, ini bisa dihapus)
                    saveMissedTask(task);
                    
                    // Hapus dari list lokal agar hilang dari tampilan
                    window.TaskApp.tasksData = window.TaskApp.tasksData.filter(t => t.id !== task.id);
                    
                } catch (err) {
                    console.error("Error moving task to missed:", err);
                }
            }
        }
        
        triggerProfileUpdate();
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
            window.TaskApp.activeDate = newActiveDate; // Set global activeDate

            updateMonthYearDisplay(monthYearDisplay, newActiveDate);
            
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
            window.TaskApp.activeDate = newActiveDate; // Set global activeDate
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
                
                // ✅ UPDATE TANGGAL AKTIF GLOBAL DI SINI
                activeDate = selectedDate; 
                window.TaskApp.activeDate = selectedDate;
                
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
    // NOTE: Fungsi ini sekarang hanya sebagai fallback/redundansi karena main.js menyediakan definisi global.
    window.showCustomDialog = function(message, buttons) {
        const dialogOverlay = window.TaskApp.dialogOverlay;
        const dialogMessage = window.TaskApp.dialogMessage;
        const dialogActions = window.TaskApp.dialogActions;
        
        if (!dialogOverlay || !dialogMessage || !dialogActions) {
            console.error("Custom dialog elements not found in the DOM.");
            // Menghapus alert() fallback di sini
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
            let baseDate = new Date(window.TaskApp.activeDate.getTime());
            
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
                let newDate = new Date(window.TaskApp.activeDate.getTime());
                newDate.setDate(newDate.getDate() + 1);
                window.TaskApp.activeDate = newDate;
                
                // Perbarui tampilan Date Input di Drawer (agar user melihat perubahan tanggal)
                if (window.TaskApp.dateInputEdit) {
                    window.TaskApp.dateInputEdit.value = formatDate(window.TaskApp.activeDate);
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
    
    // --- MODIFIKASI: Form Submit Handler (Handle Edit/Update/Restore/Reschedule) ---
const taskPageFormSubmitHandler = async function(event, user) {
    event.preventDefault(); 
    
    // 1. Ambil Referensi Input
    const activityInput = window.TaskApp.activityInput;
    const timeInput = window.TaskApp.timeInput;
    const locationInput = window.TaskApp.locationInput; 
    const dateInput = window.TaskApp.dateInputEdit;
    const detailsInput = window.TaskApp.reminderForm.querySelector('.description-field');
    const prioritySelector = window.TaskApp.prioritySelector;

    // 2. Ambil Nilai (Value)
    const activity = activityInput ? activityInput.value.trim() : '';
    const location = locationInput ? locationInput.value.trim() : ''; 
    const details = detailsInput ? detailsInput.value.trim() : '';
    const dateToUse = dateInput ? dateInput.value : ''; // Format YYYY-MM-DD
    const priority = prioritySelector ? prioritySelector.querySelector('span').textContent : 'None';

    if (activity && dateToUse) {
        
        // 1. Penentuan Status BARU
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today to midnight
        const selectedDate = new Date(dateToUse + ' 00:00:00');
        selectedDate.setHours(0, 0, 0, 0); // Normalize selected date to midnight
        
        let finalStatus = "pending";
        
        // Cek apakah tanggal yang dipilih adalah masa lalu
        if (selectedDate < today) {
            finalStatus = "missed"; // <-- JIKA MASA LALU, SET KE MISSED
        }
        
        // ... (time and dueDate calculation)
        
        // === LOGIKA WAKTU ===
        const inputTimeText = timeInput ? timeInput.value.trim() : '';
        const endMillisAttr = timeInput ? timeInput.getAttribute('data-end-millis') : null;
        
        const isTimeRangeSet = endMillisAttr && parseInt(endMillisAttr) > 0;
        const flowDurationMillis = window.TaskApp.flowDurationMillis; 
        
        let finalTimeStr = inputTimeText;
        let finalEndTimeMillis = 0;
        let finalFlowDuration = 0;
        let finalDueDateObj = null;

        const [year, month, day] = dateToUse.split('-').map(Number);

        if (isTimeRangeSet) {
            const endTimeFromAttr = new Date(parseInt(endMillisAttr));
            // Perhatian: Karena dateToUse sudah fix YYYY-MM-DD (tanggal yang dipilih), 
            // kita harus memastikan endTimeMillis memiliki tanggal yang sama atau +1 hari jika roll-over.
            // Saat ini, logik time picker sudah menyimpan endMillis yang benar.
            finalDueDateObj = endTimeFromAttr; 
            finalEndTimeMillis = finalDueDateObj.getTime();
            finalFlowDuration = flowDurationMillis;
            finalTimeStr = inputTimeText; 

        } else {
            // Gunakan akhir hari sebagai DueDate jika tidak ada Time Range
            finalDueDateObj = new Date(year, month - 1, day, 23, 59, 59, 999);
            finalEndTimeMillis = 0;
            finalFlowDuration = flowDurationMillis;

            if (inputTimeText.length === 0 && flowDurationMillis > 0) {
                 const durationText = window.TaskApp.formatDurationToString(flowDurationMillis);
                 finalTimeStr = `${durationText} (Flow)`;
            }
        }
        
        // Tambahkan cek jika status missed, atur date dan time sesuai tanggal yang dipilih
        // (Walaupun backend seharusnya mengelola ini, kita kirim data bersih)
        if (finalStatus === "missed") {
             finalTimeStr = finalTimeStr.includes('(Flow)') ? finalTimeStr : ''; // Kosongkan waktu untuk missed task jika bukan flow timer
             finalEndTimeMillis = 0;
             finalFlowDuration = 0;
        }

        // === DATA UNTUK DIKIRIM KE BACKEND ===
        const taskData = {
            title: activity,
            details: details,          
            category: location,       
            priority: priority,        
            dueDate: finalDueDateObj.toISOString(), 
            date: dateToUse, // <--- PENTING: Gunakan dateToUse untuk tanggal task
            
            time: finalTimeStr,        
            endTimeMillis: Math.floor(Number(finalEndTimeMillis)),      
            flowDurationMillis: Math.floor(Number(finalFlowDuration)),
            
            status: finalStatus, // <--- MENGGUNAKAN STATUS DINAMIS
        };

        try {
            const isEditing = window.TaskApp.editingTaskId;
            
            if (isEditing) {
                // UPDATE (PUT)
                await window.fetchData(`/tasks/${isEditing}`, {
                    method: 'PUT',
                    body: JSON.stringify(taskData)
                });
                
            } else {
                // CREATE (POST)
                await window.fetchData('/tasks', {
                    method: 'POST',
                    body: JSON.stringify(taskData)
                });
            }

            // Update UI Statistik (Profile) jika diperlukan
            // Fungsi ini bisa dimodifikasi nanti untuk fetch API stats
            triggerProfileUpdate(); 

            // Reset UI Form
            if (window.TaskApp.reminderForm) window.TaskApp.reminderForm.reset(); 
            if (timeInput) timeInput.removeAttribute('data-end-millis');
            if (window.TaskApp.dateInputEdit) window.TaskApp.dateInputEdit.removeAttribute('min');
            window.TaskApp.flowDurationMillis = 30 * 60 * 1000;

            // Pesan Sukses
            let successMessage = isEditing ? "Success Update Reminder" : "Success Add New Reminder";
            if (finalStatus === 'missed') successMessage = "Task moved to Missed Tasks!";
            else if (window.TaskApp.editMode === 'restore' || window.TaskApp.editMode === 'reschedule') successMessage = "Task successfully restored!";

            window.showCustomDialog(successMessage, [
                { 
                    text: 'Add more', 
                    action: () => {
                        window.TaskApp.editingTaskId = null;
                        window.TaskApp.editMode = null;
                        if (window.TaskApp.drawerHeaderTitle) window.TaskApp.drawerHeaderTitle.innerHTML = 'New Reminder';
                        if (window.TaskApp.saveBtn) window.TaskApp.saveBtn.textContent = 'Save';
                        
                        const taskListForDrawer = document.getElementById('taskListForDrawer');
                        if (taskListForDrawer) taskListForDrawer.style.display = 'none';
                        if (window.TaskApp.reminderForm) window.TaskApp.reminderForm.style.display = 'flex';
                        
                        if (window.TaskApp.dateInputEdit) window.TaskApp.dateInputEdit.value = dateToUse;
                        const selectorSpan = window.TaskApp.prioritySelector?.querySelector('span');
                        if (selectorSpan) selectorSpan.textContent = 'None';
                        
                        window.TaskApp.openDrawer();
                    }, 
                    isPrimary: false 
                },
                { 
                    text: 'View', 
                    action: async () => {
                        window.TaskApp.closeDrawer();
                        
                        // REFRESH LOGIC (Penting agar UI Sinkron)
                        if (window.location.pathname.includes("calendar.html") && window.CalendarApp?.reloadCalendarView) {
                            // ✅ NEW LOGIC: Call immediate refresh for calendar view
                            await window.CalendarApp.reloadCalendarView();
                            
                            // Find and activate the card for the current date to show the list view
                            if (window.findAndActivateDateCard) {
                                window.findAndActivateDateCard(dateToUse);
                            }
                            
                        } else if (window.location.pathname.includes("task.html")) {
                             await loadTasksAndRenderCalendar(user, new Date('2025-01-01'), 365);
                             const dateParts = dateToUse.split('-');
                             const newActiveDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                             displayTasksForActiveDate(newActiveDate);
                        } else if (window.location.pathname.includes("profile.html")) {
                             // Jika di halaman profile, refresh drawer yang sedang terbuka
                             if (window.TaskApp.editMode === 'restore') {
                                 if(typeof renderDeletedTasksInDrawer === 'function') await renderDeletedTasksInDrawer();
                             } else if (window.TaskApp.editMode === 'reschedule' || finalStatus === 'missed') {
                                 // Jika mode reschedule, atau task pindah ke missed
                                 if(typeof renderMissedTasksInDrawer === 'function') await renderMissedTasksInDrawer();
                             }
                        } else if (window.location.pathname.includes("search.html")) {
                             if (window.SearchApp?.reloadTasks) await window.SearchApp.reloadTasks(user);
                        } else if (window.location.pathname.includes("calendar.html")) {
                             // Fallback/Legacy redirect (should not be hit if new logic works)
                             window.location.href = `calendar.html#date=${dateToUse}&view=list`;
                        }
                    }, 
                    isPrimary: true 
                }
            ]);

        } catch (err) {
            console.error(`Error ${window.TaskApp.editingTaskId ? 'updating' : 'adding'} task:`, err);
            window.showCustomDialog(
                `Failed to save task.`,
                [{ text: 'OK', action: () => {}, isPrimary: true }]
            );
        }
    } else {
        window.showCustomDialog("Activity and Date are required!", [{ text: 'OK', action: () => {}, isPrimary: true }]);
    }
};

    // --- FUNGSI BARU: MEMULAI ALUR NEW REMINDER (Global) ---
    window.TaskApp.startNewReminderFlow = function(dateToPreselect) {
        // Gunakan dateToPreselect, yang kini sudah dijamin sama dengan kartu yang diklik
        const activeDateForNew = dateToPreselect instanceof Date && !isNaN(dateToPreselect) ? dateToPreselect : new Date();
        activeDateForNew.setHours(0, 0, 0, 0);
    
        window.TaskApp.editingTaskId = null;
        window.TaskApp.editMode = null; 
    
        // Reset UI elements
        if (window.TaskApp.drawerHeaderTitle) window.TaskApp.drawerHeaderTitle.innerHTML = 'New Reminder';
        if (window.TaskApp.saveBtn) window.TaskApp.saveBtn.textContent = 'Save';
        if (window.TaskApp.reminderForm) window.TaskApp.reminderForm.reset();
        
        const taskListForDrawer = document.getElementById('taskListForDrawer');
        if (taskListForDrawer) taskListForDrawer.style.display = 'none';
        if (window.TaskApp.reminderForm) window.TaskApp.reminderForm.style.display = 'flex';
        
        if (window.TaskApp.dateInputEdit) {
            // ✅ MENGISI INPUT TANGGAL DENGAN TANGGAL AKTIF
            window.TaskApp.dateInputEdit.value = window.TaskApp.formatDate(activeDateForNew);
            window.TaskApp.dateInputEdit.removeAttribute('min'); 
        }
        
        // Reset Flow Timer State
        window.TaskApp.flowDurationMillis = 30 * 60 * 1000;
        updateFlowTimerLinkText();
        if (window.TaskApp.timeInput) window.TaskApp.timeInput.removeAttribute('data-end-millis');
        
        const selectorSpan = window.TaskApp.prioritySelector?.querySelector('span');
        if (selectorSpan) {
            selectorSpan.textContent = 'None'; 
            updatePriorityDropdownSelection('None');
        }
        
        // Set global activeDate for submission handler
        window.TaskApp.activeDate = activeDateForNew;
    
        window.TaskApp.openDrawer();
    }


    // --- Tombol New Reminder ---
    const newReminderBtn = window.TaskApp.newReminderBtn;
    if (newReminderBtn) {
        newReminderBtn.addEventListener('click', () => {
            // ✅ MENGGUNAKAN activeDate YANG SUDAH DIUPDATE OLEH KLIK KALENDER
            window.TaskApp.startNewReminderFlow(activeDate); 
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
                        const dateString = hash.substring(6).split('&')[0]; // Ambil hanya date
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