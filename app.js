// ================= NOSTALGIA BOOTH: JAVASCRIPT LOGIC =================

// State global aplikasi
const state = {
    currentScreen: 'welcome-screen',
    stream: null,
    selectedFilter: 'normal',
    capturedPhotos: [], // Menyimpan data url gambar mentah
    photoIndex: 0,
    totalPhotos: 3,
    countdownInterval: null,
    // Definisi string filter canvas yang cocok dengan CSS
    canvasFilters: {
        normal: 'none',
        sepia: 'sepia(1) contrast(0.95) saturate(0.85) brightness(0.9) hue-rotate(-10deg)',
        grayscale: 'grayscale(1) contrast(1.3) brightness(0.9)',
        warm: 'sepia(0.35) saturate(1.4) contrast(1.15) brightness(0.9) hue-rotate(-5deg)',
        cyanotype: 'grayscale(1) sepia(0.7) hue-rotate(190deg) saturate(2) contrast(1.2) brightness(0.85)',
        faded: 'contrast(0.85) brightness(1.05) saturate(0.75) sepia(0.12)'
    }
};

// Elemen-Elemen DOM
const screens = {
    welcome: document.getElementById('welcome-screen'),
    booth: document.getElementById('booth-screen'),
    result: document.getElementById('result-screen')
};

const buttons = {
    toFilter: document.getElementById('btn-to-filter'),
    startCapture: document.getElementById('btn-start-capture'),
    download: document.getElementById('btn-download'),
    restart: document.getElementById('btn-restart')
};

const webcam = document.getElementById('webcam');
const flashOverlay = document.getElementById('flash-overlay');
const countdownDisplay = document.getElementById('countdown-display');
const statusBadge = document.getElementById('status-badge');
const filterOptions = document.querySelectorAll('.filter-option');
const photostripImg = document.getElementById('photostrip-img');
const tempCanvas = document.getElementById('photo-canvas');

// Inisialisasi Event Listener
document.addEventListener('DOMContentLoaded', () => {
    buttons.toFilter.addEventListener('click', () => switchScreen('booth'));
    buttons.startCapture.addEventListener('click', startPhotoSession);
    buttons.download.addEventListener('click', downloadPhotostrip);
    buttons.restart.addEventListener('click', restartSession);
    
    // Handler untuk pemilihan filter
    filterOptions.forEach(option => {
        option.addEventListener('click', () => {
            if (state.photoIndex > 0) return; // Kunci filter jika sesi pemotretan sedang berjalan
            
            filterOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            
            state.selectedFilter = option.dataset.filter;
            
            // Terapkan filter ke live video preview secara real-time
            webcam.className = '';
            if (state.selectedFilter !== 'normal') {
                webcam.classList.add(`filter-${state.selectedFilter}`);
            }
        });
    });
});

// Fungsi Navigasi Halaman
function switchScreen(screenKey) {
    // Sembunyikan semua screen
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    
    if (screenKey === 'welcome') {
        screens.welcome.classList.add('active');
        stopCamera();
    } else if (screenKey === 'booth') {
        screens.booth.classList.add('active');
        startCamera();
    } else if (screenKey === 'result') {
        screens.result.classList.add('active');
        stopCamera();
    }
}

// Mengaktifkan Kamera via WebRTC
async function startCamera() {
    try {
        // Hentikan stream yang ada jika ada
        stopCamera();
        
        // Konfigurasi optimal untuk laptop & smartphone
        const constraints = {
            video: {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 960 },
                aspectRatio: 4/3
            },
            audio: false
        };

        state.stream = await navigator.mediaDevices.getUserMedia(constraints);
        webcam.srcObject = state.stream;
    } catch (err) {
        console.error('Gagal mengakses kamera:', err);
        alert('Gagal membuka kamera. Harap pastikan izin kamera telah diberikan di peramban Anda.');
        switchScreen('welcome');
    }
}

// Mematikan Kamera
function stopCamera() {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
        state.stream = null;
    }
}

// Memulai Sesi Hitung Mundur & Pemotretan (3 Foto)
function startPhotoSession() {
    // Kunci tombol & panel agar tidak bisa diklik saat sesi berlangsung
    buttons.startCapture.disabled = true;
    buttons.startCapture.innerText = "MEMOTRET...";
    buttons.startCapture.style.opacity = '0.5';
    
    filterOptions.forEach(opt => opt.style.pointerEvents = 'none');
    
    state.capturedPhotos = [];
    state.photoIndex = 0;
    
    statusBadge.classList.remove('hidden');
    
    // Jalankan siklus pemotretan pertama
    captureNextCycle();
}

