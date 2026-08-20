/**
 * Verba Vitae - Mobile Camera Engine
 * Handles WebRTC live camera streams, front/rear switching, shutter effects,
 * filters, timer, and photo download.
 */

class VerbaCameraApp {
    constructor() {
        this.video = document.getElementById('cameraVideo');
        this.canvas = document.getElementById('captureCanvas');
        this.flashEl = document.getElementById('shutterFlash');
        this.countdownEl = document.getElementById('countdownOverlay');
        this.previewModal = document.getElementById('previewModal');
        this.previewImg = document.getElementById('previewImg');
        this.errorBanner = document.getElementById('cameraErrorBanner');
        
        // Buttons
        this.switchCameraBtn = document.getElementById('switchCameraBtn');
        this.captureBtn = document.getElementById('captureBtn');
        this.gridToggleBtn = document.getElementById('gridToggleBtn');
        this.timerToggleBtn = document.getElementById('timerToggleBtn');
        this.retakeBtn = document.getElementById('retakeBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.watermarkToggle = document.getElementById('watermarkToggle');
        this.galleryPickerBtn = document.getElementById('galleryPickerBtn');
        this.hiddenFileInput = document.getElementById('hiddenFileInput');
        this.galleryThumb = document.getElementById('galleryThumb');
        this.galleryIcon = document.getElementById('galleryIcon');
        this.gridOverlay = document.getElementById('gridOverlay');

        // State
        this.currentStream = null;
        this.facingMode = 'user'; // 'user' (selfie) or 'environment' (rear)
        this.timerSetting = 0; // 0 = off, 3 = 3s, 5 = 5s
        this.isCountingDown = false;
        this.currentFilter = 'none';
        this.capturedBlobUrl = null;
        this.lastPhotoDataUrl = null;
        this.watermarkLogo = new Image();
        this.watermarkLogo.src = 'images/verbavitaelogoblue.png';

        this.init();
    }

    init() {
        this.setupAudio();
        this.bindEvents();
        this.startCamera();
    }

    // Audio synthesizer for shutter sound (no external mp3 dependency required)
    setupAudio() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
        } catch (e) {
            this.audioCtx = null;
        }
    }

    playShutterSound() {
        if (!this.audioCtx) return;
        try {
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(120, this.audioCtx.currentTime + 0.08);

            gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.08);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.08);
        } catch (e) {
            console.log("Audio play suppressed:", e);
        }
    }

    bindEvents() {
        // Switch Camera (Selfie vs Rear)
        this.switchCameraBtn.addEventListener('click', () => this.toggleFacingMode());

        // Capture Shutter
        this.captureBtn.addEventListener('click', () => this.handleCaptureTrigger());

        // Grid Toggle
        this.gridToggleBtn.addEventListener('click', () => {
            this.gridOverlay.classList.toggle('active');
            this.gridToggleBtn.classList.toggle('active-setting', this.gridOverlay.classList.contains('active'));
        });

        // Timer Toggle (Off -> 3s -> 5s -> Off)
        this.timerToggleBtn.addEventListener('click', () => {
            if (this.timerSetting === 0) {
                this.timerSetting = 3;
                this.timerToggleBtn.innerHTML = '3s';
                this.timerToggleBtn.classList.add('active-setting');
            } else if (this.timerSetting === 3) {
                this.timerSetting = 5;
                this.timerToggleBtn.innerHTML = '5s';
                this.timerToggleBtn.classList.add('active-setting');
            } else {
                this.timerSetting = 0;
                this.timerToggleBtn.innerHTML = '<i class="fas fa-stopwatch"></i>';
                this.timerToggleBtn.classList.remove('active-setting');
            }
        });

        // Filter Selection Chips
        const chips = document.querySelectorAll('.filter-chip');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.applyFilter(chip.getAttribute('data-filter'));
            });
        });

        // Retake Photo
        this.retakeBtn.addEventListener('click', () => {
            this.previewModal.classList.remove('active');
            if (this.capturedBlobUrl) {
                URL.revokeObjectURL(this.capturedBlobUrl);
                this.capturedBlobUrl = null;
            }
        });

        // Watermark Stamp Toggle
        this.watermarkToggle.addEventListener('change', () => {
            this.reRenderPreviewCanvas();
        });

        // Download Photo
        this.downloadBtn.addEventListener('click', () => this.downloadCapturedPhoto());

        // Gallery File Picker fallback
        this.galleryPickerBtn.addEventListener('click', () => {
            this.hiddenFileInput.click();
        });

        this.hiddenFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        this.renderImageToPreview(img);
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        // Retry Camera button
        const retryBtn = document.getElementById('retryCameraBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.errorBanner.style.display = 'none';
                this.startCamera();
            });
        }
    }

    async startCamera() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            audio: false,
            video: {
                facingMode: this.facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };

        try {
            this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.currentStream;
            
            // Adjust mirror transformation for selfie mode
            if (this.facingMode === 'user') {
                this.video.classList.add('selfie-mode');
            } else {
                this.video.classList.remove('selfie-mode');
            }

            this.errorBanner.style.display = 'none';
        } catch (err) {
            console.error("Camera access error:", err);
            this.errorBanner.style.display = 'flex';
        }
    }

    toggleFacingMode() {
        this.switchCameraBtn.classList.add('flip-active');
        setTimeout(() => this.switchCameraBtn.classList.remove('flip-active'), 300);

        this.facingMode = (this.facingMode === 'user') ? 'environment' : 'user';
        this.startCamera();
    }

    applyFilter(filterType) {
        this.currentFilter = filterType;
        let filterCss = 'none';

        switch (filterType) {
            case 'warm':
                filterCss = 'sepia(0.25) saturate(1.4) brightness(1.05)';
                break;
            case 'bw':
                filterCss = 'grayscale(1) contrast(1.2)';
                break;
            case 'vintage':
                filterCss = 'sepia(0.55) contrast(1.1) brightness(0.95)';
                break;
            case 'vibrant':
                filterCss = 'saturate(1.8) contrast(1.15)';
                break;
            case 'cool':
                filterCss = 'hue-rotate(180deg) saturate(1.2)';
                break;
            default:
                filterCss = 'none';
        }

        this.video.style.filter = filterCss;
    }

    handleCaptureTrigger() {
        if (this.isCountingDown) return;

        if (this.timerSetting > 0) {
            this.runCountdown(this.timerSetting, () => this.snapPhoto());
        } else {
            this.snapPhoto();
        }
    }

    runCountdown(seconds, callback) {
        this.isCountingDown = true;
        let remaining = seconds;
        this.countdownEl.style.display = 'block';
        this.countdownEl.textContent = remaining;

        const interval = setInterval(() => {
            remaining--;
            if (remaining > 0) {
                this.countdownEl.textContent = remaining;
            } else {
                clearInterval(interval);
                this.countdownEl.style.display = 'none';
                this.isCountingDown = false;
                callback();
            }
        }, 1000);
    }

    snapPhoto() {
        // Flash animation
        this.flashEl.classList.add('active');
        this.playShutterSound();
        setTimeout(() => this.flashEl.classList.remove('active'), 120);

        // Haptic feedback if supported
        if (navigator.vibrate) {
            navigator.vibrate(60);
        }

        const videoWidth = this.video.videoWidth || 1280;
        const videoHeight = this.video.videoHeight || 720;

        this.canvas.width = videoWidth;
        this.canvas.height = videoHeight;
        const ctx = this.canvas.getContext('2d');

        // Draw image with selfie mirror if active
        ctx.save();
        if (this.facingMode === 'user') {
            ctx.translate(videoWidth, 0);
            ctx.scale(-1, 1);
        }

        // Apply filter directly onto canvas
        if (this.currentFilter !== 'none') {
            ctx.filter = this.video.style.filter;
        }

        ctx.drawImage(this.video, 0, 0, videoWidth, videoHeight);
        ctx.restore();

        // Draw Verba Vitae official watermark if checked
        if (this.watermarkToggle.checked) {
            this.drawWatermark(ctx, videoWidth, videoHeight);
        }

        // Generate high-quality JPEG
        const dataUrl = this.canvas.toDataURL('image/jpeg', 0.95);
        this.lastPhotoDataUrl = dataUrl;
        this.previewImg.src = dataUrl;
        this.previewModal.classList.add('active');

        // Update bottom gallery thumbnail
        this.galleryThumb.src = dataUrl;
        this.galleryThumb.style.display = 'block';
        this.galleryIcon.style.display = 'none';
    }

    drawWatermark(ctx, width, height) {
        ctx.save();
        const stampHeight = Math.max(48, Math.round(height * 0.08));
        const stampWidth = stampHeight;
        const padding = Math.round(width * 0.035);

        // Draw subtle dark pill behind badge
        const pillWidth = stampWidth + 140;
        const pillHeight = stampHeight + 12;
        const x = width - pillWidth - padding;
        const y = height - pillHeight - padding;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.roundRect(x, y, pillWidth, pillHeight, 12);
        ctx.fill();

        // Draw logo
        if (this.watermarkLogo.complete && this.watermarkLogo.naturalWidth !== 0) {
            ctx.drawImage(this.watermarkLogo, x + 8, y + 6, stampWidth, stampHeight);
        }

        // Draw text
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(stampHeight * 0.38)}px Montserrat, sans-serif`;
        ctx.fillText('VERBA VITAE', x + stampWidth + 16, y + (stampHeight * 0.48) + 6);

        ctx.fillStyle = '#d68b2d';
        ctx.font = `600 ${Math.round(stampHeight * 0.26)}px Montserrat, sans-serif`;
        ctx.fillText('OFFICIAL MEMORY', x + stampWidth + 16, y + (stampHeight * 0.82) + 6);

        ctx.restore();
    }

    reRenderPreviewCanvas() {
        if (!this.lastPhotoDataUrl) return;
        const img = new Image();
        img.onload = () => {
            const ctx = this.canvas.getContext('2d');
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            if (this.watermarkToggle.checked) {
                this.drawWatermark(ctx, img.width, img.height);
            }

            const updatedDataUrl = this.canvas.toDataURL('image/jpeg', 0.95);
            this.previewImg.src = updatedDataUrl;
        };
        img.src = this.lastPhotoDataUrl;
    }

    renderImageToPreview(img) {
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        const ctx = this.canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        if (this.watermarkToggle.checked) {
            this.drawWatermark(ctx, img.width, img.height);
        }

        const dataUrl = this.canvas.toDataURL('image/jpeg', 0.95);
        this.lastPhotoDataUrl = dataUrl;
        this.previewImg.src = dataUrl;
        this.previewModal.classList.add('active');
    }

    downloadCapturedPhoto() {
        const imageUri = this.previewImg.src || this.lastPhotoDataUrl;
        if (!imageUri) return;

        const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `VerbaVitae_Photo_${dateStr}.jpg`;

        const link = document.createElement('a');
        link.href = imageUri;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Initialize when DOM loads
window.addEventListener('DOMContentLoaded', () => {
    window.cameraApp = new VerbaCameraApp();
});
