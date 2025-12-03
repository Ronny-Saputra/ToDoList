// File: upcoming-tasks.js
// Script untuk handle popup upcoming tasks (tugas H-1)
// ✅ VERSI SIMPLIFIED: Menggunakan data dari Backend API langsung

let hasShownUpcomingTasksPopup = false;

function isFirstAppOpen() {
  const isFirstOpen = sessionStorage.getItem('hasOpenedApp') === null;
  console.log("🔍 isFirstAppOpen:", isFirstOpen);
  
  if (isFirstOpen) {
    sessionStorage.setItem('hasOpenedApp', 'true');
  }
  
  return isFirstOpen;
}

function isJustLoggedIn() {
  const justLoggedIn = sessionStorage.getItem('justLoggedIn') === 'true';
  console.log("🔍 isJustLoggedIn:", justLoggedIn);
  
  if (justLoggedIn) {
    sessionStorage.removeItem('justLoggedIn');
  }
  
  return justLoggedIn;
}

// ✅ FUNGSI BARU: Ambil upcoming tasks dari Backend API
async function getUpcomingTasks() {
  try {
    const user = firebase.auth().currentUser;
    
    if (!user) {
      console.log("❌ User not logged in");
      return [];
    }

    console.log("✅ User authenticated:", user.uid);

    // 1️⃣ Panggil Backend API untuk ambil semua pending tasks
    const tasks = await window.fetchData('/tasks?status=pending');
    
    if (!Array.isArray(tasks)) {
      console.error("❌ Invalid tasks response from API");
      return [];
    }

    console.log("📦 Total pending tasks from API:", tasks.length);

    // 2️⃣ Filter tasks yang jatuh tempo dalam 24 jam
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + (24 * 60 * 60 * 1000));

    console.log("📅 Now:", now.toLocaleString());
    console.log("📅 24 hours from now:", oneDayFromNow.toLocaleString());

    const upcomingTasks = [];

    tasks.forEach(task => {
      // Parse deadline dari task
      let taskDeadline;
      
      if (task.dueDate) {
        // Backend mengirim ISO string
        taskDeadline = new Date(task.dueDate);
      } else if (task.date) {
        // Fallback: gunakan date + end of day
        taskDeadline = new Date(task.date + " 23:59:59");
      } else {
        console.log("  ⚠️ Task has no deadline:", task.title);
        return;
      }

      console.log(`🔍 Checking: "${task.title}" | Deadline: ${taskDeadline.toLocaleString()}`);

      // Cek apakah task jatuh tempo dalam 24 jam
      if (taskDeadline <= oneDayFromNow && taskDeadline >= now) {
        console.log(`  ✅ UPCOMING! Task due in ${Math.round((taskDeadline - now) / (1000 * 60 * 60))} hours`);
        upcomingTasks.push({
          ...task,
          deadlineDate: taskDeadline
        });
      } else if (taskDeadline < now) {
        console.log("  ⏰ Task is PAST due (should be in missed)");
      } else {
        console.log("  ⏳ Task is too far in the future");
      }
    });

    // Sort by deadline (paling dekat duluan)
    upcomingTasks.sort((a, b) => a.deadlineDate - b.deadlineDate);

    console.log("📋 Final upcoming tasks count:", upcomingTasks.length);
    if (upcomingTasks.length > 0) {
      console.log("📋 Upcoming tasks:", upcomingTasks.map(t => ({
        title: t.title,
        deadline: t.deadlineDate.toLocaleString()
      })));
    }

    return upcomingTasks;

  } catch (error) {
    console.error("❌ Error fetching upcoming tasks:", error);
    return [];
  }
}

function showUpcomingTasksPopup() {
  const popup = document.getElementById('upcoming-tasks-popup');
  
  if (!popup) {
    console.error("❌ Popup element not found!");
    return;
  }
  
  popup.classList.add('show');
  hasShownUpcomingTasksPopup = true;
  console.log("✅ Upcoming tasks popup shown");
}

function closeUpcomingTasksPopup() {
  const popup = document.getElementById('upcoming-tasks-popup');
  
  if (popup) {
    popup.classList.remove('show');
    console.log("✅ Popup closed by user (Ignore button)");
  }
}

function viewUpcomingTasks() {
  console.log("✅ Redirecting to tasks page...");
  sessionStorage.setItem('showUpcomingTasks', 'true');
  window.location.href = './task.html'; // Perbaiki path (hapus '../pages/')
}

async function checkAndShowUpcomingTasksPopup() {
  try {
    console.log("🚀 Starting popup check...");
    
    // ✅ HANYA CEK SAAT FIRST OPEN ATAU JUST LOGGED IN
    const shouldCheckUpcoming = isFirstAppOpen() || isJustLoggedIn();

    if (!shouldCheckUpcoming) {
      console.log("⏭️ Not first app open or just logged in, skipping popup check");
      return;
    }

    if (hasShownUpcomingTasksPopup) {
      console.log("⏭️ Popup already shown in this session, skipping");
      return;
    }

    console.log("🔍 Checking for upcoming tasks...");

    // ✅ AMBIL DATA DARI BACKEND API
    const upcomingTasks = await getUpcomingTasks();

    console.log(`📊 Found ${upcomingTasks.length} upcoming task(s)`);

    if (upcomingTasks.length > 0) {
      // Update pesan popup dengan jumlah tasks
      const messageElement = document.querySelector('.popup-message');
      if (messageElement) {
        const taskCount = upcomingTasks.length;
        const taskWord = taskCount === 1 ? 'task' : 'tasks';
        
        messageElement.innerHTML = `
          You have <strong>${taskCount} ${taskWord}</strong> due within 24 hours.<br />
          Don't forget to complete them!
        `;
      }

      showUpcomingTasksPopup();
    } else {
      console.log("ℹ️ No upcoming tasks found");
    }

  } catch (error) {
    console.error("❌ Error in checkAndShowUpcomingTasksPopup:", error);
  }
}

// ✅ INISIALISASI SAAT DOM READY
document.addEventListener('DOMContentLoaded', () => {
  console.log("📄 Home page loaded, initializing upcoming tasks check...");

  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      console.log("✅ User authenticated:", user.uid);
      
      // Tunggu 1 detik untuk pastikan semua script sudah loaded
      setTimeout(() => {
        checkAndShowUpcomingTasksPopup();
      }, 1000);
    } else {
      console.log("❌ No user logged in");
    }
  });
});

// Expose functions globally
window.closeUpcomingTasksPopup = closeUpcomingTasksPopup;
window.viewUpcomingTasks = viewUpcomingTasks;
window.checkAndShowUpcomingTasksPopup = checkAndShowUpcomingTasksPopup; // Untuk testing manual

console.log("✅ upcoming-tasks.js loaded successfully");