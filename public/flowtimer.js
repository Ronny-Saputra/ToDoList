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
    // ⬅️ TRANSLATION HERE
    window.showCustomDialog("Time's up! Are you done with your task?", [
      {
        text: "No", // ⬅️ TRANSLATION HERE
        action: () => {
          showRescheduleDialog();
        },
        isPrimary: false,
      },
      {
        text: "Yes", // ⬅️ TRANSLATION HERE
        action: () => {
          alarmAudio.pause(); // Stop Alarm
          alarmAudio.currentTime = 0;
          window.location.href = "../pages/task.html"; // Finish Activity
        },
        isPrimary: true,
      },
    ]);
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
