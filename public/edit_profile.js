// File: public/edit_profile.js
// Logika untuk Kamera, Avatar, dan Edit Profile Drawer

// === UTILITY CAMERA & AVATAR FUNCTIONS ===
let stream = null;
let photoData = null;
let currentFacingMode = 'user';
let hasBackCamera = false;

// Elemen DOM Global
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
const editAvatarBtn = document.getElementById('editAvatarBtn');


// === UTILITY PROFILE EDITING FUNCTIONS ===
const openEditDrawerBtn = document.getElementById('openEditDrawer');
const editProfileDrawer = document.getElementById('editProfileDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');
const closeDrawerBtn = document.getElementById('closeDrawer');
const saveBtn = document.querySelector('.save-btn');
const nameInput = document.getElementById('name');
const usernameInput = document.getElementById('username');
const profileUsername = document.getElementById('profileUsername');

// GENDER DROPDOWN
const genderInput = document.getElementById('genderInput');
const genderDropdown = document.getElementById('genderDropdown');
const genderOptions = document.querySelectorAll('.gender-option');
const selectedGenderSpan = document.getElementById('selectedGender');


async function checkBackCamera() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        hasBackCamera = videoDevices.length > 1;
    } catch (err) {
        hasBackCamera = false;
    }
}

async function startCamera(facingMode) {
    if (stream) stream.getTracks().forEach(track => track.stop());
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
        video.srcObject = stream;
    } catch (err) {
        // [FIXED] Mengganti alert dengan showCustomDialog
        window.showCustomDialog("Failed to access camera: " + err.message);
        if (facingMode === 'environment') startCamera('user');
    }
}

function closeCamera() {
    if (cameraModal) cameraModal.style.display = 'none';
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    if (video) video.srcObject = null;
    if (video) video.style.display = 'none';
    if (preview) preview.style.display = 'none';
    if (preview) preview.src = '';
    photoData = null;
    if (previewControls) previewControls.style.display = 'none';
    if (captureControls) captureControls.style.display = 'flex';
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
    if (cameraModal) cameraModal.style.display = 'flex';
    if (preview) preview.src = src;
    if (video) video.style.display = 'none';
    if (preview) preview.style.display = 'block';
    if (captureControls) captureControls.style.display = 'none';
    if (previewControls) previewControls.style.display = 'flex';
}

async function updateAvatarGlobally(photoData) {
    if (mainAvatar) mainAvatar.src = photoData;
    if (drawerAvatar) drawerAvatar.src = photoData;

    try {
        // Tambahkan cek user
        const user = firebase.auth().currentUser;
        if (!user) return;

        await window.fetchData('/profile/image', {
            method: 'POST',
            body: JSON.stringify({ image: photoData })
        });
        console.log("Avatar berhasil disimpan di server.");
    } catch (error) {
        console.error("Gagal upload avatar:", error);
        // [FIXED] Mengganti alert dengan showCustomDialog
        window.showCustomDialog("Failed to save profile photo to server.");
    }
}

function closeDrawer() {
    if (editProfileDrawer) editProfileDrawer.classList.remove('active');
}

function updateInputColor(input) {
    if (input && input.value.trim() !== '') {
        input.style.color = '#14142A';
    } else if (input) {
        input.style.color = '#aaa';
    }
}

async function loadProfileData() {
    // Tambahkan cek user di sini
    const user = firebase.auth().currentUser;
    if (!user) return;

    try {
        const data = await window.fetchData('/profile');
        
        if (!data) return;

        if (profileUsername) profileUsername.textContent = data.username || 'Username';
        
        // --- LOGIKA PERBAIKAN ERROR LOADING GAMBAR ---
        if (data.profileImageUrl) {
            const imageUrl = data.profileImageUrl;

            if (mainAvatar) {
                mainAvatar.src = imageUrl;
                // Set fallback ke avatar.png jika gambar gagal dimuat
                mainAvatar.onerror = () => { mainAvatar.src = '../assets/avatar.png'; }; 
            }
            if (drawerAvatar) {
                drawerAvatar.src = imageUrl;
                // Set fallback ke avatar2.svg jika gambar gagal dimuat
                drawerAvatar.onerror = () => { drawerAvatar.src = '../assets/avatar2.svg'; }; 
            }
        } else {
             // Jika tidak ada URL, set ke default
             if (mainAvatar) mainAvatar.src = '../assets/avatar.png';
             if (drawerAvatar) drawerAvatar.src = '../assets/avatar2.svg';
        }
        // --- AKHIR LOGIKA PERBAIKAN ---

        if (nameInput) {
            nameInput.value = data.name || '';
            updateInputColor(nameInput);
        }
        if (usernameInput) {
            usernameInput.value = data.username || '';
            updateInputColor(usernameInput);
        }

        if (data.gender && selectedGenderSpan) {
            selectedGenderSpan.textContent = data.gender;
            document.querySelectorAll('.gender-option i').forEach(icon => icon.classList.add('hidden'));
            const activeOption = document.querySelector(`.gender-option[data-value="${data.gender}"] i`);
            if (activeOption) activeOption.classList.remove('hidden');
        }

    } catch (error) {
        console.error("Gagal memuat profil:", error);
    }
}


