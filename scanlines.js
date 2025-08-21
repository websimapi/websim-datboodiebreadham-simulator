import * as THREE from 'three';

export function createScanlineMaterial(texture, opts = {}) {
    const width = opts.width || texture.image?.width || 1024;
    const height = opts.height || texture.image?.height || 576;
    const uniforms = {
        tDiffuse: { value: texture },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        uOpacity: { value: opts.opacity ?? 0.18 },       // overall darkness of scanlines
        uLineThickness: { value: opts.lineThickness ?? 1.5 }, // in pixels
        uSpeed: { value: opts.speed ?? 0.0 }             // drifting speed (0 = static)
    };

    return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            precision highp float;
            varying vec2 vUv;
            uniform sampler2D tDiffuse;
            uniform float uTime;
            uniform vec2 uResolution;
            uniform float uOpacity;
            uniform float uLineThickness;
            uniform float uSpeed;

            void main() {
                vec4 base = texture2D(tDiffuse, vUv);

                // Compute scanline mask based on vertical position in pixel space
                float pixelsY = vUv.y * uResolution.y;
                float freq = 3.14159265 / max(1.0, uLineThickness);
                float drift = uTime * uSpeed;
                float s = 0.5 + 0.5 * sin((pixelsY + drift) * freq);

                // s is 0..1 (dark..bright). Mix darkening with configurable opacity.
                float brightness = mix(1.0 - uOpacity, 1.0, s);

                // Tiny global flicker for CRT vibe (very subtle)
                float flicker = 1.0 - 0.01 * sin(uTime * 75.0);

                vec3 color = base.rgb * brightness * flicker;
                gl_FragColor = vec4(color, base.a);
            }
        `,
        transparent: false
    });
}