// === DATA CHART ===
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

// === FUNGSI UNTUK LOAD DATA DARI LOCALSTORAGE ===
function getCompletedTasksFromStorage() {
    const tasks = JSON.parse(localStorage.getItem('completedTasks') || '[]');
    
    // Group by date
    const tasksByDate = {};
    tasks.forEach(task => {
        const completedDate = new Date(task.completedAt);
        const dateStr = completedDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        if (!tasksByDate[dateStr]) {
            tasksByDate[dateStr] = [];
        }
        tasksByDate[dateStr].push(task.title);
    });
    
    // Convert to array format
    return Object.entries(tasksByDate).map(([date, tasks]) => ({
        date,
        tasks
    }));
}

function getDeletedTasksFromStorage() {
    const tasks = JSON.parse(localStorage.getItem('deletedTasks') || '[]');
    
    // Group by date
    const tasksByDate = {};
    tasks.forEach(task => {
        const deletedDate = new Date(task.deletedAt);
        const dateStr = deletedDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        if (!tasksByDate[dateStr]) {
            tasksByDate[dateStr] = [];
        }
        tasksByDate[dateStr].push({
            id: task.id,
            name: task.title
        });
    });
    
    return Object.entries(tasksByDate).map(([date, tasks]) => ({
        date,
        tasks: tasks.map(t => t.name)
    }));
}

function getMissedTasksFromStorage() {
    const tasks = JSON.parse(localStorage.getItem('missedTasks') || '[]');
    
    // Group by date
    const tasksByDate = {};
    tasks.forEach(task => {
        const missedDate = new Date(task.missedAt);
        const dateStr = missedDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        if (!tasksByDate[dateStr]) {
            tasksByDate[dateStr] = [];
        }
        tasksByDate[dateStr].push({
            id: task.id,
            name: task.title
        });
    });
    
    return Object.entries(tasksByDate).map(([date, tasks]) => ({
        date,
        tasks
    }));
}

// === UPDATE TASK COUNTS ===
function updateTaskCounts() {
    const completedTasks = JSON.parse(localStorage.getItem('completedTasks') || '[]');
    const deletedTasks = JSON.parse(localStorage.getItem('deletedTasks') || '[]');
    const missedTasks = JSON.parse(localStorage.getItem('missedTasks') || '[]');
    
    const completedBox = document.querySelector('.summary-box.completed span');
    const missedBox = document.querySelector('.summary-box.missed span');
    const deletedBox = document.querySelector('.summary-box.deleted span');
    
    if (completedBox) completedBox.textContent = `Completed Tasks (${completedTasks.length})`;
    if (missedBox) missedBox.textContent = `Missed Tasks (${missedTasks.length})`;
    if (deletedBox) deletedBox.textContent = `Deleted Tasks (${deletedTasks.length})`;
}

