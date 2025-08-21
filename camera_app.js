export class CameraApp {
    constructor(onStateChange) {
        this.webcamActive = false;
        this._video = null;
        this._stream = null;
        this.onStateChange = onStateChange || (() => {});
    }

    start() {
        if (this._video) {
            this.webcamActive = true;
            this._video.play?.().catch(() => {});
            this.onStateChange();
            return;
        }
        const video = document.createElement('video');
        video.autoplay = true; video.muted = true; video.playsInline = true;
        navigator.mediaDevices?.getUserMedia?.({ video: true, audio: false })
            .then(stream => {
                this._stream = stream; video.srcObject = stream; this._video = video;
                const ready = () => { video.play?.().catch(() => {}); this.webcamActive = true; this.onStateChange(); };
                (video.readyState >= 2) ? ready() : video.addEventListener('loadedmetadata', ready, { once: true });
            })
            .catch(() => { this.webcamActive = false; this.onStateChange(); });
    }

    stop() {
        if (this._stream) { this._stream.getTracks().forEach(t => t.stop()); this._stream = null; }
        this._video = null; this.webcamActive = false; this.onStateChange();
    }

    draw(ctx, win, x, y, w, h) {
        ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#111'; ctx.fillRect(x, y, w, 28);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'left';
        ctx.fillText(this.webcamActive ? 'Camera is on' : 'Camera is off', x + 10, y + 18);
        const btnW = 70, btnH = 20, btnX = x + w - btnW - 10, btnY = y + 4;
        ctx.fillStyle = '#c0c0c0'; ctx.fillRect(btnX, btnY, btnW, btnH);
        ctx.strokeStyle = '#000'; ctx.strokeRect(btnX, btnY, btnW, btnH);
        ctx.fillStyle = '#000'; ctx.textAlign = 'center'; 
        const label = this.webcamActive ? 'Stop' : 'Start';
        ctx.fillText(label, btnX + btnW / 2, btnY + 14);
        win._stopBtn = this.webcamActive ? { x: btnX, y: btnY, w: btnW, h: btnH } : null;
        win._startBtn = !this.webcamActive ? { x: btnX, y: btnY, w: btnW, h: btnH } : null;
        const vx = x + 10, vy = y + 38, vw = w - 20, vh = h - 48;
        ctx.fillStyle = '#0a0a0a'; ctx.fillRect(vx, vy, vw, vh);
        if (this._video && this._video.readyState >= 2) {
            const vidW = this._video.videoWidth || 640, vidH = this._video.videoHeight || 480;
            const s = Math.min(vw / vidW, vh / vidH); const dw = Math.floor(vidW * s), dh = Math.floor(vidH * s);
            const dx = vx + Math.floor((vw - dw) / 2), dy = vy + Math.floor((vh - dh) / 2);
            try { ctx.drawImage(this._video, dx, dy, dw, dh); } catch {}
        } else {
            ctx.fillStyle = '#888'; ctx.textAlign = 'center'; ctx.font = '13px Arial';
            ctx.fillText('Click Start to enable the camera', x + w / 2, y + h / 2);
        }
    }
}