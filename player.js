import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export class Player {
    constructor(camera, scene, computer, audioSystem) {
        this.camera = camera;
        this.scene = scene;
        this.computer = computer;
        this.audio = audioSystem;
        this.playSound = this.audio.playSound.bind(this.audio);

        this.controls = new PointerLockControls(this.camera, document.body);
        const instructions = document.getElementById('instructions');
        instructions.addEventListener('click', () => {
            this.controls.lock();
            if (this.audio) this.audio.init();
        });

        this.controls.addEventListener('lock', () => {
            instructions.style.display = 'none';
        });

        this.controls.addEventListener('unlock', () => {
            // If we are unlocking because we are zoomed in, don't show instructions
            if (this.playerState === 'sitting' && !this.isZoomed && !this.notepadActive) {
                instructions.style.display = 'block';
            }
            // When unlocking, deactivate cursor and tell computer mouse is up
            if (this.cursorActive) {
                this.cursorActive = false;
                this.computer.setCursorVisibility(false);
                this.computer.handleMouseUp(0, 0); // Reset drag state etc.
                this.computer.focusedElement = null; // Clear focus
            }
        });

        this.scene.add(this.controls.getObject());

        // --- Location & Movement State ---
        this.playerState = 'sitting'; // 'sitting', 'standing', 'animating'
        this.sittingPos = new THREE.Vector3(0, 0, -2.5);
        this.standingPos = new THREE.Vector3(0, 0, -1.8);

        this.moveState = { forward: false, backward: false, left: false, right: false };
        this.velocity = new THREE.Vector3();
        this.bounds = null;
        this.animation = { active: false, t: 0, duration: 0, fromPos: new THREE.Vector3(), toPos: new THREE.Vector3(), onComplete: null };
        this.hasStoodUpOnce = false;

        // --- Zoom State ---
        this.isZoomed = false;
        this.wasZoomed = false;
        this.zoomedOutPosition = this.camera.position.clone();
        this.zoomedInPosition = new THREE.Vector3(0, 0.1, -3.8);

        // --- Interactivity State ---
        this.cursorActive = false;
        this.raycaster = new THREE.Raycaster();
        
        // The screen mesh is set externally after creation
        this.screen = null;
        this.screenPlane = new THREE.Plane();
        this.screenNormal = new THREE.Vector3();
        this.screenWorldPosition = new THREE.Vector3();

        // Item states
        this.heldItem = null;
        this.flashlight = null;
        this.door = null;

        // HUD elements
        this.flashlightHud = document.getElementById('flashlight-hud');
        this.batteryLevel = document.querySelector('#flashlight-hud .battery-level');
        this.doorTooltip = document.getElementById('door-tooltip');

        // Notepad state and DOM overlay
        this.notepad = null;
        this.notepadActive = false;
        this.notepadOverlay = document.getElementById('notepadOverlay');
        this.notepadTextarea = document.getElementById('notepadTextarea');
        this.notepadCloseBtn = document.getElementById('notepadCloseBtn');
        this.notepadCloseBtn?.addEventListener('click', () => this.closeNotepad());
        window.addEventListener('keydown', (e) => {
            if (this.notepadActive && e.key === 'Escape') {
                e.preventDefault();
                this.closeNotepad();
            }
        });

        // Desk mouse linkage
        this.deskMouse = null;
        this.mouseArea = null;

        // 3D Keyboard linkage
        this.keyboard3D = null;
        this.pressedKeys = new Set();

        // Sleep UI
        this.eyelidTop = document.getElementById('eyelidTop');
        this.eyelidBottom = document.getElementById('eyelidBottom');
        this.isSleeping = false;
        this.sleepTimeout = null;

        // Mobile support
        this.isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        this.touch = { moveId: null, lookId: null, moveStart: {x:0,y:0}, lookLast: {x:0,y:0} };
        if (this.isMobile) {
            document.getElementById('mobile-controls')?.classList.add('active');
            document.getElementById('btnZoom')?.addEventListener('click', () => this.handleMobileZoom());
            document.getElementById('btnUse')?.addEventListener('click', () => this.handleMobileUse());
            document.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
            document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
            document.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
        }

        // Bind event listeners
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));
        document.addEventListener('visibilitychange', this.onVisibilityChange.bind(this));
        window.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    }
    
    setScreen(screenMesh) {
        this.screen = screenMesh;
    }
    setFlashlight(mesh) { this.flashlight = mesh; }
    setNotepad(mesh) { this.notepad = mesh; }
    setDoor(mesh) { this.door = mesh; }
    setDeskMouse(mesh) {
        this.deskMouse = mesh;
        if (mesh) {
            this.mouseArea = {
                center: mesh.position.clone(),
                halfW: 0.25, // pad half-width (x)
                halfD: 0.18  // pad half-depth (z)
            };
        }
    }
    setKeyboard(mesh) { this.keyboard3D = mesh; }
    setBounds(bounds) { this.bounds = bounds; }
    setBed(mesh) { this.bed = mesh; }

    getScreenIntersection() {
        if (!this.screen || this.playerState !== 'sitting') return null;
        
        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
        const intersects = this.raycaster.intersectObject(this.screen);
        
        if (intersects.length > 0) {
            return this.screen.worldToLocal(intersects[0].point);
        }
        return null;
    }

    onMouseDown(event) {
        if (!this.controls.isLocked && !this.isMobile) {
            return;
        };
        if (event.button !== 0) return; // Only handle left clicks
        if (this.isSleeping) return;

        // Don't interact with world if cursor is active on PC
        if (this.cursorActive) {
            const localPoint = this.getScreenIntersection();
            if (localPoint) {
                this.computer.handleMouseDown(localPoint.x, localPoint.y);
            } else {
                // Clicked off the screen, deactivate cursor
                this.cursorActive = false;
                this.computer.setCursorVisibility(false);
                this.computer.handleMouseUp(0,0); // Ensure any dragging state is cleared
                this.computer.focusedElement = null; // Clear focus
            }
            return;
        }
        
        // Raycast for world interactions
        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);

        // Door interaction
        if (this.door) {
            const hit = this.raycaster.intersectObject(this.door.children[0], true); // Intersect the door mesh itself
            if (hit.length > 0 && hit[0].distance < 3.0) {
                // The sound should reflect the action being taken.
                // If the door IS open, the action is to close it.
                if (this.door.userData.isOpen) {
                    this.audio.playDoorClose();
                } else {
                    this.audio.playDoorOpen();
                }
                this.door.userData.toggle();
                return;
            }
        }

        // Flashlight can be picked up when sitting or standing
        if ((this.playerState === 'sitting' || this.playerState === 'standing') && this.flashlight && !this.heldItem) {
            const hit = this.raycaster.intersectObject(this.flashlight, true);
            // Check distance to flashlight object, not just raycast hit
            if (hit.length > 0 && this.camera.position.distanceTo(this.flashlight.position) < 2.5) {
                this.heldItem = this.flashlight;
                this.flashlight.userData.pickUp(this.camera);
                this.playSound('click');
                this.flashlightHud.style.display = 'flex';
                return;
            }
        }

        // Interactions only available when sitting
        if (this.playerState === 'sitting') {
            // First, check interaction with notepad
            if (this.notepad) {
                const hit = this.raycaster.intersectObject(this.notepad, true);
                if (hit.length > 0) {
                    this.openNotepad();
                    return;
                }
            }

            const localPoint = this.getScreenIntersection();

            if (!this.cursorActive && localPoint) {
                this.cursorActive = true;
                this.computer.setCursorVisibility(true);
                this.computer.mouse?.handleMouseDown(localPoint.x, localPoint.y);
                this.playSound('click');
            }
        }
        // Bed click to sleep (standing or sitting)
        if (this.bed) {
            const hit = this.raycaster.intersectObject(this.bed, true);
            if (hit.length > 0 && hit[0].distance < 3.0) {
                this.startSleep();
                return;
            }
        }
    }

    onMouseUp(event) {
        if (!this.controls.isLocked && !this.isMobile) return;
        if (!this.cursorActive || this.playerState !== 'sitting') return;
        if (event.button !== 0) return; // Only handle left clicks

        const localPoint = this.getScreenIntersection();
        // Even if we release outside the screen, tell the computer
        const x = localPoint ? localPoint.x : -Infinity;
        const y = localPoint ? localPoint.y : -Infinity;
        this.computer.mouse?.handleMouseUp(x, y);
        this.playSound && this.playSound('release');
    }

    onMouseMove(event) {
        // This event is now unused as pointer lock controls camera and we raycast.
        // The old logic for a custom HTML cursor is removed.
    }

    onKeyDown(event) {
        // Flashlight interaction keys
        if (this.isSleeping) return;
        if (this.heldItem === this.flashlight) {
            if (event.key.toLowerCase() === 'f') {
                this.flashlight.userData.toggle();
                this.playSound('click');
                return;
            }
            if (event.key.toLowerCase() === 'g') {
                this.flashlight.userData.putDown(this.scene);
                this.heldItem = null;
                this.playSound('release');
                this.flashlightHud.style.display = 'none';
                return;
            }
        }

        if (event.key.toLowerCase() === 'e' && !this.cursorActive && !this.notepadActive && !this.animation.active) {
            if (this.playerState === 'sitting') {
                this.standUp();
            } else if (this.playerState === 'standing') {
                // Check if near the desk to sit down
                const pos = this.camera.position;
                const mainRoomZone = this.bounds?.zones?.[0];
                let inRoom = false;
                if (mainRoomZone) {
                    inRoom = pos.x >= mainRoomZone.min.x && pos.x <= mainRoomZone.max.x &&
                             pos.z >= mainRoomZone.min.z && pos.z <= mainRoomZone.max.z;
                }
                
                if (inRoom && pos.distanceTo(this.standingPos) < 1.5) {
                    this.sitDown();
                }
            }
            return;
        }
        
        if (this.playerState === 'standing') {
            switch (event.code) {
                case 'ArrowUp': case 'KeyW': this.moveState.forward = true; break;
                case 'ArrowLeft': case 'KeyA': this.moveState.left = true; break;
                case 'ArrowDown': case 'KeyS': this.moveState.backward = true; break;
                case 'ArrowRight': case 'KeyD': this.moveState.right = true; break;
            }
            return; // Don't process other keys while standing
        }
        
        if (this.playerState !== 'sitting') {
            return;
        }

        // Block spacebar zoom while notepad is active
        if (this.notepadActive && event.code === 'Space') { return; }
        // The primary purpose of the Space key is to zoom in.
        // It should only be overridden if the user is typing into a computer element.
        if (event.code === 'Space') {
            // Prevent default browser action (e.g., scrolling)
            event.preventDefault();

            // Allow space to be typed if a text input is focused inside the computer
            const isTyping = this.cursorActive && this.computer.focusedElement;
            
            if (isTyping) {
                 this.computer.keyboard?.handleKeyDown(event);
            } else {
                if (this.computer?.scoliosisMode) {
                    this.isZoomed = !this.isZoomed; // toggle mode
                } else if (!this.isZoomed) {
                    this.isZoomed = true; // hold mode
                }
            }
            this.animateKeyPress(event.code);
            return; // Stop further processing for the space key
        }
        
        // Handle other keys only when the cursor is active on the screen
        if (this.cursorActive) {
            // Prevent default browser actions for keys we want to handle
            if (event.key === 'Backspace' || (event.key === 'Enter' && this.computer.focusedElement)) {
                event.preventDefault();
            }
            this.computer.keyboard?.handleKeyDown(event);
        }
        this.animateKeyPress(event.code);
    }

    onKeyUp(event) {
        if (this.playerState === 'standing') {
            switch (event.code) {
                case 'ArrowUp': case 'KeyW': this.moveState.forward = false; break;
                case 'ArrowLeft': case 'KeyA': this.moveState.left = false; break;
                case 'ArrowDown': case 'KeyS': this.moveState.backward = false; break;
                case 'ArrowRight': case 'KeyD': this.moveState.right = false; break;
            }
            return;
        }

        if (this.playerState !== 'sitting') return;

        if (this.notepadActive && event.code === 'Space') { return; }
        if (event.code === 'Space') {
            event.preventDefault();
            if (!this.computer?.scoliosisMode) {
                this.isZoomed = false; // only in hold mode
            }
        }
        this.animateKeyRelease(event.code);
    }

    onVisibilityChange() {
        // If the tab becomes hidden, reset the zoom state
        // to prevent getting stuck zoomed-in.
        if (document.hidden) {
            this.isZoomed = false;
        }
    }

    onWheel(event) {
        if ((!this.controls.isLocked && !this.isMobile) || !this.cursorActive || this.playerState !== 'sitting') return;
        const localPoint = this.getScreenIntersection();
        if (!localPoint) return;
        const used = this.computer.mouse?.handleMouseWheel(localPoint.x, localPoint.y, event.deltaY);
        if (used) event.preventDefault();
    }

    handleMobileZoom() {
        if (this.playerState !== 'sitting') return;
        this.isZoomed = !this.isZoomed;
    }
    handleMobileUse() {
        if (this.playerState === 'sitting') this.standUp();
        else if (this.playerState === 'standing') this.sitDown();
    }

    onTouchStart(e) {
        if (this.isSleeping) return;
        if (e.touches.length === 0) return;
        for (let i = 0; i < e.touches.length; i++) {
            const t = e.touches[i];
            if (this.touch.moveId == null && t.clientX < window.innerWidth * 0.35) { this.touch.moveId = t.identifier; this.touch.moveStart = { x: t.clientX, y: t.clientY }; }
            else if (this.touch.lookId == null) { this.touch.lookId = t.identifier; this.touch.lookLast = { x: t.clientX, y: t.clientY }; }
        }
        e.preventDefault();
    }

    onTouchMove(e) {
        for (let i = 0; i < e.touches.length; i++) {
            const t = e.touches[i];
            if (t.identifier === this.touch.moveId) {
                const dx = t.clientX - this.touch.moveStart.x, dy = t.clientY - this.touch.moveStart.y, th = 18;
                this.moveState.left = dx < -th; this.moveState.right = dx > th;
                this.moveState.forward = dy < -th; this.moveState.backward = dy > th;
            } else if (t.identifier === this.touch.lookId) {
                const dx = t.clientX - this.touch.lookLast.x, dy = t.clientY - this.touch.lookLast.y;
                this.touch.lookLast = { x: t.clientX, y: t.clientY };
                const yawObj = this.controls.getObject();
                yawObj.rotation.y -= dx * 0.003;
                this.camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camera.rotation.x - dy * 0.003));
            }
        }
        e.preventDefault();
    }

    onTouchEnd(e) {
        // Clear identifiers that ended
        const ended = new Set(Array.from(e.changedTouches).map(t => t.identifier));
        if (ended.has(this.touch.moveId)) {
            this.touch.moveId = null; this.moveState = { forward:false, backward:false, left:false, right:false };
        }
        if (ended.has(this.touch.lookId)) this.touch.lookId = null;
    }

    animateKeyPress(code) {
        if (!this.keyboard3D || !this.keyboard3D.userData.keys) return;
        const keyMesh = this.keyboard3D.userData.keys[code];
        if (keyMesh && !this.pressedKeys.has(code)) {
            keyMesh.position.y -= 0.004;
            this.pressedKeys.add(code);
        }
    }

    animateKeyRelease(code) {
        if (!this.keyboard3D || !this.keyboard3D.userData.keys) return;
        const keyMesh = this.keyboard3D.userData.keys[code];
        if (keyMesh && this.pressedKeys.has(code)) {
            keyMesh.position.y += 0.004;
            this.pressedKeys.delete(code);
        }
    }

    toggleLocation() {
        if (this.location === 'desk') {
            this.location = 'hallway';
            this.isZoomed = false; // Ensure not zoomed
            this.cursorActive = false; // Deactivate computer cursor
            this.computer.setCursorVisibility(false);
            this.camera.position.copy(this.hallwayEnterPosition);
        } else {
            this.location = 'desk';
            this.camera.position.copy(this.deskPosition);
        }
    }

    startAnimation(toPos, duration, onComplete) {
        this.animation.fromPos.copy(this.camera.position);
        this.animation.toPos.copy(toPos);
        this.animation.duration = duration;
        this.animation.t = 0;
        this.animation.onComplete = onComplete;
        this.animation.active = true;
        this.playerState = 'animating';
    }

    standUp() {
        if (this.playerState !== 'sitting') return;
        this.isZoomed = false; // Ensure not zoomed
        this.cursorActive = false; // Deactivate computer cursor
        this.computer.setCursorVisibility(false);
        this.startAnimation(this.standingPos, 1.2, () => {
            this.playerState = 'standing';
        });

        if (!this.hasStoodUpOnce) {
            this.hasStoodUpOnce = true;
            this.audio?.triggerFirstWhisper();
        }
    }

    sitDown() {
        if (this.playerState !== 'standing') return;
        this.moveState = { forward: false, backward: false, left: false, right: false }; // Stop any movement
        this.startAnimation(this.sittingPos, 1.2, () => {
            this.playerState = 'sitting';
        });
    }

    update(delta) {
        if (this.animation.active) {
            this.updateAnimation(delta);
        } else if (this.playerState === 'standing') {
            this.updatePlayerMovement(delta);
        } else if (this.playerState === 'sitting') {
            // Handle camera zoom (desk location)
            const targetPosition = this.isZoomed ? this.zoomedInPosition : this.zoomedOutPosition;
            const lerpFactor = Math.min(delta * 5.0, 1.0);
            this.camera.position.lerp(targetPosition, lerpFactor);
        }
        // During sleep, keep eyelids as they are; block other updates as needed
        if (this.isSleeping) return;
        
        // Update door animation if active
        if (this.door && this.door.userData.isAnimating) {
            this.door.userData.update(delta);
        }

        if (this.heldItem === this.flashlight) {
            this.flashlight.userData.update(delta);
            const { battery, maxBattery } = this.flashlight.userData;
            const percent = (battery / maxBattery) * 100;
            this.batteryLevel.style.width = `${percent}%`;
            if (percent < 20) this.batteryLevel.style.backgroundColor = '#f44336';
            else if (percent < 50) this.batteryLevel.style.backgroundColor = '#ffeb3b';
            else this.batteryLevel.style.backgroundColor = '#4caf50';
        }

        // Update door tooltip visibility
        this.updateDoorTooltip();

        if (!this.screen) return;

        if (this.cursorActive) {
            // Update the screen plane's position and orientation
            this.screen.getWorldPosition(this.screenWorldPosition);
            // The normal is initially (0,0,1) in local space. We transform it by the screen's world quaternion.
            this.screenNormal.set(0, 0, 1).applyQuaternion(this.screen.getWorldQuaternion(new THREE.Quaternion())).normalize();
            this.screenPlane.setFromNormalAndCoplanarPoint(this.screenNormal, this.screenWorldPosition);

            // Cast a ray from the camera
            this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);

            const intersectionPoint = new THREE.Vector3();
            if (this.raycaster.ray.intersectPlane(this.screenPlane, intersectionPoint)) {
                // Convert world intersection point to screen's local space
                const localPoint = this.screen.worldToLocal(intersectionPoint);
                this.computer.mouse?.handleMouseMove(localPoint.x, localPoint.y);

                // Map screen cursor -> desk mouse position
                if (this.deskMouse && this.mouseArea) {
                    const { x: cx, y: cy } = this.computer.localToCanvas(localPoint.x, localPoint.y);
                    const u = Math.min(1, Math.max(0, cx / this.computer.width));
                    const v = Math.min(1, Math.max(0, cy / this.computer.height));
                    const { center, halfW, halfD } = this.mouseArea;
                    this.deskMouse.position.x = center.x - halfW + u * (2 * halfW);
                    this.deskMouse.position.z = center.z - halfD + v * (2 * halfD);
                }
            }
        } else {
            // Force a final redraw when cursor becomes inactive to remove blinking cursors etc.
            if (this.computer.cursor.visible) {
                 this.computer.setCursorVisibility(false);
            }
        }
    }

    updateDoorTooltip() {
        if (!this.doorTooltip || !this.door || this.cursorActive) {
            if (this.doorTooltip && this.doorTooltip.style.display !== 'none') {
                this.doorTooltip.style.display = 'none';
            }
            return;
        }

        // Update tooltip text based on state
        this.doorTooltip.textContent = this.door.userData.isOpen ? 'Click to close door' : 'Click to open door';

        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
        const hit = this.raycaster.intersectObject(this.door.children[0], true);

        if (hit.length > 0 && hit[0].distance < 3.0) {
            this.doorTooltip.style.display = 'block';
        } else {
            this.doorTooltip.style.display = 'none';
        }
    }

    updateAnimation(delta) {
        if (!this.animation.active) return;
        this.animation.t += delta;
        let progress = Math.min(this.animation.t / this.animation.duration, 1.0);
        // Ease out cubic
        progress = 1.0 - Math.pow(1.0 - progress, 3);
        
        this.camera.position.lerpVectors(this.animation.fromPos, this.animation.toPos, progress);

        // Simple rock/bob animation
        const rockProgress = Math.sin(progress * Math.PI);
        this.camera.position.y += rockProgress * 0.1;

        if (progress >= 1.0) {
            this.animation.active = false;
            if (this.animation.onComplete) {
                this.animation.onComplete();
            }
        }
    }
    
    updatePlayerMovement(delta) {
        const speed = 10.5;
        // Damping
        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;

        const direction = new THREE.Vector3(
            Number(this.moveState.right) - Number(this.moveState.left),
            0,
            Number(this.moveState.forward) - Number(this.moveState.backward)
        ).normalize();
        
        if (this.moveState.forward || this.moveState.backward) this.velocity.z -= direction.z * speed * delta;
        if (this.moveState.left || this.moveState.right) this.velocity.x -= direction.x * speed * delta;

        const prevPos = this.camera.position.clone();

        this.controls.moveRight(-this.velocity.x * delta);
        this.controls.moveForward(-this.velocity.z * delta);

        // Collision detection and bounding
        if (this.bounds && this.bounds.zones) {
            const pos = this.camera.position;
            let inBounds = false;
            
            // Check if player is in any valid zone
            for(const zone of this.bounds.zones) {
                if (pos.x >= zone.min.x && pos.x <= zone.max.x && pos.z >= zone.min.z && pos.z <= zone.max.z) {
                    inBounds = true;
                    break;
                }
            }

            if (!inBounds) {
                // If moved out of all zones, find the closest point in the last valid zone
                let closestZone = null;
                let min_dist_sq = Infinity;

                for(const zone of this.bounds.zones) {
                    if (prevPos.x >= zone.min.x && prevPos.x <= zone.max.x && prevPos.z >= zone.min.z && prevPos.z <= zone.max.z) {
                        closestZone = zone;
                        break; // Found the zone we were just in
                    }
                }

                if (closestZone) {
                     pos.x = Math.max(closestZone.min.x, Math.min(closestZone.max.x, pos.x));
                     pos.z = Math.max(closestZone.min.z, Math.min(closestZone.max.z, pos.z));
                } else {
                    // Failsafe: if we don't know where we were, just revert.
                    pos.copy(prevPos);
                }
            }
            
            // Handle specific walls (like the one with the player's door)
            if (this.bounds.walls) {
                for (const wall of this.bounds.walls) {
                    if (wall.axis === 'x') {
                        // Check if crossing the wall plane
                        if ((prevPos.x < wall.pos && pos.x >= wall.pos) || (prevPos.x > wall.pos && pos.x <= wall.pos)) {
                             // Check if within wall segment
                            if (pos.z >= wall.min && pos.z <= wall.max) {
                                if (this.door && !this.door.userData.isOpen) {
                                    pos.x = prevPos.x; // Block if door is closed
                                }
                            }
                        }
                    } // Can add 'z' axis walls later
                }
            }
        }
    }

    openNotepad() {
        if (!this.notepad || this.notepadActive) return;
        this.notepadActive = true;
        this.notepadOverlay.style.display = 'flex';
        this.notepadOverlay.setAttribute('aria-hidden', 'false');
        this.notepadTextarea && setTimeout(() => this.notepadTextarea.focus(), 0);
        // Bring notepad up to face
        this.notepad.userData.attachToCamera(this.camera);
        // Unlock pointer so typing and cursor work
        this.controls.unlock();
        // Hide instructions while overlay is visible
        const instructions = document.getElementById('instructions');
        if (instructions) instructions.style.display = 'none';
    }

    closeNotepad() {
        if (!this.notepadActive) return;
        this.notepadActive = false;
        this.notepadOverlay.style.display = 'none';
        this.notepadOverlay.setAttribute('aria-hidden', 'true');
        // Put notepad back down
        if (this.notepad) this.notepad.userData.detachFromCamera();
        // Relock pointer for continued play
        this.controls.lock();
    }

    startSleep() {
        if (this.isSleeping) return;
        this.isSleeping = true;
        this.cursorActive = false;
        this.computer.setCursorVisibility(false);
        const target = this.bed ? this.bed.getWorldPosition(new THREE.Vector3()).clone() : new THREE.Vector3();
        const sleepPos = new THREE.Vector3(target.x, target.y + 1.2, target.z);
        this.startAnimation(sleepPos, 1.2, () => {
            requestAnimationFrame(() => this.closeEyelids());
        });
        this.playerState = 'sleeping';
    }

    closeEyelids() {
        if (!this.eyelidTop || !this.eyelidBottom) return;
        this.eyelidTop.style.height = '50%';
        this.eyelidBottom.style.height = '50%';
        this.sleepTimeout = setTimeout(() => this.wakeUp(), 30000);
    }

    wakeUp() {
        if (this.sleepTimeout) { clearTimeout(this.sleepTimeout); this.sleepTimeout = null; }
        if (this.eyelidTop && this.eyelidBottom) {
            this.eyelidTop.style.height = '0';
            this.eyelidBottom.style.height = '0';
        }
        this.startAnimation(this.standingPos, 1.0, () => {
            this.playerState = 'standing';
            this.isSleeping = false;
        });
    }
}