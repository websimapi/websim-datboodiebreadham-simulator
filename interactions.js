function handleWindowClick(computer, win, canvasX, canvasY) {
    // Focus the clicked window
    computer.focusedElement = null;
    if (win.type === 'snake') {
        win.isFocused = true;
        computer.focusedElement = { windowId: win.id, element: 'snake' };
        // Click to start/resume; if game over, click restarts
        if (win.game) {
            if (win.game.gameOver) win.game.restart();
            else win.game.start();
        }
        return;
    }
    if (win.type === 'slots') {
        // Forward click into content area
        const titleBarHeight = 25;
        const contentX = win.x + 2;
        const contentY = win.y + titleBarHeight + 2;
        if (win.game && canvasX >= contentX && canvasX <= contentX + win.width - 4 &&
            canvasY >= contentY && canvasY <= contentY + win.height - titleBarHeight - 4) {
            win.game.handleClick(canvasX, canvasY, { x: contentX, y: contentY, w: win.width - 4, h: win.height - titleBarHeight - 4 });
        }
        return;
    }
    if (win.type === 'security') {
        const titleBarHeight = 25;
        const contentX = win.x + 2, contentY = win.y + titleBarHeight + 2;
        const rect = { x: contentX, y: contentY, w: win.width - 4, h: win.height - titleBarHeight - 4 };
        if (computer.securityCameraApp) {
            computer.securityCameraApp.handleClick(canvasX, canvasY, rect, win);
        }
        return;
    }
    if (win.type === 'backgrounds') {
        const titleBarHeight = 25;
        const contentX = win.x + 2;
        const contentY = win.y + titleBarHeight + 2;
        computer.handleBackgroundsClick(win, canvasX, canvasY);
        return;
    }
    if (win.type === 'settings') {
        computer.handleSettingsClick(win, canvasX, canvasY);
        return;
    }
    if (win.type === 'camera') {
        const titleBarHeight = 25;
        const contentX = win.x + 2;
        const contentY = win.y + titleBarHeight + 2;
        // stop button hit test
        if (win._stopBtn) {
            const b = win._stopBtn;
            if (canvasX >= b.x && canvasX <= b.x + b.w && canvasY >= b.y && canvasY <= b.y + b.h) {
                computer.cameraApp.stop();
                computer.draw();
                return;
            }
        }
        // start button hit test
        if (win._startBtn) {
            const b = win._startBtn;
            if (canvasX >= b.x && canvasX <= b.x + b.w && canvasY >= b.y && canvasY <= b.y + b.h) {
                computer.cameraApp.start();
                computer.draw();
                return;
            }
        }
        // clicking video area starts webcam again if stopped
        if (!computer.cameraApp.webcamActive) {
            computer.cameraApp.start();
            computer.draw();
        }
        return;
    }
    if (win.type === 'chat') {
        const titleBarHeight = 25;
        const contentX = win.x + 2, contentY = win.y + titleBarHeight + 2;
        const rect = { x: contentX, y: contentY, w: win.width - 4, h: win.height - titleBarHeight - 4 };
        win._chatFocused = true;
        win.app && win.app.handleClick(canvasX, canvasY, rect, win);
        computer.focusedElement = { windowId: win.id, element: 'chat_input' };
        computer.draw();
        return;
    }
    return;
}

