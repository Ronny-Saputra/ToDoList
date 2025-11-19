// File: public/statistic.js

window.TaskApp = window.TaskApp || {};
window.TaskApp.LOCALE = 'en-US'; // Menggunakan English untuk konsistensi key (Mon, Tue, Jan, Feb)

// === STATISTIC UTILITY FUNCTIONS ===

/**
 * Mendapatkan tanggal Senin dari minggu yang mengandung tanggal yang diberikan.
 * @param {Date} date
 * @returns {Date} Tanggal Senin, pukul 00:00:00:000.
 */
function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 (Sun) to 6 (Sat)
    // Jika Sunday (0), geser kembali 6 hari (ke Senin minggu lalu). Jika tidak, geser ke Senin minggu ini.
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

/**
 * Mendapatkan singkatan bulan (MMM) menggunakan Locale.US
 * @param {Date} date
 * @returns {string} Singkatan bulan (e.g., "Jan", "Feb")
 */
function getMonthAbbreviation(date) {
    return date.toLocaleDateString('en-US', { month: 'short' });
}

/**
 * Mengelompokkan tugas selesai untuk DAILY stats (Mon-Sun)
 * @param {Array<Object>} tasks - Daftar tugas yang sudah selesai.
 * @param {Date} startBoundary - Senin minggu ini
 * @param {Date} endBoundary - Minggu minggu ini
 * @returns {{counts: Object, max: number, orderedKeys: Array<string>}}
 */
function groupTasksDaily(tasks, startBoundary, endBoundary) {
    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts = {};
    
    // Initialize all days dengan 0
    dayOrder.forEach(day => {
        counts[day] = 0;
    });
    
    // Hitung tasks yang selesai
    tasks.forEach(task => {
        const completedDate = new Date(task.completedAt);
        if (completedDate >= startBoundary && completedDate <= endBoundary) {
            const dayName = completedDate.toLocaleDateString('en-US', { weekday: 'short' });
            if (counts.hasOwnProperty(dayName)) {
                counts[dayName]++;
            }
        }
    });
    
    const max = Math.max(...Object.values(counts), 0);
    
    return { counts, max, orderedKeys: dayOrder };
}

/**
 * Mengelompokkan tugas selesai untuk WEEKLY stats (Week 1-4 dalam bulan saat ini)
 * @param {Array<Object>} tasks - Daftar tugas yang sudah selesai.
 * @param {Date} startBoundary - Awal bulan
 * @param {Date} endBoundary - Akhir bulan
 * @returns {{counts: Object, max: number, orderedKeys: Array<string>}}
 */
function groupTasksWeekly(tasks, startBoundary, endBoundary) {
    const weekOrder = ['1', '2', '3', '4'];
    const counts = { '1': 0, '2': 0, '3': 0, '4': 0 };
    
    tasks.forEach(task => {
        const completedDate = new Date(task.completedAt);
        if (completedDate >= startBoundary && completedDate <= endBoundary) {
            // Hitung week of month
            const startOfMonth = new Date(completedDate.getFullYear(), completedDate.getMonth(), 1);
            const dayOfMonth = completedDate.getDate();
            const startDay = startOfMonth.getDay(); // 0 = Sunday
            
            // Hitung week number (sama seperti Calendar.WEEK_OF_MONTH di Java)
            let weekNum = Math.ceil((dayOfMonth + startDay) / 7);
            
            // Konsolidasi week 5 ke week 4
            if (weekNum === 5) weekNum = 4;
            
            const weekKey = weekNum.toString();
            if (counts.hasOwnProperty(weekKey)) {
                counts[weekKey]++;
            }
        }
    });
    
    const max = Math.max(...Object.values(counts), 0);
    
    return { counts, max, orderedKeys: weekOrder };
}