// === UPDATE CHART ===
function updateChart(tabType) {
    const data = chartData[tabType];
    document.querySelector('.card-header h3').textContent = data.title;
    document.querySelector('.productivity-score span').textContent = data.score;

    const chartContainer = document.querySelector('.chart-container');
    chartContainer.innerHTML = '';
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

// === INISIALISASI ===
document.addEventListener('DOMContentLoaded', function() {

    // Update counts saat page load
    updateTaskCounts();
    
    // Listen untuk update dari task page
    window.addEventListener('storage', (e) => {
        if (e.key === 'profileUpdateTrigger') {
            updateTaskCounts();
        }
    });
    
    // Update ketika window focus (user kembali ke tab)
    window.addEventListener('focus', () => {
        updateTaskCounts();
    });

    // === TAB SWITCHING ===
    const tabButtons = document.querySelectorAll('.tab-btn');
    const statsCard = document.querySelector('.stats-card');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.classList.contains('active')) return;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            const tabText = this.textContent.toLowerCase();

            statsCard.classList.add('fade-out');
            setTimeout(() => {
                updateChart(tabText);
                statsCard.classList.remove('fade-out');
                statsCard.classList.add('fade-in');
            }, 200);
        });
    });

    // === FITUR KAMERA & UPLOAD ===
    const cameraIcon = document.querySelector('.camera-icon');
    const choiceModal = document.getElementById('cameraChoiceModal');
    const cameraModal = document.getElementById('cameraModal');
    const openCameraBtn = document.getElementById('openCameraBtn');
    const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
    const closeChoiceModal = document.getElementById('closeChoiceModal');
    const fileInput = document.getElementById('fileInput');
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const captureBtn = document.getElementById('captureBtn');
    const preview = document.getElementById('preview');
    const previewControls = document.getElementById('previewControls');
    const captureControls = document.getElementById('captureControls');
    const setPhotoBtn = document.getElementById('setPhoto');
    const retakeBtn = document.getElementById('retake');
    const switchCameraBtn = document.getElementById('switchCameraBtn');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const mainAvatar = document.getElementById('mainAvatar');
    const drawerAvatar = document.getElementById('drawerAvatar');

    let stream = null;
    let photoData = null;
    let currentFacingMode = 'user';
    let hasBackCamera = false;

    async function checkBackCamera() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            hasBackCamera = videoDevices.length > 1;
        } catch (err) {
            hasBackCamera = false;
        }
    }

    if (cameraIcon) {
        cameraIcon.addEventListener('click', () => {
            choiceModal.style.display = 'flex';
        });
    }

    if (closeChoiceModal) {
        closeChoiceModal.addEventListener('click', () => {
            choiceModal.style.display = 'none';
        });
    }
    
    if (choiceModal) {
        choiceModal.addEventListener('click', e => {
            if (e.target === choiceModal) choiceModal.style.display = 'none';
        });
    }

    if (openCameraBtn) {
        openCameraBtn.addEventListener('click', async () => {
            choiceModal.style.display = 'none';
            cameraModal.style.display = 'flex';
            video.style.display = 'block';
            preview.style.display = 'none';
            currentFacingMode = 'user';
            
            await checkBackCamera();
            switchCameraBtn.style.display = hasBackCamera ? 'inline-flex' : 'none';
            switchCameraBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Ganti ke Belakang';
            
            await startCamera('user');
            previewControls.style.display = 'none';
            captureControls.style.display = 'flex';
        });
    }

    if (uploadPhotoBtn) {
        uploadPhotoBtn.addEventListener('click', () => {
            choiceModal.style.display = 'none';
            fileInput.click();
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                cropToSquare(e.target.result, (croppedData) => {
                    photoData = croppedData;
                    openPreview(photoData);
                });
            };
            reader.readAsDataURL(file);
        });
    }

    async function startCamera(facingMode) {
        if (stream) stream.getTracks().forEach(track => track.stop());
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
            video.srcObject = stream;
        } catch (err) {
            alert("Gagal akses kamera: " + err.message);
            if (facingMode === 'environment') startCamera('user');
        }
    }

    function closeCamera() {
        cameraModal.style.display = 'none';
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        video.srcObject = null;
        video.style.display = 'none';
        preview.style.display = 'none';
        preview.src = '';
        photoData = null;
        previewControls.style.display = 'none';
        captureControls.style.display = 'flex';
    }

    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', closeCamera);
    });

    if (switchCameraBtn) {
        switchCameraBtn.addEventListener('click', async () => {
            currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
            await startCamera(currentFacingMode);
            switchCameraBtn.innerHTML = currentFacingMode === 'user' 
                ? '<i class="fas fa-sync-alt"></i> Ganti ke Belakang' 
                : '<i class="fas fa-sync-alt"></i> Ganti ke Depan';
        });
    }

    if (captureBtn) {
        captureBtn.addEventListener('click', () => {
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0);
            const tempPhotoData = canvas.toDataURL('image/png');
            
            cropToSquare(tempPhotoData, (croppedData) => {
                photoData = croppedData;
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                    stream = null;
                }
                openPreview(photoData);
            });
        });
    }

    function cropToSquare(imageSrc, callback) {
        const img = new Image();
        img.onload = () => {
            const size = Math.min(img.width, img.height);
            const x = (img.width - size) / 2;
            const y = (img.height - size) / 2;

            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, x, y, size, size, 0, 0, size, size);
            const croppedData = canvas.toDataURL('image/png');
            callback(croppedData);
        };
        img.src = imageSrc;
    }

    function openPreview(src) {
        cameraModal.style.display = 'flex';
        preview.src = src;
        video.style.display = 'none';
        preview.style.display = 'block';
        captureControls.style.display = 'none';
        previewControls.style.display = 'flex';
    }

    if (setPhotoBtn) {
        setPhotoBtn.addEventListener('click', () => {
            if (photoData) {
                updateAvatarGlobally(photoData);
                closeCamera();
                alert("Foto profil berhasil diperbarui!");
            } else {
                alert("Tidak ada foto yang dipilih!");
            }
        });
    }

    if (retakeBtn) {
        retakeBtn.addEventListener('click', () => {
            previewControls.style.display = 'none';
            captureControls.style.display = 'flex';
            preview.style.display = 'none';
            video.style.display = 'block';
            startCamera(currentFacingMode);
        });
    }

    function updateAvatarGlobally(photoData) {
        if (mainAvatar) mainAvatar.src = photoData;
        if (drawerAvatar) drawerAvatar.src = photoData;
        localStorage.setItem('userAvatar', photoData);
    }

    // === DRAWER: EDIT PROFILE ===
    const openEditDrawerBtn = document.getElementById('openEditDrawer');
    const editProfileDrawer = document.getElementById('editProfileDrawer');
    const drawerOverlay = document.getElementById('drawerOverlay');
    const closeDrawerBtn = document.getElementById('closeDrawer');
    const saveBtn = document.querySelector('.save-btn');
    const nameInput = document.getElementById('name');
    const usernameInput = document.getElementById('username');
    const profileUsername = document.getElementById('profileUsername');

    function closeDrawer() {
        editProfileDrawer.classList.remove('active');
    }

    if (openEditDrawerBtn) {
        openEditDrawerBtn.addEventListener('click', (e) => {
            e.preventDefault();

            const savedName = localStorage.getItem('userName') || '';
            const savedUsername = localStorage.getItem('userUsername') || '';
            const savedAvatar = localStorage.getItem('userAvatar');

            nameInput.value = savedName;
            usernameInput.value = savedUsername;

            if (profileUsername) {
                profileUsername.textContent = savedUsername || 'Username';
            }

            if (savedAvatar) {
                if (mainAvatar) mainAvatar.src = savedAvatar;
                if (drawerAvatar) drawerAvatar.src = savedAvatar;
            }

            updateInputColor(nameInput);
            updateInputColor(usernameInput);

            editProfileDrawer.classList.add('active');
        });
    }

    if (closeDrawerBtn) {
        closeDrawerBtn.addEventListener('click', closeDrawer);
    }
    
    if (drawerOverlay) {
        drawerOverlay.addEventListener('click', closeDrawer);
    }

    function updateInputColor(input) {
        if (input.value.trim() !== '') {
            input.style.color = '#14142A';
        } else {
            input.style.color = '#aaa';
        }
    }

    [nameInput, usernameInput].forEach(input => {
        if (input) {
            input.addEventListener('input', () => updateInputColor(input));
        }
    });

    if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();

            const newName = nameInput.value.trim();
            const newUsername = usernameInput.value.trim() || 'Username';

            localStorage.setItem('userName', newName);
            localStorage.setItem('userUsername', newUsername);

            if (profileUsername) {
                profileUsername.textContent = newUsername;
            }

            closeDrawer();
            alert('Profil berhasil diperbarui!');
        });
    }

    // === GENDER DROPDOWN ===
    const genderInput = document.getElementById('genderInput');
    const genderDropdown = document.getElementById('genderDropdown');
    const genderOptions = document.querySelectorAll('.gender-option');
    const selectedGenderSpan = document.getElementById('selectedGender');

    if (genderInput) {
        genderInput.addEventListener('click', () => {
            const isOpen = genderDropdown.classList.contains('open');
            genderDropdown.classList.toggle('open', !isOpen);
            genderInput.classList.toggle('open', !isOpen);
        });
    }

    genderOptions.forEach(option => {
        option.addEventListener('click', () => {
            const value = option.dataset.value;
            if (selectedGenderSpan) {
                selectedGenderSpan.textContent = value;
            }
            document.querySelectorAll('.gender-option i').forEach(icon => {
                icon.classList.add('hidden');
            });
            option.querySelector('i').classList.remove('hidden');
            genderDropdown.classList.remove('open');
            genderInput.classList.remove('open');
        });
    });

    document.addEventListener('click', (e) => {
        if (genderInput && genderDropdown && !genderInput.contains(e.target) && !genderDropdown.contains(e.target)) {
            genderDropdown.classList.remove('open');
            genderInput.classList.remove('open');
        }
    });

    const editAvatarBtn = document.getElementById('editAvatarBtn');
    if (editAvatarBtn) {
        editAvatarBtn.addEventListener('click', () => {
            document.getElementById('cameraChoiceModal').style.display = 'flex';
            closeDrawer();
        });
    }
    
    // Load saved data
    const savedUsername = localStorage.getItem('userUsername');
    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedUsername && savedUsername !== 'Username' && profileUsername) {
        profileUsername.textContent = savedUsername;
    }
    if (savedAvatar && mainAvatar) {
        mainAvatar.src = savedAvatar;
    }
});

