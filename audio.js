import * as THREE from 'three';
import { HallucinationVoice } from './hallucination_voice.js';

export class AudioSystem {
    constructor(getPlayer, getMouse, getDoor, getPcTower) {
        this.getPlayer = getPlayer || (() => null);
        this.getMouse = getMouse || (() => null);
        this.getDoor = getDoor || (() => null);
        this.getPcTower = getPcTower || (() => null);

        this.audioCtx = null;
        this.buffers = {};
        this.masterGain = null;
        this.uiGain = null;
        this.convolver = null;
        this.reverbGain = null;
        this.mousePanner = null;
        this.doorPanner = null;
        this.pcTowerPanner = null;
        this.pcTowerSource = null;

        this._knockTimer = null;
        this._whisperTimer = null;
        this.conversationHistory = [];
        this.firstWhisperTriggered = false;
        this.hallucinationVoice = null;
    }

    async init() {
        if (this.audioCtx) return;
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Master and buses
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.value = 0.9;
        this.masterGain.connect(this.audioCtx.destination);

        this.uiGain = this.audioCtx.createGain();
        this.uiGain.gain.value = 0.6;
        this.uiGain.connect(this.masterGain);

        this.convolver = this.audioCtx.createConvolver();
        this.convolver.buffer = this._generateRoomImpulse(this.audioCtx, 1.5, 3.0);
        this.reverbGain = this.audioCtx.createGain();
        this.reverbGain.gain.value = 0.1;
        this.reverbGain.connect(this.convolver);
        this.convolver.connect(this.masterGain);

        this.doorPanner = this.audioCtx.createStereoPanner();
        this.doorPanner.connect(this.reverbGain);

        this.mousePanner = this.audioCtx.createStereoPanner();
        this.mousePanner.connect(this.reverbGain);

        this.pcTowerPanner = this.audioCtx.createPanner();
        this.pcTowerPanner.panningModel = 'HRTF';
        this.pcTowerPanner.distanceModel = 'inverse';
        this.pcTowerPanner.refDistance = 0.5;
        this.pcTowerPanner.maxDistance = 10;
        this.pcTowerPanner.rolloffFactor = 1.0;

        this.hallucinationVoice = new HallucinationVoice(this.audioCtx, this.masterGain, this.reverbGain);

        await Promise.all([
            this._loadSound('click', 'click.mp3'),
            this._loadSound('release', 'release.mp3'),
            this._loadSound('crash', 'crash.mp3'),
            this._loadSound('pc_fan', 'pc_fan.mp3'),
            this._loadSound('door_open', 'door_open.mp3'),
            this._loadSound('door_close', 'door_close.mp3'),
        ]);

        this._playPcFan();
        this._scheduleRandomKnock();
        // We will now trigger the first whisper manually.
        // this._scheduleRandomWhisper();
    }

    async _loadSound(name, url) {
        try {
            const res = await fetch(url);
            const buf = await res.arrayBuffer();
            this.buffers[name] = await this.audioCtx.decodeAudioData(buf);
        } catch (e) {
            console.error('Audio load failed:', name, e);
        }
    }

    async triggerFirstWhisper() {
        if (this.hallucinationVoice) {
            this.hallucinationVoice.triggerFirst();
        }
    }

    playSound(name) {
        if (!this.audioCtx || !this.buffers[name]) return;
        if (name === 'click' || name === 'release') {
            this._playMouseSound(name);
            return;
        }
        const src = this.audioCtx.createBufferSource();
        src.buffer = this.buffers[name];
        src.connect(this.uiGain);
        src.start();
    }

    playDoorOpen() { this._playDoorSound('door_open'); }
    playDoorClose() { this._playDoorSound('door_close'); }

