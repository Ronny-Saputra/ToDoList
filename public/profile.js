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

    // === DETEKSI KAMERA BELAKANG ===
    async function checkBackCamera() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            hasBackCamera = videoDevices.length > 1;
        } catch (err) {
            hasBackCamera = false;
        }
    }

    // === BUKA MODAL PILIHAN ===
    cameraIcon.addEventListener('click', () => {
        choiceModal.style.display = 'flex';
    });

    // === TUTUP MODAL PILIHAN ===
    closeChoiceModal.addEventListener('click', () => {
        choiceModal.style.display = 'none';
    });
    choiceModal.addEventListener('click', e => {
        if (e.target === choiceModal) choiceModal.style.display = 'none';
    });

    // === AMBIL FOTO ===
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

    // === UPLOAD FOTO ===
    uploadPhotoBtn.addEventListener('click', () => {
        choiceModal.style.display = 'none';
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            // BARU: Crop otomatis ke square sebelum preview
            cropToSquare(e.target.result, (croppedData) => {
                photoData = croppedData;
                openPreview(photoData);
            });
        };
        reader.readAsDataURL(file);
    });

    // === FUNGSI KAMERA ===
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

    switchCameraBtn.addEventListener('click', async () => {
        currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
        await startCamera(currentFacingMode);
        switchCameraBtn.innerHTML = currentFacingMode === 'user' 
            ? '<i class="fas fa-sync-alt"></i> Ganti ke Belakang' 
            : '<i class="fas fa-sync-alt"></i> Ganti ke Depan';
    });

    captureBtn.addEventListener('click', () => {
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0);
            const tempPhotoData = canvas.toDataURL('image/png');
            
            // BARU: Crop otomatis ke square setelah capture
            cropToSquare(tempPhotoData, (croppedData) => {
                photoData = croppedData;
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                    stream = null;
                }
                openPreview(photoData);
            });
        });

       // BARU: Fungsi untuk crop gambar ke square (center crop)
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

    setPhotoBtn.addEventListener('click', () => {
        if (photoData) {
            updateAvatarGlobally(photoData);
            closeCamera();
            alert("Foto profil berhasil diperbarui!");
        } else {
            alert("Tidak ada foto yang dipilih!");
        }
    });

    retakeBtn.addEventListener('click', () => {
        previewControls.style.display = 'none';
        captureControls.style.display = 'flex';
        preview.style.display = 'none';
        video.style.display = 'block';
        startCamera(currentFacingMode);
    });

    // === UPDATE AVATAR GLOBALLY ===
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

    openEditDrawerBtn.addEventListener('click', (e) => {
        e.preventDefault();

        const savedName = localStorage.getItem('userName') || '';
        const savedUsername = localStorage.getItem('userUsername') || '';
        const savedAvatar = localStorage.getItem('userAvatar');

        nameInput.value = savedName;
        usernameInput.value = savedUsername;

        profileUsername.textContent = savedUsername || 'Username';

        if (savedAvatar) {
            if (mainAvatar) mainAvatar.src = savedAvatar;
            if (drawerAvatar) drawerAvatar.src = savedAvatar;
        }

        updateInputColor(nameInput);
        updateInputColor(usernameInput);

        editProfileDrawer.classList.add('active');
    });

    closeDrawerBtn.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);

    // === WARNA INPUT BERUBAH SAAT DIISI ===
    function updateInputColor(input) {
        if (input.value.trim() !== '') {
            input.style.color = '#14142A';
        } else {
            input.style.color = '#aaa';
        }
    }

    [nameInput, usernameInput].forEach(input => {
        input.addEventListener('input', () => updateInputColor(input));
    });

    // === SAVE PROFILE ===
    saveBtn.addEventListener('click', (e) => {
        e.preventDefault();

        const newName = nameInput.value.trim();
        const newUsername = usernameInput.value.trim() || 'Username';

        localStorage.setItem('userName', newName);
        localStorage.setItem('userUsername', newUsername);

        profileUsername.textContent = newUsername;

        closeDrawer();
        alert('Profil berhasil diperbarui!');
    });

    // === GENDER DROPDOWN ===
    const genderInput = document.getElementById('genderInput');
    const genderDropdown = document.getElementById('genderDropdown');
    const genderOptions = document.querySelectorAll('.gender-option');
    const selectedGenderSpan = document.getElementById('selectedGender');

    genderInput.addEventListener('click', () => {
        const isOpen = genderDropdown.classList.contains('open');
        genderDropdown.classList.toggle('open', !isOpen);
        genderInput.classList.toggle('open', !isOpen);
    });

    genderOptions.forEach(option => {
        option.addEventListener('click', () => {
            const value = option.dataset.value;
            selectedGenderSpan.textContent = value;
            document.querySelectorAll('.gender-option i').forEach(icon => {
                icon.classList.add('hidden');
            });
            option.querySelector('i').classList.remove('hidden');
            genderDropdown.classList.remove('open');
            genderInput.classList.remove('open');
        });
    });

    document.addEventListener('click', (e) => {
        if (!genderInput.contains(e.target) && !genderDropdown.contains(e.target)) {
            genderDropdown.classList.remove('open');
            genderInput.classList.remove('open');
        }
    });

    // === EDIT AVATAR DI DRAWER ===
    const editAvatarBtn = document.getElementById('editAvatarBtn');
    editAvatarBtn.addEventListener('click', () => {
        document.getElementById('cameraChoiceModal').style.display = 'flex';
        closeDrawer();
    });

    // === LOAD DATA SAAT HALAMAN DIMUAT ===
    const savedUsername = localStorage.getItem('userUsername');
    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedUsername && savedUsername !== 'Username') {
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

completedBox.style.cursor = 'pointer';

completedBox.addEventListener('click', () => {
    renderCompletedTasksInDrawer();
    completedDrawer.classList.add('active');
});

closeCompletedDrawer.addEventListener('click', () => {
    completedDrawer.classList.remove('active');
});

completedDrawerOverlay.addEventListener('click', () => {
    completedDrawer.classList.remove('active');
});

function renderCompletedTasksInDrawer() {
    completedDrawerContent.innerHTML = '';
    const tasks = getCompletedTasks();

    if (tasks.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'completed-empty';
        emptyDiv.innerHTML = `
            <i class="fas fa-clock"></i>
            <p>Yay, all tasks completed!</p>
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

// Data dummy (ganti dengan real data jika ada)
function getCompletedTasks() {
    return [
        { date: 'Wednesday, 22 October 2025', tasks: ['Dinner Date', 'Movie Night', 'Zoom Meeting', 'Gym'] },
        { date: 'Tuesday, 21 October 2025', tasks: ['Pay Electricity Bill', 'Doctor Appointment'] },
        { date: 'Monday, 20 October 2025', tasks: ['Study Group Session', 'Clean the Room', 'Morning Run'] },
        { date: 'Sunday, 19 October 2025', tasks: ['Weekend Picnic'] }
    ];
    // return []; // Uncomment untuk uji empty state
}

// === DRAWER: DELETED TASKS ===
const deletedDrawer = document.getElementById('deletedDrawer');
const deletedDrawerContent = document.getElementById('deletedDrawerContent');
const closeDeletedDrawer = document.getElementById('closeDeletedDrawer');
const deletedDrawerOverlay = document.getElementById('deletedDrawerOverlay');

const deletedBox = document.querySelector('.summary-box.deleted');

deletedBox.style.cursor = 'pointer';

deletedBox.addEventListener('click', () => {
    renderDeletedTasksInDrawer();
    deletedDrawer.classList.add('active');
});

closeDeletedDrawer.addEventListener('click', () => {
    deletedDrawer.classList.remove('active');
});

deletedDrawerOverlay.addEventListener('click', () => {
    deletedDrawer.classList.remove('active');
});

function renderDeletedTasksInDrawer() {
    deletedDrawerContent.innerHTML = '';
    const tasks = getDeletedTasks();

    if (tasks.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'deleted-empty';
        emptyDiv.innerHTML = `
            <i class="fas fa-clock"></i>
            <p>Yay, trash is empty!</p>
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

            group.tasks.forEach(task => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'deleted-task-item';
                itemDiv.innerHTML = `
                    <span>${task}</span>
                    <button class="restore-btn">Restore</button>
                `;
                // Tambahkan event untuk restore (placeholder)
                itemDiv.querySelector('.restore-btn').addEventListener('click', () => {
                    alert(`Restoring task: ${task}`);
                    // Di sini bisa tambah logika real: hapus dari deleted, tambah ke list aktif, update UI
                });
                groupDiv.appendChild(itemDiv);
            });

            deletedDrawerContent.appendChild(groupDiv);
        });
    }
}