// === DRAWER: COMPLETED TASKS ===
const completedDrawer = document.getElementById('completedDrawer');
const completedDrawerContent = document.getElementById('completedDrawerContent');
const closeCompletedDrawer = document.getElementById('closeCompletedDrawer');
const completedDrawerOverlay = document.getElementById('completedDrawerOverlay');
const completedBox = document.querySelector('.summary-box.completed');

if (completedBox) {
    completedBox.style.cursor = 'pointer';
    completedBox.addEventListener('click', () => {
        renderCompletedTasksInDrawer();
        completedDrawer.classList.add('active');
    });
}

if (closeCompletedDrawer) {
    closeCompletedDrawer.addEventListener('click', () => {
        completedDrawer.classList.remove('active');
    });
}

if (completedDrawerOverlay) {
    completedDrawerOverlay.addEventListener('click', () => {
        completedDrawer.classList.remove('active');
    });
}

function renderCompletedTasksInDrawer() {
    const tasks = getCompletedTasksFromStorage();

    completedDrawerContent.innerHTML = '';
    
    if (tasks.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'completed-empty';
        emptyDiv.innerHTML = `
        <img src="../assets/completed_tasks.svg" alt="No completed tasks" style="width: 200px; height: 200px; margin-bottom: 16px;">
        `;
        completedDrawerContent.appendChild(emptyDiv);
    } else {
        tasks.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'task-group';

            const dateDiv = document.createElement('div');
            dateDiv.className = 'task-date';
            dateDiv.textContent = group.date;
            groupDiv.appendChild(dateDiv);

            group.tasks.forEach(task => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'task-item';
                itemDiv.textContent = task;
                groupDiv.appendChild(itemDiv);
            });

            completedDrawerContent.appendChild(groupDiv);
        });
    }
}

