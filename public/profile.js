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
            photoData = e.target.result;
            openPreview(photoData);
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
        photoData = canvas.toDataURL('image/png');
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        openPreview(photoData);
    });

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