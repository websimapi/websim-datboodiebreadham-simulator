import * as THREE from 'three';

export function createNotepad(position = new THREE.Vector3(), rotationY = 0) {
    const group = new THREE.Group();
    group.position.copy(position);
    group.rotation.y = rotationY;

    const paperMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
    const backingMat = new THREE.MeshStandardMaterial({ color: 0xb08d57, roughness: 0.95, metalness: 0.05 });
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.4, metalness: 0.6 });

    // Backing board
    const backing = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.005, 0.24), backingMat);
    backing.castShadow = true;
    backing.receiveShadow = true;
    group.add(backing);

    // Paper stack
    const paper = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.004, 0.23), paperMat);
    paper.position.y = 0.0045;
    paper.castShadow = true;
    group.add(paper);

    // Rings at top
    const ringGeom = new THREE.TorusGeometry(0.008, 0.0018, 10, 16, Math.PI);
    for (let i = -2; i <= 2; i++) {
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.z = Math.PI;
        ring.position.set(i * 0.03, 0.006, -0.11);
        group.add(ring);
    }

    // Save rest state
    group.userData.rest = {
        parent: null,
        position: group.position.clone(),
        quaternion: group.quaternion.clone()
    };

    // Helpers for camera attach/detach
    group.userData.attachToCamera = (camera) => {
        if (!group.userData.rest.parent) {
            group.userData.rest.parent = group.parent;
            group.userData.rest.position.copy(group.position);
            group.userData.rest.quaternion.copy(group.quaternion);
        }
        camera.add(group);
        group.position.set(0.0, -0.05, -0.6);
        group.quaternion.identity();
        group.rotation.x = -0.1;
    };

    group.userData.detachFromCamera = () => {
        const rest = group.userData.rest;
        if (rest.parent) {
            rest.parent.add(group);
            group.position.copy(rest.position);
            group.quaternion.copy(rest.quaternion);
            rest.parent = null;
        }
    };

    return group;
}