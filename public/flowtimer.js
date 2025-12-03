// File: public/flowtimer.js

document.addEventListener("DOMContentLoaded", function () {
  // --- UTILITY: Format Duration Milis to String (Local to flowtimer.js) ---
  function formatDurationToString(millis) {
    const MILLIS_IN_HOUR = 3600000;
    const MILLIS_IN_MINUTE = 60000;
    const MILLIS_IN_SECOND = 1000;

    const durationHours = Math.floor(millis / MILLIS_IN_HOUR);
    const remainingAfterHours = millis % MILLIS_IN_HOUR;
    const durationMinutes = Math.floor(remainingAfterHours / MILLIS_IN_MINUTE);
    const durationSeconds = Math.floor(
      (remainingAfterHours % MILLIS_IN_MINUTE) / MILLIS_IN_SECOND,
    );

    let parts = [];
    if (durationHours > 0) parts.push(`${durationHours}h`);
    if (durationMinutes > 0) parts.push(`${durationMinutes}m`);
    if (durationSeconds > 0) parts.push(`${durationSeconds}s`);

    return parts.join(" ") || "0s";
  }

  // --- UTILITY: SHOW CUSTOM DIALOG ---
  window.showCustomDialog = function (message, buttons) {
    const dialogOverlay = document.getElementById("custom-dialog-overlay");
    const dialogMessage = dialogOverlay
      ? dialogOverlay.querySelector("#custom-dialog-message")
      : null;
    const dialogActions = dialogOverlay
      ? dialogOverlay.querySelector("#custom-dialog-actions")
      : null;

    if (!dialogOverlay || !dialogMessage || !dialogActions) {
      console.error(
        "Custom dialog elements not found in the DOM. Cannot display complex dialog.",
      );
      alert(message);
      return;
    }

    dialogMessage.textContent = message;
    dialogActions.innerHTML = "";

    buttons.forEach((btn, index) => {
      const buttonElement = document.createElement("button");
      buttonElement.textContent = btn.text;
      buttonElement.classList.add("dialog-btn");

      if (btn.isPrimary) {
        buttonElement.classList.add("primary");
      }

      buttonElement.addEventListener("click", () => {
        dialogOverlay.classList.remove("open");
        if (btn.action) {
          btn.action();
        }
      });

      if (index > 0 && buttons.length > 1) {
        buttonElement.style.borderLeft = "1px solid #ddd";
      }

      dialogActions.appendChild(buttonElement);
    });

    dialogOverlay.classList.add("open");
  };

  // --- UTILITY: SHOW DURATION PICKER (For setting new duration) ---
  function showDurationPicker(onSave) {
    const pickerOverlay = document.getElementById("flow-timer-picker-overlay");
    const hoursInput = document.getElementById("flow-timer-hours-input");
    const minutesInput = document.getElementById("flow-timer-minutes-input");
    const secondsInput = document.getElementById("flow-timer-seconds-input");
    const cancelBtn = document.getElementById("flow-timer-cancel");
    const saveBtn = document.getElementById("flow-timer-save");

    if (!pickerOverlay) {
      // ⬅️ TRANSLATION HERE
      window.showCustomDialog(
        "Failed to load duration picker. Returning to task list.",
        [
          {
            text: "OK",
            action: () => (window.location.href = "../pages/task.html"),
            isPrimary: true,
          },
        ],
      );
      return;
    }

    // Reset inputs to 30 minutes
    hoursInput.value = "0";
    minutesInput.value = "30";
    secondsInput.value = "0";

    const saveListener = () => {
      const hours = parseInt(hoursInput.value) || 0;
      const minutes = parseInt(minutesInput.value) || 0;
      const seconds = parseInt(secondsInput.value) || 0;

      const totalMillis = hours * 3600000 + minutes * 60000 + seconds * 1000;

      if (totalMillis <= 0) {
        // ⬅️ TRANSLATION HERE
        window.showCustomDialog("Duration cannot be zero.", [
          { text: "OK", action: () => {}, isPrimary: true },
        ]);
        return;
      }

      removeListeners();
      pickerOverlay.classList.remove("open");
      onSave(totalMillis);
    };

    const cancelListener = () => {
      removeListeners();
      pickerOverlay.classList.remove("open");
      window.location.href = "../pages/task.html";
    };

    const overlayClickListener = (e) => {
      if (e.target === pickerOverlay) {
        cancelListener();
      }
    };

    function removeListeners() {
      saveBtn.removeEventListener("click", saveBtn.listener);
      cancelBtn.removeEventListener("click", cancelBtn.listener);
      pickerOverlay.removeEventListener("click", pickerOverlay.listener);
    }

    saveBtn.listener = saveListener;
    cancelBtn.listener = cancelListener;
    pickerOverlay.listener = overlayClickListener;

    removeListeners();

    saveBtn.addEventListener("click", saveListener);
    cancelBtn.addEventListener("click", cancelListener);
    pickerOverlay.addEventListener("click", overlayClickListener);

    pickerOverlay.classList.add("open");
  }

  const activityTitleEl = document.getElementById("activityTitle");
  const timerDisplayEl = document.getElementById("timerDisplay");
  const controlBtn = document.getElementById("controlBtn");
  const controlIcon = controlBtn?.querySelector("i");

  const alarmAudio = new Audio("../assets/alarm_sound.mp3");

  let totalDurationSeconds = 1800;
  let timeLeft = totalDurationSeconds;
  let timerInterval = null;
  let isRunning = false;
  let activityName = "";

  // --- UTILITY: Format Time ---
  function formatTime(seconds) {
    if (seconds >= 3600) {
      const hrs = Math.floor(seconds / 3600);
      const min = Math.floor((seconds % 3600) / 60);
      const sec = seconds % 60;
      return `${String(hrs).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    }

    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  // --- DIALOG CHAIN LOGIC (Mimics FlowTimerActivity.kt) ---

  function showCompletionDialog() {
    window.showCustomDialog("Time's up! Are you done with your task?", [
      {
        text: "No",
        action: () => {
          showRescheduleDialog();
        },
        isPrimary: false,
      },
      {
        text: "Yes",
        action: async () => {
          alarmAudio.pause(); // Stop Alarm
          alarmAudio.currentTime = 0;
          
          // ✅ MARK TASK AS COMPLETED (SAMA DENGAN LOGIC CHECKBOX)
          await markTaskAsCompleted();
        },
        isPrimary: true,
      },
    ]);
  }
  
  // ✅ FUNCTION OPTIMIZED - PARALLEL API CALLS
async function markTaskAsCompleted() {

  // Tambahkan di awal function markTaskAsCompleted()
const loadingOverlay = document.getElementById('loading-overlay');
if (loadingOverlay) loadingOverlay.style.display = 'flex';

// Tambahkan sebelum showCustomDialog (sukses atau error)
if (loadingOverlay) loadingOverlay.style.display = 'none';
  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      window.showCustomDialog("Please log in first.", [
        { text: "OK", action: () => window.location.href = "../pages/login.html", isPrimary: true }
      ]);
      return;
    }

    // Get task ID from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get("taskId");
    
    if (!taskId) {
      console.warn("No task ID found. Redirecting to task page.");
      window.location.href = "../pages/task.html";
      return;
    }

    console.log("🔍 Debug: Starting markTaskAsCompleted for taskId:", taskId);

    // ✅ CEK APAKAH window.fetchData ADA
    if (typeof window.fetchData !== 'function') {
      console.error("❌ window.fetchData is not available!");
      window.showCustomDialog("System error: fetchData not available.", [
        { text: "OK", action: () => window.location.href = "../pages/task.html", isPrimary: true }
      ]);
      return;
    }

    // Format date helper (sama dengan task.js)
    function formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    // ✅ OPTIMASI: Jalankan fetch original task dan streak state SECARA PARALEL
    console.log("📡 Fetching data in parallel...");
    
    const [allTasksResult, initialStreakResult] = await Promise.allSettled([
      window.fetchData("/tasks?status=pending"),
      window.fetchData("/stats/streak")
    ]);

    // Process original task
    let originalTask = null;
    if (allTasksResult.status === 'fulfilled') {
      const allTasks = allTasksResult.value;
      originalTask = Array.isArray(allTasks) ? allTasks.find(t => t.id === taskId) : null;
      console.log("✅ Original task fetched:", originalTask);
    } else {
      console.error("❌ Failed to fetch original task:", allTasksResult.reason);
    }

    // Process streak state
    let initialStreakState = { currentStreak: 0 };
    if (initialStreakResult.status === 'fulfilled') {
      initialStreakState = initialStreakResult.value || {};
      initialStreakState.currentStreak = initialStreakState.currentStreak || 0;
      console.log("✅ Streak state fetched:", initialStreakState);
    } else {
      console.error("❌ Failed to fetch streak state:", initialStreakResult.reason);
    }

    // 3. Update task status dan streak SECARA PARALEL
    const updateData = {
      done: true,
      status: "completed",
      date: formatDate(new Date())
    };

    console.log("📡 Updating task and streak in parallel...");
    
    const [updateTaskResult, updateStreakResult] = await Promise.allSettled([
      window.fetchData(`/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      }),
      window.fetchData("/stats/streak/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    ]);

    // Check task update result
    if (updateTaskResult.status === 'rejected') {
      throw new Error("Failed to update task: " + updateTaskResult.reason);
    }
    console.log("✅ Task updated successfully");

    // Process streak update result
    let newStreakNumber = 0;
    let streakIncremented = false;

    if (updateStreakResult.status === 'fulfilled') {
      const updatedState = updateStreakResult.value;
      newStreakNumber = updatedState.currentStreak || 0;
      console.log("✅ Streak updated:", newStreakNumber);

      if (newStreakNumber > initialStreakState.currentStreak) {
        streakIncremented = true;
      }
    } else {
      console.error("❌ Error updating streak:", updateStreakResult.reason);
    }

    // 4. Save to localStorage (SYNC - cepat)
    const taskData = {
      id: taskId,
      title: activityName,
      completedAt: new Date().toISOString(),
      date: formatDate(new Date()),
      time: originalTask?.time || "",
      location: originalTask?.location || ""
    };
    
    const completedTasks = JSON.parse(localStorage.getItem("completedTasks") || "[]");
    const existingIndex = completedTasks.findIndex((t) => t.id === taskId);
    if (existingIndex === -1) {
      completedTasks.push(taskData);
      localStorage.setItem("completedTasks", JSON.stringify(completedTasks));
      console.log("✅ Saved to completedTasks localStorage");
    }

    // 5. Trigger profile update (SYNC - cepat)
    localStorage.setItem("profileUpdateTrigger", new Date().getTime().toString());

    // 6. Show dialog
    let dialogMessage = "Task marked as done!";

    if (streakIncremented) {
      dialogMessage = `🎉 Yay, you're on fire! ${newStreakNumber} streak!`;
    }

    console.log("✅ All operations completed successfully");

    window.showCustomDialog(dialogMessage, [
      { 
        text: "OK", 
        action: () => window.location.href = "../pages/task.html", 
        isPrimary: true 
      }
    ]);

  } catch (err) {
    console.error("❌ Error marking task as completed:", err);
    console.error("Error details:", err.message, err.stack);
    
    window.showCustomDialog("Failed to update task status. Please try again.", [
      { 
        text: "OK", 
        action: () => window.location.href = "../pages/task.html", 
        isPrimary: true 
      }
    ]);
  }
}

  function showRescheduleDialog() {
    // ⬅️ TRANSLATION HERE
    window.showCustomDialog(
      "Would you like to extend the Flow Timer duration?",
      [
        {
          text: "No", // ⬅️ TRANSLATION HERE
          action: () => {
            alarmAudio.pause(); // Stop Alarm
            alarmAudio.currentTime = 0;
            window.location.href = "../pages/task.html"; // Finish Activity
          },
          isPrimary: false,
        },
        {
          text: "Yes", // ⬅️ TRANSLATION HERE
          action: () => {
            alarmAudio.pause(); // Stop Alarm when Duration Picker appears
            alarmAudio.currentTime = 0;

            showDurationPicker((newDurationMillis) => {
              totalDurationSeconds = Math.floor(newDurationMillis / 1000);
              timeLeft = totalDurationSeconds;

              if (timerDisplayEl)
                timerDisplayEl.textContent = formatTime(timeLeft);
              if (controlIcon) controlIcon.className = "fas fa-play"; // Set icon to Play
              isRunning = false;

              // ⬅️ TRANSLATION HERE
              window.showCustomDialog(
                "Flow Timer duration has been reset. Press Play to start.",
                [{ text: "OK", action: () => {}, isPrimary: true }],
              );
            });
          },
          isPrimary: true,
        },
      ],
    );
  }

  // --- MAIN FUNCTION: Update Timer ---
  function updateTimer() {
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      isRunning = false;
      if (controlIcon) controlIcon.className = "fas fa-redo";
      if (timerDisplayEl) timerDisplayEl.textContent = formatTime(0);

      // START ALARM AND DIALOG CHAIN
      alarmAudio.loop = true;
      alarmAudio
        .play()
        .then(() => {
          console.log("Audio started successfully.");
        })
        .catch((error) => {
          console.warn(
            "Audio play blocked or failed. User interaction is required.",
            error,
          );
        });

      showCompletionDialog();
      return;
    }

    timeLeft--;
    if (timerDisplayEl) timerDisplayEl.textContent = formatTime(timeLeft);
  }

  // --- MAIN FUNCTION: Toggle Timer (Play/Pause) ---
  function toggleTimer() {
    if (!controlIcon) return;

    // ENSURE ALARM STOPS WHEN TIMER IS PLAYED/PAUSED
    alarmAudio.pause();
    alarmAudio.currentTime = 0;

    if (isRunning) {
      // Pause
      clearInterval(timerInterval);
      isRunning = false;
      controlIcon.className = "fas fa-play";
    } else {
      // Play (or Reset)
      if (timeLeft <= 0) {
        timeLeft = totalDurationSeconds;
        if (timerDisplayEl) timerDisplayEl.textContent = formatTime(timeLeft);
      }

      // Start
      timerInterval = setInterval(updateTimer, 1000);
      isRunning = true;
      controlIcon.className = "fas fa-pause";
    }
  }

  // --- INITIALIZATION ---
  function initFlowTimer() {
    const urlParams = new URLSearchParams(window.location.search);

    let duration = urlParams.get("duration");
    const activity = urlParams.get("activity");

    let initialDuration = 1800;

    if (duration) {
      const parsedDuration = parseInt(duration);
      if (!isNaN(parsedDuration) && parsedDuration > 0) {
        initialDuration = parsedDuration;
      }
    }

    totalDurationSeconds = initialDuration;
    timeLeft = totalDurationSeconds;

    if (activity) {
      activityName = decodeURIComponent(activity);
    }

    if (activityTitleEl) activityTitleEl.textContent = activityName;
    if (timerDisplayEl) timerDisplayEl.textContent = formatTime(timeLeft);

    controlBtn?.addEventListener("click", toggleTimer);

    if (typeof firebase !== "undefined" && firebase.auth) {
      firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
          window.location.href = "../pages/login.html";
        }
      });
    }
  }

  initFlowTimer();
});
