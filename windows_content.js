import { SnakeGame } from './snake.js';
import { SlotsGame } from './slots.js';

export const WindowsContent = {
  drawWindow(model, win) {
    const ctx = model.ctx;
    const titleBarHeight = 25;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(win.x + 5, win.y + 5, win.width, win.height);
    ctx.fillStyle = '#c0c0c0'; ctx.fillRect(win.x, win.y, win.width, win.height);
    ctx.strokeStyle = '#ffffff'; ctx.strokeRect(win.x, win.y, win.width, win.height);
    ctx.fillStyle = '#000080'; ctx.fillRect(win.x + 2, win.y + 2, win.width - 4, titleBarHeight);
    ctx.fillStyle = 'white'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'left';
    ctx.fillText(win.title, win.x + 8, win.y + 18);
    ctx.fillStyle = '#c0c0c0';
    const closeButton = { x: win.x + win.width - 20, y: win.y + 5, w: 15, h: 15 };
    ctx.fillRect(closeButton.x, closeButton.y, closeButton.w, closeButton.h);
    ctx.strokeRect(closeButton.x, closeButton.y, closeButton.w, closeButton.h);
    ctx.fillStyle = 'black'; ctx.font = 'bold 12px Arial';
    ctx.fillText('X', closeButton.x + 4, closeButton.y + 12);

    const contentX = win.x + 2, contentY = win.y + titleBarHeight + 2;
    const contentWidth = win.width - 4, contentHeight = win.height - titleBarHeight - 4;
    ctx.fillStyle = 'white'; ctx.fillRect(contentX, contentY, contentWidth, contentHeight);

    // Clip content to window bounds
    ctx.save();
    ctx.beginPath();
    ctx.rect(contentX, contentY, contentWidth, contentHeight);
    ctx.clip();

    // Ensure per-window scroll state
    win._scroll = win._scroll || { offset: 0, max: 0 };

    if (model.focusedElement && model.focusedElement.windowId === win.id) {
      ctx.strokeStyle = 'rgba(0, 120, 215, 0.8)'; ctx.lineWidth = 2;
      if (model.focusedElement.element === 'url_bar') {
        const urlBar = { x: contentX + 80, y: contentY + 5, w: contentWidth - 85, h: 20 };
        ctx.strokeRect(urlBar.x - 1, urlBar.y - 1, urlBar.w + 2, urlBar.h + 2);
      }
      ctx.lineWidth = 1;
    }

    // NEW: Check for scrollbar and adjust content width
    const scrollbarWidth = 14;
    const needsScrollbar = win.type !== 'chat' && win._scroll && win._scroll.max > 0;
    let renderWidth = contentWidth;
    if (needsScrollbar) {
        renderWidth -= scrollbarWidth;
    }
    
    // Re-clip to the adjusted render area
    ctx.restore(); // remove the first clip
    ctx.save();
    ctx.beginPath();
    ctx.rect(contentX, contentY, renderWidth, contentHeight);
    ctx.clip();

    switch (win.type) {
      case 'recycle_bin': drawRecycleBin(ctx, contentX, contentY, renderWidth, contentHeight, win); break;
      case 'snake': drawSnake(model, win, contentX, contentY, renderWidth, contentHeight); model.needsAnimation = true; break;
      case 'slots': drawSlots(model, win, contentX, contentY, renderWidth, contentHeight); model.needsAnimation = true; break;
      case 'backgrounds': drawBackgrounds(model, win, contentX, contentY, renderWidth, contentHeight); break;
      case 'settings': drawSettings(model, win, contentX, contentY, renderWidth, contentHeight); break;
      case 'camera':
        model.cameraApp.draw(ctx, win, contentX, contentY, renderWidth, contentHeight);
        model.needsAnimation = true;
        break;
      case 'security':
        if (model.securityCameraApp) {
            model.securityCameraApp.renderViews(); // Trigger render of 3D scene to texture
            model.securityCameraApp.draw(ctx, win, contentX, contentY, contentWidth, contentHeight);
        }
        model.needsAnimation = true;
        break;
      case 'chat':
        if (win.app?.update) win.app.update(model._dt || 0);
        if (win.app?.draw) win.app.draw(ctx, win, contentX, contentY, contentWidth, contentHeight, !!win._chatFocused);
        model.needsAnimation = true;
        break;
    }

    ctx.restore();

    // Resize grip (bottom-right)
    const grip = { x: win.x + win.width - 14, y: win.y + win.height - 14, w: 12, h: 12 };
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(grip.x, grip.y, grip.w, grip.h);
    ctx.strokeStyle = '#000';
    ctx.strokeRect(grip.x, grip.y, grip.w, grip.h);
    ctx.strokeStyle = '#666';
    for (let i = 2; i <= 8; i += 3) {
      ctx.beginPath();
      ctx.moveTo(grip.x + i, grip.y + grip.h);
      ctx.lineTo(grip.x + grip.w, grip.y + i);
      ctx.stroke();
    }

    // Draw vertical scrollbar if needed (skip for chat which draws its own)
    if (needsScrollbar) {
      const sbX = contentX + renderWidth, sbY = contentY, sbW = scrollbarWidth, sbH = contentHeight;
      ctx.fillStyle = '#dfdfdf'; ctx.fillRect(sbX, sbY, sbW, sbH);
      
      const ratio = contentHeight / (contentHeight + win._scroll.max);
      const thumbH = Math.max(24, sbH * ratio);
      const thumbY = sbY + (sbH - thumbH) * (win._scroll.offset / win._scroll.max);

      // Draw thumb with classic 3D effect
      ctx.fillStyle = '#c0c0c0'; ctx.fillRect(sbX, thumbY, sbW, thumbH);
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(sbX, thumbY + thumbH - 1); ctx.lineTo(sbX, thumbY); ctx.lineTo(sbX + sbW - 1, thumbY); ctx.stroke();
      ctx.strokeStyle = '#808080';
      ctx.beginPath(); ctx.moveTo(sbX + 1, thumbY + thumbH - 1); ctx.lineTo(sbX + sbW - 1, thumbY + thumbH - 1); ctx.lineTo(sbX + sbW - 1, thumbY + 1); ctx.stroke();
    }
  },
};

