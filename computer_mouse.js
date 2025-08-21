import * as Interactions from './interactions.js';

export function createMouseHandlers(computer) {
    return {
        handleMouseDown(localX, localY) {
            Interactions.handleMouseDown(computer, localX, localY);
        },
        handleMouseUp(localX, localY) {
            Interactions.handleMouseUp(computer, localX, localY);
        },
        handleMouseMove(localX, localY) {
            Interactions.handleMouseMove(computer, localX, localY);
        },
        handleMouseWheel(localX, localY, deltaY) {
            if (!computer.cursor.visible) return false;
            const { x: canvasX, y: canvasY } = computer.localToCanvas(localX, localY);
            for (let i = computer.windows.length - 1; i >= 0; i--) {
                const win = computer.windows[i];
                const titleH = 25, contentX = win.x + 2, contentY = win.y + titleH + 2;
                const cw = win.width - 4, ch = win.height - titleH - 4;
                if (canvasX >= contentX && canvasX <= contentX + cw && canvasY >= contentY && canvasY <= contentY + ch) {
                    if (win.type === 'chat' && win.app) {
                        const pad = 10, inputH = 30;
                        const listX = contentX + pad, listY = contentY + pad;
                        const listW = cw - pad * 2, listH = ch - pad * 3 - inputH;
                        if (canvasX >= listX && canvasX <= listX + listW && canvasY >= listY && canvasY <= listY + listH) {
                            const used = win.app.onWheel(deltaY);
                            if (used) { computer.needsAnimation = true; computer.draw(); return true; }
                        }
                    } else if (win._scroll && win._scroll.max > 0) {
                        const step = 40;
                        win._scroll.offset = Math.min(win._scroll.max, Math.max(0, win._scroll.offset + Math.sign(deltaY) * step));
                        computer.draw();
                        return true;
                    }
                    break;
                }
            }
            return false;
        },
    };
}