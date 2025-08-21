export const ScreenHandlers = {
  handleBackgroundsClick(model, win, canvasX, canvasY) {
    if (!win._bgItems) return;
    for (const item of win._bgItems) {
      if (!item) continue; // Add a check to skip null/undefined items
      const b = item.buy, a = item.apply;
      if (canvasX >= b.x && canvasX <= b.x + b.w && canvasY >= b.y && canvasY <= b.y + b.h) {
        if (!model.ownedBackgrounds.has(b.name) && model.points >= b.cost) {
          model.points -= b.cost; model.ownedBackgrounds.add(b.name); model.draw();
        }
        return;
      }
      if (canvasX >= a.x && canvasX <= a.x + a.w && canvasY >= a.y && canvasY <= a.y + a.h) {
        if (model.ownedBackgrounds.has(a.name) && !a.isActive) { model.activeBackground = a.name; model.draw(); }
        return;
      }
    }
  },

  handleSettingsClick(model, win, canvasX, canvasY) {
    if (!win || !win._settings) return;
    const s = win._settings.scoliosisHit;
    if (canvasX >= s.x && canvasX <= s.x + s.w && canvasY >= s.y && canvasY <= s.y + s.h) {
      model.scoliosisMode = !model.scoliosisMode; model.draw();
    }
    const m = win._settings.mattBeQuietHit;
    if (m && canvasX >= m.x && canvasX <= m.x + m.w && canvasY >= m.y && canvasY <= m.y + m.h) {
      model.mattBeQuietMode = !model.mattBeQuietMode; model.draw();
    }
    const f = win._settings.fullbrightHit;
    if (f && canvasX >= f.x && canvasX <= f.x + f.w && canvasY >= f.y && canvasY <= f.y + f.h) {
      model.fullbrightMode = !model.fullbrightMode; model.draw();
    }
  },
};