import * as THREE from 'three';
import { SnakeGame } from './snake.js';
import { SlotsGame } from './slots.js';
import { createScanlineMaterial } from './scanlines.js';
import { CameraApp } from './camera_app.js';
import { ChatApp } from './chat.js';
import { SecurityCameraApp } from './security_camera_app.js';
import { DesktopUI } from './ui_desktop.js';
import { WindowsContent } from './windows_content.js';
import { ScreenHandlers } from './screen_handlers.js';

export class ComputerScreenModel {
    constructor(screenMesh, playSound, renderer, scene, securityCameras) {
        this.screenMesh = screenMesh;
        this.playSound = playSound || (() => {});
        this.width = 1024;
        this.height = 576;
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext('2d');
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.screenMesh.material = createScanlineMaterial(this.texture, {
            width: this.width, height: this.height, opacity: 0.14, lineThickness: 1.25, speed: 0.0
        });

        // UI State
        this.isCrashed = false;
        this.crashTime = 0;
        this.cursor = { x: 0, y: 0, visible: false };
        this.windows = [];
        this.nextWindowId = 1;
        this.draggingWindow = null;
        this.dragOffset = { x: 0, y: 0 };
        // add resizing state
        this.resizingWindow = null;
        this.resizeStart = { mx: 0, my: 0, w: 0, h: 0 };
        this.startMenuOpen = false;
        this.focusedElement = null;
        this.pendingCloseWindow = null;
        this.points = 0;
        this.activeBackground = 'Classic';
        this.ownedBackgrounds = new Set(['Classic']);
        this.scoliosisMode = false;
        this.mattBeQuietMode = false;
        this.fullbrightMode = false;

        // Desktop icons
        this.icons = [
            { id: "recycle_bin", name: "Recycle Bin", x: 30, y: 30, width: 64, height: 64, img: new Image() },
            { id: "snake", name: "Snake", x: 30, y: 120, width: 64, height: 64, img: new Image() },
            { id: "slots", name: "Slots", x: 30, y: 210, width: 64, height: 64, img: new Image() },
            { id: "backgrounds", name: "Backgrounds", x: 30, y: 300, width: 64, height: 64, img: new Image() },
            { id: "camera", name: "Camera", x: 30, y: 390, width: 64, height: 64, img: new Image() },
            { id: "security", name: "Security", x: 120, y: 30, width: 64, height: 64, img: new Image() },
            { id: "chat", name: "Chat", x: 120, y: 120, width: 64, height: 64, img: new Image() }
        ];
        this.icons[0].img.src = 'recycle_bin_icon.png';
        this.icons[1].img.src = 'snake_icon.png';
        this.icons[2].img.src = 'slots_icon.png';
        this.icons[3].img.src = 'backgrounds_icon.png';
        this.icons[4].img.src = 'camera_icon.png';
        this.icons[5].img.src = 'security_camera_icon.png';
        this.icons[6].img.src = 'chat_icon.png';
        this.icons.forEach(icon => {
            icon.img.onload = () => this.draw();
            icon.img.onerror = () => { icon.broken = true; this.draw(); };
        });

        // Apps
        this.cameraApp = new CameraApp(() => this.draw());
        this.securityCameraApp = securityCameras.length > 0 ? new SecurityCameraApp(renderer, scene, securityCameras, () => this.draw()) : null;

        this.draw();
    }

    update(delta) {
        if (this.isCrashed) {
            if (performance.now() - this.crashTime > 5000) { // 5 second reboot timer
                this.reboot();
            }
            return; // Don't process anything else while crashed
        }

        this._incomingDt = delta;
        if (this.screenMesh.material && this.screenMesh.material.uniforms && this.screenMesh.material.uniforms.uTime) {
            this.screenMesh.material.uniforms.uTime.value += delta;
        }
    }

    setCursorVisibility(visible) {
        if (this.cursor.visible !== visible) {
            this.cursor.visible = visible;
            this.draw();
        }
    }

    localToCanvas(localX, localY) {
        const screenWidth = this.screenMesh.geometry.parameters.width;
        const screenHeight = this.screenMesh.geometry.parameters.height;
        const canvasX = (localX + screenWidth / 2) / screenWidth * this.width;
        const canvasY = (-localY + screenHeight / 2) / screenHeight * this.height;
        return { x: canvasX, y: canvasY };
    }

    openWindow(source) {
        if (this.isCrashed) return;

        const baseWindow = {
            id: this.nextWindowId++,
            title: source.name,
            x: 100 + ((this.windows.length + this.nextWindowId) % 5) * 20,
            y: 50 + ((this.windows.length + this.nextWindowId) % 5) * 20,
            width: 700,
            height: 450,
        };
        switch(source.id) {
            case 'recycle_bin': this.windows.push({ ...baseWindow, type: 'recycle_bin', items: [] }); break;
            case 'snake': this.windows.push({ ...baseWindow, type: 'snake', width: 520, height: 400, game: null }); break;
            case 'slots': this.windows.push({ ...baseWindow, type: 'slots', width: 420, height: 340, game: null }); break;
            case 'backgrounds': this.windows.push({ ...baseWindow, type: 'backgrounds', width: 420, height: 320 }); break;
            case 'settings': this.windows.push({ ...baseWindow, type: 'settings', width: 480, height: 320 }); break;
            case 'camera': this.windows.push({ ...baseWindow, type: 'camera', width: 520, height: 380 }); break;
            case 'security':
                if (this.securityCameraApp) {
                     this.windows.push({ ...baseWindow, type: 'security', title: 'Security Cameras', width: 540, height: 380 });
                }
                break;
            case 'chat':
                this.windows.push({
                    ...baseWindow, type: 'chat', title: 'Chat', width: 520, height: 420,
                    app: new ChatApp(() => this.draw()), _chatFocused: true
                });
                this.focusedElement = { windowId: this.nextWindowId - 1, element: 'chat_input' };
                break;
        }

        if (this.windows.length >= 30) {
            this.triggerCrash();
        }
    }

