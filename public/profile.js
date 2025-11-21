// File: public/profile.js
// Logika untuk Task Counters, Tab Switching, dan Task Drawers (Completed, Deleted, Missed)

// === CACHE UNTUK MENYIMPAN DATA TASK COUNTS ===
let taskCountsCache = {
    completed: 0,
    missed: 0,
    deleted: 0,
    lastFetch: 0
};

const CACHE_DURATION = 5000; // 5 detik
window.TaskApp = window.TaskApp || {}; 

// === UPDATE TASK COUNTS (OPTIMIZED WITH CACHE) ===
async function updateTaskCounts(forceRefresh = false) {
    // Tambahkan cek user di sini
    const user = typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser;
    if (!user) return taskCountsCache;

    try {
        const now = Date.now();
        
        // Gunakan cache jika masih valid dan tidak force refresh
        if (!forceRefresh && (now - taskCountsCache.lastFetch) < CACHE_DURATION) {
            updateTaskCountsUI(taskCountsCache);
            return taskCountsCache;
        }

        // Fetch data dari server
        const stats = await window.fetchData('/stats/tasks');
        
        if (!stats) return taskCountsCache;

        // Update cache
        taskCountsCache = {
            completed: stats.completed || 0,
            missed: stats.missed || 0,
            deleted: stats.deleted || 0,
            lastFetch: now
        };

        // Update UI
        updateTaskCountsUI(taskCountsCache); 
        
        return taskCountsCache;

    } catch (error) {
        console.error('Gagal memperbarui jumlah tugas:', error);
        // Tetap gunakan cache yang ada jika fetch gagal
        updateTaskCountsUI(taskCountsCache);
        return taskCountsCache;
    }
}

// === FUNGSI HELPER UNTUK UPDATE UI ===
function updateTaskCountsUI(stats) {
    const completedBox = document.querySelector('.summary-box.completed span');
    const missedBox = document.querySelector('.summary-box.missed span');
    const deletedBox = document.querySelector('.summary-box.deleted span');
    
    if (completedBox) completedBox.textContent = `Completed Tasks (${stats.completed})`;
    if (missedBox) missedBox.textContent = `Missed Tasks (${stats.missed})`;
    if (deletedBox) deletedBox.textContent = `Deleted Tasks (${stats.deleted})`;
}

// === FUNGSI UNTUK LOAD DATA DARI API (Diperlukan oleh drawers) ===
async function getCompletedTasksFromAPI() {
    try {
        const tasks = await window.fetchData('/tasks?status=completed');
        return groupTasksByDate(tasks, 'completedAt');
    } catch (error) {
        console.error('Error fetching completed tasks:', error);
        return [];
    }
}

async function getDeletedTasksFromAPI() {
    try {
        const tasks = await window.fetchData('/tasks?status=deleted');
        return groupTasksByDate(tasks, 'deletedAt');
    } catch (error) {
        console.error('Error fetching deleted tasks:', error);
        return [];
    }
}

async function getMissedTasksFromAPI() {
    try {
        const tasks = await window.fetchData('/tasks?status=missed');
        return groupTasksByDate(tasks, 'missedAt');
    } catch (error) {
        console.error('Error fetching missed tasks:', error);
        return [];
    }
}