export function handleMouseDown(computer, localX, localY) {
    if (computer.isCrashed || !computer.cursor.visible) return;
    computer.playSound('click');
    const { x: canvasX, y: canvasY } = computer.localToCanvas(localX, localY);

    // Unfocus all windows first
    computer.windows.forEach(w => w.isFocused = false);

    // Check for clicks on window title bars (from top down)
    for (let i = computer.windows.length - 1; i >= 0; i--) {
        const win = computer.windows[i];
        const titleBarHeight = 25;
        // Resize grip hit first (bottom-right 12x12)
        const grip = { x: win.x + win.width - 14, y: win.y + win.height - 14, w: 12, h: 12 };
        if (canvasX >= grip.x && canvasX <= grip.x + grip.w && canvasY >= grip.y && canvasY <= grip.y + grip.h) {
            // start resizing
            computer.windows.push(computer.windows.splice(i, 1)[0]);
            computer.resizingWindow = computer.windows[computer.windows.length - 1];
            computer.resizingWindow.isFocused = true;
            computer.resizeStart.mx = canvasX;
            computer.resizeStart.my = canvasY;
            computer.resizeStart.w = computer.resizingWindow.width;
            computer.resizeStart.h = computer.resizingWindow.height;
            computer.draw();
            return;
        }
        if (canvasX >= win.x && canvasX <= win.x + win.width &&
            canvasY >= win.y && canvasY <= win.y + titleBarHeight) {
            
            // Check close button first – don't start dragging if close is targeted
            const closeButton = { x: win.x + win.width - 20, y: win.y + 5, w: 15, h: 15 };
            if (canvasX >= closeButton.x && canvasX <= closeButton.x + closeButton.w &&
                canvasY >= closeButton.y && canvasY <= closeButton.y + closeButton.h) {
                computer.pendingCloseWindow = win.id;
                computer.draw();
                return;
            }
            
            // Bring window to front
            computer.windows.push(computer.windows.splice(i, 1)[0]);
            
            const activeWin = computer.windows[computer.windows.length - 1];
            activeWin.isFocused = true;

            computer.focusedElement = null; // Clicking title bar unfocuses elements within the window
            activeWin.focusedElement = null;

            // Start dragging
            computer.draggingWindow = activeWin;
            computer.dragOffset.x = canvasX - computer.draggingWindow.x;
            computer.dragOffset.y = canvasY - computer.draggingWindow.y;
            
            computer.draw();
            return;
        }

        // Check for clicks inside the window content
        if (canvasX >= win.x && canvasX <= win.x + win.width &&
            canvasY > win.y + titleBarHeight && canvasY <= win.y + win.height) {
            
            // Bring window to front if it's not already
            if (i !== computer.windows.length - 1) {
                computer.windows.push(computer.windows.splice(i, 1)[0]);
            }
            
            const activeWin = computer.windows[computer.windows.length - 1];
            activeWin.isFocused = true;
            handleWindowClick(computer, activeWin, canvasX, canvasY);
            computer.draw();
            return;
        }
    }

    // If we clicked anywhere else, unfocus
    computer.focusedElement = null;
    computer.draw();
}