function drawRecycleBin(ctx, x, y, width, height, win) {
  if (!win.items || win.items.length === 0) {
    ctx.fillStyle = '#888888'; ctx.font = '14px Arial'; ctx.textAlign = 'center';
    ctx.fillText("This folder is empty.", x + width / 2, y + height / 2);
  }
}

function drawSettings(model, win, x, y, width, height) {
  const ctx = model.ctx;
  ctx.fillStyle = 'black'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'left';
  ctx.fillText("System Settings", x + 10, y + 25);
  ctx.font = '14px Arial';
  ctx.fillText("Display Resolution: 1024x576", x + 10, y + 60);
  ctx.fillText("System Time: 09:41 AM", x + 10, y + 80);
  ctx.fillText("Account: User", x + 10, y + 100);

  // Scoliosis mode
  const ty1 = y + 140;
  const box1 = { x: x + 10, y: ty1 - 14, w: 20, h: 20 };
  ctx.strokeStyle = '#333'; ctx.strokeRect(box1.x, box1.y, box1.w, box1.h);
  if (model.scoliosisMode) { ctx.fillStyle = '#0078d7'; ctx.fillRect(box1.x + 3, box1.y + 3, box1.w - 6, box1.h - 6); }
  ctx.fillStyle = 'black'; ctx.font = '14px Arial';
  ctx.fillText("Scoliosis mode (toggle zoom)", box1.x + box1.w + 10, ty1 + 2);

  // Matt be quiet mode
  const ty2 = y + 170;
  const box2 = { x: x + 10, y: ty2 - 14, w: 20, h: 20 };
  ctx.strokeStyle = '#333'; ctx.strokeRect(box2.x, box2.y, box2.w, box2.h);
  if (model.mattBeQuietMode) { ctx.fillStyle = '#0078d7'; ctx.fillRect(box2.x + 3, box2.y + 3, box2.w - 6, box2.h - 6); }
  ctx.fillStyle = 'black'; ctx.font = '14px Arial';
  ctx.fillText("Matt be quiet mode", box2.x + box2.w + 10, ty2 + 2);
  
  // Fullbright mode
  const ty3 = y + 200;
  const box3 = { x: x + 10, y: ty3 - 14, w: 20, h: 20 };
  ctx.strokeStyle = '#333'; ctx.strokeRect(box3.x, box3.y, box3.w, box3.h);
  if (model.fullbrightMode) { ctx.fillStyle = '#0078d7'; ctx.fillRect(box3.x + 3, box3.y + 3, box3.w - 6, box3.h - 6); }
  ctx.fillStyle = 'black'; ctx.font = '14px Arial';
  ctx.fillText("Fullbright mode", box3.x + box3.w + 10, ty3 + 2);

  win._settings = { 
      scoliosisHit: { x: box1.x, y: box1.y, w: 300, h: box1.h },
      mattBeQuietHit: { x: box2.x, y: box2.y, w: 300, h: box2.h },
      fullbrightHit: { x: box3.x, y: box3.y, w: 300, h: box3.h }
  };
}

