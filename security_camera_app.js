import * as THREE from 'three';

export class SecurityCameraApp {
    constructor(renderer, scene, cameras, requestDraw) {
        this.renderer = renderer;
        this.scene = scene;
        this.cameras = cameras; 
        this.requestDraw = requestDraw || (() => {});

        this.activeCamIndex = 0;
        this.renderTargets = [];
        this.renderCamera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 100);

        const rtSize = { width: 512, height: 288 };
        for (let i = 0; i < this.cameras.length; i++) {
            this.renderTargets.push(new THREE.WebGLRenderTarget(rtSize.width, rtSize.height));
        }

        // Buffer for reading pixels from GPU to CPU
        this._pixelBuffer = new Uint8Array(rtSize.width * rtSize.height * 4);
        this._imageData = new ImageData(rtSize.width, rtSize.height);

        this.lastRenderTime = 0;
        this.renderInterval = 1000 / 15; 
        this._needsRender = true; 

    }

    renderViews() {
        const now = performance.now();
        if (now - this.lastRenderTime < this.renderInterval && !this._needsRender) {
            return;
        }
        this._needsRender = false;
        this.lastRenderTime = now;

        const originalRenderTarget = this.renderer.getRenderTarget();
        
        for (let i = 0; i < this.cameras.length; i++) {
            const camObject = this.cameras[i];
            
            camObject.getWorldPosition(this.renderCamera.position);
            camObject.getWorldQuaternion(this.renderCamera.quaternion);

            // The camObject is oriented using lookAt, which points its +Z axis forward.
            // A THREE.js camera looks down its -Z axis.
            // We need to rotate the renderCamera by 180 degrees around its local Y axis
            // to align its view with the physical camera model's direction.
            this.renderCamera.rotateY(Math.PI);

            this.renderer.setRenderTarget(this.renderTargets[i]);
            this.renderer.render(this.scene, this.renderCamera);
        }

        this.renderer.setRenderTarget(originalRenderTarget);
        this.requestDraw(); 
    }

    handleClick(canvasX, canvasY, rect, win) {
        const btnW = (rect.w - (this.cameras.length + 1) * 10) / this.cameras.length;
        const btnH = 24, pad = 10;
        for (let i = 0; i < this.cameras.length; i++) {
            const btnX = rect.x + pad + i * (btnW + pad);
            const btnY = rect.y + pad;
            if (canvasX >= btnX && canvasX <= btnX + btnW && canvasY >= btnY && canvasY <= btnY + btnH) {
                if (this.activeCamIndex !== i) {
                    this.activeCamIndex = i;
                    this.requestDraw();
                }
                return;
            }
        }
    }

    draw(ctx, win, x, y, w, h) {
        ctx.fillStyle = '#111';
        ctx.fillRect(x, y, w, h);

        const pad = 10;
        const btnH = 24;
        const btnW = Math.min(100, (w - (this.cameras.length + 1) * pad) / this.cameras.length);

        for (let i = 0; i < this.cameras.length; i++) {
            const btnX = x + pad + i * (btnW + pad);
            const btnY = y + pad;
            const isActive = i === this.activeCamIndex;
            ctx.fillStyle = isActive ? '#0078d7' : '#c0c0c0';
            ctx.fillRect(btnX, btnY, btnW, btnH);
            ctx.strokeStyle = '#000';
            ctx.strokeRect(btnX, btnY, btnW, btnH);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`CAM ${i + 1}`, btnX + btnW / 2, btnY + 16);
        }

        const videoY = y + pad * 2 + btnH;
        const videoH = h - (pad * 3 + btnH);
        const videoW = w - pad * 2;
        ctx.fillStyle = '#000';
        ctx.fillRect(x + pad, videoY, videoW, videoH);

        const rt = this.renderTargets[this.activeCamIndex];
        if (rt) {
            try {
                // Read pixels from the render target
                this.renderer.readRenderTargetPixels(rt, 0, 0, rt.width, rt.height, this._pixelBuffer);
                this._imageData.data.set(this._pixelBuffer);

                // Create a temporary canvas to draw the ImageData
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = rt.width;
                tempCanvas.height = rt.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.putImageData(this._imageData, 0, 0);

                // Calculate aspect ratio and destination size
                const aspect = rt.width / rt.height;
                let dw = videoW;
                let dh = videoW / aspect;
                if (dh > videoH) {
                    dh = videoH;
                    dw = videoH * aspect;
                }
                const dx = x + pad + (videoW - dw) / 2;
                const dy = videoY + (videoH - dh) / 2;

                // Draw the temporary canvas to the main canvas, flipping it vertically
                ctx.save();
                ctx.translate(dx, dy + dh);
                ctx.scale(1, -1);
                ctx.drawImage(tempCanvas, 0, 0, dw, dh);
                ctx.restore();

            } catch (e) {
                 ctx.fillStyle = 'red';
                 ctx.textAlign = 'center';
                 ctx.fillText('Render Error', x + w / 2, y + h / 2);
            }
        }
    }
}