// File: public/statistic.js

window.TaskApp = window.TaskApp || {};
window.TaskApp.LOCALE = "en-US"; // Menggunakan English untuk konsistensi key (Mon, Tue, Jan, Feb)

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
  return date.toLocaleDateString("en-US", { month: "short" });
}

/**
 * Mengelompokkan tugas selesai untuk DAILY stats (Mon-Sun)
 * @param {Array<Object>} tasks - Daftar tugas yang sudah selesai.
 * @param {Date} startBoundary - Senin minggu ini
 * @param {Date} endBoundary - Minggu minggu ini
 * @returns {{counts: Object, max: number, orderedKeys: Array<string>}}
 */
function groupTasksDaily(tasks, startBoundary, endBoundary) {
  // JS Date.getDay(): 0=Sun, 1=Mon, ..., 6=Sat
  // Kita ingin output dalam urutan: Mon, Tue, ..., Sun
  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const counts = {};

  // Initialize all days dengan 0
  dayOrder.forEach((day) => {
    counts[day] = 0;
  });

  // Hitung tasks yang selesai
  tasks.forEach((task) => {
    // Asumsi task memiliki field 'completedAt' yang merupakan ISO string
    const completedDate = new Date(task.completedAt);

    // Cek apakah tanggal berada dalam batas (Walaupun query backend sudah filter)
    if (completedDate >= startBoundary && completedDate <= endBoundary) {
      const dayName = completedDate.toLocaleDateString("en-US", {
        weekday: "short",
      });
      // JS Date.toLocaleDateString menghasilkan: Mon, Tue, Wed, Thu, Fri, Sat, Sun
      if (counts.hasOwnProperty(dayName)) {
        counts[dayName]++;
      } else {
        // Karena JS Sunday=0, dan urutan dimulai dari Senin (1),
        // Sunday akan terhitung dengan nama 'Sun' (sesuai locale short)
        if (dayName === "Sun") counts["Sun"]++;
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
  // ✅ PERBAIKAN: Menggunakan 4 minggu alih-alih 5
  const weekOrder = ["1", "2", "3", "4"];
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };

  tasks.forEach((task) => {
    const completedDate = new Date(task.completedAt);
    if (completedDate >= startBoundary && completedDate <= endBoundary) {
      // Hitung week of month
      const startOfMonth = new Date(
        completedDate.getFullYear(),
        completedDate.getMonth(),
        1,
      );
      const dayOfMonth = completedDate.getDate();
      const startDay = startOfMonth.getDay(); // 0 = Sunday

      // Hitung week number (sama seperti Calendar.WEEK_OF_MONTH di Java)
      let weekNum = Math.ceil((dayOfMonth + startDay) / 7);

      // ✅ PERBAIKAN: Konsolidasi week 5 ke week 4
      if (weekNum >= 5) weekNum = 4;

      // Pastikan weekNum tidak nol
      if (weekNum < 1) weekNum = 1;

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
  tasks.forEach((task) => {
    const completedDate = new Date(task.completedAt);
    // Kita hanya hitung jika dalam rentang 6 bulan yang ditampilkan
    if (completedDate >= startBoundary && completedDate <= endBoundary) {
      // Hitung selisih bulan dari startBoundary
      const diffMonths =
        completedDate.getFullYear() * 12 +
        completedDate.getMonth() -
        (startBoundary.getFullYear() * 12 + startBoundary.getMonth());

      if (diffMonths >= 0 && diffMonths < 6) {
        const monthKey = getMonthAbbreviation(completedDate);
        if (counts.hasOwnProperty(monthKey)) {
          counts[monthKey]++;
        }
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
  const user =
    typeof firebase !== "undefined" &&
    firebase.auth &&
    firebase.auth().currentUser;
  if (!user) return null;

  // 1. Panggil Backend API (Lebih efisien)
  const statsDataRaw = await window.fetchData(
    `/stats/productivity?view=${tabType}`,
  );

  // 2. Format Data sesuai Kebutuhan Frontend
  // Asumsi statsDataRaw adalah Array<number> [Sun, Mon, Tue, ..., Sat] dari backend
  if (!Array.isArray(statsDataRaw)) return null;

  let orderedKeys;
  let maxCount = Math.max(...statsDataRaw, 0);
  let maxBarIndex = -1;

  let chartBars = [];
  const MIN_SCALE = 0.05;

  if (tabType === "daily") {
    // Backend mengirim [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
    // Kita tampilkan: Mon, Tue, Wed, Thu, Fri, Sat, Sun
    const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
    const displayOrder = [1, 2, 3, 4, 5, 6, 0]; // Index JS Date (0=Sun)

    // Temukan nilai tertinggi untuk penyorotan
    let maxScore = -1;
    displayOrder.forEach((jsIndex, displayIndex) => {
      const count = statsDataRaw[jsIndex];
      if (count > maxScore) {
        maxScore = count;
        maxBarIndex = displayIndex;
      }
    });

    // Buat Bar Data
    displayOrder.forEach((jsIndex, displayIndex) => {
      const count = statsDataRaw[jsIndex];
      let scale = 0;
      if (maxCount > 0) {
        const normalizedCount = count / maxCount;
        scale = Math.max(MIN_SCALE, normalizedCount);
      }

      chartBars.push({
        height: `${scale * 100}%`,
        label: dayLabels[displayIndex],
        count: count,
        highlight: displayIndex === maxBarIndex && maxScore > 0,
        clickable: count > 0,
      });
    });
  } else if (tabType === "weekly") {
    // Backend mengirim [W1, W2, W3, W4, W5]
    // ✅ PERBAIKAN: Menggunakan 4 minggu, dan menyesuaikan label
    const rawCounts = statsDataRaw.slice(0, 4); // Ambil 4 minggu pertama
    const labels = ["Week 1", "Week 2", "Week 3", "Week 4"];

    // Temukan nilai tertinggi
    let maxScore = -1;
    maxCount = Math.max(...rawCounts, 0); // Update maxCount

    rawCounts.forEach((count, index) => {
      if (count > maxScore) {
        maxScore = count;
        maxBarIndex = index;
      }
    });

    rawCounts.forEach((count, index) => {
      let scale = 0;
      if (maxCount > 0) {
        const normalizedCount = count / maxCount;
        scale = Math.max(MIN_SCALE, normalizedCount);
      }

      chartBars.push({
        height: `${scale * 100}%`,
        label: labels[index] || "",
        count: count,
        highlight: index === maxBarIndex && maxScore > 0,
        clickable: count > 0,
      });
    });
  } else if (tabType === "monthly") {
    // Backend mengirim 12 bulan, kita hanya ambil 6 bulan pertama atau kedua (sesuai context)
    const now = new Date();
    const currentMonth = now.getMonth();
    const isSecondHalf = currentMonth >= 6; // 0=Jan, 6=Jul
    const startIndex = isSecondHalf ? 6 : 0;

    const rawCounts = statsDataRaw.slice(startIndex, startIndex + 6);
    const allLabels = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const labels = allLabels.slice(startIndex, startIndex + 6);

    // Temukan nilai tertinggi
    let maxScore = -1;
    maxCount = Math.max(...rawCounts, 0); // Update maxCount

    rawCounts.forEach((count, index) => {
      if (count > maxScore) {
        maxScore = count;
        maxBarIndex = index;
      }
    });

    rawCounts.forEach((count, index) => {
      let scale = 0;
      if (maxCount > 0) {
        const normalizedCount = count / maxCount;
        scale = Math.max(MIN_SCALE, normalizedCount);
      }

      chartBars.push({
        height: `${scale * 100}%`,
        label: labels[index] || "",
        count: count,
        highlight: index === maxBarIndex && maxScore > 0,
        clickable: count > 0,
      });
    });
  } else {
    return null;
  }

  // Tentukan skor yang ditampilkan (score tertinggi)
  const finalScore = maxCount > 0 ? maxCount : 0;

  return {
    title:
      tabType.charAt(0).toUpperCase() +
      tabType.slice(1) +
      " Productivity Statistics",
    score: finalScore,
    bars: chartBars,
  };
}

/**
 * Memperbarui tampilan bagan dan skor berdasarkan data yang diproses.
 * @param {string} tabType - 'daily', 'weekly', atau 'monthly'.
 */
async function updateChart(tabType) {
  const statsData = await fetchAndProcessStats(tabType);

  const chartTitleElement = document.getElementById("cardTitle");
  const scoreElement = document.getElementById("productivityScore");
  const chartContainer = document.getElementById("chartContainer");
  const chartLabelsContainer = document.getElementById("chartLabels");

  if (
    !chartTitleElement ||
    !scoreElement ||
    !chartContainer ||
    !chartLabelsContainer
  )
    return;

  if (!statsData) {
    chartTitleElement.textContent = "Productivity Statistics";
    scoreElement.textContent = "0";
    chartContainer.innerHTML =
      '<p style="text-align:center; padding: 20px;">No Data Available</p>';
    chartContainer.className = "chart-container";
    chartContainer.classList.add(`chart-${tabType}`);
    chartLabelsContainer.style.display = "none";
    return;
  }

  chartTitleElement.textContent = statsData.title;

  // Hapus konten lama
  chartContainer.innerHTML = "";

  // Update score
  scoreElement.textContent = statsData.score.toString();

  // Tampilkan Chart Labels
  chartLabelsContainer.style.display = "flex";
  chartLabelsContainer.innerHTML = statsData.bars
    .map((bar) => `<span class="label">${bar.label}</span>`)
    .join("");

  // Render Bars
  statsData.bars.forEach((bar) => {
    const barWrapper = document.createElement("div");
    barWrapper.className = "bar-wrapper";

    // Tinggi bar disesuaikan; min-height 5% untuk visualisasi
    const cursorStyle = bar.clickable ? "pointer" : "default";
    const finalHeight = bar.count === 0 ? "0%" : bar.height;

    barWrapper.innerHTML = `
            <div class="${bar.highlight ? "bar highlight" : "bar"}" 
                 style="height: ${finalHeight}; cursor: ${cursorStyle};" 
                 data-count="${bar.count}">
            </div>
        `;
    chartContainer.appendChild(barWrapper);

    // Tambahkan event listener HANYA jika bar memiliki data (count > 0)
    const newBar = barWrapper.querySelector(".bar");
    if (newBar && bar.clickable) {
      newBar.addEventListener("click", () => {
        // Update tampilan skor utama
        scoreElement.textContent = bar.count;

        // Hapus highlight dari bar lain
        chartContainer.querySelectorAll(".bar.highlight").forEach((b) => {
          b.classList.remove("highlight");
        });

        // Terapkan highlight pada bar yang diklik
        newBar.classList.add("highlight");
      });
    }
  });
}

// Ekspos fungsi-fungsi ke objek global untuk diakses oleh profile.js
window.TaskApp.updateChart = updateChart;
