document.addEventListener('DOMContentLoaded', function() {
    const calendarContainer = document.getElementById('calendar-cards-container');
    const monthYearDisplay = document.getElementById('month-year-display');
    const taskListContainer = document.getElementById('task-list-container');
    const reminderForm = document.getElementById('reminder-form');
    const ENGLISH_LOCALE = 'en-US';
    
    // State
    let tasksData = []; // Menyimpan semua tugas yang dimuat dari Firebase
    let activeDate = new Date();
    activeDate.setHours(0, 0, 0, 0); // Pastikan tanpa waktu untuk perbandingan

    // --- UTILITY: Format Date ke string YYYY-MM-DD ---
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // --- 1. FUNGSI UTAMA: LOAD TASKS & RENDER CALENDAR ---
    async function loadTasksAndRenderCalendar(user, startDate, numberOfDays) {
        if (!user) return;
        const db = firebase.firestore();
        const tasksRef = db.collection("users").doc(user.uid).collection("tasks");

        try {
            // Ambil SEMUA tugas 
            const snapshot = await tasksRef.get();
            tasksData = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));
            
            // Set tanggal hari ini sebagai aktif
            activeDate = new Date();
            activeDate.setHours(0, 0, 0, 0);
            
            // Render ulang kalender dengan data tugas
            generateCalendar(startDate, numberOfDays, tasksData);
            
            // Set scroll kalender ke hari ini
            setupCalendarScroll(calendarContainer); 
            
            // Tampilkan tugas untuk tanggal aktif hari ini
            displayTasksForActiveDate(activeDate);

        } catch (err) {
            console.error("Error loading tasks:", err);
        }
    }


    // --- 2. MODIFIKASI: generateCalendar untuk cek DOT INDICATOR ---
    /**
     * Generates date cards, menambahkan dot indicator jika ada tugas pada tanggal tsb.
     */
    function generateCalendar(startDate, numberOfDays, tasks) {
        if (!calendarContainer) return;
        calendarContainer.innerHTML = ''; // Clear existing cards
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); 

        // Buat Set berisi tanggal (YYYY-MM-DD) yang memiliki tugas
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
            
            // ✅ Cek apakah ada tugas yang tersimpan untuk tanggal ini
            const hasTask = datesWithTasks.has(dateString); 

            const card = document.createElement('div');
            card.classList.add('date-card');
            card.id = `date-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
            card.setAttribute('data-date-index', index);
            card.setAttribute('data-date-string', dateString); // Tambahkan attribute tanggal
            
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
                ${hasTask ? '<span class="dot-indicator"></span>' : ''} `;
            
            calendarContainer.appendChild(card);
        });
        
        setupDateCardClicks(calendarContainer); // Re-attach listeners
    }

    // --- 3. MODIFIKASI: setupDateCardClicks untuk menampilkan tugas ---
    function setupDateCardClicks(container) {
        container.querySelectorAll('.date-card').forEach(card => {
            card.addEventListener('click', () => {
                container.querySelectorAll('.date-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                
                const index = parseInt(card.getAttribute('data-date-index'));
                const startDate = new Date('2025-01-01');
                const selectedDate = new Date(startDate);
                selectedDate.setDate(startDate.getDate() + index); 
                selectedDate.setHours(0, 0, 0, 0); // Tetapkan waktu ke nol
                
                // Update activeDate global
                activeDate = selectedDate; 
                
                updateMonthYearDisplay(monthYearDisplay, selectedDate);
                
                // ✅ Panggil fungsi untuk menampilkan tugas yang sesuai
                displayTasksForActiveDate(selectedDate);
            });
        });
    }


    // --- 4. FUNGSI BARU: DISPLAY TASKS FOR ACTIVE DATE ---
    function displayTasksForActiveDate(date) {
        if (!taskListContainer) return;
        taskListContainer.innerHTML = '';
        
        const dateString = formatDate(date);
        
        // Filter tugas berdasarkan tanggal yang dipilih
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


    // --- 5. MODIFIKASI: createTaskCard (Tambahkan status 'done' dan tombol aksi) ---
    function createTaskCard(title, time, location, taskId, isDone) {
        const card = document.createElement('div');
        card.classList.add('task-card-item');
        card.setAttribute('data-task-id', taskId); // Tambahkan ID tugas
        
        // Tambahkan kelas visual jika sudah selesai
        if (isDone) {
            card.classList.add('done-task');
        }

        // ✅ PERUBAHAN UTAMA: Menambahkan struktur tombol aksi
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

        // Handle "mark as done"
        const checkbox = card.querySelector('.task-checkbox');
        checkbox.addEventListener('click', async (e) => {
            // Hentikan penyebaran agar tidak men-toggle status 'active' pada card
            e.stopPropagation(); 
            
            const user = firebase.auth().currentUser;
            if (!user) return alert('Please log in first.');

            const db = firebase.firestore();
            try {
                // Toggle status done: jika sudah done, batalkan. Jika belum, tandai done.
                const taskInState = tasksData.find(t => t.id === taskId);
                const currentDoneStatus = taskInState ? taskInState.done : false;
                const newDoneStatus = !currentDoneStatus; 
                
                await db.collection("users").doc(user.uid)
                    .collection("tasks").doc(taskId)
                    .update({
                        done: newDoneStatus,
                        // Jika menandai selesai, gunakan tanggal hari ini untuk streak. 
                        // Jika dibatalkan, gunakan tanggal tugas yang lama.
                        date: newDoneStatus ? formatDate(new Date()) : taskInState.date 
                    });

                // Setelah update berhasil, muat ulang semua data
                alert(`Task marked as ${newDoneStatus ? 'done' : 'undone'}!`);
                
                // Muat ulang data (memastikan tugas yang baru ditandai selesai/batal muncul di daftar)
                await loadTasksAndRenderCalendar(user, new Date('2025-01-01'), 365); 
                
                // Panggil ulang tampilan tugas untuk tanggal aktif yang sama
                displayTasksForActiveDate(activeDate);

            } catch (err) {
                console.error("Error updating task status:", err);
            }
        });
        
        // [Tambahkan event listeners untuk Flow Timer, Edit, Delete di sini jika diperlukan]
        
        return card;
    }
    
    // --- 6. MODIFIKASI: Form Submit (Reload setelah berhasil) ---
    const formSubmitHandler = async function(event, user) {
        event.preventDefault(); 
        const db = firebase.firestore();
        const tasksRef = db.collection("users").doc(user.uid).collection("tasks");
        
        const activity = document.getElementById('activity-input').value.trim();
        const time = document.getElementById('time-input').value.trim();
        const location = document.getElementById('location-input').value.trim() || 'No Location'; 

        if (activity && time) {
            try {
                // Gunakan tanggal aktif saat ini 
                const dateToUse = formatDate(activeDate);

                await tasksRef.add({
                    title: activity,
                    time,
                    location,
                    done: false,
                    date: dateToUse, 
                });

                reminderForm.reset(); 
                closeDrawer();
                
                // ✅ PENTING: Muat ulang data setelah task baru ditambahkan
                await loadTasksAndRenderCalendar(user, new Date('2025-01-01'), 365);

                window.showCustomDialog(
                    "Success Add New Reminder",
                    [
                        { text: 'Add more', action: () => {
                            document.getElementById('newReminderDrawer').classList.add('open');
                            document.body.style.overflow = 'hidden';
                        }, isPrimary: false },
                        { text: 'View', action: () => {}, isPrimary: true }
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


    // --- INIT: Panggil loadTasksAndRenderCalendar saat user login ---
    firebase.auth().onAuthStateChanged(user => {
        if (!user) {
            console.log("No user logged in, redirecting...");
            window.location.href = "../pages/login.html";
            return;
        }

        console.log("User logged in:", user.email);
        
        // Inisialisasi tampilan kalender
        loadTasksAndRenderCalendar(user, new Date('2025-01-01'), 365);

        // Atur ulang event listener untuk form submit
        if (reminderForm && taskListContainer) {
            // Pastikan tidak ada listener ganda
            reminderForm.onsubmit = null; 
            
            // Tambahkan listener baru dengan akses ke object user
            reminderForm.addEventListener('submit', (event) => formSubmitHandler(event, user));
        }
    });

    
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

    // --- Time Picker & Drawer Logic (Disalin dari task.js asli) ---
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
    const newReminderBtn = document.querySelector('.new-reminder-btn');

    const closeDrawer = () => {
        if (newReminderDrawer) {
            newReminderDrawer.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    if (newReminderBtn) {
        newReminderBtn.addEventListener('click', () => {
            if (newReminderDrawer) {
                newReminderDrawer.classList.add('open');
                document.body.style.overflow = 'hidden';
            }
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
                    showCustomDialog(
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