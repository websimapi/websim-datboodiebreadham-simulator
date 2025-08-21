import * as THREE from 'three';

export function createDoor(config) {
    const { width, height, position, openAngle, closedAngle } = config;

    const doorPivot = new THREE.Group();
    const doorGeo = new THREE.BoxGeometry(width, height, 0.1);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x966F33, roughness: 0.8 });
    const doorMesh = new THREE.Mesh(doorGeo, doorMat);
    doorMesh.castShadow = true;
    
    // Offset the door mesh so the pivot is at its edge.
    doorMesh.position.x = -width / 2; // Pivot on the right edge
    doorPivot.add(doorMesh);
    
    // Position the pivot at the hinge point
    doorPivot.position.copy(position);

    // Set initial rotation to the closed state
    doorPivot.rotation.y = closedAngle;

    // Door state and methods for animation and interaction
    doorPivot.userData = {
        isOpen: false,
        isAnimating: false,
        animationTime: 0,
        animationDuration: 1.2, // seconds
        openAngle: openAngle,
        closedAngle: closedAngle,
        
        toggle() {
            if (this.isAnimating) return;
            this.isAnimating = true;
            this.animationTime = 0;
            // The state is now toggled at the beginning of the animation.
            this.isOpen = !this.isOpen;
        },
        
        update(delta) {
            if (!this.isAnimating) return;
            this.animationTime += delta;
            let progress = this.animationTime / this.animationDuration;

            if (progress >= 1) {
                progress = 1;
                this.isAnimating = false;
                // State is no longer toggled at the end.
            }
            
            // Refined ease-in-out elastic easing function
            const c5 = (2 * Math.PI) / 4.5;
            let easedProgress;
            if (progress === 0) {
                easedProgress = 0;
            } else if (progress === 1) {
                easedProgress = 1;
            } else if (progress < 0.5) {
                easedProgress = -(Math.pow(2, 20 * progress - 10) * Math.sin((20 * progress - 11.125) * c5)) / 2;
            } else {
                easedProgress = (Math.pow(2, -20 * progress + 10) * Math.sin((20 * progress - 11.125) * c5)) / 2 + 1;
            }
            
            // Since isOpen is already flipped, 'from' is the opposite of the new state.
            const fromAngle = this.isOpen ? this.closedAngle : this.openAngle;
            const toAngle = this.isOpen ? this.openAngle : this.closedAngle;

            doorPivot.rotation.y = fromAngle + (toAngle - fromAngle) * easedProgress;
        }
    };

    return doorPivot;
}