// === DRAWER: DELETED TASKS ===
const deletedDrawer = document.getElementById('deletedDrawer');
const deletedDrawerContent = document.getElementById('deletedDrawerContent');
const closeDeletedDrawer = document.getElementById('closeDeletedDrawer');
const deletedDrawerOverlay = document.getElementById('deletedDrawerOverlay');
const deletedBox = document.querySelector('.summary-box.deleted');

if (deletedBox) {
    deletedBox.style.cursor = 'pointer';
    deletedBox.addEventListener('click', () => {
        renderDeletedTasksInDrawer();
        deletedDrawer.classList.add('active');
    });
}

if (closeDeletedDrawer) {
    closeDeletedDrawer.addEventListener('click', () => {
        deletedDrawer.classList.remove('active');
    });
}

if (deletedDrawerOverlay) {
    deletedDrawerOverlay.addEventListener('click', () => {
        deletedDrawer.classList.remove('active');
    });
}

// === UPDATE RENDER DELETED TASKS (DENGAN EVENT LISTENER) ===
function renderDeletedTasksInDrawer() {
    const tasks = getDeletedTasksFromStorage();

    deletedDrawerContent.innerHTML = '';
    
    if (tasks.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'deleted-empty';
        emptyDiv.innerHTML = `
           <img src="../assets/deleted_tasks.svg" alt="No deleted tasks" style="width: 178px; height: 178px; margin-bottom: 16px;">
        `;
        deletedDrawerContent.appendChild(emptyDiv);
    } else {
        tasks.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'deleted-task-group';

            const dateDiv = document.createElement('div');
            dateDiv.className = 'deleted-task-date';
            dateDiv.textContent = group.date;
            groupDiv.appendChild(dateDiv);

            group.tasks.forEach((taskName) => {
                // Dapatkan task ID dari deletedTasks localStorage
                const deletedTasks = JSON.parse(localStorage.getItem('deletedTasks') || '[]');
                const taskObj = deletedTasks.find(t => t.title === taskName);
                const taskId = taskObj ? taskObj.id : null;
                
                const itemDiv = document.createElement('div');
                itemDiv.className = 'deleted-task-item';
                itemDiv.innerHTML = `
                    <span>${taskName}</span>
                    <button class="restore-btn" data-task-id="${taskId}">Restore</button>
                `;
                
                // ✅ EVENT LISTENER UNTUK RESTORE
                itemDiv.querySelector('.restore-btn').addEventListener('click', async () => {
                    if (taskId) {
                        await restoreDeletedTask(taskId);
                    } else {
                        alert('Task ID not found.');
                    }
                });
                
                groupDiv.appendChild(itemDiv);
            });

            deletedDrawerContent.appendChild(groupDiv);
        });
    }
}

