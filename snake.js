export class SnakeGame {
    constructor(cols = 20, rows = 15, onScore = null) {
        this.cols = cols;
        this.rows = rows;
        this.onScore = onScore;
        this.reset();
    }

    reset() {
        this.direction = { x: 1, y: 0 };
        this.nextDir = { x: 1, y: 0 };
        const cx = Math.floor(this.cols / 2);
        const cy = Math.floor(this.rows / 2);
        this.snake = [{ x: cx - 1, y: cy }, { x: cx, y: cy }];
        this.spawnFood();
        this.accum = 0;
        this.step = 0.12; // seconds per move
        this.running = false;
        this.gameOver = false;
        this.score = 0;
    }

    spawnFood() {
        while (true) {
            const fx = Math.floor(Math.random() * this.cols);
            const fy = Math.floor(Math.random() * this.rows);
            if (!this.snake.some(s => s.x === fx && s.y === fy)) {
                this.food = { x: fx, y: fy };
                break;
            }
        }
    }

    start() {
        if (this.gameOver) return;
        this.running = true;
    }

    pause() {
        this.running = false;
    }

    restart() {
        this.reset();
        this.start();
    }

    handleKey(e) {
        const k = e.key;
        const map = {
            ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
            ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, S: { x: 0, y: 1 },
            ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
            ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }, D: { x: 1, y: 0 },
        };
        if (map[k]) {
            const nd = map[k];
            // Prevent reversing directly
            if (this.snake.length > 1 && (nd.x === -this.direction.x && nd.y === -this.direction.y)) return;
            this.nextDir = nd;
            this.start();
            e.preventDefault();
            return;
        }
        // Pause/resume on P (ignore Space)
        if (k === 'p' || k === 'P') {
            if (!this.gameOver) this.running ? this.pause() : this.start();
            e.preventDefault();
            return;
        }
        // Enter: restart on game over, or start if halted
        if (k === 'Enter') {
            if (this.gameOver) this.restart();
            else this.start();
            e.preventDefault();
        }
    }

    update(dt) {
        if (!this.running || this.gameOver) return;
        this.accum += dt;
        while (this.accum >= this.step) {
            this.accum -= this.step;
            this.tick();
        }
    }

    tick() {
        // Apply queued direction
        this.direction = this.nextDir;
        const head = this.snake[this.snake.length - 1];
        const nx = head.x + this.direction.x;
        const ny = head.y + this.direction.y;

        // Collisions
        if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows ||
            this.snake.some(s => s.x === nx && s.y === ny)) {
            this.gameOver = true;
            this.running = false;
            return;
        }

        // Move
        this.snake.push({ x: nx, y: ny });

        // Eat
        if (nx === this.food.x && ny === this.food.y) {
            this.score += 10;
            if (this.onScore) this.onScore(10);
            // Speed up slightly
            this.step = Math.max(0.06, this.step - 0.004);
            this.spawnFood();
        } else {
            this.snake.shift();
        }
    }

    render(ctx, x, y, w, h) {
        // Compute cell size and margins to center the grid
        const cellSize = Math.floor(Math.min(w / this.cols, h / this.rows));
        const gw = cellSize * this.cols;
        const gh = cellSize * this.rows;
        const gx = Math.floor(x + (w - gw) / 2);
        const gy = Math.floor(y + (h - gh) / 2);

        // Background
        ctx.fillStyle = '#111'; // content bg already white; give game area dark for contrast
        ctx.fillRect(gx - 1, gy - 1, gw + 2, gh + 2);

        // Grid (subtle)
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let i = 1; i < this.cols; i++) {
            const xx = gx + i * cellSize + 0.5;
            ctx.beginPath(); ctx.moveTo(xx, gy); ctx.lineTo(xx, gy + gh); ctx.stroke();
        }
        for (let j = 1; j < this.rows; j++) {
            const yy = gy + j * cellSize + 0.5;
            ctx.beginPath(); ctx.moveTo(gx, yy); ctx.lineTo(gx + gw, yy); ctx.stroke();
        }

        // Food
        ctx.fillStyle = '#e74c3c';
        this.drawCell(ctx, this.food.x, this.food.y, gx, gy, cellSize);

        // Snake
        ctx.fillStyle = '#2ecc71';
        for (let i = 0; i < this.snake.length; i++) {
            const s = this.snake[i];
            this.drawCell(ctx, s.x, s.y, gx, gy, cellSize);
        }

        // Head highlight
        const head = this.snake[this.snake.length - 1];
        ctx.fillStyle = '#27ae60';
        this.drawCell(ctx, head.x, head.y, gx, gy, cellSize);

        // HUD
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Score: ${this.score}`, gx, gy - 8);

        // Overlays
        if (!this.running && !this.gameOver) {
            this.overlay(ctx, gx, gy, gw, gh, 'Click or press arrows to start');
        }
        if (this.gameOver) {
            this.overlay(ctx, gx, gy, gw, gh, 'Game Over - Click or Press Enter');
        }
    }

    drawCell(ctx, cx, cy, gx, gy, cs) {
        const px = gx + cx * cs;
        const py = gy + cy * cs;
        ctx.fillRect(px + 1, py + 1, cs - 2, cs - 2);
    }

    overlay(ctx, gx, gy, gw, gh, text) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(gx, gy, gw, gh);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(text, gx + gw / 2, gy + gh / 2);
        ctx.font = '12px Arial';
        ctx.fillText('WASD or Arrow Keys. P to pause.', gx + gw / 2, gy + gh / 2 + 20);
    }
}