/**
 * Mengelompokkan tugas selesai untuk MONTHLY stats (6 bulan berturut-turut)
 * @param {Array<Object>} tasks - Daftar tugas yang sudah selesai.
 * @param {Date} startBoundary - Awal periode 6 bulan
 * @param {Date} endBoundary - Akhir periode 6 bulan
 * @returns {{counts: Object, max: number, orderedKeys: Array<string>}}
 */
function groupTasksMonthly(tasks, startBoundary, endBoundary) {
    const counts = {};
    const orderedKeys = [];
    
    // Generate 6 bulan berurutan
    const tempDate = new Date(startBoundary);
    for (let i = 0; i < 6; i++) {
        const monthKey = getMonthAbbreviation(tempDate);
        orderedKeys.push(monthKey);
        counts[monthKey] = 0;
        tempDate.setMonth(tempDate.getMonth() + 1);
    }
    
    // Hitung tasks yang selesai
    tasks.forEach(task => {
        const completedDate = new Date(task.completedAt);
        if (completedDate >= startBoundary && completedDate <= endBoundary) {
            const monthKey = getMonthAbbreviation(completedDate);
            if (counts.hasOwnProperty(monthKey)) {
                counts[monthKey]++;
            }
        }
    });
    
    const max = Math.max(...Object.values(counts), 0);
    
    return { counts, max, orderedKeys };
}

/**
 * Mengambil tugas selesai dan memprosesnya menjadi data bagan berdasarkan tab.
 * @param {string} tabType - 'daily', 'weekly', atau 'monthly'.
 */
async function fetchAndProcessStats(tabType) {
    const user = typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser;
    if (!user) return null;
    
    // 1. Ambil semua tugas selesai
    const allCompletedTasks = await window.fetchData('/tasks?status=completed');
    if (!Array.isArray(allCompletedTasks)) return null;

    let startBoundary, endBoundary, groupingResult;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // 2. Tentukan Batas Waktu dan Proses Data
    if (tabType === 'daily') {
        // Minggu ini (Senin - Minggu)
        startBoundary = getStartOfWeek(now);
        endBoundary = new Date(startBoundary);
        endBoundary.setDate(endBoundary.getDate() + 6);
        endBoundary.setHours(23, 59, 59, 999);
        
        groupingResult = groupTasksDaily(allCompletedTasks, startBoundary, endBoundary);
        
    } else if (tabType === 'weekly') {
        // Bulan Saat Ini
        startBoundary = new Date(now.getFullYear(), now.getMonth(), 1);
        startBoundary.setHours(0, 0, 0, 0);
        
        endBoundary = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endBoundary.setHours(23, 59, 59, 999);
        
        groupingResult = groupTasksWeekly(allCompletedTasks, startBoundary, endBoundary);
        
    } else if (tabType === 'monthly') {
        // Periode Semi-tahunan (Jan-Jun atau Jul-Dec)
        const currentMonth = now.getMonth();
        const startMonth = currentMonth < 6 ? 0 : 6; // 0 = January, 6 = July
        
        startBoundary = new Date(now.getFullYear(), startMonth, 1);
        startBoundary.setHours(0, 0, 0, 0);
        
        endBoundary = new Date(now.getFullYear(), startMonth + 6, 0);
        endBoundary.setHours(23, 59, 59, 999);
        
        groupingResult = groupTasksMonthly(allCompletedTasks, startBoundary, endBoundary);
    } else {
        return null;
    }
    
    const { counts, max, orderedKeys } = groupingResult;
    
    // 3. Tentukan Batang dan Sorotan (Highlight)
    const maxTaskCount = max > 0 ? max : 1;
    let chartBars = [];
    let maxBarScore = -1;
    let maxBarIndex = -1;
    
    const MIN_SCALE = 0.05;

    orderedKeys.forEach((key, index) => {
        const count = counts[key] || 0;
        
        // LOGIKA BARU: >= untuk memilih yang terbaru jika nilainya sama
        if (count >= maxBarScore) {
            maxBarScore = count;
            maxBarIndex = index;
        }
        
        // Perhitungan Skala Linear: 0% jika count 0, minimal MIN_SCALE jika count > 0
        let scale = 0;
        if (count > 0) {
            const normalizedCount = count / maxTaskCount;
            scale = Math.max(MIN_SCALE, normalizedCount);
        }
        
        // Label singkat sesuai dengan fragment Kotlin
        let labelText = key;
        if (tabType === 'daily') {
            // Label Harian: Hanya huruf pertama (M, T, W, T, F, S, S)
            labelText = key.substring(0, 1);
        } else if (tabType === 'weekly') {
            // Label Mingguan: 1, 2, 3, 4
            labelText = key;
        } else if (tabType === 'monthly') {
            // Label Bulanan: Jan, Feb, Mar (sudah 3 huruf)
            labelText = key;
        }

        chartBars.push({
            height: `${scale * 100}%`,
            label: labelText,
            highlight: false,
            count: count,
            clickable: count > 0 // Hanya aktifkan klik jika ada task
        });
    });
    
    // Terapkan sorotan hanya jika ada data yang dicatat (max > 0)
    if (max > 0 && maxBarIndex !== -1) {
        chartBars[maxBarIndex].highlight = true;
    }

    return {
        title: tabType.charAt(0).toUpperCase() + tabType.slice(1) + ' Productivity Statistics',
        score: maxBarScore >= 0 ? maxBarScore : 0, // Skor awal adalah skor tertinggi
        bars: chartBars
    };
}

