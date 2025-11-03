// public/search.js

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const filterPillsContainer = document.querySelector('.filter-pills-container');
    const taskListContainer = document.getElementById('taskListContainer');
    const emptyState = document.getElementById('emptyState');
    
    let allTasksData = []; // Variabel untuk menyimpan semua data tugas

    // Inisialisasi status tampilan: Sembunyikan daftar, tampilkan status kosong
    if (taskListContainer) taskListContainer.style.display = 'none';
    if (emptyState) emptyState.style.display = 'flex'; 

    // --- UTILITY: Format Tanggal untuk tampilan (e.g., "Today", "7 Nov") ---
    function formatTaskDate(dateString) {
        if (!dateString) return '';
        try {
             // Tanggal adalah YYYY-MM-DD. Gunakan YYYY/MM/DD untuk kompatibilitas Safari
            const date = new Date(dateString.replace(/-/g, '/')); 
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Cek apakah tanggalnya hari ini
            if (date.toDateString() === today.toDateString()) {
                return "Today";
            }
            
            // Format ke "7 Nov"
            return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        } catch (e) {
            console.error("Error formatting date:", e);
            return dateString;
        }
    }


    // --- MEMBUAT TASK CARD (Reusable & Custom) ---
    function createTaskCardForSearch(taskObject) {
        const { title, date, done: isDone } = taskObject;
        const card = document.createElement('div');
        card.classList.add('task-card-item');
        card.setAttribute('data-task-id', taskObject.id); 
        card.setAttribute('data-task-date', date);
        
        if (isDone) {
            card.classList.add('done-task');
        }

        const formattedDate = formatTaskDate(date);

        card.innerHTML = `
            <div class="task-checkbox" style="background-color: ${isDone ? '#3f67b5' : 'transparent'};"></div>
            <div class="task-details">
                <span class="task-title-reminder">${title}</span>
                <div class="task-meta">
                    <span class="task-location-small">${taskObject.location || 'No Location'}</span>
                </div>
            </div>
            <div class="task-time-box">
                <span class="task-time-large">${formattedDate}</span>
            </div>
            <i class="fas fa-chevron-right task-arrow"></i>`;
        
        // Redirect ke halaman tugas. Anda dapat menambahkan ID tugas di query string jika diperlukan.
        card.addEventListener('click', () => {
             window.location.href = `task.html`; 
        });

        // Toggle 'mark as done' pada checkbox
        const checkbox = card.querySelector('.task-checkbox');
        checkbox.addEventListener('click', async (e) => {
            e.stopPropagation(); 
            const user = firebase.auth().currentUser;
            if (!user) return alert('Please log in first.');

            const db = firebase.firestore();
            try {
                const taskInState = allTasksData.find(t => t.id === taskObject.id) || taskObject;
                const currentDoneStatus = taskInState.done;
                const newDoneStatus = !currentDoneStatus; 
                
                // Gunakan TaskApp.formatDate (dari task.js) untuk mendapatkan tanggal hari ini (YYYY-MM-DD)
                const newDate = newDoneStatus ? (window.TaskApp?.formatDate ? window.TaskApp.formatDate(new Date()) : taskInState.date) : taskInState.date; 
                
                await db.collection("users").doc(user.uid)
                    .collection("tasks").doc(taskObject.id)
                    .update({
                        done: newDoneStatus,
                        date: newDate
                    });

                // Update UI lokal
                taskInState.done = newDoneStatus;
                taskInState.date = newDate;
                
                // Render ulang daftar tugas
                performSearchThrottled(); 
                
                alert(`Task marked as ${newDoneStatus ? 'done' : 'undone'}!`);

            } catch (err) {
                console.error("Error updating task status:", err);
            }
        });
        
        return card;
    }


    // --- FUNGSI UTAMA: RENDER TASK LIST ---
    function renderTasks(tasksToRender) {
        taskListContainer.innerHTML = '';
        
        if (tasksToRender.length === 0) {
            emptyState.style.display = 'flex';
            taskListContainer.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            taskListContainer.style.display = 'grid'; // Menggunakan grid
            
            // Urutkan berdasarkan tanggal (paling dekat duluan)
            tasksToRender.sort((a, b) => new Date(a.date.replace(/-/g, '/')) - new Date(b.date.replace(/-/g, '/')));

            tasksToRender.forEach(task => {
                taskListContainer.appendChild(createTaskCardForSearch(task));
            });
        }
    }


    // --- FUNGSI UTAMA: LOAD TASK DARI FIREBASE ---
    // ✅ PENTING: Fungsi ini mengambil SEMUA tugas
    async function loadTasks(user) {
        if (!user) return;
        const db = firebase.firestore();
        const tasksRef = db.collection("users").doc(user.uid).collection("tasks");

        try {
            const snapshot = await tasksRef.get();
            allTasksData = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));
            
            // Panggil fungsi pencarian/filter untuk pertama kali merender data
            performSearchThrottled(); 

        } catch (err) {
            console.error("Error loading tasks:", err);
            renderTasks([]);
        }
    }


    // --- LOGIKA PENCARIAN & FILTER ---
    function performSearchAndFilter(query, filter) {
        let filteredTasks = allTasksData;
        
        // 1. Filter berdasarkan filter pill (tanggal/bulan)
        if (filter !== 'all') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            
            filteredTasks = filteredTasks.filter(task => {
                const taskDate = new Date(task.date.replace(/-/g, '/'));
                taskDate.setHours(0, 0, 0, 0); 

                switch (filter) {
                    case 'today':
                        return taskDate.toDateString() === today.toDateString();
                    case 'tomorrow':
                        return taskDate.toDateString() === tomorrow.toDateString();
                    case 'jan': case 'feb': case 'mar': case 'apr': case 'may': case 'jun':
                    case 'jul': case 'aug': case 'sep': case 'oct': case 'nov': case 'dec':
                        // Dapatkan index bulan (0-11)
                        const monthIndex = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(filter);
                        return taskDate.getMonth() === monthIndex;
                    default:
                        return true;
                }
            });
        }

        // 2. Filter berdasarkan string pencarian (judul/lokasi)
        if (query) {
            const lowerCaseQuery = query.toLowerCase();
            filteredTasks = filteredTasks.filter(task => 
                (task.title && task.title.toLowerCase().includes(lowerCaseQuery)) ||
                (task.location && task.location.toLowerCase().includes(lowerCaseQuery))
            );
        }

        renderTasks(filteredTasks);
    }
    
    // Fungsi untuk dipanggil oleh listener keyup/input (throttled)
    const performSearchThrottled = () => {
        const query = searchInput.value.trim();
        const activePill = document.querySelector('.filter-pill.active')?.getAttribute('data-filter') || 'all';
        performSearchAndFilter(query, activePill);
    };

    // Fungsi untuk dipanggil oleh listener filter pill
    const performFilter = (filter) => {
        const query = searchInput.value.trim();
        performSearchAndFilter(query, filter);
    };


    // --- INISIALISASI & LISTENERS ---

    // 1. Inisialisasi Firebase Auth dan Load Data
    firebase.auth().onAuthStateChanged(user => {
        if (!user) {
             taskListContainer.innerHTML = '';
             emptyState.style.display = 'flex';
             taskListContainer.style.display = 'none'; 
            return;
        }
        loadTasks(user);
    });

    // 2. Listeners untuk Search Input
    if (searchInput) {
        searchInput.addEventListener('keyup', performSearchThrottled);
    }
    
    // 3. Listeners untuk Filter Pills
    if (filterPillsContainer) {
        filterPillsContainer.addEventListener('click', (event) => {
            const pill = event.target.closest('.filter-pill');
            if (pill && !pill.classList.contains('active')) {
                updateActivePill(pill);
                const filterValue = pill.getAttribute('data-filter');
                performFilter(filterValue); 
            }
        });
    }

    // 4. Logika Clear Button 
    if (clearSearchBtn && searchInput) {
        const toggleClearButton = () => {
            clearSearchBtn.style.display = searchInput.value.length > 0 ? 'flex' : 'none';
        }
        
        searchInput.addEventListener('input', toggleClearButton);
        
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            toggleClearButton();
            performSearchThrottled(); 
        });

        toggleClearButton();
    }
    
    
    // --- FUNGSI UTAMA UNTUK MENGELOLA ICON CENTANG ---
    function updateActivePill(newActivePill) {
        let currentActivePill = document.querySelector('.filter-pill.active');
        
        if (currentActivePill) {
            currentActivePill.classList.remove('active');
            const checkIcon = currentActivePill.querySelector('.check-icon');
            if (checkIcon) {
                currentActivePill.removeChild(checkIcon);
            }
        }

        if (newActivePill) {
            newActivePill.classList.add('active');
            const checkIcon = document.createElement('i');
            checkIcon.classList.add('fas', 'fa-check', 'check-icon');
            const spanElement = newActivePill.querySelector('span');
            if (spanElement) {
                newActivePill.insertBefore(checkIcon, spanElement);
            } else {
                 newActivePill.prepend(checkIcon);
            }
        }
    }
    
    // INISIALISASI: Atur centang pada pill 'All' saat pertama kali dimuat
    const initialActivePill = document.querySelector('.filter-pill[data-filter="all"]');
    if (initialActivePill) {
        if (!initialActivePill.classList.contains('active')) {
             initialActivePill.classList.add('active');
        }
        if (!initialActivePill.querySelector('.check-icon')) {
             updateActivePill(initialActivePill);
        }
    }
});