// === HELPER: GROUP TASKS BY DATE (Tetap dibutuhkan oleh drawer) ===
function groupTasksByDate(tasks, dateField) {
    const tasksByDate = {};
    
    if (!Array.isArray(tasks)) return [];
    
    tasks.forEach(task => {
        const date = task[dateField]; 
        let dateStr;
        
        let dateObj = null;

        // 1. Coba gunakan ISO date (completedAt/deletedAt/missedAt)
        if (date) {
            const dateNum = Date.parse(date);
            if (!isNaN(dateNum)) {
                dateObj = new Date(dateNum);
            }
        }
        
        if (dateObj && !isNaN(dateObj.getTime())) { 
            dateStr = dateObj.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        } else {
            // 2. FALLBACK ke Tanggal Terjadwal (task.date is YYYY-MM-DD)
            const fallbackDate = task.date; 
            if (fallbackDate) {
                 const dateParts = fallbackDate.split('-'); 
                 
                 if (dateParts.length === 3) {
                     const dateObjFallback = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                     
                     if (!isNaN(dateObjFallback.getTime())) { 
                         let label = "";
                         if (dateField === 'deletedAt' || dateField === 'missedAt') {
                             label = " ";
                         }
                         
                         dateStr = dateObjFallback.toLocaleDateString('en-US', { 
                             weekday: 'long', 
                             year: 'numeric', 
                             month: 'long', 
                             day: 'numeric' 
                         }) + label; 
                     } else {
                          dateStr = 'Unknown Date (Invalid Fallback)';
                     }
                 } else {
                      dateStr = 'Unknown Date (Format Error)';
                 }
            } else {
                 dateStr = 'Unknown Date (No Date Field)';
            }
        }
        
        if (!tasksByDate[dateStr]) {
            tasksByDate[dateStr] = [];
        }
        
        tasksByDate[dateStr].push({
            id: task.id,
            title: task.title,
            date: task.date,
            time: task.time,
            location: task.location || task.category,
            priority: task.priority,
            endTimeMillis: task.endTimeMillis,
            flowDurationMillis: task.flowDurationMillis
        });
    });
    
    return Object.entries(tasksByDate).map(([date, tasks]) => ({
        date,
        tasks
    }));
}


// === INISIALISASI ===
document.addEventListener('DOMContentLoaded', function() {

    // Kunci Perbaikan: Pindahkan semua inisialisasi yang memerlukan data/status user ke dalam listener
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(user => {
            if (!user) {
                // Redirect sudah ditangani di profile.html, tapi ini untuk safety
                return;
            }
            
            // 1. Update counts saat page load (gunakan cache untuk render cepat)
            updateTaskCounts();
            
            // 2. Force refresh setelah 100ms untuk data terbaru
            setTimeout(() => updateTaskCounts(true), 100);
            
            // 3. Listen untuk update dari task page
            window.addEventListener('storage', (e) => {
                if (e.key === 'profileUpdateTrigger') {
                    updateTaskCounts(true);
                    // Panggil fungsi chart dari statistic.js
                    if (window.TaskApp.updateChart) {
                        const activeTab = document.querySelector('.tab-btn.active');
                        const tabType = activeTab ? activeTab.textContent.toLowerCase() : 'daily';
                        window.TaskApp.updateChart(tabType);
                    }
                }
            });
            
            // 4. Update ketika window focus (user kembali ke tab)
            window.addEventListener('focus', () => {
                updateTaskCounts(true);
            });

            // 5. === TAB SWITCHING ===
            const tabButtons = document.querySelectorAll('.tab-btn');
            const statsCard = document.querySelector('.stats-card');

            // Initial Chart Load
            if (window.TaskApp.updateChart) {
                 window.TaskApp.updateChart('daily');
            }

            tabButtons.forEach(button => {
                button.addEventListener('click', function() {
                    if (this.classList.contains('active')) return;
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');
                    const tabType = this.textContent.toLowerCase();

                    statsCard.classList.add('fade-out');
                    setTimeout(() => {
                        // Panggil fungsi chart dari statistic.js
                        if (window.TaskApp.updateChart) {
                            window.TaskApp.updateChart(tabType);
                        }
                        statsCard.classList.remove('fade-out');
                        statsCard.classList.add('fade-in');
                    }, 200);
                });
            });
            
            // 6. === ATTACH DRAWER LISTENERS DI SINI ===
            // Karena drawer memerlukan fungsi get*TasksFromAPI() yang memanggil fetchData()
            attachDrawerListeners();
        });
    }

});

