import * as THREE from 'three';

export function createPcTower(position = new THREE.Vector3()) {
    const group = new THREE.Group();
    group.position.copy(position);

    // Main case
    const caseWidth = 0.25;
    const caseHeight = 0.55;
    const caseDepth = 0.6;
    const caseMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.1 });
    const caseGeo = new THREE.BoxGeometry(caseWidth, caseHeight, caseDepth);
    const pcCase = new THREE.Mesh(caseGeo, caseMat);
    pcCase.castShadow = true;
    pcCase.receiveShadow = true;
    group.add(pcCase);

    // Power button
    const btnRadius = 0.015;
    const btnMat = new THREE.MeshStandardMaterial({
        color: 0x00aaff,
        emissive: 0x00aaff,
        emissiveIntensity: 1.0,
        roughness: 0.8
    });
    const btnGeo = new THREE.CylinderGeometry(btnRadius, btnRadius, 0.01, 16);
    const powerButton = new THREE.Mesh(btnGeo, btnMat);
    
    // Position on front panel (+Z face)
    powerButton.rotation.x = Math.PI / 2;
    powerButton.position.set(0, caseHeight * 0.35, caseDepth / 2);
    pcCase.add(powerButton);

    // Light from power button
    const powerLight = new THREE.PointLight(0x00aaff, 0.5, 0.8);
    powerLight.position.copy(powerButton.position);
    powerLight.position.z += 0.02; // Slightly in front of the button
    pcCase.add(powerLight);

    // Add a subtle fan vent on the side (-X face)
    const ventGeo = new THREE.PlaneGeometry(caseWidth * 0.6, caseHeight * 0.4);
    const ventMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const vent = new THREE.Mesh(ventGeo, ventMat);
    vent.rotation.y = -Math.PI / 2;
    vent.position.set(-caseWidth / 2 - 0.001, 0, 0); // a tiny bit offset to avoid z-fighting
    pcCase.add(vent);

    return group;
}