// === UPDATE FUNGSI RESTORE DAN RESCHEDULE ===
// Ganti fungsi yang lama dengan ini:

async function restoreDeletedTask(taskId) {
    const user = firebase.auth().currentUser;
    if (!user) return alert('Please log in first.');
    
    const db = firebase.firestore();
    const tasksRef = db.collection("users").doc(user.uid).collection("tasks");
    
    try {
        const taskDoc = await tasksRef.doc(taskId).get();
        if (!taskDoc.exists) {
            return alert('Task not found.');
        }
        
        const taskData = { id: taskId, ...taskDoc.data() };
        
        // Close deleted drawer
        document.getElementById('deletedDrawer').classList.remove('active');
        
        // Open task edit drawer
        openTaskEditDrawer(taskData, 'restore');
        
    } catch (err) {
        console.error("Error restoring task:", err);
        alert('Failed to restore task. Please try again.');
    }
}

async function rescheduleMissedTask(taskId) {
    const user = firebase.auth().currentUser;
    if (!user) return alert('Please log in first.');
    
    const db = firebase.firestore();
    const tasksRef = db.collection("users").doc(user.uid).collection("tasks");
    
    try {
        const taskDoc = await tasksRef.doc(taskId).get();
        if (!taskDoc.exists) {
            return alert('Task not found.');
        }
        
        const taskData = { id: taskId, ...taskDoc.data() };
        
        // Close missed drawer
        document.getElementById('missedDrawer').classList.remove('active');
        
        // Open task edit drawer
        openTaskEditDrawer(taskData, 'reschedule');
        
    } catch (err) {
        console.error("Error rescheduling task:", err);
        alert('Failed to reschedule task. Please try again.');
    }
}

// === DRAWER: MISSED TASKS ===
const missedDrawer = document.getElementById('missedDrawer');
const missedDrawerContent = document.getElementById('missedDrawerContent');
const closeMissedDrawer = document.getElementById('closeMissedDrawer');
const missedDrawerOverlay = document.getElementById('missedDrawerOverlay');
const missedBox = document.querySelector('.summary-box.missed');

if (missedBox) {
    missedBox.style.cursor = 'pointer';
    missedBox.addEventListener('click', () => {
        renderMissedTasksInDrawer();
        missedDrawer.classList.add('active');
    });
}

if (closeMissedDrawer) {
    closeMissedDrawer.addEventListener('click', () => {
        missedDrawer.classList.remove('active');
    });
}

if (missedDrawerOverlay) {
    missedDrawerOverlay.addEventListener('click', () => {
        missedDrawer.classList.remove('active');
    });
}