function captureNextCycle() {
    if (state.photoIndex < state.totalPhotos) {
        state.photoIndex++;
        statusBadge.innerText = `FOTO ${state.photoIndex} / ${state.totalPhotos}`;
        
        let timeLeft = 3;
        countdownDisplay.innerText = timeLeft;
        countdownDisplay.classList.remove('hidden');
        
        // Efek detak hitung mundur
        state.countdownInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft > 0) {
                countdownDisplay.innerText = timeLeft;
            } else {
                clearInterval(state.countdownInterval);
                countdownDisplay.classList.add('hidden');
                takePhoto();
            }
        }, 1000);
    } else {
        // Semua foto selesai diambil
        finishPhotoSession();
    }
}

// Mengambil frame foto dari video element
function takePhoto() {
    // Efek visual flash kamera
    flashOverlay.classList.add('flash-active');
    setTimeout(() => {
        flashOverlay.classList.remove('flash-active');
    }, 800);

    // Persiapkan temporary canvas untuk mengambil frame video saat ini
    const width = webcam.videoWidth || 640;
    const height = webcam.videoHeight || 480;
    
    tempCanvas.width = width;
    tempCanvas.height = height;
    
    const ctx = tempCanvas.getContext('2d');
    
    // Balik secara horizontal sebelum mengambil gambar agar pas dengan tampilan mirror (preview)
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    
    // Gambar frame video saat ini ke canvas
    ctx.drawImage(webcam, 0, 0, width, height);
    
    // Ambil base64 gambar
    const photoDataUrl = tempCanvas.toDataURL('image/jpeg', 0.95);
    state.capturedPhotos.push(photoDataUrl);
    
    // Jeda 1.5 detik sebelum beralih ke foto selanjutnya untuk berganti gaya
    setTimeout(() => {
        captureNextCycle();
    }, 1500);
}

// Sesi Selesai: Membuat Photostrip
async function finishPhotoSession() {
    statusBadge.classList.add('hidden');
    buttons.startCapture.disabled = false;
    buttons.startCapture.innerText = "MULAI FOTO";
    buttons.startCapture.style.opacity = '1';
    filterOptions.forEach(opt => opt.style.pointerEvents = 'auto');
    
    // Tampilkan animasi loading atau langsung buat strip
    await generatePhotostrip();
    switchScreen('result');
}

