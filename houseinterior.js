import * as THREE from 'three';
import { createDoor } from './door.js';

/**
 * Creates a simple room with floor, ceiling, and walls.
 * @param {object} size - { width, depth, height }
 * @param {object} materials - { wallMaterial, floorMaterial }
 * @param {object} openings - An array of openings [{ side, pos, width, height }]
 *   - side: 'back'(-z), 'front'(+z), 'left'(-x), 'right'(+x)
 *   - pos: center of the opening on its wall axis
 *   - width, height: size of the opening
 * @returns {THREE.Group}
 */
function createRoomGeometry(size, materials, openings = []) {
    const group = new THREE.Group();
    const { wallMaterial, floorMaterial } = materials;

    // Floor & Ceiling
    const floorGeo = new THREE.PlaneGeometry(size.width, size.depth);
    const floor = new THREE.Mesh(floorGeo, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -size.height / 2;
    floor.receiveShadow = true;
    group.add(floor);

    const ceiling = new THREE.Mesh(floorGeo, wallMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = size.height / 2;
    ceiling.receiveShadow = true;
    group.add(ceiling);

    const wallConfigs = [
        { side: 'back', size: [size.width, size.height], pos: [0, 0, -size.depth / 2], rot: [0, 0, 0] },
        { side: 'front', size: [size.width, size.height], pos: [0, 0, size.depth / 2], rot: [0, Math.PI, 0] },
        { side: 'left', size: [size.depth, size.height], pos: [-size.width / 2, 0, 0], rot: [0, Math.PI / 2, 0] },
        { side: 'right', size: [size.depth, size.height], pos: [size.width / 2, 0, 0], rot: [0, -Math.PI / 2, 0] },
    ];
    
    wallConfigs.forEach(config => {
        const wallOpening = openings.find(o => o.side === config.side);
        if (wallOpening) {
            // Simplified wall-with-hole logic
            const wallH = size.height;
            const wallW = config.side === 'left' || config.side === 'right' ? size.depth : size.width;
            
            const o = wallOpening;
            const doorPos = o.pos;
            const doorW = o.width;
            const doorH = o.height;
            
            const segs = [
                { offset: (doorPos - doorW/2 - wallW/2)/2, width: (wallW/2 + doorPos - doorW/2) },
                { offset: (wallW/2 + doorPos + doorW/2)/2, width: (wallW/2 - doorPos - doorW/2) },
            ];

            segs.forEach(seg => {
                if(seg.width <= 0) return;
                const plane = new THREE.Mesh(new THREE.PlaneGeometry(seg.width, wallH), wallMaterial);
                plane.position.set(seg.offset, 0, 0);
                plane.receiveShadow = true;
                group.add(plane);
            });
            const aboveDoor = new THREE.Mesh(new THREE.PlaneGeometry(doorW, wallH - doorH), wallMaterial);
            aboveDoor.position.set(doorPos, doorH/2, 0);
            aboveDoor.receiveShadow = true;
            group.add(aboveDoor);

            const wallGroup = new THREE.Group();
            wallGroup.add(...group.children.filter(c => c.type === 'Mesh' && c.geometry.type === 'PlaneGeometry' && c.parent === group));
            wallGroup.position.set(...config.pos);
            wallGroup.rotation.set(...config.rot);
            group.add(wallGroup);

        } else {
            const wall = new THREE.Mesh(new THREE.PlaneGeometry(...config.size), wallMaterial);
            wall.position.set(...config.pos);
            wall.rotation.set(...config.rot);
            wall.receiveShadow = true;
            group.add(wall);
        }
    });

    return group;
}

// Helper to create a wall with window openings
function createWallWithWindows(width, height, material, windows = []) {
    const wallShape = new THREE.Shape();
    wallShape.moveTo(-width / 2, -height / 2);
    wallShape.lineTo(width / 2, -height / 2);
    wallShape.lineTo(width / 2, height / 2);
    wallShape.lineTo(-width / 2, height / 2);
    wallShape.closePath();

    windows.forEach(win => {
        const hole = new THREE.Path();
        const w_left = win.center - win.width / 2;
        const w_right = win.center + win.width / 2;
        const w_bottom = win.bottom - height / 2;
        const w_top = w_bottom + win.height;
        hole.moveTo(w_left, w_bottom);
        hole.lineTo(w_right, w_bottom);
        hole.lineTo(w_right, w_top);
        hole.lineTo(w_left, w_top);
        hole.closePath();
        wallShape.holes.push(hole);
    });

    const wallGeo = new THREE.ShapeGeometry(wallShape);
    const wall = new THREE.Mesh(wallGeo, material);
    wall.receiveShadow = true;
    return wall;
}

export function createHouseInterior(scene, materials, mainRoomSize, mainRoomDoorConfig) {
    const { wallMaterial, floorMaterial } = materials;
    const ROOM_HEIGHT = mainRoomSize.height;

    // --- Layout Definitions ---
    const HALL_WIDTH = 4;
    const HALL_LENGTH = 16;
    const END_ROOM_SIZE = { w: 20, h: ROOM_HEIGHT, d: 16 };
    
    const houseGroup = new THREE.Group();
    scene.add(houseGroup);
    
    // Position the whole exterior structure at the main room's doorway
    const exitX = mainRoomSize.width / 2;
    const exitZ = mainRoomDoorConfig.position.z; // This is the center of the doorway
    // The houseGroup base is on the floor level
    houseGroup.position.set(exitX, -ROOM_HEIGHT / 2, exitZ);

    // --- Create Combined Floor ---
    const floorShape = new THREE.Shape();
    // Start at main room door
    floorShape.moveTo(0, -HALL_WIDTH/2);
    // Hallway
    floorShape.lineTo(HALL_LENGTH, -HALL_WIDTH/2);
    // Transition to End room
    floorShape.lineTo(HALL_LENGTH, -END_ROOM_SIZE.w/2);
    floorShape.lineTo(HALL_LENGTH + END_ROOM_SIZE.d, -END_ROOM_SIZE.w/2);
    floorShape.lineTo(HALL_LENGTH + END_ROOM_SIZE.d, END_ROOM_SIZE.w/2);
    floorShape.lineTo(HALL_LENGTH, END_ROOM_SIZE.w/2);
    // Back along hallway
    floorShape.lineTo(HALL_LENGTH, HALL_WIDTH/2);
    floorShape.lineTo(0, HALL_WIDTH/2);
    floorShape.closePath();

    const houseFloorGeo = new THREE.ShapeGeometry(floorShape);
    const houseFloor = new THREE.Mesh(houseFloorGeo, floorMaterial);
    houseFloor.rotation.x = -Math.PI/2;
    houseFloor.receiveShadow = true;
    houseGroup.add(houseFloor);

    // --- Create Ceiling ---
    const houseCeiling = new THREE.Mesh(houseFloorGeo, wallMaterial);
    houseCeiling.rotation.x = Math.PI / 2;
    houseCeiling.position.y = ROOM_HEIGHT;
    houseCeiling.receiveShadow = true;
    houseGroup.add(houseCeiling);

    // Replace complex shape with two clean rectangles (hallway + end room)
    const hallFloor = new THREE.Mesh(new THREE.PlaneGeometry(HALL_LENGTH, HALL_WIDTH), floorMaterial);
    hallFloor.rotation.x = -Math.PI / 2;
    hallFloor.position.set(HALL_LENGTH / 2, 0, 0);
    hallFloor.receiveShadow = true;
    houseGroup.add(hallFloor);

    const endFloor = new THREE.Mesh(new THREE.PlaneGeometry(END_ROOM_SIZE.d, END_ROOM_SIZE.w), floorMaterial);
    endFloor.rotation.x = -Math.PI / 2;
    endFloor.position.set(HALL_LENGTH + END_ROOM_SIZE.d / 2, 0, 0);
    endFloor.receiveShadow = true;
    houseGroup.add(endFloor);

    // Ceilings (match floors)
    const hallCeil = new THREE.Mesh(new THREE.PlaneGeometry(HALL_LENGTH, HALL_WIDTH), wallMaterial);
    hallCeil.rotation.x = Math.PI / 2;
    hallCeil.position.set(HALL_LENGTH / 2, ROOM_HEIGHT, 0);
    hallCeil.receiveShadow = true;
    houseGroup.add(hallCeil);

    const endCeil = new THREE.Mesh(new THREE.PlaneGeometry(END_ROOM_SIZE.d, END_ROOM_SIZE.w), wallMaterial);
    endCeil.rotation.x = Math.PI / 2;
    endCeil.position.set(HALL_LENGTH + END_ROOM_SIZE.d / 2, ROOM_HEIGHT, 0);
    endCeil.receiveShadow = true;
    houseGroup.add(endCeil);

    // --- Create Walls ---
    // Hallway side walls
    const hallWallLeft = new THREE.Mesh(new THREE.PlaneGeometry(HALL_LENGTH, ROOM_HEIGHT), wallMaterial);
    hallWallLeft.rotation.y = -Math.PI / 2;
    hallWallLeft.position.set(HALL_LENGTH / 2, ROOM_HEIGHT / 2, HALL_WIDTH / 2);
    houseGroup.add(hallWallLeft);

    const hallWallRight = new THREE.Mesh(new THREE.PlaneGeometry(HALL_LENGTH, ROOM_HEIGHT), wallMaterial);
    hallWallRight.rotation.y = Math.PI / 2;
    hallWallRight.position.set(HALL_LENGTH / 2, ROOM_HEIGHT / 2, -HALL_WIDTH / 2);
    houseGroup.add(hallWallRight);

    // End Room walls (box open to hallway width)
    const endBack = new THREE.Mesh(new THREE.PlaneGeometry(END_ROOM_SIZE.w, ROOM_HEIGHT), wallMaterial);
    endBack.rotation.y = Math.PI / 2;
    endBack.position.set(HALL_LENGTH + END_ROOM_SIZE.d, ROOM_HEIGHT / 2, 0);
    houseGroup.add(endBack);

    const endLeft = new THREE.Mesh(new THREE.PlaneGeometry(END_ROOM_SIZE.d, ROOM_HEIGHT), wallMaterial);
    endLeft.rotation.y = -Math.PI / 2;
    endLeft.position.set(HALL_LENGTH + END_ROOM_SIZE.d / 2, ROOM_HEIGHT / 2, END_ROOM_SIZE.w / 2);
    houseGroup.add(endLeft);

    const endRight = new THREE.Mesh(new THREE.PlaneGeometry(END_ROOM_SIZE.d, ROOM_HEIGHT), wallMaterial);
    endRight.rotation.y = Math.PI / 2;
    endRight.position.set(HALL_LENGTH + END_ROOM_SIZE.d / 2, ROOM_HEIGHT / 2, -END_ROOM_SIZE.w / 2);
    houseGroup.add(endRight);

    // Connector walls (fill gaps beside hallway opening into end room)
    const connectorSpan = (END_ROOM_SIZE.w - HALL_WIDTH) / 2;
    const connectGeo = new THREE.PlaneGeometry(connectorSpan, ROOM_HEIGHT);

    const connectLeft = new THREE.Mesh(connectGeo, wallMaterial);
    connectLeft.rotation.y = Math.PI / 2;
    connectLeft.position.set(HALL_LENGTH, ROOM_HEIGHT / 2, (END_ROOM_SIZE.w + HALL_WIDTH) / 4);
    houseGroup.add(connectLeft);

    const connectRight = new THREE.Mesh(connectGeo, wallMaterial);
    connectRight.rotation.y = Math.PI / 2;
    connectRight.position.set(HALL_LENGTH, ROOM_HEIGHT / 2, -(END_ROOM_SIZE.w + HALL_WIDTH) / 4);
    houseGroup.add(connectRight);

    // Front Door
    const frontDoorConfig = {
        width: 1.8, height: 4.2,
        position: new THREE.Vector3(HALL_LENGTH, ROOM_HEIGHT / 2 - 4.2 / 2, -HALL_WIDTH / 2),
        openAngle: Math.PI / 2, closedAngle: 0
    };
    const frontDoor = createDoor(frontDoorConfig);
    frontDoor.userData.isOpen = true; // start open
    frontDoor.rotation.y = frontDoor.userData.openAngle;
    houseGroup.add(frontDoor);

    // Clean lighting for hall and end room
    const hallLight = new THREE.PointLight(0xffeebb, 0.7, 18);
    hallLight.position.set(HALL_LENGTH / 2, ROOM_HEIGHT - 1, 0);
    houseGroup.add(hallLight);

    const endRoomLight = new THREE.PointLight(0xffeebb, 0.9, 28);
    endRoomLight.position.set(HALL_LENGTH + END_ROOM_SIZE.d / 2, ROOM_HEIGHT - 1, 0);
    houseGroup.add(endRoomLight);
}