// === INISIALISASI LISTENER ===
document.addEventListener('DOMContentLoaded', function() {

    // --- FITUR KAMERA & UPLOAD ---
    if (cameraIcon) {
        cameraIcon.addEventListener('click', () => {
            if (choiceModal) choiceModal.style.display = 'flex';
        });
    }

    if (closeChoiceModal) {
        closeChoiceModal.addEventListener('click', () => {
            if (choiceModal) choiceModal.style.display = 'none';
        });
    }
    
    if (choiceModal) {
        choiceModal.addEventListener('click', e => {
            if (e.target === choiceModal) choiceModal.style.display = 'none';
        });
    }

    if (openCameraBtn) {
        openCameraBtn.addEventListener('click', async () => {
            if (choiceModal) choiceModal.style.display = 'none';
            if (cameraModal) cameraModal.style.display = 'flex';
            if (video) video.style.display = 'block';
            if (preview) preview.style.display = 'none';
            currentFacingMode = 'user';
            
            await checkBackCamera();
            if (switchCameraBtn) switchCameraBtn.style.display = hasBackCamera ? 'inline-flex' : 'none';
            if (switchCameraBtn) switchCameraBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Switch to Back';
            
            await startCamera('user');
            if (previewControls) previewControls.style.display = 'none';
            if (captureControls) captureControls.style.display = 'flex';
        });
    }

    if (uploadPhotoBtn) {
        uploadPhotoBtn.addEventListener('click', () => {
            if (choiceModal) choiceModal.style.display = 'none';
            if (fileInput) fileInput.click();
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                if (canvas) {
                    cropToSquare(e.target.result, (croppedData) => {
                        photoData = croppedData;
                        openPreview(photoData);
                    });
                }
            };
            reader.readAsDataURL(file);
        });
    }

    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', closeCamera);
    });

    if (switchCameraBtn) {
        switchCameraBtn.addEventListener('click', async () => {
            currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
            await startCamera(currentFacingMode);
            switchCameraBtn.innerHTML = currentFacingMode === 'user' 
                ? '<i class="fas fa-sync-alt"></i> Switch to Back' 
                : '<i class="fas fa-sync-alt"></i> Switch to Front';
        });
    }

    if (captureBtn && canvas) {
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

    if (setPhotoBtn) {
        setPhotoBtn.addEventListener('click', () => {
            if (photoData) {
                updateAvatarGlobally(photoData);
                closeCamera();
                // [FIXED] Mengganti alert dengan showCustomDialog
                window.showCustomDialog("Profile photo successfully updated!");
            } else {
                // [FIXED] Mengganti alert dengan showCustomDialog
                window.showCustomDialog("No photo selected!");
            }
        });
    }

    if (retakeBtn) {
        retakeBtn.addEventListener('click', () => {
            if (previewControls) previewControls.style.display = 'none';
            if (captureControls) captureControls.style.display = 'flex';
            if (preview) preview.style.display = 'none';
            if (video) video.style.display = 'block';
            startCamera(currentFacingMode);
        });
    }

    // --- DRAWER: EDIT PROFILE ---
    if (openEditDrawerBtn) {
        openEditDrawerBtn.addEventListener('click', (e) => {
            e.preventDefault();

            updateInputColor(nameInput);
            updateInputColor(usernameInput);

            if (editProfileDrawer) editProfileDrawer.classList.add('active');
        });
    }

    if (closeDrawerBtn) {
        closeDrawerBtn.addEventListener('click', closeDrawer);
    }
    
    if (drawerOverlay) {
        drawerOverlay.addEventListener('click', closeDrawer);
    }

    [nameInput, usernameInput].forEach(input => {
        if (input) {
            input.addEventListener('input', () => updateInputColor(input));
        }
    });

    if (saveBtn) {
        saveBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const newName = nameInput.value.trim();
            const newUsername = usernameInput.value.trim();
            const gender = selectedGenderSpan ? selectedGenderSpan.textContent : 'Male';

            const profileData = {
                name: newName,
                username: newUsername,
                gender: gender
            };

            try {
                // Tambahkan cek user
                const user = firebase.auth().currentUser;
                if (!user) return;
                
                await window.fetchData('/profile', {
                    method: 'PUT',
                    body: JSON.stringify(profileData)
                });

                if (profileUsername) {
                    profileUsername.textContent = newUsername || 'Username';
                }

                closeDrawer();
                // [FIXED] Mengganti alert dengan showCustomDialog
                window.showCustomDialog("Profile successfully updated and saved!");
            } catch (error) {
                console.error("Error saving profile:", error);
                // [FIXED] Mengganti alert dengan showCustomDialog
                window.showCustomDialog("Failed to save profile. Check your internet connection.");
            }
        });
    }

    // --- GENDER DROPDOWN ---
    if (genderInput) {
        genderInput.addEventListener('click', () => {
            const isOpen = genderDropdown.classList.contains('open');
            if (genderDropdown) genderDropdown.classList.toggle('open', !isOpen);
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
            if (genderDropdown) genderDropdown.classList.remove('open');
            genderInput.classList.remove('open');
        });
    });

    document.addEventListener('click', (e) => {
        if (genderInput && genderDropdown && !genderInput.contains(e.target) && !genderDropdown.contains(e.target)) {
            genderDropdown.classList.remove('open');
            genderInput.classList.remove('open');
        }
    });

    if (editAvatarBtn) {
        editAvatarBtn.addEventListener('click', () => {
            if (choiceModal) choiceModal.style.display = 'flex';
            closeDrawer();
        });
    }
    
    // --- LOAD INITIAL DATA (Dipanggil setelah status login terkonfirmasi) ---
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // Panggil loadProfileData hanya setelah status login terkonfirmasi
                loadProfileData(); 
            }
        });
    }
});