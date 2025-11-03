// Data untuk setiap tab
const chartData = {
    daily: {
        title: 'Daily Average Productivity',
        score: 5,
        bars: [
            { height: '30%', label: 'S', highlight: false },
            { height: '50%', label: 'M', highlight: false },
            { height: '70%', label: 'T', highlight: true },
            { height: '20%', label: 'W', highlight: false },
            { height: '40%', label: 'T', highlight: false },
            { height: '15%', label: 'F', highlight: false },
            { height: '10%', label: 'S', highlight: false }
        ]
    },
    weekly: {
        title: 'Weekly Productivity Statistics',
        score: 17,
        bars: [
            { height: '40%', label: '1', highlight: false },
            { height: '25%', label: '2', highlight: false },
            { height: '85%', label: '3', highlight: true },
            { height: '10%', label: '4', highlight: false },
            { height: '5%', label: '5', highlight: false }
        ]
    },
    monthly: {
        title: 'Monthly Productivity Statistics',
        score: 23,
        bars: [
            { height: '50%', label: 'Sept', highlight: false },
            { height: '80%', label: 'Oct', highlight: true },
            { height: '15%', label: 'Nov', highlight: false },
            { height: '20%', label: 'Dec', highlight: false },
            { height: '18%', label: 'Jan', highlight: false },
            { height: '22%', label: 'Feb', highlight: false },
            { height: '25%', label: 'Mar', highlight: false }
        ]
    }
};

// Fungsi untuk update chart
function updateChart(tabType) {
    const data = chartData[tabType];
    
    // Update title
    document.querySelector('.card-header h3').textContent = data.title;
    
    // Update score
    document.querySelector('.productivity-score span').textContent = data.score;
    
    // Update bars
    const chartContainer = document.querySelector('.chart-container');
    chartContainer.innerHTML = '';
    
    // Add class untuk styling khusus
    chartContainer.className = 'chart-container';
    chartContainer.classList.add(`chart-${tabType}`);
    
    data.bars.forEach(bar => {
        const barWrapper = document.createElement('div');
        barWrapper.className = 'bar-wrapper';
        
        const barElement = document.createElement('div');
        barElement.className = bar.highlight ? 'bar highlight' : 'bar';
        barElement.style.height = bar.height;
        
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = bar.label;
        
        barWrapper.appendChild(barElement);
        barWrapper.appendChild(label);
        chartContainer.appendChild(barWrapper);
    });
}

// Event listener untuk tab buttons (KODE BARU DENGAN ANIMASI)
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    // Ambil elemen kartu statistiknya
    const statsCard = document.querySelector('.stats-card');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            
            // 1. Cek jika tab yang diklik sudah aktif, jangan lakukan apa-apa
            if (this.classList.contains('active')) {
                return;
            }

            // 2. Hapus 'active' dari semua tombol & tambahkan ke tombol ini
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // 3. Dapatkan tipe tab (daily, weekly, atau monthly)
            const tabText = this.textContent.toLowerCase();
            
            // 4. MULAI PROSES ANIMASI
            
            // Hapus kelas 'fade-in' (jika ada) agar animasi bisa diputar ulang
            statsCard.classList.remove('fade-in');

            // Tambahkan 'fade-out' untuk memulai animasi keluar
            statsCard.classList.add('fade-out');

            // Gunakan setTimeout untuk menunggu animasi fade-out selesai
            setTimeout(() => {
                
                // 5. GANTI KONTEN (saat kartu sedang tidak terlihat)
                updateChart(tabText);
                
                // 6. ANIMASIKAN KEMBALI
                
                // Hapus 'fade-out'
                statsCard.classList.remove('fade-out');
                
                // Tambahkan 'fade-in' untuk memunculkan konten baru
                statsCard.classList.add('fade-in');

            }, 200); // Durasi ini (200ms) harus sama dengan animasi 'fadeOut' di CSS
        });
    });
});