export function handleMouseUp(computer, localX, localY) {
    if (computer.isCrashed || !computer.cursor.visible) return;
    const { x: canvasX, y: canvasY } = computer.localToCanvas(localX, localY);

    // stop resizing if active
    if (computer.resizingWindow) {
        computer.resizingWindow = null;
        return;
    }

    // Handle pending close if mouseup is still on the close button
    if (computer.pendingCloseWindow != null) {
        const win = computer.windows.find(w => w.id === computer.pendingCloseWindow);
        computer.pendingCloseWindow = null;
        if (win) {
            const closeButton = { x: win.x + win.width - 20, y: win.y + 5, w: 15, h: 15 };
            if (canvasX >= closeButton.x && canvasX <= closeButton.x + closeButton.w &&
                canvasY >= closeButton.y && canvasY <= closeButton.y + closeButton.h) {
                if (computer.focusedElement && computer.focusedElement.windowId === win.id) computer.focusedElement = null;
                computer.windows = computer.windows.filter(w => w.id !== win.id);
                computer.draw();
                return;
            }
        }
    }

    // If we were dragging, just stop. The click is consumed by the drag.
    if (computer.draggingWindow) {
        computer.draggingWindow = null;
        return;
    }

    // Check for click on a window's close button (from top down)
    for (let i = computer.windows.length - 1; i >= 0; i--) {
        const win = computer.windows[i];
        const closeButton = { x: win.x + win.width - 20, y: win.y + 5, w: 15, h: 15 };
        if (canvasX >= closeButton.x && canvasX <= closeButton.x + closeButton.w &&
            canvasY >= closeButton.y && canvasY <= closeButton.y + closeButton.h) {
            
            if (computer.focusedElement && computer.focusedElement.windowId === win.id) {
                computer.focusedElement = null;
            }
            computer.windows.splice(i, 1); // Remove the window
            computer.draw();
            return;
        }
    }

    // Check Start Menu
    const startButton = { x: 4, y: computer.height - 36, w: 80, h: 32 };
    if (canvasX >= startButton.x && canvasX <= startButton.x + startButton.w &&
        canvasY >= startButton.y && canvasY <= startButton.y + startButton.h) {
        computer.startMenuOpen = !computer.startMenuOpen;
        computer.draw();
        return;
    }

    // Check Start Menu Items if open
    if (computer.startMenuOpen) {
        // Align hit areas with drawStartMenu()
        const menuWidth = 150, menuHeight = 200, menuX = 2, menuY = computer.height - 40 - menuHeight;
        // If click is inside the menu, handle it and prevent click-through
        if (canvasX >= menuX && canvasX <= menuX + menuWidth &&
            canvasY >= menuY && canvasY <= menuY + menuHeight) {
            const settingsButton = { x: menuX, y: menuY, w: menuWidth, h: 30 };
            if (canvasX >= settingsButton.x && canvasX <= settingsButton.x + settingsButton.w &&
                canvasY >= settingsButton.y && canvasY <= settingsButton.y + settingsButton.h) {
                computer.openWindow({ id: 'settings', name: 'Settings' });
            }
            computer.startMenuOpen = false;
            computer.draw();
            return;
        }
    }

    // Click was not on a window or start button, so close the start menu
    if (computer.startMenuOpen) {
        computer.startMenuOpen = false;
    }

    // Check if click is on an icon
    for (const icon of computer.icons) {
        if (canvasX >= icon.x && canvasX <= icon.x + icon.width &&
            canvasY >= icon.y && canvasY <= icon.y + icon.height) {
            computer.openWindow(icon);
            computer.draw();
            return;
        }
    }
    
    computer.draw(); // Redraw to handle start menu closing
}

export function handleMouseMove(computer, localX, localY) {
    if (computer.isCrashed || !computer.cursor.visible) return;
    const { x: canvasX, y: canvasY } = computer.localToCanvas(localX, localY);

    computer.cursor.x = Math.max(0, Math.min(computer.width, canvasX));
    computer.cursor.y = Math.max(0, Math.min(computer.height, canvasY));

    if (computer.resizingWindow) {
        const dx = canvasX - computer.resizeStart.mx;
        const dy = canvasY - computer.resizeStart.my;
        const minW = 260, minH = 180;
        computer.resizingWindow.width = Math.max(minW, computer.resizeStart.w + dx);
        computer.resizingWindow.height = Math.max(minH, computer.resizeStart.h + dy);
        // keep within desktop bounds
        computer.resizingWindow.width = Math.min(computer.width - computer.resizingWindow.x - 2, computer.resizingWindow.width);
        computer.resizingWindow.height = Math.min(computer.height - computer.resizingWindow.y - 42, computer.resizingWindow.height);
        computer.draw();
        return;
    }

    if (computer.draggingWindow) {
        computer.draggingWindow.x = computer.cursor.x - computer.dragOffset.x;
        computer.draggingWindow.y = computer.cursor.y - computer.dragOffset.y;
    }

    computer.draw();
}

export function handleKeyDown(computer, event) {
    if (computer.isCrashed) return;

    // Route keys to focused snake window if any
    if (computer.focusedElement) {
        const w = computer.windows.find(w => w.id === computer.focusedElement.windowId);
        if (w && w.type === 'snake' && w.game) {
            w.game.handleKey(event);
            computer.draw();
            return;
        }
        // route to chat input
        if (w && w.type === 'chat' && w.app) {
            w.app.handleKey(event);
            computer.needsAnimation = true;
            computer.draw();
            return;
        }
    }
    return;
}