// Data dummy (ganti dengan real data jika ada)
function getDeletedTasks() {
    return [
        { date: 'Wednesday, 23 October 2025', tasks: ['Practice Guitar'] },
        { date: 'Tuesday, 21 October 2025', tasks: ['Read a Chapter of Book', 'Wash the Car', 'Organize Bookshelf'] },
        { date: 'Monday, 20 October 2025', tasks: ['Watch Online Lecture'] },
        { date: 'Sunday, 19 October 2025', tasks: ['Coffee with Friend'] },
        { date: 'Saturday, 18 October 2025', tasks: ['Call Grandma', 'Yoga Class'] }
    ];
    // return []; // Uncomment untuk uji empty state
}

// === DRAWER: MISSED TASKS ===
const missedDrawer = document.getElementById('missedDrawer');
const missedDrawerContent = document.getElementById('missedDrawerContent');
const closeMissedDrawer = document.getElementById('closeMissedDrawer');
const missedDrawerOverlay = document.getElementById('missedDrawerOverlay');

const missedBox = document.querySelector('.summary-box.missed');

missedBox.style.cursor = 'pointer';

missedBox.addEventListener('click', () => {
    renderMissedTasksInDrawer();
    missedDrawer.classList.add('active');
});

closeMissedDrawer.addEventListener('click', () => {
    missedDrawer.classList.remove('active');
});