function attachDrawerListeners() {
    // ===================================================
    // DRAWER: COMPLETED TASKS
    // ===================================================
    const completedDrawer = document.getElementById('completedDrawer');
    const completedDrawerContent = document.getElementById('completedDrawerContent');
    const closeCompletedDrawer = document.getElementById('closeCompletedDrawer');
    const completedDrawerOverlay = document.getElementById('completedDrawerOverlay');
    const completedBox = document.querySelector('.summary-box.completed');

    if (completedBox) {
        completedBox.style.cursor = 'pointer';
        completedBox.addEventListener('click', async () => {
            await renderCompletedTasksInDrawer();
            completedDrawer.classList.add('active');
        });
    }

    if (closeCompletedDrawer) {
        closeCompletedDrawer.addEventListener('click', () => {
            completedDrawer.classList.remove('active');
        });
    }

    if (completedDrawerOverlay) {
        completedDrawerOverlay.addEventListener('click', () => {
            completedDrawer.classList.remove('active');
        });
    }

    async function renderCompletedTasksInDrawer() {
        completedDrawerContent.innerHTML = '<div class="loading-spinner"></div>';
        
        const tasks = await getCompletedTasksFromAPI();
        
        completedDrawerContent.innerHTML = '';
        
        if (tasks.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'completed-empty';
            emptyDiv.innerHTML = `
            <img src="../assets/completed_tasks.svg" alt="No completed tasks" style="width: 200px; height: 200px; margin-bottom: 16px;">
            `;
            completedDrawerContent.appendChild(emptyDiv);
        } else {
            tasks.forEach(group => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'task-group';

                const dateDiv = document.createElement('div');
                dateDiv.className = 'task-date';
                dateDiv.textContent = group.date;
                groupDiv.appendChild(dateDiv);

                group.tasks.forEach(task => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'task-item';
                    itemDiv.textContent = task.title;
                    groupDiv.appendChild(itemDiv);
                });

                completedDrawerContent.appendChild(groupDiv);
            });
        }
    }

    // ===================================================
    // DRAWER: DELETED TASKS
    // ===================================================
    const deletedDrawer = document.getElementById('deletedDrawer');
    const deletedDrawerContent = document.getElementById('deletedDrawerContent');
    const closeDeletedDrawer = document.getElementById('closeDeletedDrawer');
    const deletedDrawerOverlay = document.getElementById('deletedDrawerOverlay');
    const deletedBox = document.querySelector('.summary-box.deleted');
    
    // EXPOSE ke global scope agar bisa dipanggil setelah restore di task edit drawer
    window.renderDeletedTasksInDrawer = renderDeletedTasksInDrawer;

    if (deletedBox) {
        deletedBox.style.cursor = 'pointer';
        deletedBox.addEventListener('click', async () => {
            await renderDeletedTasksInDrawer();
            deletedDrawer.classList.add('active');
        });
    }

    if (closeDeletedDrawer) {
        closeDeletedDrawer.addEventListener('click', () => {
            deletedDrawer.classList.remove('active');
        });
    }

    if (deletedDrawerOverlay) {
        deletedDrawerOverlay.addEventListener('click', () => {
            deletedDrawer.classList.remove('active');
        });
    }

    async function renderDeletedTasksInDrawer() {
        deletedDrawerContent.innerHTML = '<div class="loading-spinner"></div>';
        
        const tasks = await getDeletedTasksFromAPI();
        
        deletedDrawerContent.innerHTML = '';
        
        if (tasks.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'deleted-empty';
            emptyDiv.innerHTML = `
               <img src="../assets/deleted_tasks.svg" alt="No deleted tasks" style="width: 178px; height: 178px; margin-bottom: 16px;">
            `;
            deletedDrawerContent.appendChild(emptyDiv);
        } else {
            tasks.forEach(group => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'deleted-task-group';

                const dateDiv = document.createElement('div');
                dateDiv.className = 'deleted-task-date';
                dateDiv.textContent = group.date;
                groupDiv.appendChild(dateDiv);

                group.tasks.forEach((task) => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'deleted-task-item';
                    itemDiv.innerHTML = `
                        <span>${task.title}</span>
                        <button class="restore-btn" data-task-id="${task.id}">Restore</button>
                    `;
                    
                    itemDiv.querySelector('.restore-btn').addEventListener('click', async () => {
                        if (task.id) {
                            await restoreDeletedTask(task);
                        } else {
                            // [FIXED] Menggunakan Custom Dialog
                            window.showCustomDialog('Task ID not found.');
                        }
                    });
                    
                    groupDiv.appendChild(itemDiv);
                });

                deletedDrawerContent.appendChild(groupDiv);
            });
        }
    }

    // ===================================================
    // DRAWER: MISSED TASKS
    // ===================================================
    const missedDrawer = document.getElementById('missedDrawer');
    const missedDrawerContent = document.getElementById('missedDrawerContent');
    const closeMissedDrawer = document.getElementById('closeMissedDrawer');
    const missedDrawerOverlay = document.getElementById('missedDrawerOverlay');
    const missedBox = document.querySelector('.summary-box.missed');
    
    // EXPOSE ke global scope agar bisa dipanggil setelah reschedule di task edit drawer
    window.renderMissedTasksInDrawer = renderMissedTasksInDrawer;

    if (missedBox) {
        missedBox.style.cursor = 'pointer';
        missedBox.addEventListener('click', async () => {
            await renderMissedTasksInDrawer();
            missedDrawer.classList.add('active');
        });
    }

    if (closeMissedDrawer) {
        closeMissedDrawer.addEventListener('click', () => {
            missedDrawer.classList.remove('active');
        });
    }

    if (missedDrawerOverlay) {
        missedDrawerOverlay.addEventListener('click', () => {
            missedDrawer.classList.remove('active');
        });
    }

    async function renderMissedTasksInDrawer() {
        missedDrawerContent.innerHTML = '<div class="loading-spinner"></div>';
        
        const tasks = await getMissedTasksFromAPI();
        
        missedDrawerContent.innerHTML = '';
        
        if (tasks.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'missed-empty';
            emptyDiv.innerHTML = `
                <img src="../assets/missed_tasks.svg" alt="No missed tasks" style="width: 188px; height: 188px; margin-bottom: 16px;">
            `;
            missedDrawerContent.appendChild(emptyDiv);
        } else {
            tasks.forEach(group => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'missed-task-group';

                const dateDiv = document.createElement('div');
                dateDiv.className = 'missed-task-date';
                dateDiv.textContent = group.date;
                groupDiv.appendChild(dateDiv);

                group.tasks.forEach(task => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'missed-task-item';
                    itemDiv.innerHTML = `
                        <span>${task.title}</span>
                        <button class="reschedule-btn" data-task-id="${task.id}">Reschedule</button>
                    `;
                    
                    itemDiv.querySelector('.reschedule-btn').addEventListener('click', async () => {
                        await rescheduleMissedTask(task);
                    });
                    
                    groupDiv.appendChild(itemDiv);
                });

                missedDrawerContent.appendChild(groupDiv);
            });
        }
    }

    // ===================================================
    // TASK EDIT DRAWER (RESTORE/RESCHEDULE)
    // ===================================================
    const taskEditDrawer = document.getElementById('taskEditDrawer');
    const taskEditDrawerOverlay = document.getElementById('taskEditDrawerOverlay');
    const closeTaskEditDrawer = document.getElementById('closeTaskEditDrawer');
    const taskEditForm = document.getElementById('task-edit-form');
    const taskActivityInput = document.getElementById('task-activity-input');
    const taskDateInput = document.getElementById('task-date-input');
    const taskTimeInput = document.getElementById('task-time-input');
    const taskLocationInput = document.getElementById('task-location-input');
    const taskSaveBtn = document.getElementById('task-save-btn');
    const taskEditDrawerTitle = document.getElementById('taskEditDrawerTitle');
    const taskDescriptionInput = document.getElementById('task-description-input');

    let currentEditTaskId = null;
    let currentEditMode = null; // 'restore' atau 'reschedule'
    let currentEditTaskData = null; // Simpan data task lengkap

    // Priority Dropdown Logic
    const taskPrioritySelector = document.getElementById('task-priority-selector');
    const taskPrioritySection = document.getElementById('task-priority-section');
    const taskPriorityWrapper = document.createElement('div');
    taskPriorityWrapper.classList.add('priority-dropdown-wrapper');
    taskPriorityWrapper.id = 'taskPriorityDropdownWrapper';

    if (taskPrioritySection) {
        taskPrioritySection.appendChild(taskPriorityWrapper);
    }

    const priorityLevels = ['None', 'Low', 'Medium', 'High'];

    function createTaskPriorityDropdown() {
        if (!taskPriorityWrapper || !taskPrioritySelector) return;
        
        const currentLevel = taskPrioritySelector.querySelector('span').textContent;
        let dropdownHtml = '<div class="priority-dropdown">';
        
        priorityLevels.forEach(level => {
            const isSelected = currentLevel === level;
            const checkIconHtml = isSelected 
                ? '<i class="fa-solid fa-check"></i>' 
                : '<i class="fa-solid fa-check" style="visibility: hidden;"></i>';
            
            dropdownHtml += `<div class="priority-option" data-value="${level}">${checkIconHtml} ${level}</div>`;
        });
        
        dropdownHtml += '</div>';
        taskPriorityWrapper.innerHTML = dropdownHtml;
    }

    if (taskPrioritySelector) {
        taskPrioritySelector.addEventListener('click', function(e) {
            e.stopPropagation();
            createTaskPriorityDropdown();
            taskPriorityWrapper.classList.toggle('open');
        });
    }

    if (taskPriorityWrapper) {
        taskPriorityWrapper.addEventListener('click', function(e) {
            const option = e.target.closest('.priority-option');
            if (option) {
                const selectedLevel = option.getAttribute('data-value');
                const selectorSpan = taskPrioritySelector.querySelector('span');
                if (selectorSpan) {
                    selectorSpan.textContent = selectedLevel;
                }
                taskPriorityWrapper.classList.remove('open');
            }
        });
    }

    document.addEventListener('click', function(e) {
        if (taskPriorityWrapper && taskPriorityWrapper.classList.contains('open') && 
            !taskPrioritySelector.contains(e.target) && 
            !taskPriorityWrapper.contains(e.target)) {
            taskPriorityWrapper.classList.remove('open');
        }
    });

    // Helper function: Format date for input
    function formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Open Task Edit Drawer
    function openTaskEditDrawer(taskData, mode) {
        currentEditTaskId = taskData.id;
        currentEditMode = mode;
        currentEditTaskData = taskData;
        
        // Isi form
        taskActivityInput.value = taskData.title || '';
        taskTimeInput.value = taskData.time || '';
        taskLocationInput.value = taskData.location || '';
        taskDescriptionInput.value = ''; // Reset description
        
        // Set priority
        const taskPriority = taskData.priority || 'None';
        const taskSelectorSpan = taskPrioritySelector?.querySelector('span');
        if (taskSelectorSpan) {
            taskSelectorSpan.textContent = taskPriority;
        }
        
        // Set tanggal - Tampilkan tanggal yang tersimpan
        const taskDateValue = taskData.date;
        taskDateInput.value = taskDateValue;
        
        // Hapus min date restriction
        taskDateInput.removeAttribute('min');
        
        // Update title dan button
        if (mode === 'restore') {
            taskEditDrawerTitle.textContent = 'Restore Task';
            taskSaveBtn.textContent = 'Restore';
        } else if (mode === 'reschedule') {
            taskEditDrawerTitle.textContent = 'Reschedule Task';
            taskSaveBtn.textContent = 'Reschedule';
        }
        
        // Buka drawer
        taskEditDrawer.classList.add('active');
    }

    // Close Task Edit Drawer
    function closeTaskEditDrawerFunc() {
        taskEditDrawer.classList.remove('active');
        currentEditTaskId = null;
        currentEditMode = null;
        currentEditTaskData = null;
        taskEditForm.reset();
        taskDateInput.removeAttribute('min');
    }

    // Event Listeners
    if (closeTaskEditDrawer) {
        closeTaskEditDrawer.addEventListener('click', closeTaskEditDrawerFunc);
    }

    if (taskEditDrawerOverlay) {
        taskEditDrawerOverlay.addEventListener('click', closeTaskEditDrawerFunc);
    }

    // Form Submit Handler
    if (taskEditForm) {
        taskEditForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const user = firebase.auth().currentUser;
            // Gunakan window.showCustomDialog
            if (!user) return window.showCustomDialog('Please log in first.'); 
            
            const activity = taskActivityInput.value.trim();
            const date = taskDateInput.value;
            const time = taskTimeInput.value.trim();
            const location = taskLocationInput.value.trim();
            const priority = taskPrioritySelector?.querySelector('span').textContent || 'None';
            
            // Gunakan window.showCustomDialog
            if (!activity || !date) {
                return window.showCustomDialog('Activity and Date are required!');
            }
            
            // 1. Tentukan status berdasarkan perbandingan tanggal
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selectedDate = new Date(date + ' 00:00:00');
            selectedDate.setHours(0, 0, 0, 0);
            
            let finalStatus = 'pending';
            
            if (selectedDate < today) {
                // Jika tanggal yang dipilih adalah masa lalu, paksa status menjadi "missed"
                finalStatus = 'missed';
            }

            try {
                // Siapkan data update
                const updateData = {
                    title: activity,
                    date: date,
                    time: time,
                    category: location,
                    priority: priority,
                    status: finalStatus,
                    done: false,
                    // Pertahankan endTimeMillis dan flowDurationMillis jika ada
                    endTimeMillis: currentEditTaskData.endTimeMillis || 0,
                    flowDurationMillis: currentEditTaskData.flowDurationMillis || 0,
                    dueDate: new Date(date + ' 23:59:59').toISOString()
                };
                
                // Update task via API
                await window.fetchData(`/tasks/${currentEditTaskId}`, {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                });
                
                // Update counts dan refresh
                await updateTaskCounts(true);
                
                // Close drawer
                closeTaskEditDrawerFunc();
                
                // Close parent drawer (deleted/missed)
                if (currentEditMode === 'restore') {
                    deletedDrawer.classList.remove('active');
                } else if (currentEditMode === 'reschedule' || finalStatus === 'missed') {
                    missedDrawer.classList.remove('active');
                }
                
                // Show success message
                let successMessage = finalStatus === 'missed' ? 'Task moved to Missed Tasks!' : 'Task successfully restored!';
                window.showCustomDialog(successMessage, [
                    { text: 'OK', action: async () => {
                        // Refresh data di drawer yang tersisa atau yang harusnya ter-update
                        if (currentEditMode === 'restore') {
                           await renderDeletedTasksInDrawer();
                        } else if (currentEditMode === 'reschedule' || finalStatus === 'missed') {
                           await renderMissedTasksInDrawer();
                        }
                    }, isPrimary: true }
                ]);
                
            } catch (err) {
                console.error('Error updating task:', err);
                // Gunakan window.showCustomDialog
                window.showCustomDialog('Failed to update task. Please try again.');
            }
        });
    }

    // Restore Deleted Task
    async function restoreDeletedTask(taskData) {
        // Close deleted drawer
        deletedDrawer.classList.remove('active');
        
        // Open task edit drawer
        openTaskEditDrawer(taskData, 'restore');
    }

    // Reschedule Missed Task
    async function rescheduleMissedTask(taskData) {
        // Close missed drawer
        missedDrawer.classList.remove('active');
        
        // Open task edit drawer
        openTaskEditDrawer(taskData, 'reschedule');
    }
}