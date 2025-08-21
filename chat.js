export class ChatApp {
    constructor(requestDraw) {
        this.messages = [{ from: 'System', text: 'Welcome to Chat. Say hi!' }];
        this.input = '';
        this.requestDraw = requestDraw || (() => {});
        this._blink = 0;
        this._caretOn = true;
        this.friendName = 'Anem';
        this.scroll = { offset: 0, max: 0, atBottom: true };
    }

    update(dt) {
        this._blink += dt;
        if (this._blink >= 0.5) { this._blink = 0; this._caretOn = !this._caretOn; }
    }

    async sendMessage(txt) {
        const text = (txt || this.input).trim();
        if (!text) return;
        this.messages.push({ from: 'You', text });
        this.input = '';
        // Placeholder "typing…" message from Anem
        this.messages.push({ from: this.friendName, text: 'typing…' });
        this.requestDraw();

        try {
            // Build conversation history (last 10, excluding System)
            const history = this.messages
                .filter(m => m.from !== 'System')
                .map(m => ({
                    role: m.from === 'You' ? 'user' : 'assistant',
                    content: m.text
                }))
                .slice(-10);

            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: 'You are roleplaying as "Anem", the user’s longtime friend. Always reply in first person as Anem, sounding casual and mundane. Keep replies to 1–3 short sentences. Never change persona, never mention being an AI, and never speak as anyone other than Anem.'
                    },
                    ...history
                ]
            });

            const replyRaw = (completion && completion.content) ? String(completion.content).trim() : '';
            const reply = this.sanitizeReply(replyRaw);
            // Replace the typing placeholder with the actual reply
            const idx = this.messages.findIndex((m, i) => m.from === this.friendName && m.text === 'typing…' && i === this.messages.length - 1);
            if (idx >= 0) {
                this.messages[idx] = { from: this.friendName, text: reply || "Sorry, I zoned out for a sec. What were you saying?" };
            } else {
                this.messages.push({ from: this.friendName, text: reply || "Sorry, I zoned out for a sec. What were you saying?" });
            }
            // auto-stick to bottom on new reply
            this.scroll.atBottom = true;
        } catch (e) {
            // Fallback on error
            const idx = this.messages.findIndex((m, i) => m.from === this.friendName && m.text === 'typing…' && i === this.messages.length - 1);
            const fallback = "Sorry, I glitched for a sec. What's up?";
            if (idx >= 0) this.messages[idx] = { from: this.friendName, text: fallback };
            else this.messages.push({ from: this.friendName, text: fallback });
        }

        this.requestDraw();
    }

    handleKey(event) {
        const k = event.key;
        if (k === 'Enter') { this.sendMessage(); event.preventDefault?.(); return; }
        if (k === 'Backspace') { this.input = this.input.slice(0, -1); this.requestDraw(); event.preventDefault?.(); return; }
        if (k.length === 1 && !event.ctrlKey && !event.metaKey) {
            this.input += k;
            this.requestDraw();
        }
    }

    handleClick(canvasX, canvasY, rect, win) {
        // Input bar + send button hit test
        const pad = 10;
        const inputH = 30;
        const inputY = rect.y + rect.h - inputH - pad;
        const inputX = rect.x + pad;
        const sendW = 70;
        const sendX = rect.x + rect.w - pad - sendW;
        const inputW = rect.w - pad * 3 - sendW;

        if (canvasY >= inputY && canvasY <= inputY + inputH) {
            if (canvasX >= sendX && canvasX <= sendX + sendW) {
                this.sendMessage();
                return;
            }
            if (canvasX >= inputX && canvasX <= inputX + inputW) {
                win._chatFocused = true;
                this.requestDraw();
                return;
            }
        }
    }

    draw(ctx, win, x, y, w, h, focused) {
        // Dark mode panel
        ctx.fillStyle = '#0f1115';
        ctx.fillRect(x, y, w, h);

        // Messages area
        const pad = 10;
        const inputH = 30;
        const listX = x + pad;
        const listY = y + pad;
        const listW = w - pad * 2;
        const listH = h - pad * 3 - inputH;

        ctx.fillStyle = '#131722';
        ctx.fillRect(listX, listY, listW, listH);

        // update scroll metrics
        const contentH = this.measureMessagesHeight(ctx, listW);
        this.scroll.max = Math.max(0, contentH - listH);
        if (this.scroll.atBottom) this.scroll.offset = this.scroll.max;

        // Render messages
        ctx.save();
        ctx.beginPath();
        ctx.rect(listX, listY, listW, listH);
        ctx.clip();

        let ty = listY + 18 - this.scroll.offset;
        for (const m of this.messages.slice(-200)) {
            ctx.fillStyle = '#9aa4b2';
            ctx.font = '12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(m.from, listX + 8, ty);
            ty += 16;
            ctx.fillStyle = '#e6edf3';
            ctx.font = (m.text === 'typing…' ? 'italic 14px Arial' : '14px Arial');
            const lines = this.wrapText(ctx, m.text, listW - 16);
            for (const ln of lines) {
                ctx.fillText(ln, listX + 8, ty);
                ty += 18;
            }
            ty += 6;
        }

        ctx.restore();

        // Input bar
        const inputY = y + h - inputH - pad;
        const inputX = x + pad;
        const sendW = 70;
        const sendX = x + w - pad - sendW;
        const inputW = w - pad * 3 - sendW;

        ctx.fillStyle = '#0b0e14';
        ctx.fillRect(inputX, inputY, inputW, inputH);
        ctx.strokeStyle = focused ? '#3b82f6' : '#232a36';
        ctx.strokeRect(inputX, inputY, inputW, inputH);

        // Text + caret
        ctx.fillStyle = '#e6edf3';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        const textY = inputY + 20;
        const shown = this.input || '';
        ctx.fillText(shown, inputX + 8, textY);
        if (focused && this._caretOn) {
            const tw = ctx.measureText(shown).width;
            ctx.fillRect(inputX + 8 + tw + 1, inputY + 7, 2, inputH - 14);
        }

        // Send button
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(sendX, inputY, sendW, inputH);
        ctx.strokeStyle = '#232a36';
        ctx.strokeRect(sendX, inputY, sendW, inputH);
        ctx.fillStyle = '#e6edf3';
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('Send', sendX + sendW / 2, textY);
    }

    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let line = '';
        for (const w of words) {
            const test = line ? line + ' ' + w : w;
            if (ctx.measureText(test).width > maxWidth) {
                if (line) lines.push(line);
                line = w;
            } else {
                line = test;
            }
        }
        if (line) lines.push(line);
        return lines;
    }

    sanitizeReply(text) {
        let t = (text || '').trim();
        // strip leading name or roles like "Anem:" or "Assistant:" etc.
        t = t.replace(/^(anem|assistant|system|ai)\s*:\s*/i, '').trim();
        // remove AI disclaimers
        t = t.replace(/^as an ai.*?[,.-]\s*/i, '').trim();
        // hard cap length to keep it snappy
        if (t.length > 280) t = t.slice(0, 280).trim();
        return t;
    }

    // NEW: compute total height of messages for scrolling
    measureMessagesHeight(ctx, width) {
        let total = 0;
        ctx.font = '12px Arial';
        for (const m of this.messages.slice(-200)) {
            total += 16; // name line
            ctx.font = (m.text === 'typing…' ? 'italic 14px Arial' : '14px Arial');
            const lines = this.wrapText(ctx, m.text, width - 16);
            total += lines.length * 18 + 6;
        }
        return total + 18;
    }

    // NEW: wheel handler
    onWheel(deltaY) {
        if (this.scroll.max <= 0) return false;
        const step = 40;
        this.scroll.offset = Math.min(this.scroll.max, Math.max(0, this.scroll.offset + Math.sign(deltaY) * step));
        this.scroll.atBottom = (this.scroll.offset >= this.scroll.max - 1);
        return true;
    }
}