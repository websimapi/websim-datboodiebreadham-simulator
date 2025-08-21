import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { createCactus } from './cactus.js';
import { createNotepad } from './notepad.js';
import { createHouseInterior } from './houseinterior.js';
import { createFlashlight } from './flashlight.js';
import { createPcTower } from './pc_tower.js';
import { createDoor } from './door.js';

export function createRoom(scene) {
    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambientLight);

    // Light from the computer screen
    const screenLight = new THREE.PointLight(0x00aaff, 3, 5);
    screenLight.position.set(0, -0.1, -4);
    screenLight.castShadow = true;
    scene.add(screenLight);

    // Dim overhead light
    const overheadLight = new THREE.SpotLight(0xffffff, 0.5);
    overheadLight.position.set(0, 4, 0);
    overheadLight.angle = Math.PI / 3;
    overheadLight.penumbra = 0.5;
    overheadLight.castShadow = true;
    scene.add(overheadLight);

    // --- Scene Objects ---
    const roomSize = { width: 10, height: 6, depth: 12 };

    // Ceiling ball light
    const ceilingLight = new THREE.PointLight(0xFFFFE0, 1.5, 20); // Soft yellow
    ceilingLight.position.set(0, roomSize.height / 2 - 0.2, 0);
    ceilingLight.castShadow = true;
    scene.add(ceilingLight);

    const ceilingLightFixtureGeo = new THREE.SphereGeometry(0.15, 16, 8);
    const ceilingLightFixtureMat = new THREE.MeshBasicMaterial({ color: 0xFFFFE0 });
    const ceilingLightFixture = new THREE.Mesh(ceilingLightFixtureGeo, ceilingLightFixtureMat);
    ceilingLightFixture.position.copy(ceilingLight.position);
    scene.add(ceilingLightFixture);

    // Walls - Rebuilt from planes to allow for a doorway
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, side: THREE.FrontSide, roughness: 0.8 });
    
    // Ceiling
    const ceilingGeo = new THREE.PlaneGeometry(roomSize.width, roomSize.depth);
    const ceiling = new THREE.Mesh(ceilingGeo, wallMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = roomSize.height / 2;
    ceiling.receiveShadow = true;
    scene.add(ceiling);

    // Back wall (-Z)
    const backWallGeo = new THREE.PlaneGeometry(roomSize.width, roomSize.height);
    const backWall = new THREE.Mesh(backWallGeo, wallMaterial);
    backWall.position.z = -roomSize.depth / 2;
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Front wall (+Z)
    const frontWallGeo = new THREE.PlaneGeometry(roomSize.width, roomSize.height);
    const frontWall = new THREE.Mesh(frontWallGeo, wallMaterial);
    frontWall.rotation.y = Math.PI;
    frontWall.position.z = roomSize.depth / 2;
    frontWall.receiveShadow = true;
    scene.add(frontWall);

    // Left wall (-X)
    const leftWallGeo = new THREE.PlaneGeometry(roomSize.depth, roomSize.height);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMaterial);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.x = -roomSize.width / 2;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Right wall (+X, with doorway)
    const doorWidth = 1.8; // Increased width
    const doorHeight = 4.2; // Increased height
    const doorPositionZ = 2; 
    const wallX = roomSize.width / 2;

    // --- Create wall with a hole for the door ---
    const rightWallShape = new THREE.Shape();
    const wallDepth = roomSize.depth;
    const wallHeight = roomSize.height;

    // Define outer rectangle of the wall
    rightWallShape.moveTo(-wallDepth / 2, -wallHeight / 2);
    rightWallShape.lineTo(wallDepth / 2, -wallHeight / 2);
    rightWallShape.lineTo(wallDepth / 2, wallHeight / 2);
    rightWallShape.lineTo(-wallDepth / 2, wallHeight / 2);
    rightWallShape.closePath();

    // Define the door hole
    const doorHole = new THREE.Path();
    const doorLeft = doorPositionZ - doorWidth / 2;
    const doorRight = doorPositionZ + doorWidth / 2;
    const doorBottom = -wallHeight / 2;
    const doorTop = doorBottom + doorHeight;
    doorHole.moveTo(doorLeft, doorBottom);
    doorHole.lineTo(doorRight, doorBottom);
    doorHole.lineTo(doorRight, doorTop);
    doorHole.lineTo(doorLeft, doorTop);
    doorHole.closePath();
    rightWallShape.holes.push(doorHole);

    // Create geometry from the shape
    const rightWallGeo = new THREE.ShapeGeometry(rightWallShape);
    const rightWall = new THREE.Mesh(rightWallGeo, wallMaterial);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(wallX, 0, 0); // Position the entire wall plane
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(roomSize.width, roomSize.depth);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x405d80, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -roomSize.height / 2 + 0.01; // Slightly above the bottom of the room box to prevent z-fighting
    floor.receiveShadow = true;
    scene.add(floor);

    // --- Hallway ---
    // The hallway and the rest of the house are now generated by houseinterior.js
    // This leaves this file responsible only for the main player room.

    // Desk
    const deskGroup = new THREE.Group();
    const deskTopGeo = new THREE.BoxGeometry(3, 0.1, 1.5);
    const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.7 });
    const deskTop = new THREE.Mesh(deskTopGeo, woodMaterial);
    deskTop.position.set(0, -0.5, -4);
    deskTop.castShadow = true;
    deskGroup.add(deskTop);
    scene.add(deskGroup);

    // --- NEW: PC Tower ---
    const pcTower = createPcTower(new THREE.Vector3(1.2, -roomSize.height / 2 + 0.55 / 2, -4.2));
    scene.add(pcTower);

    // --- Create rest of the house interior ---
    const materials = { wallMaterial, floorMaterial, woodMaterial };
    const doorConfigForInterior = {
        position: new THREE.Vector3(roomSize.width / 2, 0, doorPositionZ),
    };
    createHouseInterior(scene, materials, roomSize, doorConfigForInterior);

    // Computer
    const computerGroup = new THREE.Group();
    computerGroup.position.set(0, -0.5, -4.5); // On the desk top

    // Monitor
    const monitorGeo = new THREE.BoxGeometry(1.2, 0.7, 0.05);
    const plasticMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.4 });
    const monitor = new THREE.Mesh(monitorGeo, plasticMaterial);
    monitor.castShadow = true;
    computerGroup.add(monitor);

    // Webcam housing + LED
    const webcamGroup = new THREE.Group();
    const camHousingMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.5 });
    const camHousing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.02), camHousingMat);
    camHousing.castShadow = true;
    webcamGroup.add(camHousing);
    const ledMat = new THREE.MeshStandardMaterial({ color: 0x004400, emissive: 0x00ff00, emissiveIntensity: 0.02, roughness: 0.6 });
    const webcamLED = new THREE.Mesh(new THREE.SphereGeometry(0.01, 12, 12), ledMat);
    webcamLED.position.set(0.09, 0, 0.012);
    webcamGroup.add(webcamLED);
    const webcamLight = new THREE.PointLight(0x00ff88, 0.0, 0.3);
    webcamLight.position.set(0.09, 0, 0.015);
    webcamGroup.add(webcamLight);
    webcamGroup.position.set(1.2/2 - 0.22/2 - 0.02, 0.7/2 + 0.03, 0.03); // top-right of monitor
    monitor.add(webcamGroup);

    // Screen
    const screenGeo = new THREE.PlaneGeometry(1.15, 0.65);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Will be replaced by computer screen canvas
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.z = 0.03;
    monitor.add(screen);

    // Monitor Neck
    const neckHeight = 0.15;
    const neckGeo = new THREE.CylinderGeometry(0.04, 0.04, neckHeight, 16);
    const neck = new THREE.Mesh(neckGeo, plasticMaterial);
    neck.castShadow = true;
    computerGroup.add(neck);

    // Monitor Base
    const baseHeight = 0.02;
    const baseGeo = new THREE.CylinderGeometry(0.2, 0.25, baseHeight, 32);
    const base = new THREE.Mesh(baseGeo, plasticMaterial);
    base.castShadow = true;
    computerGroup.add(base);

    // Position monitor components
    base.position.y = baseHeight / 2;
    neck.position.y = baseHeight + neckHeight / 2;
    monitor.position.y = baseHeight + neckHeight + (0.7 / 2); // monitor screen height is 0.7

    // We need to apply the group's world matrix to get the correct screen orientation
    computerGroup.updateMatrixWorld();
    scene.add(computerGroup);

    // Keyboard
    const keyboardGroup = new THREE.Group();
    keyboardGroup.userData.keys = {}; // To store key meshes for animation

    // Main chassis
    const chassisGeo = new THREE.BoxGeometry(0.8, 0.04, 0.3);
    const chassis = new THREE.Mesh(chassisGeo, plasticMaterial);
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    keyboardGroup.add(chassis);
    
    // Key area - a slightly raised plane is replaced by individual keys
    const keysMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5 });
    const keysTextMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.95 });

    const keyRows = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2], // Number row + backspace
        [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5], // QWERTY row + tab/enter-like
        [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25], // ASDF row + caps/enter
        [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75], // ZXCV row + shifts
        [1.25, 1.25, 1.25, 6, 1.25, 1.25, 1.25] // Bottom row + space
    ];

    const keyLabels = [
        ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', 'Bksp'],
        ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']'],
        ['Caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', 'Enter'],
        ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', 'Shift'],
        ['Ctrl', 'Alt', '◇', ' ', 'Alt', 'Ctrl', 'Fn']
    ];

    const keyCodes = [
        ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Backspace'],
        ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight'],
        ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Enter'],
        ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'ShiftRight'],
        ['ControlLeft', 'AltLeft', 'OSLeft', 'Space', 'AltRight', 'ControlRight', 'ContextMenu']
    ];

    const KEY_W = 0.045, KEY_D = 0.045, KEY_H = 0.008;
    const GAP = 0.005;
    const STEP_X = KEY_W + GAP;
    const STEP_Z = KEY_D + GAP;
    const BASE_Y = 0.02 + KEY_H / 2;
    const START_Z = (keyRows.length / 2 - 0.5) * STEP_Z;

    const keysContainer = new THREE.Group();
    const fontLoader = new FontLoader();
    fontLoader.load('https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_regular.typeface.json', (font) => {
        keyRows.forEach((row, rowIndex) => {
            const totalKeyUnits = row.reduce((sum, factor) => sum + factor, 0);
            const rowWidth = totalKeyUnits * KEY_W + (row.length - 1) * GAP;
            
            let currentX = -rowWidth / 2;
            const currentZ = START_Z - rowIndex * STEP_Z;

            const reversedRow = [...row].reverse();
            const reversedLabels = [...(keyLabels[rowIndex] || [])].reverse();
            const reversedCodes = [...(keyCodes[rowIndex] || [])].reverse();

            reversedRow.forEach((widthFactor, keyIndex) => {
                const keyWidth = widthFactor * KEY_W + (widthFactor - 1) * GAP;
                const keyGeo = new THREE.BoxGeometry(keyWidth, KEY_H, KEY_D);
                const key = new THREE.Mesh(keyGeo, keysMat);
                key.castShadow = true;
                
                key.position.set(currentX + keyWidth / 2, BASE_Y, currentZ);
                keysContainer.add(key);

                // Store key mesh for animation
                const code = reversedCodes[keyIndex];
                if (code) {
                    keyboardGroup.userData.keys[code] = key;
                }

                // Add text label
                const label = reversedLabels[keyIndex] || '';
                if (label.trim()) {
                    const textGeo = new TextGeometry(label, {
                        font: font,
                        size: 0.012,
                        height: 0.001,
                    });
                    textGeo.computeBoundingBox();
                    const text = new THREE.Mesh(textGeo, keysTextMat);
                    text.position.set(
                        -textGeo.boundingBox.max.x / 2, // center
                        -textGeo.boundingBox.max.y / 2, // center
                        0 // Place text flat on the group's XY plane
                    );
                    const labelGroup = new THREE.Group();
                    labelGroup.add(text);
                    // Position the label group directly on the key's top surface
                    labelGroup.position.set(key.position.x, key.position.y + KEY_H / 2 + 0.001, key.position.z);
                    labelGroup.rotation.x = -Math.PI / 2;
                    labelGroup.rotation.z = Math.PI;
                    keysContainer.add(labelGroup);
                }
                
                currentX += keyWidth + GAP;
            });
        });
    });
    
    keyboardGroup.add(keysContainer);

    // Cable (a simple tube)
    const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.01, 0.15),
        new THREE.Vector3(0, 0.02, 0.2),
        new THREE.Vector3(0.1, 0.05, 0.25),
        new THREE.Vector3(0.1, -0.1, 0.3) // goes down behind desk
    ]);
    const cableGeo = new THREE.TubeGeometry(curve, 20, 0.005, 8, false);
    const cableMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.6 });
    const cable = new THREE.Mesh(cableGeo, cableMat);
    cable.castShadow = true;
    keyboardGroup.add(cable);

    keyboardGroup.position.set(-0.35, -0.45 + 0.02, -3.95);
    keyboardGroup.rotation.y = 0.2 + Math.PI; // Slightly ajar and flipped
    scene.add(keyboardGroup);

    // --- MOUSE ---
    const mouse = new THREE.Group();
    const bodyMat = plasticMaterial; // Use same white plastic from monitor
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6 });

    // Main Body - using a capsule-like shape
    const bodyGeo = new THREE.CapsuleGeometry(0.045, 0.05, 10, 20);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    body.scale.z = 0.6; // Flatten it
    body.castShadow = true;
    body.receiveShadow = true;
    mouse.add(body);
    
    // Left & Right Buttons (as cutouts on the top surface)
    const buttonCutoutGeo = new THREE.BoxGeometry(0.08, 0.04, 0.08);
    const buttonCutout = new THREE.Mesh(buttonCutoutGeo); // Invisible, for CSG
    buttonCutout.position.y = 0.02;

    // Scroll Wheel
    const wheelGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.018, 16);
    const wheel = new THREE.Mesh(wheelGeo, darkMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, 0.015, 0.01);
    wheel.castShadow = true;
    mouse.add(wheel);

    // Side Buttons (two small capsules)
    const sideButtonGeo = new THREE.CapsuleGeometry(0.004, 0.02, 8, 16);
    const sideButton1 = new THREE.Mesh(sideButtonGeo, darkMat);
    sideButton1.rotation.y = Math.PI / 2;
    sideButton1.position.set(-0.042, 0.0, 0.02);
    sideButton1.castShadow = true;
    mouse.add(sideButton1);

    const sideButton2 = new THREE.Mesh(sideButtonGeo, darkMat);
    sideButton2.rotation.y = Math.PI / 2;
    sideButton2.position.set(-0.042, 0.0, -0.01);
    sideButton2.castShadow = true;
    mouse.add(sideButton2);
    
    mouse.position.set(0.55, -0.45 + 0.02, -4.1); // To the right of the keyboard
    mouse.rotation.y = -0.2;
    scene.add(mouse);

    // Cup
    const cupGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.15, 32);
    const cupMat = new THREE.MeshStandardMaterial({ color: 0xeaeaea, roughness: 0.1, metalness: 0.0 });
    const cup = new THREE.Mesh(cupGeo, cupMat);
    cup.position.set(-0.9, -0.45 + 0.08 / 2, -4.2); // On the desk, to the left of monitor
    cup.castShadow = true;
    scene.add(cup);

    // Tiny clay pot (opposite side of the pencil cup)
    const potGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.08, 24);
    const potMat = new THREE.MeshStandardMaterial({ color: 0xB5651D, roughness: 0.9, metalness: 0.0 });
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.set(0.9, -0.45 + 0.08 / 2, -4.2);
    pot.castShadow = true;
    scene.add(pot);

    // Cactus in the pot
    const cactus = createCactus(pot.position);
    scene.add(cactus);

    // Pen and Pencil in cup
    const penAndPencilGroup = new THREE.Group();

    // Pen
    const penGroup = new THREE.Group();
    const penBodyGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.18, 8);
    const penBodyMat = new THREE.MeshStandardMaterial({ color: 0x2222aa, roughness: 0.3 });
    const penBody = new THREE.Mesh(penBodyGeo, penBodyMat);
    penBody.castShadow = true;
    penGroup.add(penBody);

    const penTipGeo = new THREE.ConeGeometry(0.005, 0.015, 8);
    const penTipMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.2, metalness: 0.5 });
    const penTip = new THREE.Mesh(penTipGeo, penTipMat);
    penTip.position.y = -0.09;
    penTip.castShadow = true;
    penGroup.add(penTip);

    penGroup.position.y = 0.08;
    penGroup.rotation.z = 0.1;
    penGroup.rotation.x = -0.1;
    penAndPencilGroup.add(penGroup);

    // Pencil
    const pencilGroup = new THREE.Group();
    const pencilBodyGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.18, 6);
    const pencilBodyMat = new THREE.MeshStandardMaterial({ color: 0xffd700 }); // Yellow
    const pencilBody = new THREE.Mesh(pencilBodyGeo, pencilBodyMat);
    pencilBody.castShadow = true;
    pencilGroup.add(pencilBody);

    const pencilTipGeo = new THREE.ConeGeometry(0.005, 0.02, 6);
    const pencilTipMat = new THREE.MeshStandardMaterial({ color: 0x222222 }); // Graphite
    const pencilTip = new THREE.Mesh(pencilTipGeo, pencilTipMat);
    pencilTip.position.y = -0.09;
    pencilTip.castShadow = true;
    pencilGroup.add(pencilTip);

    pencilGroup.position.x = 0.01;
    pencilGroup.position.y = 0.07;
    pencilGroup.rotation.z = -0.15;
    pencilGroup.rotation.x = 0.15;
    penAndPencilGroup.add(pencilGroup);

    penAndPencilGroup.position.copy(cup.position);
    scene.add(penAndPencilGroup);

    // Notepad on desk near the cup (slightly rotated)
    const notepadPos = new THREE.Vector3(cup.position.x + 0.18, -0.45 + 0.005, -4.25);
    const notepad = createNotepad(notepadPos, -0.25);
    scene.add(notepad);

    // --- NEW: Flashlight ---
    const flashlight = createFlashlight(new THREE.Vector3(0.7, -0.45, -3.8));
    flashlight.rotation.set(Math.PI / 2, 0, 0.5);
    scene.add(flashlight);

    // Chair (represented by a simple block)
    const chairGeo = new THREE.BoxGeometry(0.8, 1.2, 0.8);
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 });
    const chair = new THREE.Mesh(chairGeo, chairMat);
    chair.position.set(0, -2.4, -2.5);
    chair.castShadow = true;
    scene.add(chair);

    // --- Door ---
    const doorConfig = {
        width: doorWidth,
        height: doorHeight,
        position: new THREE.Vector3(
            roomSize.width / 2,                      // On the right wall plane
            -roomSize.height / 2 + doorHeight / 2,   // Centered vertically in the opening
            doorPositionZ + doorWidth / 2            // At the RIGHT edge of the opening (hinge)
        ),
        // The door should open inwards, into the room.
        // openAngle: 0 means it aligns with the X-axis (swung open).
        // closedAngle: -PI/2 means it aligns with the Z-axis (parallel to the wall, closing the gap).
        openAngle: -Math.PI,
        closedAngle: -Math.PI / 2
    };
    const door = createDoor(doorConfig);
    scene.add(door);

    // Bed
    const bedGroup = new THREE.Group();
    const bedWidth = 2;
    const bedDepth = 4.0;
    const frameHeight = 0.8;
    const mattressHeight = 0.5;

    // Bed Frame
    const frameGeo = new THREE.BoxGeometry(bedWidth, frameHeight, bedDepth);
    const bedFrame = new THREE.Mesh(frameGeo, woodMaterial);
    bedFrame.position.y = frameHeight / 2;
    bedFrame.castShadow = true;
    bedFrame.receiveShadow = true;
    bedGroup.add(bedFrame);

    // Mattress
    const mattressGeo = new THREE.BoxGeometry(bedWidth * 0.95, mattressHeight, bedDepth * 0.95);
    const mattressMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const mattress = new THREE.Mesh(mattressGeo, mattressMat);
    mattress.position.y = frameHeight + mattressHeight / 2;
    mattress.castShadow = true;
    bedGroup.add(mattress);

    // Pillow
    const pillowGeo = new THREE.BoxGeometry(bedWidth * 0.4, 0.2, 0.4);
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xeeeeff, roughness: 0.8 });
    const pillow = new THREE.Mesh(pillowGeo, pillowMat);
    pillow.position.y = frameHeight + mattressHeight + 0.2 / 2;
    pillow.position.z = -bedDepth / 2 + 0.5;
    pillow.castShadow = true;
    bedGroup.add(pillow);

    // Acoustic guitar on bed
    const guitar = new THREE.Group();
    const guitarBodyMat = new THREE.MeshStandardMaterial({ color: 0xCC9966, roughness: 0.6 });
    const neckMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.5 });
    const bodyLow = new THREE.Mesh(new THREE.SphereGeometry(0.22,16,16), guitarBodyMat); bodyLow.scale.set(1.0,0.25,0.7); bodyLow.castShadow = true;
    const bodyUp = new THREE.Mesh(new THREE.SphereGeometry(0.18,16,16), guitarBodyMat); bodyUp.position.z = -0.22; bodyUp.scale.set(0.9,0.24,0.6); bodyUp.castShadow = true;
    const neckGuitar = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.03,0.6), neckMat); neckGuitar.position.set(0,0.01,-0.6); neckGuitar.castShadow = true;
    const headGuitar = new THREE.Mesh(new THREE.BoxGeometry(0.09,0.025,0.12), neckMat); headGuitar.position.set(0,0.012,-0.96); headGuitar.castShadow = true;
    const holeGuitar = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.01,16), new THREE.MeshStandardMaterial({ color: 0x000000 })); holeGuitar.rotation.x = Math.PI/2; holeGuitar.position.set(0,0.02,-0.1);
    guitar.add(bodyLow, bodyUp, neckGuitar, headGuitar, holeGuitar);
    guitar.position.set(0.35, frameHeight + mattressHeight + 0.06, 0.3);
    guitar.rotation.set(0.05, 0.3, 0.02);
    bedGroup.add(guitar);

    // Position the bed in the back-left corner
    bedGroup.position.set(
        -roomSize.width / 2 + bedWidth / 2,
        -roomSize.height / 2, // bottom of frame on the floor
        -roomSize.depth / 2 + bedDepth / 2 + 0.1 // a little off the back wall
    );
    scene.add(bedGroup);

    // --- Hallway Dimensions (for camera placement) ---
    const hallwayLength = 16;
    const hallwayWidth = 4;

    // --- Security Cameras ---
    const securityCameras = [];
    const camMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.3 });
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    const createCam = (pos, lookAtPos) => {
        const camGroup = new THREE.Object3D();
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), camMat);
        body.castShadow = true;
        camGroup.add(body);
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16), lensMat);
        lens.rotation.x = Math.PI / 2;
        lens.position.z = 0.07;
        body.add(lens);
        
        // Add a small red light indicator
        const ledGeo = new THREE.SphereGeometry(0.008, 8, 8);
        const ledMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const led = new THREE.Mesh(ledGeo, ledMat);
        led.position.set(0, 0.05, 0.06);
        body.add(led);

        camGroup.position.copy(pos);
        camGroup.lookAt(lookAtPos);
        scene.add(camGroup);
        securityCameras.push(camGroup);
    };

    // Cam 1: Hallway, looking towards living room
    createCam(
        new THREE.Vector3(roomSize.width / 2 + 1, roomSize.height / 2 - 0.3, doorPositionZ + 1.5),
        new THREE.Vector3(roomSize.width / 2 + hallwayLength, 0, doorPositionZ)
    );

    // Cam 2: End room, looking back towards hallway
    createCam(
        new THREE.Vector3(22, roomSize.height / 2 - 0.3, 11.7),
        new THREE.Vector3(21, 0, 2)
    );

    // Cam 3: Room corner, looking at desk
    createCam(
        new THREE.Vector3(roomSize.width / 2 - 0.3, roomSize.height / 2 - 0.3, -roomSize.depth / 2 + 0.3),
        new THREE.Vector3(0, -0.5, -4)
    );

    // Cam 4: On wall, looking at bed
    createCam(
        new THREE.Vector3(-roomSize.width/2 + 0.3, 1, 0),
        bedGroup.position
    );

    return { screen, cactus, notepad, mouse, keyboard: keyboardGroup, webcamLED, webcamLight, door: door, securityCameras, flashlight, ambientLight, pcTower, bed: bedGroup };
}