import * as Interactions from './interactions.js';
import { createMouseHandlers } from './computer_mouse.js';
import { createKeyboardHandlers } from './computer_keyboard.js';
import { ComputerScreenModel } from './computer_screen_model.js';

export class ComputerScreen extends ComputerScreenModel {
    constructor(screenMesh, playSound, renderer, scene, securityCameras) {
        super(screenMesh, playSound, renderer, scene, securityCameras);
        this.mouse = createMouseHandlers(this);
        this.keyboard = createKeyboardHandlers(this);
    }

    handleMouseDown(localX, localY) { Interactions.handleMouseDown(this, localX, localY); }
    handleMouseUp(localX, localY) { Interactions.handleMouseUp(this, localX, localY); }
    handleMouseMove(localX, localY) { Interactions.handleMouseMove(this, localX, localY); }
    handleKeyDown(event) { Interactions.handleKeyDown(this, event); }

    handleMouseWheel(localX, localY, deltaY) {
        if (!this.cursor.visible) return false;
        const { x: canvasX, y: canvasY } = this.localToCanvas(localX, localY);
        for (let i = this.windows.length - 1; i >= 0; i--) {
            const win = this.windows[i];
            const titleH = 25, contentX = win.x + 2, contentY = win.y + titleH + 2;
            const cw = win.width - 4, ch = win.height - titleH - 4;
            if (canvasX >= contentX && canvasX <= contentX + cw && canvasY >= contentY && canvasY <= contentY + ch) {
                if (win.type === 'chat' && win.app) {
                    const pad = 10, inputH = 30;
                    const listX = contentX + pad, listY = contentY + pad;
                    const listW = cw - pad * 2, listH = ch - pad * 3 - inputH;
                    if (canvasX >= listX && canvasX <= listX + listW && canvasY >= listY && canvasY <= listY + listH) {
                        const used = win.app.onWheel(deltaY);
                        if (used) { this.needsAnimation = true; this.draw(); return true; }
                    }
                } else if (win._scroll && win._scroll.max > 0) {
                    const step = 40;
                    win._scroll.offset = Math.min(win._scroll.max, Math.max(0, win._scroll.offset + Math.sign(deltaY) * step));
                    this.draw();
                    return true;
                }
                break;
            }
        }
        return false;
    }
}