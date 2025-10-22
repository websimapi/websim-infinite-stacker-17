import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

const fragmentShader = `
varying vec2 vUv;
uniform float u_time;
uniform float u_score;
uniform vec3 u_skyColorTop;
uniform vec3 u_skyColorBottom;
uniform vec3 u_cloudColor;

// 2D Random
float random (vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// 2D Noise based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise (vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f*f*(3.0-2.0*f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}


float fbm (vec2 st) {
    float value = 0.0;
    float amplitude = .5;
    float frequency = 0.;
    for (int i = 0; i < 8; i++) { // Increased iterations for more detail
        value += amplitude * noise(st);
        st *= 2.;
        amplitude *= .5;
    }
    return value;
}

void main() {
    // 1. Calculate altitude progression (0.0 to 1.0)
    float altitude_t = smoothstep(20.0, 30.0, u_score);

    // 2. Define sky colors and mix them based on altitude
    vec3 daySkyColor = mix(u_skyColorBottom, u_skyColorTop, vUv.y);
    vec3 spaceColor = vec3(0.0, 0.0, 0.05);
    vec3 sky = mix(daySkyColor, spaceColor, altitude_t);
    vec3 finalColor = sky;

    // 3. Add clouds that fade with altitude
    vec2 cloudUv = vUv;
    cloudUv.x *= 1.5; // Stretch clouds
    cloudUv.x += u_time * 0.02;
    float cloudPattern = fbm(cloudUv * 3.0); // Higher frequency for more detail
    cloudPattern = smoothstep(0.45, 0.65, cloudPattern);
    float cloudAlpha = 1.0 - altitude_t;
    finalColor = mix(finalColor, u_cloudColor, cloudPattern * cloudAlpha);

    // 4. Add stars that appear with altitude
    if (altitude_t > 0.0) {
        float star_t = random(vUv * 200.0);
        float star_twinkle = 0.5 + 0.5 * sin(u_time * 2.0 + vUv.x * 100.0);
        if (star_t > 0.998) {
            finalColor += vec3(1.0) * star_twinkle * altitude_t;
        }
    }

    // 5. Add planets/moon in deep space
    float deep_space_t = smoothstep(50.0, 60.0, u_score);
    if (deep_space_t > 0.0) {
        // Simple Moon
        vec2 moon_uv = vUv - vec2(0.8, 0.8);
        float moon_dist = length(moon_uv);
        float moon_radius = 0.1;
        float moon_glow = smoothstep(moon_radius + 0.01, moon_radius, moon_dist);
        float moon_surface = 1.0 - smoothstep(moon_radius - 0.01, moon_radius, moon_dist);
        
        if (moon_surface > 0.0) {
             float craters = noise(vUv * 30.0) * 0.2;
             vec3 moon_color = vec3(0.8) - craters;
             finalColor = mix(finalColor, moon_color, moon_surface * deep_space_t);
        }
        finalColor += vec3(0.8, 0.8, 1.0) * moon_glow * 0.5 * deep_space_t;

        // Distant red planet
        vec2 planet_uv = vUv - vec2(0.2, 0.7);
        float planet_dist = length(planet_uv);
        float planet_radius = 0.04;
        float planet_surface = 1.0 - smoothstep(planet_radius - 0.005, planet_radius, planet_dist);
        if (planet_surface > 0.0) {
            vec3 planet_color = vec3(0.8, 0.3, 0.1);
            finalColor = mix(finalColor, planet_color, planet_surface * deep_space_t);
        }
    }
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;


export class Sky {
    constructor() {
        this.uniforms = {
            u_time: { value: 0.0 },
            u_score: { value: 0.0 },
            u_skyColorTop: { value: new THREE.Color(0x73b3e8) },
            u_skyColorBottom: { value: new THREE.Color(0xd0e7f9) },
            u_cloudColor: { value: new THREE.Color(0xffffff) },
        };

        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: this.uniforms,
            depthTest: false,
            depthWrite: false,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.renderOrder = -1; // Ensure it's drawn first
    }

    update() {
        this.uniforms.u_time.value += 1 / 60;
    }

    updateScore(score) {
        this.uniforms.u_score.value = score;
    }
}