// === UPDATE RENDER MISSED TASKS (DENGAN EVENT LISTENER) ===
function renderMissedTasksInDrawer() {
    const tasks = getMissedTasksFromStorage();

    missedDrawerContent.innerHTML = '';
    
    if (tasks.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'missed-empty';
        emptyDiv.innerHTML = `
            <img src="../assets/missed_tasks.svg" alt="No missed tasks" style="width: 188px; height: 188px; margin-bottom: 16px;">
        `;
        missedDrawerContent.appendChild(emptyDiv);
    } else {
        tasks.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'missed-task-group';

            const dateDiv = document.createElement('div');
            dateDiv.className = 'missed-task-date';
            dateDiv.textContent = group.date;
            groupDiv.appendChild(dateDiv);

            group.tasks.forEach(task => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'missed-task-item';
                itemDiv.innerHTML = `
                    <span>${task.name}</span>
                    <button class="reschedule-btn" data-task-id="${task.id}">Reschedule</button>
                `;
                
                // ✅ EVENT LISTENER UNTUK RESCHEDULE
                itemDiv.querySelector('.reschedule-btn').addEventListener('click', async () => {
                    await rescheduleMissedTask(task.id);
                });
                
                groupDiv.appendChild(itemDiv);
            });

            missedDrawerContent.appendChild(groupDiv);
        });
    }
}

// ===================================================
// TASK EDIT DRAWER (UNTUK RESTORE/RESCHEDULE)
// ===================================================

const taskEditDrawer = document.getElementById('taskEditDrawer');
const taskEditDrawerOverlay = document.getElementById('taskEditDrawerOverlay');
const closeTaskEditDrawer = document.getElementById('closeTaskEditDrawer');
const taskEditForm = document.getElementById('task-edit-form');
const taskActivityInput = document.getElementById('task-activity-input');
const taskDateInput = document.getElementById('task-date-input');
const taskTimeInput = document.getElementById('task-time-input');
const taskLocationInput = document.getElementById('task-location-input');
const taskSaveBtn = document.getElementById('task-save-btn');
const taskEditDrawerTitle = document.getElementById('taskEditDrawerTitle');

let currentEditTaskId = null;
let currentEditMode = null; // 'restore' atau 'reschedule'

// Priority Dropdown Logic
const taskPrioritySelector = document.getElementById('task-priority-selector');
const taskPrioritySection = document.getElementById('task-priority-section');
const taskPriorityWrapper = document.createElement('div');
taskPriorityWrapper.classList.add('priority-dropdown-wrapper');
taskPriorityWrapper.id = 'taskPriorityDropdownWrapper';

if (taskPrioritySection) {
    taskPrioritySection.appendChild(taskPriorityWrapper);
}

const priorityLevels = ['None', 'Low', 'Medium', 'High'];

function createTaskPriorityDropdown() {
    if (!taskPriorityWrapper || !taskPrioritySelector) return;
    
    const currentLevel = taskPrioritySelector.querySelector('span').textContent;
    let dropdownHtml = '<div class="priority-dropdown">';
    
    priorityLevels.forEach(level => {
        const isSelected = currentLevel === level;
        const checkIconHtml = isSelected 
            ? '<i class="fa-solid fa-check"></i>' 
            : '<i class="fa-solid fa-check" style="visibility: hidden;"></i>';
        
        dropdownHtml += `<div class="priority-option" data-value="${level}">${checkIconHtml} ${level}</div>`;
    });
    
    dropdownHtml += '</div>';
    taskPriorityWrapper.innerHTML = dropdownHtml;
}

if (taskPrioritySelector) {
    taskPrioritySelector.addEventListener('click', function(e) {
        e.stopPropagation();
        createTaskPriorityDropdown();
        taskPriorityWrapper.classList.toggle('open');
    });
}

if (taskPriorityWrapper) {
    taskPriorityWrapper.addEventListener('click', function(e) {
        const option = e.target.closest('.priority-option');
        if (option) {
            const selectedLevel = option.getAttribute('data-value');
            const selectorSpan = taskPrioritySelector.querySelector('span');
            if (selectorSpan) {
                selectorSpan.textContent = selectedLevel;
            }
            taskPriorityWrapper.classList.remove('open');
        }
    });
}

document.addEventListener('click', function(e) {
    if (taskPriorityWrapper && taskPriorityWrapper.classList.contains('open') && 
        !taskPrioritySelector.contains(e.target) && 
        !taskPriorityWrapper.contains(e.target)) {
        taskPriorityWrapper.classList.remove('open');
    }
});

// Add Details Logic
const taskAddDetailsBtn = document.getElementById('task-add-details-btn');
const taskDescriptionInput = document.getElementById('task-description-input');

// Ganti dengan kode ini untuk memastikan description field selalu tampil:
if (taskDescriptionInput) {
    taskDescriptionInput.style.display = 'block';
}

