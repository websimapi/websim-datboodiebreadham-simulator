import * as THREE from 'three';

export function createFlashlight(position = new THREE.Vector3()) {
    const group = new THREE.Group();
    group.position.copy(position);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.2 });
    const lensMat = new THREE.MeshStandardMaterial({ color: 0xeeffff, emissive: 0xffffee, emissiveIntensity: 0, transparent: true, opacity: 0.8 });

    // --- Create components oriented along the Z-axis ---
    const componentGroup = new THREE.Group();
    group.add(componentGroup);

    // Body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.18, 20), bodyMat);
    body.castShadow = true;
    componentGroup.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 20), bodyMat);
    head.position.y = 0.09 + 0.03;
    head.castShadow = true;
    componentGroup.add(head);

    // Lens
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 20), lensMat);
    lens.position.y = 0.12 + 0.005;
    componentGroup.add(lens);

    // Spotlight - points out of the top of the cylinder (+Y)
    const spotLight = new THREE.SpotLight(0xffffee, 0, 10, Math.PI / 8, 0.5, 1.5);
    spotLight.position.set(0, 0.13, 0);
    spotLight.target.position.set(0, 0.13 + 1, 0); // Pointing along +Y relative to components
    componentGroup.add(spotLight);
    componentGroup.add(spotLight.target);
    spotLight.castShadow = true;

    // Rotate components so the light points forward (+Z) relative to the main group
    componentGroup.rotation.x = -Math.PI / 2;

    // State
    group.userData = {
        isOn: false,
        isHeld: false,
        battery: 180, // 3 minutes
        maxBattery: 180,
        flickerTime: 0,
        initialPosition: position.clone(),
        initialQuaternion: group.quaternion.clone(),
        
        toggle() {
            if (!this.isHeld || (this.battery <= 0 && this.isOn)) return;
            this.isOn = !this.isOn;
            if (this.battery <= 0) this.isOn = false; // Can't turn on if dead

            spotLight.intensity = this.isOn ? 8 : 0;
            lens.material.emissiveIntensity = this.isOn ? 1 : 0;
        },

        pickUp(camera) {
            if (this.isHeld) return;
            this.isHeld = true;

            this.initialPosition.copy(group.position);
            this.initialQuaternion.copy(group.quaternion);
            
            camera.add(group);
            group.position.set(0.3, -0.2, -0.5);
            // Point it slightly down and to the left, but mostly forward
            group.rotation.set(0.4, -0.3, 0.1);

            if (!this.isOn && this.battery > 0) this.toggle();
        },

        putDown(parentScene) {
            if (!this.isHeld) return;
            this.isHeld = false;
            
            parentScene.add(group);
            group.position.copy(this.initialPosition);
            group.quaternion.copy(this.initialQuaternion);
        },

        update(delta) {
            if (!this.isHeld) return;

            if (this.isOn) {
                this.battery -= delta;
            }

            if (this.battery < 0) this.battery = 0;

            if (this.battery <= 0) {
                if (this.isOn) { // Turn it off for the last time
                    this.isOn = false;
                    spotLight.intensity = 0;
                    lens.material.emissiveIntensity = 0;
                }
                return;
            }

            if (this.isOn && this.battery < 15) { // Flicker for last 15 seconds
                this.flickerTime += delta;
                const flickerRate = (this.battery / 15) * 0.1 + 0.05;
                if (this.flickerTime > flickerRate) {
                    const intensity = 8 * (this.battery / 15);
                    spotLight.intensity = Math.random() > 0.3 ? intensity : intensity * 0.2;
                    lens.material.emissiveIntensity = spotLight.intensity > 0 ? 1 : 0;
                    this.flickerTime = 0;
                }
            } else if (this.isOn) {
                spotLight.intensity = 8;
                lens.material.emissiveIntensity = 1;
            }
        }
    };
    
    return group;
}