import * as THREE from 'three';

export function createCactus(basePosition = new THREE.Vector3()) {
    const cactusGroup = new THREE.Group();
    cactusGroup.position.copy(basePosition);

    const cactusMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.6 });

    // Main stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 12), cactusMat);
    stem.castShadow = true;
    stem.position.y = 0.14 / 2;
    cactusGroup.add(stem);

    // Rounded top
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 12), cactusMat);
    top.castShadow = true;
    top.position.y = 0.14;
    cactusGroup.add(top);

    // Side arm
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.08, 10), cactusMat);
    arm.castShadow = true;
    arm.rotation.z = Math.PI / 2;
    arm.position.set(0.045, 0.06, 0);
    cactusGroup.add(arm);

    // Pink flower (appears late in growth)
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xff77aa, roughness: 0.5 });
    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 12), flowerMat);
    flower.castShadow = true;
    flower.position.set(0, 0.14 + 0.03 + 0.015, 0);
    cactusGroup.add(flower);

    // Bud (initial tiny green circle/sphere)
    const bud = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 12), cactusMat);
    bud.castShadow = true;
    bud.position.set(0, 0.03, 0);
    cactusGroup.add(bud);

    // Initial scales
    stem.scale.set(1, 0.0001, 1);
    top.scale.set(0.0001, 0.0001, 0.0001);
    arm.scale.set(0.0001, 0.0001, 0.0001);
    flower.scale.set(0.0001, 0.0001, 0.0001);
    bud.scale.set(1, 1, 1);

    // Growth updater (30 minutes -> t in [0,1])
    const STEM_H = 0.14, ARM_H = 0.08, TOP_R = 0.03;
    cactusGroup.userData.startMs = performance.now();
    cactusGroup.userData.updateGrowth = () => {
        const elapsed = (performance.now() - cactusGroup.userData.startMs) / 1000;
        const t = Math.min(elapsed / (30 * 60), 1);

        // Stem grows first
        const tStem = Math.min(t / 0.6, 1);
        stem.scale.y = Math.max(tStem, 0.0001);
        stem.position.y = (STEM_H * stem.scale.y) / 2;

        // Top bulb after some stem
        const tTop = Math.max(0, (t - 0.2) / 0.5);
        const sTop = Math.max(tTop, 0.0001);
        top.scale.set(sTop, sTop, sTop);
        top.position.y = STEM_H * stem.scale.y;

        // Arm later
        const tArm = Math.max(0, (t - 0.4) / 0.5);
        const sArm = Math.max(tArm, 0.0001);
        arm.scale.set(sArm, sArm, sArm);
        arm.position.set(0.045, Math.max(0.06 * stem.scale.y, 0.01), 0);

        // Flower last
        const tFlower = Math.max(0, (t - 0.8) / 0.2);
        const sFlower = Math.max(tFlower, 0.0001);
        flower.scale.set(sFlower, sFlower, sFlower);
        flower.position.y = STEM_H * stem.scale.y + TOP_R * top.scale.y + 0.015 * sFlower;

        // Bud shrinks away
        const sBud = Math.max(1 - t * 1.5, 0.0001);
        bud.scale.set(sBud, sBud, sBud);
        bud.visible = sBud > 0.01;
    };

    return cactusGroup;
}