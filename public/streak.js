// File: public/streak.js

// Function to calculate the longest consecutive streak ending on today or yesterday
function calculateConsecutiveStreak(doneDates) {
    if (doneDates.length === 0) return 0;
    
    // Convert string dates to Date objects, normalize to midnight, and sort unique dates
    const dates = doneDates.map(dateStr => new Date(dateStr.replace(/-/g, '/')));
    const normalizedDates = dates.map(d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
    const uniqueNormalizedDates = [...new Set(normalizedDates)].sort((a, b) => a - b);
    
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    let isStreakActiveToday = uniqueNormalizedDates.includes(today.getTime());
    let isStreakActiveYesterday = uniqueNormalizedDates.includes(yesterday.getTime());
    
    // Determine the starting point for backward check
    let lastProductiveDayTime = 0;
    
    // LOGIKA RESET STREAK: Streak hanya aktif jika ada tugas yang selesai hari ini ATAU kemarin.
    if (isStreakActiveToday) {
        lastProductiveDayTime = today.getTime();
        currentStreak = 1;
    } else if (isStreakActiveYesterday) {
        lastProductiveDayTime = yesterday.getTime();
        currentStreak = 1;
    } else {
        // Streak is broken if no task completed today or yesterday, reset to 0
        return 0;
    }
    
    let comparisonDate = new Date(lastProductiveDayTime);
    
    // Find the index of the last productive day in the unique list
    let lastIndex = uniqueNormalizedDates.findIndex(time => time === comparisonDate.getTime());
    
    // Start counting back from the day before the last productive day
    for (let i = lastIndex - 1; i >= 0; i--) {
        const prevDate = uniqueNormalizedDates[i];
        
        comparisonDate.setDate(comparisonDate.getDate() - 1);
        const dayBeforeTime = comparisonDate.getTime();
        
        if (prevDate === dayBeforeTime) {
            currentStreak++;
        } else {
            // Streak broken
            break;
        }
    }
    return currentStreak;
}

// --- Update streak UI ---
function updateStreakUI(streakStartInWeekIndex, streakDaysInWeek, currentStreak) {
  const progressFill = document.getElementById("progress-fill");
  const runnerIcon = document.getElementById("runner-icon");
  const streakNumber = document.querySelector(".streak-number");
  const dotTrack = document.getElementById("dot-track");

  if (!progressFill || !runnerIcon || !streakNumber || !dotTrack) return;

  // 1. Update Streak Number (Now the actual consecutive streak)
  streakNumber.textContent = currentStreak;

  // 2. Calculate runner position and fill width
  let fillPercent = 0;
  
  if (currentStreak > 0 && streakStartInWeekIndex !== -1) {
      // Calculate the start position in percentage for the progress fill bar
      const startPercent = (streakStartInWeekIndex / 7) * 100;
      
      // Calculate the width of the filled section in percentage
      const widthPercent = (streakDaysInWeek / 7) * 100;
      
      // The runner position is at the end of the filled bar
      fillPercent = startPercent + widthPercent;
      
      progressFill.style.left = `${startPercent}%`;
      progressFill.style.width = `${widthPercent}%`;
      runnerIcon.style.left = `${fillPercent}%`;
  } else {
      // Streak is 0 or calculation failed
      progressFill.style.left = `0%`;
      progressFill.style.width = `0%`;
      runnerIcon.style.left = `0%`;
  }
  
  // 3. Generate dots and hide those that are completed
  dotTrack.innerHTML = "";
  for (let i = 0; i < 7; i++) {
    const dot = document.createElement("div");
    dot.classList.add("dot");

    // Hide dots if they are within the completed streak range this week.
    // Index 'i' goes from 0 (Mon) to 6 (Sun).
    if (currentStreak > 0 && streakStartInWeekIndex !== -1 && i >= streakStartInWeekIndex && i < streakStartInWeekIndex + streakDaysInWeek) {
        dot.style.opacity = "0"; // Hide completed dots
    }
    
    dotTrack.appendChild(dot);
  }

  console.log(`Streak updated: Start Index=${streakStartInWeekIndex}, Days this week=${streakDaysInWeek}, Current Streak=${currentStreak}`);
}


document.addEventListener("DOMContentLoaded", async () => {
  // Hanya jalankan di halaman home.html
  if (!window.location.pathname.includes("home.html")) return;
  console.log("Loading streak progress...");

  // Pastikan Firebase sudah diinisialisasi dan pengguna sudah login
  if (typeof firebase === 'undefined' || !firebase.auth) {
      console.error("Firebase not loaded.");
      return;
  }

  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      console.log("User not logged in, skip streak update.");
      return;
    }

    const db = firebase.firestore();
    const tasksRef = db.collection("users").doc(user.uid).collection("tasks");

    try {
      const snapshot = await tasksRef.where("done", "==", true).get();

      // --- 1. Get unique completion dates
      const doneDates = [...new Set(snapshot.docs.map(doc => doc.data().date))];

      // --- 2. Calculate current consecutive streak
      const currentConsecutiveStreak = calculateConsecutiveStreak(doneDates);
      
      // --- 3. Calculate streak start and length within this week
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let streakDaysInWeek = 0;

      if (currentConsecutiveStreak > 0) {
          // Get the start date of the overall consecutive streak
          const dates = doneDates.map(dateStr => new Date(dateStr.replace(/-/g, '/')));
          const normalizedDates = dates.map(d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
          const uniqueNormalizedDates = [...new Set(normalizedDates)].sort((a, b) => a - b);
          
          // Check if uniqueNormalizedDates has enough elements
          if (uniqueNormalizedDates.length >= currentConsecutiveStreak) {
              const streakStartDateTimestamp = uniqueNormalizedDates[uniqueNormalizedDates.length - currentConsecutiveStreak];
              const streakStartDate = new Date(streakStartDateTimestamp);
              
              // Get the start of the current week (Monday)
              const startOfWeek = new Date(today);
              startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); 
              startOfWeek.setHours(0, 0, 0, 0);

              // The effective start day for the weekly progress bar is the later of:
              // a) The start of the week (if streak started before)
              // b) The start of the streak (if streak started this week)
              const effectiveStartDate = (streakStartDate.getTime() < startOfWeek.getTime()) ? startOfWeek : streakStartDate;
              
              // Calculate the number of days from effective start to today (inclusive)
              const diffTime = today.getTime() - effectiveStartDate.getTime();
              streakDaysInWeek = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to be inclusive of today
              
              streakDaysInWeek = Math.min(streakDaysInWeek, 7); // Cap at 7 days
              
              // Re-calculate the start index based on the effective start date
              let effectiveDayIndex = effectiveStartDate.getDay();
              const effectiveStartInWeekIndex = (effectiveDayIndex + 6) % 7;
              
              // Update UI with the final calculated values
              updateStreakUI(effectiveStartInWeekIndex, streakDaysInWeek, currentConsecutiveStreak);
          } else {
             updateStreakUI(-1, 0, 0); // Data inconsistency fallback
          }

      } else {
          // No active streak (0 days)
          updateStreakUI(-1, 0, 0);
      }

    } catch (err) {
      console.error("Error loading streak:", err);
    }
  });
});