    _playDoorSound(name) {
        if (!this.audioCtx || !this.buffers[name] || !this.doorPanner) return;
        this.updateSpatial(); // ensure pan is up-to-date
        
        const src = this.audioCtx.createBufferSource();
        src.buffer = this.buffers[name];

        // Route through door panner and reverb
        const dry = this.audioCtx.createGain();
        dry.gain.value = 0.5;
        const send = this.audioCtx.createGain();
        send.gain.value = 0.5;

        src.connect(dry);
        dry.connect(this.masterGain);
        
        src.connect(send);
        send.connect(this.doorPanner);
        
        src.start();
    }

    _playMouseSound(name) {
        const player = this.getPlayer?.();
        const mouse = this.getMouse?.();
        if (!this.audioCtx || !this.buffers[name] || !mouse || !player) return;

        const camObj = player.controls.getObject();
        const to = new THREE.Vector3().subVectors(mouse.position, camObj.position).setY(0);
        const dist = Math.max(0.1, to.length());
        to.normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camObj.quaternion);
        const pan = Math.max(-1, Math.min(1, to.dot(right)));
        this.mousePanner?.pan.setValueAtTime(pan, this.audioCtx.currentTime);

        const src = this.audioCtx.createBufferSource();
        src.buffer = this.buffers[name];

        const dry = this.audioCtx.createGain();
        dry.gain.value = 0.45 / (1 + 0.2 * dist);
        const send = this.audioCtx.createGain();
        send.gain.value = 0.9 / (1 + 0.1 * dist);

