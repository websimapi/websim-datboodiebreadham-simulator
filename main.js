import * as THREE from 'three';
import { ComputerScreen } from './computer_screen_controller.js';
import { createRoom } from './room.js';
import { Player } from './player.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { AudioSystem } from './audio.js';

// --- Basic Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101010);
const cssScene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// WebGL Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Scene Objects ---
// The room and all its objects are now created in a separate module
const { screen, cactus, notepad, mouse, keyboard, webcamLED, webcamLight, door, securityCameras, flashlight, ambientLight, pcTower, bed } = createRoom(scene);

// Initialize audio before using it (lazy getters for player/mouse/door)
let playerRef = null;
const audio = new AudioSystem(() => playerRef, () => mouse, () => door, () => pcTower);

// --- Computer Simulation ---
const computer = new ComputerScreen(screen, audio.playSound.bind(audio), renderer, scene, securityCameras);

// --- Controls & Interactivity ---
camera.position.set(0, 0, -2.5); // Initial seated position
camera.lookAt(0, 0, -4); // Look at the desk

const player = new Player(camera, scene, computer, audio);
playerRef = player;
player.setScreen(screen);
player.setNotepad(notepad);
player.setFlashlight(flashlight);
player.setDoor(door);
player.setDeskMouse(mouse);
player.setKeyboard(keyboard);
player.setBed(bed);
player.setBounds({
    zones: [
      // Main Room
      { type: 'box', min: { x: -4.8, z: -5.8 }, max: { x: 4.8, z: 5.8 } },
      // Hallway (world coords: x from 5 to 21, z from 0 to 4)
      { type: 'box', min: { x: 5, z: 0 }, max: { x: 21, z: 4 } },
      // End Room (world coords: x from 21 to 37, z from -8 to 12)
      { type: 'box', min: { x: 21, z: -8 }, max: { x: 37, z: 12 } },
    ],
    // The wall between the main room and hallway, with a door gap
    walls: [
      { type: 'wall', axis: 'x', pos: 5, min: -6, max: 0, door: false },
      { type: 'wall', axis: 'x', pos: 5, min: 4, max: 6, door: false },
    ]
});
player.zoomedOutPosition.copy(camera.position); // Set initial camera position for zoom reference

const clock = new THREE.Clock();

// --- Postprocessing: SSAO ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
ssaoPass.kernelRadius = 16; ssaoPass.minDistance = 0.005; ssaoPass.maxDistance = 0.1;
composer.addPass(ssaoPass);

// --- Render Loop ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Update player controls and interactions (e.g., cursor on screen)
    player.update(delta);
    computer.update(delta);
    audio.update();

    if (cactus && cactus.userData && typeof cactus.userData.updateGrowth === 'function') {
        cactus.userData.updateGrowth();
    }

    // Update lighting based on computer settings
    if (ambientLight) {
        let targetIntensity = 1.5; // Default
        if (computer.mattBeQuietMode) targetIntensity = 2.5;
        if (computer.fullbrightMode) targetIntensity = 75.0; // Override with fullbright

        ambientLight.intensity += (targetIntensity - ambientLight.intensity) * 0.05;
    }

    // Force redraw for blinking cursor in text inputs
    if (computer.focusedElement || computer.needsAnimation) {
        computer.draw();
    }

    // Webcam LED indicator
    if (webcamLED && webcamLED.material) {
        webcamLED.material.emissiveIntensity = computer.cameraApp?.webcamActive ? 1.4 : 0.02;
    }
    if (webcamLight) {
        webcamLight.intensity = computer.cameraApp?.webcamActive ? 0.9 : 0.0;
    }

    composer.render();
}

// --- Handle Window Resize ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    ssaoPass.setSize(window.innerWidth, window.innerHeight);
});

animate();