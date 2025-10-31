document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const filterPillsContainer = document.querySelector('.filter-pills-container');
    const filterPills = document.querySelectorAll('.filter-pill');
    
    // --- FUNGSI UTAMA UNTUK MENGELOLA ICON CENTANG ---
    /**
     * Memindahkan icon centang dan status 'active' ke pill yang baru.
     * @param {HTMLElement} newActivePill - Elemen pill filter yang baru diaktifkan.
     */
    function updateActivePill(newActivePill) {
        let currentActivePill = document.querySelector('.filter-pill.active');
        
        // 1. Hapus kelas 'active' dan icon centang dari pill sebelumnya
        if (currentActivePill) {
            currentActivePill.classList.remove('active');
            const checkIcon = currentActivePill.querySelector('.check-icon');
            if (checkIcon) {
                currentActivePill.removeChild(checkIcon);
            }
        }

        // 2. Tambahkan kelas 'active' ke pill yang baru
        if (newActivePill) {
            newActivePill.classList.add('active');
            
            // 3. Buat dan masukkan icon centang
            const checkIcon = document.createElement('i');
            checkIcon.classList.add('fas', 'fa-check', 'check-icon');
            
            // Masukkan icon di depan elemen <span>
            const spanElement = newActivePill.querySelector('span');
            if (spanElement) {
                newActivePill.insertBefore(checkIcon, spanElement);
            } else {
                 newActivePill.prepend(checkIcon);
            }
        }
    }
    
    // --- INISIALISASI: Atur centang pada pill 'All' saat pertama kali dimuat ---
    const initialActivePill = document.querySelector('.filter-pill.active');
    if (initialActivePill) {
        // Hanya tambahkan centang jika belum ada (untuk inisialisasi awal)
        if (!initialActivePill.querySelector('.check-icon')) {
             updateActivePill(initialActivePill);
        }
    }
    
    // --- LOGIKA CLEAR BUTTON ---
    if (clearSearchBtn && searchInput) {
        const toggleClearButton = () => {
            // Gunakan 'flex' karena clearSearchBtn menggunakan display: flex
            clearSearchBtn.style.display = searchInput.value.length > 0 ? 'flex' : 'none';
        }
        
        searchInput.addEventListener('input', toggleClearButton);
        
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            toggleClearButton();
            // Panggil fungsi pencarian (jika ada)
            performSearch(); 
        });

        toggleClearButton();
    }
    
    // --- LOGIKA FILTER PILLS ---
    if (filterPillsContainer) {
        filterPillsContainer.addEventListener('click', (event) => {
            const pill = event.target.closest('.filter-pill');
            // Cek apakah pill diklik dan pill tersebut belum aktif
            if (pill && !pill.classList.contains('active')) {
                updateActivePill(pill); // Panggil fungsi pemindahan centang
                
                const filterValue = pill.getAttribute('data-filter');
                console.log(`Filter selected: ${filterValue}`);
                performFilter(filterValue); 
            }
        });
    }

    // --- LOGIKA PENCARIAN & FILTER (Placeholder) ---
    searchInput.addEventListener('keyup', performSearch);
    
    function performSearch() {
        const query = searchInput.value.trim().toLowerCase();
        console.log(`Searching for: ${query}`);
    }

    function performFilter(filter) {
        console.log(`Applying filter: ${filter}`);
    }
});