        src.connect(dry); dry.connect(this.masterGain);
        src.connect(send); send.connect(this.mousePanner);
        src.start();
    }

    _playPcFan() {
        if (!this.audioCtx || !this.buffers['pc_fan'] || !this.pcTowerPanner) return;

        this.pcTowerSource = this.audioCtx.createBufferSource();
        this.pcTowerSource.buffer = this.buffers['pc_fan'];
        this.pcTowerSource.loop = true;

        const fanGain = this.audioCtx.createGain();
        fanGain.gain.value = 0.8; // Was 0.5

        this.pcTowerSource.connect(fanGain);
        fanGain.connect(this.pcTowerPanner);
        this.pcTowerPanner.connect(this.masterGain);

        this.pcTowerSource.start();
    }

    _generateRoomImpulse(ctx, seconds = 2.0, decay = 2.0) {
        const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
        const buf = ctx.createBuffer(2, len, rate);
        for (let ch = 0; ch < 2; ch++) {
            const data = buf.getChannelData(ch);
            for (let i = 0; i < len; i++) {
                const t = i / len;
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * 0.6;
            }
        }
        return buf;
    }

    _playDoorKnock() {
        if (!this.audioCtx || !this.doorPanner) return;
        const now = this.audioCtx.currentTime;

        const makeTap = (t0, freq = 180) => {
            const osc = this.audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const g = this.audioCtx.createGain();
            g.gain.setValueAtTime(0.0, t0);
            g.gain.linearRampToValueAtTime(0.7, t0 + 0.003);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);

            osc.connect(g);

            // tiny noise transient
            const nBuf = this.audioCtx.createBuffer(1, 256, this.audioCtx.sampleRate);
            const n = nBuf.getChannelData(0);
            for (let i = 0; i < n.length; i++) n[i] = (Math.random() * 2 - 1) * (1 - i / n.length);
            const nSrc = this.audioCtx.createBufferSource();
            nSrc.buffer = nBuf;
            const nGain = this.audioCtx.createGain();
            nGain.gain.setValueAtTime(0.5, t0);
            nGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);
            nSrc.connect(nGain);

            // routing
            const dry = this.audioCtx.createGain();
            dry.gain.value = 0.4;
            g.connect(dry); dry.connect(this.masterGain);

            const send = this.audioCtx.createGain();
            send.gain.value = 0.6;
            g.connect(send); send.connect(this.doorPanner);

            nGain.connect(this.doorPanner);

            osc.start(t0); osc.stop(t0 + 0.15);
            nSrc.start(t0); nSrc.stop(t0 + 0.05);
        };

        this.updateSpatial(); // ensure pan is up-to-date
        makeTap(now);
        makeTap(now + 0.18, 160);
    }

    _scheduleRandomKnock() {
        const min = 10000, max = 30000;
        const wait = Math.floor(min + Math.random() * (max - min));
        this._knockTimer = setTimeout(() => {
            this.updateSpatial();
            this._playDoorKnock();
            this._scheduleRandomKnock();
        }, wait);
    }

    async _playRandomWhisper() {
        if (!this.audioCtx) return;

        try {
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: "Generate a short, unsettling, cryptic whispered phrase of 3-7 words. The phrase should sound like something heard in an empty, possibly haunted, house. Examples: 'Who even are you?', 'What are you doing here?', 'I see you.', 'You're not supposed to be here.', 'Get out.', 'Why did you come back?'. Respond with only the phrase itself, no quotation marks or other text."
                    },
                    ...this.conversationHistory
                ]
            });

            const text = completion.content;
            if (!text) {
                this._scheduleRandomWhisper();
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
            send.gain.value = 0.8;

            source.connect(panner);
            panner.connect(dry);
            dry.connect(this.masterGain);
            panner.connect(send);
            send.connect(this.reverbGain); // Use main room reverb

            source.start();

        } catch (e) {
            console.error("Whisper generation failed:", e);
        } finally {
            this._scheduleRandomWhisper();
        }
    }

    _scheduleRandomWhisper() {
        if (this._whisperTimer) clearTimeout(this._whisperTimer);
        const min = 35000; // 35 seconds
        const max = 80000; // 80 seconds
        const wait = Math.floor(min + Math.random() * (max - min));
        this._whisperTimer = setTimeout(() => {
            this._playRandomWhisper();
        }, wait);
    }

    updateSpatial() {
        const player = this.getPlayer?.();
        const door = this.getDoor?.();
        if (!this.audioCtx || !this.doorPanner || !player || !door) return;

        const camObj = player.controls.getObject();
        const camPos = camObj.position;
        const toDoor = new THREE.Vector3().subVectors(door.position, camPos).setY(0);
        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camObj.quaternion);
        const pan = Math.max(-1, Math.min(1, toDoor.normalize().dot(camRight)));
        this.doorPanner.pan.setValueAtTime(pan, this.audioCtx.currentTime);
    }

    updateListener() {
        const player = this.getPlayer?.();
        if (!this.audioCtx || !player) return;

        const camObj = player.controls.getObject();
        const now = this.audioCtx.currentTime;

        // Update listener position
        this.audioCtx.listener.positionX.setValueAtTime(camObj.position.x, now);
        this.audioCtx.listener.positionY.setValueAtTime(camObj.position.y, now);
        this.audioCtx.listener.positionZ.setValueAtTime(camObj.position.z, now);

        // Update listener orientation
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camObj.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camObj.quaternion);

        this.audioCtx.listener.forwardX.setValueAtTime(forward.x, now);
        this.audioCtx.listener.forwardY.setValueAtTime(forward.y, now);
        this.audioCtx.listener.forwardZ.setValueAtTime(forward.z, now);
        this.audioCtx.listener.upX.setValueAtTime(up.x, now);
        this.audioCtx.listener.upY.setValueAtTime(up.y, now);
        this.audioCtx.listener.upZ.setValueAtTime(up.z, now);
    }

    update() {
        // Called each frame
        this.updateListener();
        this.updateSpatial();

        // Update PC Tower sound position
        const pcTower = this.getPcTower?.();
        if (this.audioCtx && this.pcTowerPanner && pcTower) {
            const now = this.audioCtx.currentTime;
            const pos = pcTower.position;
            this.pcTowerPanner.positionX.setValueAtTime(pos.x, now);
            this.pcTowerPanner.positionY.setValueAtTime(pos.y, now);
            this.pcTowerPanner.positionZ.setValueAtTime(pos.z, now);
        }
    }
}