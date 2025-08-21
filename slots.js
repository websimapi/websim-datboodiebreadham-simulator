export class SlotsGame {
    constructor({ spendPoints, awardPoints, requestDraw }) {
        this.spendPoints = spendPoints;
        this.awardPoints = awardPoints;
        this.requestDraw = requestDraw;
        this.symbols = ['🍒', '🍋', '🔔', '⭐', '7'];
        this.reels = [0, 0, 0];
        this.spinning = false;
        this.spinTime = 0;
        this.spinDuration = 0;
        this.result = null;
        this.bet = 10;
        this.buttonRect = { x: 0, y: 0, w: 0, h: 0 };
    }

    startSpin() {
        if (this.spinning) return;
        if (!this.spendPoints(this.bet)) return; // not enough points
        this.spinning = true;
        this.spinTime = 0;
        this.spinDuration = 1.2 + Math.random() * 0.8;
        this.result = null;
        this.requestDraw && this.requestDraw();
    }

    update(dt) {
        if (!this.spinning) return;
        this.spinTime += dt;
        // advance reels with easing
        for (let i = 0; i < 3; i++) {
            const speed = 18 - i * 3; // stagger stops
            this.reels[i] = (this.reels[i] + speed * dt) % this.symbols.length;
        }
        if (this.spinTime >= this.spinDuration) {
            // stop and compute outcome
            this.spinning = false;
            for (let i = 0; i < 3; i++) {
                this.reels[i] = Math.floor(this.reels[i] + Math.random() * this.symbols.length) % this.symbols.length;
            }
            this.evaluate();
            this.requestDraw && this.requestDraw();
        }
    }

    evaluate() {
        const [a, b, c] = this.reels.map(r => Math.round(r) % this.symbols.length);
        let payout = 0;
        if (a === b && b === c) {
            // triple payout
            const sym = this.symbols[a];
            payout = sym === '7' ? this.bet * 10 : this.bet * 5;
        } else if (a === b || b === c) {
            payout = Math.floor(this.bet * 1.5);
        }
        if (payout > 0) this.awardPoints(payout);
        this.result = { indices: [a, b, c], payout };
    }

    handleClick(canvasX, canvasY, rect) {
        // One button centered bottom
        const btnW = 120, btnH = 36;
        const btnX = rect.x + (rect.w - btnW) / 2;
        const btnY = rect.y + rect.h - btnH - 12;
        this.buttonRect = { x: btnX, y: btnY, w: btnW, h: btnH };
        if (canvasX >= btnX && canvasX <= btnX + btnW && canvasY >= btnY && canvasY <= btnY + btnH) {
            this.startSpin();
        }
    }

    render(ctx, x, y, w, h) {
        // Panel
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#444';
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Slots', x + w / 2, y + 24);

        // Reels area
        const reelW = Math.floor((w - 60) / 3);
        const reelH = 100;
        const rx = x + 20;
        const ry = y + 50;

        for (let i = 0; i < 3; i++) {
            const sx = rx + i * (reelW + 10);
            ctx.fillStyle = '#eee';
            ctx.fillRect(sx, ry, reelW, reelH);
            ctx.strokeStyle = '#000';
            ctx.strokeRect(sx, ry, reelW, reelH);

            // symbol display (center)
            const idx = Math.round(this.reels[i]) % this.symbols.length;
            ctx.fillStyle = '#000';
            ctx.font = '32px Arial';
            ctx.fillText(this.symbols[idx], sx + reelW / 2, ry + reelH / 2 + 12);
        }

        // Bet display
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Bet: ${this.bet} pts`, x + 20, ry + reelH + 24);

        // Result
        if (this.result) {
            ctx.textAlign = 'right';
            ctx.fillStyle = this.result.payout > 0 ? '#2ecc71' : '#e74c3c';
            ctx.fillText(this.result.payout > 0 ? `Won ${this.result.payout} pts` : 'No win', x + w - 20, ry + reelH + 24);
        }

        // Button
        const btnW = 120, btnH = 36;
        const btnX = x + (w - btnW) / 2;
        const btnY = y + h - btnH - 12;
        this.buttonRect = { x: btnX, y: btnY, w: btnW, h: btnH };
        ctx.fillStyle = this.spinning ? '#888' : '#c0c0c0';
        ctx.fillRect(btnX, btnY, btnW, btnH);
        ctx.strokeStyle = '#000';
        ctx.strokeRect(btnX, btnY, btnW, btnH);
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(this.spinning ? 'Spinning...' : 'Spin', btnX + btnW / 2, btnY + 22);
    }
}