function drawSnake(model, win, x, y, width, height) {
  if (!win.game || win._lastW !== width || win._lastH !== height) {
    const cols = Math.max(10, Math.floor(width / 16));
    const rows = Math.max(8, Math.floor(height / 16));
    win.game = new SnakeGame(cols, rows, (delta) => { model.points += delta; });
    win._lastW = width; win._lastH = height;
  }
  win.game.update(model._dt || 0);
  win.game.render(model.ctx, x, y, width, height);
}

function drawSlots(model, win, x, y, width, height) {
  if (!win.game) {
    win.game = new SlotsGame({
      spendPoints: (amt) => { if (model.points >= amt) { model.points -= amt; return true; } return false; },
      awardPoints: (amt) => { model.points += amt; },
      requestDraw: () => { model.draw(); }
    });
  }
  win.game.update(model._dt || 0);
  win.game.render(model.ctx, x, y, width, height);
}

function drawBackgrounds(model, win, x, y, width, height) {
  const ctx = model.ctx;
  const items = [
    { name: 'Classic', cost: 0 }, { name: 'Midnight', cost: 50 }, { name: 'Soft Grid', cost: 75 },
    { name: 'Dawn', cost: 40 }, { name: 'Horizon Lines', cost: 45 }, { name: 'Low Poly Peaks', cost: 70 },
    { name: 'Blueprint', cost: 35 }, { name: 'Retro Sun', cost: 65 }, { name: 'Paper', cost: 20 },
    { name: 'Starfield', cost: 55 }, { name: 'Waves', cost: 60 }, { name: 'Hex Mesh', cost: 50 }, { name: 'Circuit', cost: 50 }
  ];
  ctx.fillStyle = '#111'; ctx.fillRect(x, y, width, height);
  ctx.fillStyle = 'white'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'left';
  ctx.fillText('Backgrounds', x + 12, y + 24);

  const padTop = 50, rowH = 58;
  const totalH = padTop + items.length * rowH;
  win._scroll = win._scroll || { offset: 0, max: 0 };
  win._scroll.max = Math.max(0, totalH - height);

  let oy = y + padTop - win._scroll.offset;
  win._bgItems = [];

  items.forEach((bg, i) => {
    const owned = model.ownedBackgrounds.has(bg.name);
    const isActive = model.activeBackground === bg.name;
    const rowY = oy - 18;
    // only draw if within clipped region
    if (rowY < y + height && rowY + 46 > y) {
      ctx.fillStyle = '#222'; ctx.fillRect(x + 10, rowY, width - 20, 46);
      ctx.strokeStyle = isActive ? '#0078d7' : '#555';
      ctx.strokeRect(x + 10, rowY, width - 20, 46);
      ctx.fillStyle = 'white'; ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'left'; // <<< FIX: Reset textAlign for each item
      
      const btnW = 80;
      const btnAreaWidth = btnW * 2 + 10;
      const textMaxWidth = width - 20 - btnAreaWidth - 10; // content width - padding - buttons - text padding
      ctx.fillText(bg.name, x + 20, oy, textMaxWidth);

      ctx.font = '12px Arial'; ctx.fillStyle = '#ddd';
      ctx.fillText(owned ? 'Owned' : `Cost: ${bg.cost} pts`, x + 20, oy + 18, textMaxWidth);
      const btnH = 24, btnY = oy - 6;
      const btnBuyX = x + width - 10 - btnW * 2 - 10;
      const btnApplyX = x + width - 10 - btnW;
      ctx.fillStyle = owned ? '#2a2a2a' : '#c0c0c0';
      ctx.fillRect(btnBuyX, btnY, btnW, btnH);
      ctx.strokeStyle = '#000'; ctx.strokeRect(btnBuyX, btnY, btnW, btnH);
      ctx.fillStyle = 'black'; ctx.textAlign = 'center';
      ctx.fillText(owned ? 'Owned' : 'Buy', btnBuyX + btnW / 2, btnY + 16);
      ctx.fillStyle = owned && !isActive ? '#c0c0c0' : '#2a2a2a';
      ctx.fillRect(btnApplyX, btnY, btnW, btnH);
      ctx.strokeStyle = '#000'; ctx.strokeRect(btnApplyX, btnY, btnW, btnH);
      ctx.fillStyle = 'black'; ctx.fillText(isActive ? 'Active' : 'Apply', btnApplyX + btnW / 2, btnY + 16);

      // store absolute positions (already offset-applied for current frame)
      win._bgItems[i] = {
        buy: { x: btnBuyX, y: btnY, w: btnW, h: btnH, name: bg.name, cost: bg.cost, owned },
        apply: { x: btnApplyX, y: btnY, w: btnW, h: btnH, name: bg.name, owned, isActive }
      };
    } else {
      // still keep indices aligned for click checks
      win._bgItems[i] = win._bgItems[i] || null;
    }
    oy += rowH;
  });
}