/**
 * Memperbarui tampilan bagan dan skor berdasarkan data yang diproses.
 * @param {string} tabType - 'daily', 'weekly', atau 'monthly'.
 */
async function updateChart(tabType) {
    const statsData = await fetchAndProcessStats(tabType);
    
    const chartTitleElement = document.querySelector('.card-header h3');
    const scoreElement = document.querySelector('.productivity-score span');
    const chartContainer = document.querySelector('.chart-container');
    
    if (!chartTitleElement || !scoreElement || !chartContainer) return;

    if (!statsData) {
        chartTitleElement.textContent = 'Productivity Statistics';
        scoreElement.textContent = '0';
        chartContainer.innerHTML = '<p style="text-align:center; padding: 20px;">No Data Available</p>';
        chartContainer.className = 'chart-container';
        chartContainer.classList.add(`chart-${tabType}`);
        return;
    }
    
    chartTitleElement.textContent = statsData.title;
    
    chartContainer.innerHTML = '';
    chartContainer.className = 'chart-container';
    chartContainer.classList.add(`chart-${tabType}`);
    
    // Atur skor awal (skor tertinggi, atau 0 jika tidak ada data)
    scoreElement.textContent = statsData.score.toString();
    
    statsData.bars.forEach(bar => {
        const barWrapper = document.createElement('div');
        barWrapper.className = 'bar-wrapper';
        
        // Buat elemen bar dan label
        const cursorStyle = bar.clickable ? 'pointer' : 'default';
        barWrapper.innerHTML = `
            <div class="${bar.highlight ? 'bar highlight' : 'bar'}" 
                 style="height: ${bar.height}; cursor: ${cursorStyle};" 
                 data-count="${bar.count}">
            </div>
            <span class="label">${bar.label}</span>
        `;
        chartContainer.appendChild(barWrapper);
        
        // Tambahkan event listener HANYA jika bar memiliki data (count > 0)
        const newBar = barWrapper.querySelector('.bar');
        if (newBar && bar.clickable) {
            newBar.addEventListener('click', () => {
                // Update tampilan skor utama
                scoreElement.textContent = bar.count;
                // Hapus highlight dari bar lain dan terapkan pada bar yang diklik
                chartContainer.querySelectorAll('.bar.highlight').forEach(b => {
                    if (b !== newBar) b.classList.remove('highlight');
                });
                newBar.classList.add('highlight');
            });
        }
    });
}

// Ekspos fungsi-fungsi ke objek global untuk diakses oleh profile.js
window.TaskApp.updateChart = updateChart;