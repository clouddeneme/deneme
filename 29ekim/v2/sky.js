import * as THREE from 'three';
import { clamp, lerp } from '../src/util.js';

// Time-of-day sky: a dome that follows the camera, with a sun disc, horizon glow and stars.
// The same "daylight" state drives the sun light, the ambient light, fog and the exposure.
// Keyframes: video time -> sun elevation (deg), sky colours, light levels.
const C = h => new THREE.Color(h);
const KEYS = [
  // t,   elev, zenith,    horizon,   glow,      sunCol,    sunI, hemiSky,  hemiGnd,  hemiI, stars, exposure
  [0.0,  -16, '#121635', '#3a3470', '#7a4a7a', '#ff9a6a', 0.0, '#2a3060', '#0c0c14', 0.6, 1.0, 1.0],
  [4.0,  -9,  '#1c2048', '#4a3e78', '#b4687a', '#ff9a6a', 0.0, '#5a5aa0', '#2a2440', 1.4, 0.8, 1.0],
  [6.8,  -2,  '#2c3a78', '#c27a86', '#ffa070', '#ffb070', 0.6, '#9aa0d0', '#6a5048', 1.9, 0.35, 1.0],
  [8.0,   5,  '#4a6aae', '#f0b088', '#ffc890', '#ffc48a', 3.0, '#c8c8e0', '#8a6a48', 2.3, 0.0, 1.0],
  [11.0,  18, '#3f7cd0', '#bcd6ee', '#fff0d0', '#ffe2b8', 3.4, '#d4e2f4', '#9a8060', 2.5, 0.0, 1.0],
  [19.0,  34, '#3f84d8', '#c4dcf2', '#fff6e0', '#fff0d8', 3.4, '#dce8f6', '#a08a6a', 2.1, 0.0, 1.0],
  [24.5,  40, '#4688da', '#cce0f4', '#fff8e8', '#fff2dc', 3.0, '#f4ece0', '#b09a7a', 2.3, 0.0, 1.0],
  [31.0,  45, '#4a8ede', '#d4e6f6', '#fffaf0', '#fff6e8', 3.0, '#f4ece0', '#a8947a', 2.3, 0.0, 1.0],
  // tower world: sunset (sun in the west) -> blue hour
  [31.6,  10, '#4659aa', '#f09a80', '#ffbe78', '#ffb46a', 2.8, '#b4a8b8', '#7a5a40', 1.5, 0.0, 1.0],
  [36.4,   4, '#3c4e9e', '#eb786e', '#ffb070', '#ffa058', 2.5, '#a49ab8', '#6a4a34', 1.35, 0.0, 1.0],
  [38.6,  -1, '#2a3c86', '#b46a86', '#ff9a68', '#ff7a48', 0.7, '#5a64a4', '#3a2a2a', 1.0, 0.1, 1.05],
  [40.5,  -6, '#14286e', '#3a50a0', '#a0688a', '#ff7a48', 0.0, '#3a4c90', '#1a1a2a', 0.9, 0.5, 1.1],
  [45.0,  -9, '#102266', '#2e4696', '#704c86', '#ff7a48', 0.0, '#34468a', '#16182a', 0.85, 0.7, 1.1],
];

const VERT = /* glsl */`varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const FRAG = /* glsl */`
uniform vec3 uZen, uHor, uGlow, uSunCol, uSunDir;
uniform float uStars, uTime;
varying vec3 vDir;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.2, 1.0);
  vec3 col = mix(uHor, uZen, pow(smoothstep(-0.02, 0.6, h), 0.7));
  float sd = max(dot(d, uSunDir), 0.0);
  // horizon glow toward the sun
  float band = exp(-abs(d.y - 0.02) * 9.0);
  col += uGlow * band * (0.35 + 0.65 * pow(sd, 3.0)) * 0.8;
  // sun disc and halo
  float disc = smoothstep(0.9993, 0.99965, sd);
  col += uSunCol * (disc * 6.0 + pow(sd, 120.0) * 1.2 + pow(sd, 12.0) * 0.25) * smoothstep(-0.03, 0.02, uSunDir.y + 0.02);
  // below the horizon: a soft haze
  col = mix(col, uHor * 0.9, smoothstep(0.0, -0.15, d.y));
  // stars
  vec3 g = floor(d * 420.0);
  float s = hash(g);
  float star = step(0.9975, s) * smoothstep(0.0, 0.3, d.y) * (0.6 + 0.4 * sin(uTime * 3.0 + s * 100.0));
  col += vec3(0.9, 0.92, 1.0) * star * uStars;
  gl_FragColor = vec4(col, 1.0);
}`;

export class Sky {
  constructor() {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, depthWrite: false, depthTest: false,
      uniforms: { uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uSunCol: { value: new THREE.Color() },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uStars: { value: 0 }, uTime: { value: 0 } },
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), this.mat);
    this.mesh.renderOrder = -10; this.mesh.frustumCulled = false;
    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0008; this.sun.shadow.normalBias = 0.05;
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
    this.state = {};
  }
  // azimuth of the sun (deg from north, clockwise) for the two worlds
  sample(t) {
    let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= t) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const u = clamp((t - a[0]) / (b[0] - a[0]));
    const s = u * u * (3 - 2 * u);
    const col = k => C(a[k]).lerp(C(b[k]), s);
    return { elev: lerp(a[1], b[1], s), zen: col(2), hor: col(3), glow: col(4), sunCol: col(5), sunI: lerp(a[6], b[6], s),
      hemiSky: col(7), hemiGnd: col(8), hemiI: lerp(a[9], b[9], s), stars: lerp(a[10], b[10], s), exposure: lerp(a[11], b[11], s) };
  }
  update(t, camera, focus) {
    const st = this.sample(t);
    // map world: sunrise in the east (+x); tower world: sunset in the west, behind the camera's left
    const az = t < 31.6 ? 95 : 250;
    const e = THREE.MathUtils.degToRad(st.elev), a = THREE.MathUtils.degToRad(az);
    const dir = new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)).normalize();
    const U = this.mat.uniforms;
    U.uZen.value.copy(st.zen); U.uHor.value.copy(st.hor); U.uGlow.value.copy(st.glow); U.uSunCol.value.copy(st.sunCol);
    U.uSunDir.value.copy(dir); U.uStars.value = st.stars; U.uTime.value = t;
    this.mesh.position.copy(camera.position);
    // sun light: shadows follow what the camera looks at
    const span = focus.span;
    this.sun.color.copy(st.sunCol); this.sun.intensity = st.sunI * Math.max(0, Math.min(1, (st.elev + 2) / 4));
    this.sun.position.set(focus.x + dir.x * span * 3, focus.y + dir.y * span * 3, focus.z + dir.z * span * 3);
    this.sun.target.position.set(focus.x, focus.y, focus.z); this.sun.target.updateMatrixWorld();
    const sc = this.sun.shadow.camera; sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.near = 0.01; sc.far = span * 8; sc.updateProjectionMatrix();
    this.hemi.color.copy(st.hemiSky); this.hemi.groundColor.copy(st.hemiGnd); this.hemi.intensity = st.hemiI;
    this.state = { ...st, dir };
    return this.state;
  }
}