    triggerCrash() {
        this.isCrashed = true;
        this.crashTime = performance.now();
        this.playSound('crash');

        // Clean up immediate state to prevent interaction under BSOD
        this.windows = [];
        this.startMenuOpen = false;
        this.draggingWindow = null;
        this.resizingWindow = null;
        this.focusedElement = null;
        this.cameraApp.stop();

        this.draw();
    }

    reboot() {
        this.isCrashed = false;
        this.crashTime = 0;
        this.windows = [];
        this.nextWindowId = 1;
        this.draggingWindow = null;
        this.dragOffset = { x: 0, y: 0 };
        this.resizingWindow = null;
        this.resizeStart = { mx: 0, my: 0, w: 0, h: 0 };
        this.startMenuOpen = false;
        this.focusedElement = null;
        this.pendingCloseWindow = null;
        this.points = 0;
        this.activeBackground = 'Classic';
        this.ownedBackgrounds = new Set(['Classic']);
        this.scoliosisMode = false;
        this.mattBeQuietMode = false;
        this.fullbrightMode = false;
        this.cameraApp.stop();
        this.draw();
    }

    drawBSOD() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0000AA';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = 'white';
        ctx.font = '22px "Courier New", monospace';
        ctx.textAlign = 'center';

        ctx.fillText("A fatal error has occurred.", this.width / 2, this.height / 2 - 30);
        ctx.fillText("The system will restart shortly.", this.width / 2, this.height / 2 + 10);
        
        ctx.font = '16px "Courier New", monospace';
        ctx.fillText("ERROR_CODE: 0x001BADD0 (TOO_MANY_WINDOWS)", this.width / 2, this.height / 2 + 80);
    }

    draw() {
        if (this.isCrashed) {
            this.drawBSOD();
            this.texture.needsUpdate = true;
            return;
        }

        if (this._incomingDt != null) { this._dt = this._incomingDt; this._incomingDt = null; }
        else {
            const now = performance.now();
            this._dt = this._lastTime ? (now - this._lastTime) / 1000 : 0;
            this._lastTime = now;
        }
        DesktopUI.drawDesktopBackground(this);
        this.ctx.font = '14px Arial'; this.ctx.textAlign = 'center';
        for (const icon of this.icons) {
            if (icon.img && icon.img.complete && icon.img.naturalWidth > 0 && !icon.broken) {
                this.ctx.drawImage(icon.img, icon.x, icon.y, icon.width, icon.height);
            } else {
                this.ctx.fillStyle = '#efefef'; this.ctx.fillRect(icon.x, icon.y, icon.width, icon.height);
                this.ctx.strokeStyle = 'black'; this.ctx.strokeRect(icon.x, icon.y, icon.width, icon.height);
            }
            this.ctx.fillStyle = 'white'; this.ctx.shadowColor = 'rgba(0,0,0,0.5)'; this.ctx.shadowBlur = 4;
            this.ctx.fillText(icon.name, icon.x + icon.width / 2, icon.y + icon.height + 18);
            this.ctx.shadowBlur = 0;
        }
        this.needsAnimation = false;
        this.windows.forEach(win => this.drawWindow(win));
        this.ctx.fillStyle = '#c0c0c0';
        const taskbarHeight = 40;
        this.ctx.fillRect(0, this.height - taskbarHeight, this.width, taskbarHeight);
        this.ctx.strokeStyle = '#ffffff'; this.ctx.beginPath();
        this.ctx.moveTo(0, this.height - taskbarHeight + 1); this.ctx.lineTo(this.width, this.height - taskbarHeight + 1); this.ctx.stroke();
        this.ctx.fillStyle = 'black'; this.ctx.font = 'bold 14px Arial'; this.ctx.textAlign = 'right';
        this.ctx.fillText(`Points: ${this.points}`, this.width - 12, this.height - 12);
        const startButtonWidth = 80;
        this.ctx.fillStyle = '#c0c0c0';
        this.ctx.fillRect(4, this.height - taskbarHeight + 4, startButtonWidth, taskbarHeight - 8);
        this.ctx.strokeRect(4, this.height - taskbarHeight + 4, startButtonWidth, taskbarHeight - 8);
        this.ctx.fillStyle = 'black'; this.ctx.font = 'bold 18px Arial'; this.ctx.textAlign = 'left';
        this.ctx.fillText('Start', 15, this.height - taskbarHeight + 26);
        if (this.startMenuOpen) DesktopUI.drawStartMenu(this);
        if (this.cursor.visible) {
            this.ctx.fillStyle = 'white'; this.ctx.strokeStyle = 'black'; this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(this.cursor.x, this.cursor.y);
            this.ctx.lineTo(this.cursor.x, this.cursor.y + 17);
            this.ctx.lineTo(this.cursor.x + 5, this.cursor.y + 12);
            this.ctx.lineTo(this.cursor.x + 11, this.cursor.y + 11);
            this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke();
        }
        this.texture.needsUpdate = true;
    }

    drawWindow(win) { WindowsContent.drawWindow(this, win); }

    handleBackgroundsClick(win, canvasX, canvasY) {
        ScreenHandlers.handleBackgroundsClick(this, win, canvasX, canvasY);
    }

    handleSettingsClick(win, canvasX, canvasY) {
        ScreenHandlers.handleSettingsClick(this, win, canvasX, canvasY);
    }
}