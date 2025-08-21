export class HallucinationVoice {
    constructor(audioCtx, masterGain, reverbGain) {
        this.audioCtx = audioCtx;
        this.masterGain = masterGain;
        this.reverbGain = reverbGain;

        this.conversationHistory = [];
        this._whisperTimer = null;
        this.firstWhisperTriggered = false;
        this.systemPrompt = `Generate a short, unsettling, cryptic whispered phrase of 3-10 words. The phrase should sound like something heard in an empty, possibly haunted, house. It could also be self-deprecating or threatening. Respond with only the phrase itself, no quotation marks or other text. Examples:
- "Who even are you?"
- "What are you doing here?"
- "I see you."
- "You're not supposed to be here."
- "Get out."
- "Why did you come back?"
- "You will never come back!"
- "Stop trying."
- "Never-never get back"
- "You... You CANT!"
- "You'll die!"
- "You'll never get back"
- "I can't.."
- "You'll NEVER GET BACK! Are you listening to me?!"
- "There's no one you can get back for"
- "No one cares about you"
- "They'll find you"
- "No one will miss you, so what's the point?"
- "You should just die"
- "Okay.. You might just take another!"
- "In this madness..."
- "Don't RUN!"
- "Go back. I can't win.."
- "Welcome to this Green Hell"
- "This is your new home.. this green hell"
- "You don't even try!"
- "You're pathetic.."
- "Don't even try"
- "Shut up.. Go away!"
- "Just give up."
- "Die.."
- "What's the point of trying?!"
- "You can't save her!"
- "You CAN'T!"
- "You'll just miss."`;
    }

    triggerFirst() {
        if (this.firstWhisperTriggered) return;
        this.firstWhisperTriggered = true;
        
        // Give it a slight delay to build tension
        setTimeout(() => {
            this.playRandom();
        }, 3000 + Math.random() * 4000);
    }

    async playRandom() {
        if (!this.audioCtx) return;

        try {
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: this.systemPrompt
                    },
                    ...this.conversationHistory
                ]
            });

            const text = completion.content;
            if (!text) {
                this.scheduleRandom();
                return;
            }

            this.conversationHistory.push(completion);
            if (this.conversationHistory.length > 4) this.conversationHistory.shift();

            const ttsResult = await websim.textToSpeech({
                text: text,
                voice: "en-male",
            });

            const response = await fetch(ttsResult.url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);

            const source = this.audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.playbackRate.value = 0.75; // Lower pitch

            const panner = this.audioCtx.createPanner();
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            panner.refDistance = 1;
            panner.maxDistance = 100;
            panner.rolloffFactor = 1.2;
            panner.coneInnerAngle = 360;
            panner.coneOuterAngle = 0;
            panner.coneOuterGain = 0;

            // Random position in the house (room + hallway)
            const roomW = 10, roomD = 12;
            const hallL = 14;
            const inRoom = Math.random() > 0.4;
            let x, y, z;
            if (inRoom) {
                x = (Math.random() - 0.5) * roomW;
                y = Math.random() * 2 - 1; // around ear level
                z = (Math.random() - 0.5) * roomD;
            } else { // In hallway/other rooms
                x = (roomW / 2) + Math.random() * hallL;
                y = Math.random() * 2 - 1;
                z = Math.random() * 8 - 2; // Approximate range of other rooms
            }
            panner.positionX.value = x;
            panner.positionY.value = y;
            panner.positionZ.value = z;

            const dry = this.audioCtx.createGain();
            dry.gain.value = 0.6;
            const send = this.audioCtx.createGain();
            send.gain.value = 0.7;

            source.connect(panner);
            panner.connect(dry);
            dry.connect(this.masterGain);
            panner.connect(send);
            send.connect(this.reverbGain); // Use main room reverb

            source.start();

        } catch (e) {
            console.error("Whisper generation failed:", e);
        } finally {
            this.scheduleRandom();
        }
    }

    scheduleRandom() {
        if (this._whisperTimer) clearTimeout(this._whisperTimer);
        const min = 35000; // 35 seconds
        const max = 80000; // 80 seconds
        const wait = Math.floor(min + Math.random() * (max - min));
        this._whisperTimer = setTimeout(() => {
            this.playRandom();
        }, wait);
    }
}