// public/search.js

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const filterPillsContainer = document.querySelector('.filter-pills-container');
    const taskListContainer = document.getElementById('taskListContainer');
    const emptyState = document.getElementById('emptyState');
    
    let allTasksData = []; // Variabel untuk menyimpan semua data tugas
    
    // ✅ NEW: Gunakan sessionStorage untuk state yang persisten
    const STORAGE_KEY_FILTER = 'search_active_filter';
    const STORAGE_KEY_QUERY = 'search_query';
    
    // Ambil state dari sessionStorage atau gunakan default
    let currentActiveFilter = sessionStorage.getItem(STORAGE_KEY_FILTER) || 'all';
    let currentSearchQuery = sessionStorage.getItem(STORAGE_KEY_QUERY) || '';
    
    // Dapatkan fungsi create card dari TaskApp global (dari task.js)
    const createTaskCard = window.TaskApp?.createTaskCard; 
    
    if (!createTaskCard) {
        console.error("Dependency Error: window.TaskApp.createTaskCard not found. Ensure task.js is loaded first.");
        return; 
    }

    // Inisialisasi status tampilan: Sembunyikan daftar, tampilkan status kosong
    if (taskListContainer) taskListContainer.style.display = 'none';
    if (emptyState) emptyState.style.display = 'flex'; 

    
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
                // Definisikan fungsi reload spesifik untuk halaman search (memuat ulang data dari Firebase)
                const reloadFn = () => loadTasks(firebase.auth().currentUser);
                
                // Gunakan fungsi global createTaskCard dari task.js
                const card = createTaskCard(task, reloadFn); 
                
                // Hapus kelas .active secara eksplisit pada saat rendering 
                card.classList.remove('active'); 
                
                taskListContainer.appendChild(card);
            });
        }
    }


    // --- LOGIKA PENCARIAN & FILTER (Kombinasi Keywords dan Bulan) ---
    function performSearchAndFilter(query, filter) {
        let filteredTasks = allTasksData;
        
        // 1. Filter berdasarkan filter pill (bulan)
        if (filter !== 'all') {
            
            const monthFilters = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const monthIndex = monthFilters.indexOf(filter);

            if (monthIndex > -1) {
                filteredTasks = filteredTasks.filter(task => {
                    if (!task.date) return false;
                    
                    const taskDate = new Date(task.date.replace(/-/g, '/'));
                    
                    return taskDate.getMonth() === monthIndex;
                });
            }
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
    
    // Fungsi untuk dipanggil oleh listener keyup/input (menggunakan filter aktif saat ini)
    const performSearchThrottled = () => {
        const query = searchInput.value.trim();
        // ✅ UPDATE: Simpan query ke sessionStorage
        currentSearchQuery = query;
        sessionStorage.setItem(STORAGE_KEY_QUERY, query);
        // Gunakan state filter yang tersimpan
        performSearchAndFilter(query, currentActiveFilter);
    };

    // Fungsi untuk dipanggil oleh listener filter pill
    const performFilter = (filter) => {
        // ✅ UPDATE STATE FILTER DAN SIMPAN KE sessionStorage
        currentActiveFilter = filter;
        sessionStorage.setItem(STORAGE_KEY_FILTER, filter);
        
        const query = searchInput ? searchInput.value.trim() : '';
        // ✅ UPDATE: Simpan query ke sessionStorage
        currentSearchQuery = query;
        sessionStorage.setItem(STORAGE_KEY_QUERY, query);
        
        performSearchAndFilter(query, filter);
    };


    // --- FUNGSI UTAMA: LOAD TASK DARI FIREBASE ---
    async function loadTasks(user) {
        if (!user) return;
        
        console.log('=== SEARCH PAGE: Loading tasks ===');
        console.log('User UID:', user.uid);
        
        const db = firebase.firestore();
        const tasksRef = db.collection("users").doc(user.uid).collection("tasks");

        try {
            const snapshot = await tasksRef.get();
            console.log('Total tasks from Firebase:', snapshot.size);
            
            allTasksData = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));
            
            console.log('All tasks data:', allTasksData);
            
            // ✅ UPDATE: Ambil state dari sessionStorage
            currentSearchQuery = sessionStorage.getItem(STORAGE_KEY_QUERY) || '';
            currentActiveFilter = sessionStorage.getItem(STORAGE_KEY_FILTER) || 'all';
            
            console.log('Restored state - Filter:', currentActiveFilter, 'Query:', currentSearchQuery);
            
            // ✅ Restore search input value dari sessionStorage
            if (searchInput) {
                searchInput.value = currentSearchQuery;
                // Update clear button visibility
                if (clearSearchBtn) {
                    clearSearchBtn.style.display = currentSearchQuery.length > 0 ? 'flex' : 'none';
                }
            }
            
            // ✅ Restore active pill berdasarkan filter yang tersimpan
            restoreActivePill(currentActiveFilter);
            
            // ✅ UPDATE: Gunakan state yang tersimpan untuk re-filter dan re-render
            performSearchAndFilter(currentSearchQuery, currentActiveFilter);

            console.log('✅ Tasks loaded and rendered successfully');

        } catch (err) {
            console.error("❌ Error loading tasks:", err);
            renderTasks([]);
        }
    }

    // ✅ NEW: Fungsi untuk restore active pill berdasarkan filter
    function restoreActivePill(filter) {
        const targetPill = document.querySelector(`.filter-pill[data-filter="${filter}"]`);
        if (targetPill && !targetPill.classList.contains('active')) {
            updateActivePill(targetPill);
        }
    }

    // Ekspos fungsi loadTasks ke global agar task.js dapat memanggilnya
    window.SearchApp = window.SearchApp || {};
    window.SearchApp.reloadTasks = loadTasks;


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
                const filterValue = pill.getAttribute('data-filter');
                updateActivePill(pill);
                // ✅ Panggil performFilter yang akan mengupdate state currentActiveFilter
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
            // ✅ UPDATE: Reset state dan sessionStorage
            currentSearchQuery = '';
            sessionStorage.setItem(STORAGE_KEY_QUERY, '');
            toggleClearButton();
            // Gunakan state filter yang ada saat ini
            performSearchAndFilter('', currentActiveFilter);
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
    
    // INISIALISASI: Atur centang pada pill berdasarkan state yang tersimpan
    const savedFilter = sessionStorage.getItem(STORAGE_KEY_FILTER) || 'all';
    const initialActivePill = document.querySelector(`.filter-pill[data-filter="${savedFilter}"]`);
    if (initialActivePill) {
        if (!initialActivePill.querySelector('.check-icon')) {
             updateActivePill(initialActivePill);
        }
    }
    
    // ✅ NEW: Restore search input saat page load
    if (searchInput) {
        const savedQuery = sessionStorage.getItem(STORAGE_KEY_QUERY) || '';
        searchInput.value = savedQuery;
        if (clearSearchBtn) {
            clearSearchBtn.style.display = savedQuery.length > 0 ? 'flex' : 'none';
        }
    }
});