// Fungsi menggabungkan 3 gambar ke kanvas photostrip
function generatePhotostrip() {
    return new Promise((resolve) => {
        // Konfigurasi Dimensi Photostrip (400px x 1030px)
        const stripWidth = 400;
        const photoWidth = 360;
        const photoHeight = 270; // Rasio 4:3
        const padding = 20;
        const gap = 20;
        const footerHeight = 130;
        
        const stripHeight = padding + (photoHeight * 3) + (gap * 2) + footerHeight;
        
        tempCanvas.width = stripWidth;
        tempCanvas.height = stripHeight;
        
        const ctx = tempCanvas.getContext('2d');
        
        // 1. Gambar latar belakang kertas polaroid (warm off-white/cream)
        ctx.fillStyle = '#fcfaf2';
        ctx.fillRect(0, 0, stripWidth, stripHeight);
        
        // Efek tekstur kertas vintage buatan (butiran & noda halus)
        ctx.fillStyle = 'rgba(44, 30, 17, 0.02)';
        for (let i = 0; i < 500; i++) {
            const x = Math.random() * stripWidth;
            const y = Math.random() * stripHeight;
            const r = Math.random() * 1.5;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // ORNAMEN PENDUKUNG: Bingkai garis ganda klasik di sepanjang tepian photostrip
        ctx.strokeStyle = '#b89047'; // Emas Vintage
        ctx.lineWidth = 1.5;
        ctx.strokeRect(6, 6, stripWidth - 12, stripHeight - 12);
        
        ctx.lineWidth = 0.5;
        ctx.strokeRect(9, 9, stripWidth - 18, stripHeight - 18);
        
        // 2. Gambar 3 Foto dengan Filter Terpilih
        let loadedImages = 0;
        
        state.capturedPhotos.forEach((dataUrl, index) => {
            const img = new Image();
            img.src = dataUrl;
            img.onload = () => {
                const yPos = padding + index * (photoHeight + gap);
                
                ctx.save();
                
                // Terapkan filter yang dipilih ke kanvas untuk foto ini saja
                ctx.filter = state.canvasFilters[state.selectedFilter] || 'none';
                
                // Gambar foto di posisi tengah secara horizontal
                ctx.drawImage(img, padding, yPos, photoWidth, photoHeight);
                
                ctx.restore();
                
                // Gambar border/bingkai hitam tipis di sekeliling foto
                ctx.strokeStyle = 'rgba(44, 30, 17, 0.25)';
                ctx.lineWidth = 1;
                ctx.strokeRect(padding, yPos, photoWidth, photoHeight);

                // ORNAMEN PENDUKUNG: Sudut kertas album vintage (Photo Corners) di setiap ujung foto
                const cornerSize = 12;
                ctx.fillStyle = '#3d2b1f'; // Cokelat kayu gelap antik
                
                // Kiri Atas
                ctx.beginPath();
                ctx.moveTo(padding, yPos);
                ctx.lineTo(padding + cornerSize, yPos);
                ctx.lineTo(padding, yPos + cornerSize);
                ctx.closePath();
                ctx.fill();
                
                // Kanan Atas
                ctx.beginPath();
                ctx.moveTo(padding + photoWidth, yPos);
                ctx.lineTo(padding + photoWidth - cornerSize, yPos);
                ctx.lineTo(padding + photoWidth, yPos + cornerSize);
                ctx.closePath();
                ctx.fill();
                
                // Kiri Bawah
                ctx.beginPath();
                ctx.moveTo(padding, yPos + photoHeight);
                ctx.lineTo(padding + cornerSize, yPos + photoHeight);
                ctx.lineTo(padding, yPos + photoHeight - cornerSize);
                ctx.closePath();
                ctx.fill();
                
                // Kanan Bawah
                ctx.beginPath();
                ctx.moveTo(padding + photoWidth, yPos + photoHeight);
                ctx.lineTo(padding + photoWidth - cornerSize, yPos + photoHeight);
                ctx.lineTo(padding + photoWidth, yPos + photoHeight - cornerSize);
                ctx.closePath();
                ctx.fill();
                
                loadedImages++;
                
                // Jika ketiga foto sudah dimuat & digambar
                if (loadedImages === state.totalPhotos) {
                    // 3. Tambahkan Teks & Logo Vintage di bagian bawah polaroid (footer)
                    drawFooter(ctx, stripWidth, stripHeight - footerHeight + 25);
                    
                    // Ekspor hasil ke gambar di layar
                    photostripImg.src = tempCanvas.toDataURL('image/png');
                    resolve();
                }
            };
        });
    });
}

// Gambar teks vintage di bagian bawah strip
function drawFooter(ctx, width, startY) {
    // Pembatas garis emas tipis bergaya double
    ctx.strokeStyle = '#b89047';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, startY);
    ctx.lineTo(width - 40, startY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(40, startY + 3);
    ctx.lineTo(width - 40, startY + 3);
    ctx.stroke();
    
    // Teks Utama: Vintage Booth
    ctx.fillStyle = '#2c1e11'; // Tinta cokelat tua retro
    ctx.font = '22px "Playfair Display", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Vintage Booth', width / 2, startY + 38);
    
    // Tanggal Hari Ini (Format retro)
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const todayStr = new Date().toLocaleDateString('id-ID', options);
    
    ctx.fillStyle = '#8b7355'; // Faded Tan
    ctx.font = '12px "Special Elite", Courier, monospace';
    ctx.fillText(todayStr.toUpperCase(), width / 2, startY + 65);
    
    // Ornament penutup
    ctx.fillStyle = '#b89047';
    ctx.font = '12px "Special Elite", monospace';
    ctx.fillText('✦ ❖ ✦', width / 2, startY + 83);
}

// Mengunduh berkas photostrip ke perangkat pengguna
function downloadPhotostrip() {
    const dataUrl = photostripImg.src;
    if (!dataUrl) return;
    
    const link = document.createElement('a');
    link.href = dataUrl;
    
    // Generate nama file dengan timestamp
    const timeStamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    link.download = `vintage-photostrip-${timeStamp}.png`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Mereset Sesi Photobooth
function restartSession() {
    state.capturedPhotos = [];
    state.photoIndex = 0;
    
    // Reset video class
    webcam.className = '';
    state.selectedFilter = 'normal';
    
    // Reset filter active class di DOM
    filterOptions.forEach(opt => opt.classList.remove('active'));
    document.querySelector('[data-filter="normal"]').classList.add('active');
    
    switchScreen('welcome');
}