missedDrawerOverlay.addEventListener('click', () => {
    missedDrawer.classList.remove('active');
});

function renderMissedTasksInDrawer() {
    missedDrawerContent.innerHTML = '';
    const tasks = getMissedTasks();

    if (tasks.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'missed-empty';
        emptyDiv.innerHTML = `
            <i class="fas fa-clock"></i>
            <p>Yay, no missed tasks!</p>
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
                if (task.subTasks) {
                    // Tugas dengan sub-tasks (dropdown)
                    const headerDiv = document.createElement('div');
                    headerDiv.className = 'missed-task-header';
                    headerDiv.innerHTML = `
                        <span>${task.name}</span>
                        <i class="fas fa-chevron-down"></i>
                    `;

                    const subTasksDiv = document.createElement('div');
                    subTasksDiv.className = 'missed-sub-tasks';

                    task.subTasks.forEach((sub, index) => {
                        const subDiv = document.createElement('div');
                        subDiv.className = `missed-sub-task ${index === 0 ? 'orange' : 'gray'}`;
                        subDiv.innerHTML = `
                            <span>${sub}</span>
                            <button class="reschedule-btn">Reschedule</button>
                        `;
                        subDiv.querySelector('.reschedule-btn').addEventListener('click', () => {
                            alert(`Rescheduling sub-task: ${sub}`);
                            // Logika real: pindah ke tanggal baru, update UI
                        });
                        subTasksDiv.appendChild(subDiv);
                    });

                    headerDiv.addEventListener('click', () => {
                        headerDiv.classList.toggle('open');
                        subTasksDiv.classList.toggle('open');
                    });

                    groupDiv.appendChild(headerDiv);
                    groupDiv.appendChild(subTasksDiv);
                } else {
                    // Tugas standalone
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'missed-task-item';
                    itemDiv.innerHTML = `
                        <span>${task.name}</span>
                        <button class="reschedule-btn">Reschedule</button>
                    `;
                    itemDiv.querySelector('.reschedule-btn').addEventListener('click', () => {
                        alert(`Rescheduling task: ${task.name}`);
                        // Logika real: pindah ke tanggal baru, update UI
                    });
                    groupDiv.appendChild(itemDiv);
                }
            });

            missedDrawerContent.appendChild(groupDiv);
        });
    }
}

// Data dummy (ganti dengan real data jika ada; filtered berdasarkan current date Nov 10 2025)
function getMissedTasks() {
    return [
        { date: 'Wednesday, 22 October 2025', tasks: [
            { name: 'Do Science Project', subTasks: ['Elephant Toothpaste Experiment', 'Analysis Report', 'Oral Presentation'] }
        ] },
        { date: 'Tuesday, 21 October 2025', tasks: [
            { name: 'Laundry' },
            { name: 'Grocery Shopping' },
            { name: 'Math Homework' }
        ] },
        { date: 'Monday, 20 October 2025', tasks: [
            { name: 'Laptop Repair' },
            { name: 'Mom\'s Birthday' },
            { name: 'Cake Baking' }
        ] }
    ];
    // return []; // Uncomment untuk uji empty state
}