function openTaskEditDrawer(taskData, mode) {
    currentEditTaskId = taskData.id;
    currentEditMode = mode;
    
    // Isi form
    taskActivityInput.value = taskData.title || '';
    taskTimeInput.value = taskData.time || '';
    taskLocationInput.value = taskData.location || '';
    
    // Set priority
    const taskPriority = taskData.priority || 'None';
    const taskSelectorSpan = taskPrioritySelector?.querySelector('span');
    if (taskSelectorSpan) {
        taskSelectorSpan.textContent = taskPriority;
    }
    
    // Set tanggal - untuk restore/reschedule, minimal hari ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(taskData.date + ' 00:00:00');
    taskDate.setHours(0, 0, 0, 0);
    
    if (taskDate < today) {
        taskDateInput.value = formatDateForInput(today);
    } else {
        taskDateInput.value = taskData.date;
    }
    
    // Set min date
    taskDateInput.min = formatDateForInput(today);
    
    // Update title dan button
    if (mode === 'restore') {
        taskEditDrawerTitle.textContent = 'Restore Task';
        taskSaveBtn.textContent = 'Restore & Reschedule';
    } else if (mode === 'reschedule') {
        taskEditDrawerTitle.textContent = 'Reschedule Task';
        taskSaveBtn.textContent = 'Reschedule';
    }
    
    // Buka drawer
    taskEditDrawer.classList.add('active');
}

function closeTaskEditDrawerFunc() {
    taskEditDrawer.classList.remove('active');
    currentEditTaskId = null;
    currentEditMode = null;
    taskEditForm.reset();
    taskDateInput.removeAttribute('min');
}

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Event Listeners
if (closeTaskEditDrawer) {
    closeTaskEditDrawer.addEventListener('click', closeTaskEditDrawerFunc);
}

if (taskEditDrawerOverlay) {
    taskEditDrawerOverlay.addEventListener('click', closeTaskEditDrawerFunc);
}

if (taskEditForm) {
    taskEditForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const user = firebase.auth().currentUser;
        if (!user) return alert('Please log in first.');
        
        const activity = taskActivityInput.value.trim();
        const date = taskDateInput.value;
        const time = taskTimeInput.value.trim();
        const location = taskLocationInput.value.trim();
        
        if (!activity || !date) {
            return alert('Activity and Date are required!');
        }
        
        // Validasi tanggal tidak boleh lampau
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(date + ' 00:00:00');
        selectedDate.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            return alert('Cannot restore/reschedule to past dates. Please select today or a future date.');
        }
        
        const db = firebase.firestore();
        const tasksRef = db.collection("users").doc(user.uid).collection("tasks");
        
        try {
            // Update task
            await tasksRef.doc(currentEditTaskId).update({
                title: activity,
                date: date,
                time: time,
                location: location,
                status: 'pending',
                done: false,
                deletedAt: firebase.firestore.FieldValue.delete(),
                missedAt: firebase.firestore.FieldValue.delete(),
                completedAt: firebase.firestore.FieldValue.delete(),
                dueDate: firebase.firestore.Timestamp.fromDate(new Date(date + ' 23:59:59'))
            });
            
            // Hapus dari localStorage
            if (currentEditMode === 'restore') {
                let deletedTasks = JSON.parse(localStorage.getItem('deletedTasks') || '[]');
                deletedTasks = deletedTasks.filter(t => t.id !== currentEditTaskId);
                localStorage.setItem('deletedTasks', JSON.stringify(deletedTasks));
            } else if (currentEditMode === 'reschedule') {
                let missedTasks = JSON.parse(localStorage.getItem('missedTasks') || '[]');
                missedTasks = missedTasks.filter(t => t.id !== currentEditTaskId);
                localStorage.setItem('missedTasks', JSON.stringify(missedTasks));
            }
            
            // Update counts
            updateTaskCounts();
            
            // Close drawer
            closeTaskEditDrawerFunc();
            
            // Show success message
            alert('Task successfully restored!');
            
            // Reload drawer yang terbuka
            if (currentEditMode === 'restore') {
                renderDeletedTasksInDrawer();
            } else if (currentEditMode === 'reschedule') {
                renderMissedTasksInDrawer();
            }
            
        } catch (err) {
            console.error('Error updating task:', err);
            alert('Failed to update task. Please try again.');
        }
    });
}