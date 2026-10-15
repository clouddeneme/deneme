import * as THREE from 'three';
import { clamp, lerp, smooth, ease, rng, pointInRing, textPoints } from '../src/util.js';
import { Tower } from '../src/tower.js';
import { FLAG } from '../src/flag.js';
import { T, TOWER_X } from './timeline.js';
import { pointsMaterial } from './act1.js';

// ACT 3 · İzmit Saat Kulesi at sunset, the flag on its pole beside the tower, the lantern procession
// that fills the square and, seen from above, becomes a Turkish flag of light and "103".

const TX = TOWER_X;
export const POLE = { x: TX + 9.2, z: -1.5, h: 21, G: 3.6 };
// the flag of lanterns on the square: Law 2893 proportions, G = 80 m, the tower stands in the crescent's hollow
export const FORM = (() => {
  const G = 80, x0 = TX - FLAG.inner * G;
  return { G, x0, L: 1.5 * G, outer: x0 + FLAG.outer * G, inner: TX, star: x0 + FLAG.starC * G, num: { x: x0 + 1.5 * G + 46, z: 0, h: 30 } };
})();

// ---------------------------------------------------------------- the flag: Verlet cloth, precomputed
const NX = 49, NY = 33;
const SIM_T0 = 28.4, REC_T0 = T.dial - 0.1, REC_T1 = 45.1, FPS = 30, SUB = 10;

function simulateFlag() {
  const G = POLE.G, L = 1.5 * G, dx = L / (NX - 1), dy = G / (NY - 1);
  const n = NX * NY, P = new Float32Array(n * 3), Q = new Float32Array(n * 3), pin = new Float32Array(n * 3);
  const top = POLE.h - 0.55, px = POLE.x + 0.14, pz = POLE.z;
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const k = (j * NX + i) * 3;
    P[k] = px + i * dx * 0.98; P[k + 1] = top - j * dy - i * 0.004; P[k + 2] = pz + Math.sin(i * 0.4) * 0.02;
    Q[k] = P[k]; Q[k + 1] = P[k + 1]; Q[k + 2] = P[k + 2];
    pin[k] = px; pin[k + 1] = top - j * dy; pin[k + 2] = pz;
  }
  // constraints: structural, shear, bend
  const C = [];
  const add = (a, b, s) => { const ax = P[a * 3] - P[b * 3]; C.push(a, b, s); };
  const id = (i, j) => j * NX + i;
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    if (i < NX - 1) add(id(i, j), id(i + 1, j), 1);
    if (j < NY - 1) add(id(i, j), id(i, j + 1), 1);
    if (i < NX - 1 && j < NY - 1) { add(id(i, j), id(i + 1, j + 1), 0.6); add(id(i + 1, j), id(i, j + 1), 0.6); }
    if (i < NX - 2) add(id(i, j), id(i + 2, j), 0.12);
    if (j < NY - 2) add(id(i, j), id(i, j + 2), 0.12);
  }
  const nc = C.length / 3, CA = new Int32Array(nc * 2), CS = new Float32Array(nc), CR = new Float32Array(nc);
  for (let c = 0; c < nc; c++) {
    CA[c * 2] = C[c * 3]; CA[c * 2 + 1] = C[c * 3 + 1]; CS[c] = C[c * 3 + 2];
    const a = CA[c * 2], b = CA[c * 2 + 1];
    const ia = a % NX, ja = Math.floor(a / NX), ib = b % NX, jb = Math.floor(b / NX);
    CR[c] = Math.hypot((ia - ib) * dx, (ja - jb) * dy);
  }
  const tris = [];
  for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) { const a = id(i, j), b = id(i, j + 1), c = id(i + 1, j), d = id(i + 1, j + 1); tris.push(a, b, c, c, b, d); }
  const TR = new Int32Array(tris);
  const mass = 0.16 * dx * dy, dt = 1 / (FPS * SUB), F = new Float32Array(n * 3);
  const rec = [], nRec = Math.ceil((REC_T1 - REC_T0) * FPS) + 1;
  let t = SIM_T0;
  const steps = Math.ceil((REC_T1 - SIM_T0) * FPS * SUB);
  for (let s = 0; s <= steps; s++, t += dt) {
    F.fill(0);
    // wind: steady from the west with gusts, plus travelling side-load that makes the cloth flap
    const gust = 1 + 0.22 * Math.sin(t * 0.73) + 0.14 * Math.sin(t * 1.91 + 1.3) + 0.08 * Math.sin(t * 3.7 + 0.4);
    for (let q = 0; q < TR.length; q += 3) {
      const a = TR[q] * 3, b = TR[q + 1] * 3, c = TR[q + 2] * 3;
      const e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2], e2x = P[c] - P[a], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2];
      let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      const len = Math.hypot(nx, ny, nz) || 1, area = len / 2; nx /= len; ny /= len; nz /= len;
      const cx = (P[a] + P[b] + P[c]) / 3;
      const u = (cx - px) / L;
      const wx = 7.2 * gust, wy = 0.3 * Math.sin(t * 2.3 + u * 4), wz = 0.9 + 2.6 * Math.sin(6.2832 * (1.45 * t - u * 1.25)) * (0.4 + 0.6 * u) + 0.8 * Math.sin(t * 5.1 + u * 9.0);
      const vx = (P[a] - Q[a] + P[b] - Q[b] + P[c] - Q[c]) / (3 * dt), vy = (P[a + 1] - Q[a + 1] + P[b + 1] - Q[b + 1] + P[c + 1] - Q[c + 1]) / (3 * dt), vz = (P[a + 2] - Q[a + 2] + P[b + 2] - Q[b + 2] + P[c + 2] - Q[c + 2]) / (3 * dt);
      const rx = wx - vx, ry = wy - vy, rz = wz - vz;
      const vn = rx * nx + ry * ny + rz * nz;
      const fn = 0.5 * 1.2 * 1.1 * area * vn * Math.abs(vn);
      // skin friction along the cloth
      const tx = rx - vn * nx, ty = ry - vn * ny, tz = rz - vn * nz, ft = 0.5 * 1.2 * 0.03 * area * Math.hypot(tx, ty, tz);
      const fx = (fn * nx + ft * tx) / 3, fy = (fn * ny + ft * ty) / 3, fz = (fn * nz + ft * tz) / 3;
      for (const k of [a, b, c]) { F[k] += fx; F[k + 1] += fy; F[k + 2] += fz; }
    }
    for (let k = 0; k < n * 3; k += 3) {
      const ax = F[k] / mass, ay = F[k + 1] / mass - 9.81, az = F[k + 2] / mass;
      const x = P[k], y = P[k + 1], z = P[k + 2];
      P[k] += (x - Q[k]) * 0.996 + ax * dt * dt; P[k + 1] += (y - Q[k + 1]) * 0.996 + ay * dt * dt; P[k + 2] += (z - Q[k + 2]) * 0.996 + az * dt * dt;
      Q[k] = x; Q[k + 1] = y; Q[k + 2] = z;
    }
    for (let it = 0; it < 5; it++) {
      for (let c = 0; c < nc; c++) {
        const a = CA[c * 2] * 3, b = CA[c * 2 + 1] * 3;
        const ddx = P[b] - P[a], ddy = P[b + 1] - P[a + 1], ddz = P[b + 2] - P[a + 2];
        const d = Math.hypot(ddx, ddy, ddz) || 1e-6, r = CR[c];
        if (CS[c] < 1 && d < r) continue;                       // shear/bend resist stretch more than compression
        const f = (d - r) / d * 0.5 * CS[c];
        P[a] += ddx * f; P[a + 1] += ddy * f; P[a + 2] += ddz * f;
        P[b] -= ddx * f; P[b + 1] -= ddy * f; P[b + 2] -= ddz * f;
      }
      for (let j = 0; j < NY; j++) { const k = j * NX * 3; P[k] = pin[k]; P[k + 1] = pin[k + 1]; P[k + 2] = pin[k + 2]; }
    }
    // record at frame boundaries
    if (s % SUB === 0 && t >= REC_T0 - 1e-6 && rec.length < nRec) rec.push(P.slice());
  }
  return rec;
}

// flag cloth shader: Law 2893 emblem drawn analytically, stitches, fibre, lit by the scene's sun and sky
const FVERT = /* glsl */`
varying vec2 vF; varying vec3 vN; varying vec3 vWorld;
void main() {
  vF = vec2(uv.x * 1.5, uv.y - 0.5);
  vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const FFRAG = /* glsl */`
uniform vec3 uSunDir, uSunCol, uSky, uGnd, uFloodCol;
uniform float uSunI, uHemiI, uFlood;
varying vec2 vF; varying vec3 vN; varying vec3 vWorld;
const float M = ${FLAG.M.toFixed(6)}, OUTER = ${FLAG.outer.toFixed(6)}, INNER = ${FLAG.inner.toFixed(6)}, STARC = ${FLAG.starC.toFixed(6)};
const float PI = 3.14159265359;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
float starSide(vec2 p, float R) {
  float seg = 2.0 * PI / 5.0; float a = atan(p.y, -p.x); a = mod(a + seg * 0.5, seg) - seg * 0.5;
  vec2 q = length(p) * vec2(cos(a), abs(sin(a))); float r = R * 0.381966;
  vec2 A = vec2(R, 0.0), B = vec2(r * cos(seg * 0.5), r * sin(seg * 0.5)); vec2 ed = B - A, w = q - A;
  return (ed.x * w.y - ed.y * w.x) / length(ed);
}
float emblem(vec2 p) {
  float outer = length(p - vec2(OUTER, 0.0)) - 0.25, inner = length(p - vec2(INNER, 0.0)) - 0.20;
  float st = max(-starSide(p - vec2(STARC, 0.0), 0.125), length(p - vec2(STARC, 0.0)) - 0.126);
  return min(max(outer, -inner), st);
}
float stitch(float d, float off, float s, float aa) {
  float line = 1.0 - smoothstep(0.0012, 0.0012 + aa, abs(d + off));
  float dash = smoothstep(0.25, 0.35, fract(s * 160.0)) * (1.0 - smoothstep(0.75, 0.85, fract(s * 160.0)));
  return line * dash;
}
void main() {
  vec3 RED = vec3(0.7681, 0.0030, 0.0080), WHITE = vec3(0.80);
  vec2 p = vF;
  float d = emblem(p), aa = max(fwidth(d), 1e-4);
  float wm = 1.0 - smoothstep(-aa, aa, d), sleeve = 1.0 - smoothstep(M - aa, M + aa, p.x);
  float white = max(wm, sleeve);
  vec3 base = mix(RED, WHITE, white);
  float faa = clamp(1.0 - fwidth(p.x) * 300.0, 0.0, 1.0);
  base *= 0.965 + 0.07 * mix(0.5, fbm(p * vec2(220.0, 260.0)), faa);
  base *= 0.985 + 0.03 * fbm(p * 6.0 + 9.0);
  float sw = 0.0, edgeT = 0.5 - p.y, edgeB = p.y + 0.5, edgeF = 1.5 - p.x;
  sw += stitch(-edgeT, 0.010, p.x, aa) + stitch(-edgeT, 0.018, p.x + 0.003, aa);
  sw += stitch(-edgeB, 0.010, p.x, aa) + stitch(-edgeB, 0.018, p.x + 0.003, aa);
  sw += stitch(-edgeF, 0.010, p.y, aa) + stitch(-edgeF, 0.018, p.y + 0.003, aa);
  sw += stitch(p.x - M, 0.004, p.y, aa);
  sw += stitch(d, 0.0045, atan(p.y, p.x - OUTER) * 0.25 + atan(p.y, p.x - STARC) * 0.125, aa) * 0.9;
  sw = clamp(sw, 0.0, 1.0) * faa;
  float hem = 1.0 - smoothstep(0.022, 0.024, min(min(edgeT, edgeB), edgeF));
  base *= 1.0 - 0.06 * hem;
  base = mix(base, mix(base * 0.72, vec3(0.86), 0.25), sw * 0.8);

  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vWorld), L = normalize(uSunDir);
  float ndl = dot(N, L);
  float wrap = max((ndl + 0.3) / 1.3, 0.0);
  // light through the cloth when the sun is behind it (red glows, white turns warm)
  float through = max(-ndl, 0.0) * max(dot(-L, V), 0.0);
  vec3 hemi = mix(uGnd, uSky, 0.5 + 0.5 * N.y) * uHemiI;
  vec3 Lf = normalize(vec3(${POLE.x.toFixed(2)}, 0.5, ${(POLE.z + 9).toFixed(2)}) - vWorld);
  float flood = max(dot(N, Lf), 0.0) * uFlood + max(-dot(N, Lf), 0.0) * uFlood * 0.25;
  vec3 irr = uSunCol * uSunI * wrap + hemi + uFloodCol * flood;
  vec3 col = base * irr / PI + base * uSunCol * uSunI * through * 0.35 / PI;
  // satin sheen along the threads
  vec3 dpx = dFdx(vWorld); vec3 Tn = normalize(dpx - N * dot(N, dpx) + 1e-6);
  vec3 H = normalize(L + V); float th = dot(Tn, H);
  float sheen = pow(sqrt(max(1.0 - th * th, 0.0)), 90.0) * 0.12 * max(ndl, 0.0) * uSunI;
  col += sheen * uSunCol * mix(vec3(1.0, 0.35, 0.33), vec3(1.0), white) / PI;
  gl_FragColor = vec4(col, 1.0);
}`;

export class FlagCloth {
  constructor() {
    this.frames = simulateFlag();
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(NX * NY * 3);
    const uv = new Float32Array(NX * NY * 2), idx = [];
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const k = j * NX + i; uv[k * 2] = i / (NX - 1); uv[k * 2 + 1] = 1 - j / (NY - 1); }
    for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) { const a = j * NX + i, b = a + NX, c = a + 1, d = b + 1; idx.push(a, b, c, c, b, d); }
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
    this.geo = g;
    this.U = { uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() }, uSunI: { value: 1 }, uSky: { value: new THREE.Color() }, uGnd: { value: new THREE.Color() },
      uHemiI: { value: 1 }, uFlood: { value: 0 }, uFloodCol: { value: new THREE.Color(1.0, 0.82, 0.62) } };
    this.mat = new THREE.ShaderMaterial({ vertexShader: FVERT, fragmentShader: FFRAG, uniforms: this.U, side: THREE.DoubleSide, extensions: { derivatives: true } });
    this.cloth = new THREE.Mesh(g, this.mat); this.cloth.frustumCulled = false; this.cloth.castShadow = true;
    // the pole, finial and halyard
    this.group = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: 0xe4e6ea, metalness: 0.85, roughness: 0.25 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.13, POLE.h, 24), steel); pole.position.set(POLE.x, POLE.h / 2, POLE.z); pole.castShadow = true;
    const gold = new THREE.MeshStandardMaterial({ color: 0xd8b14a, metalness: 1, roughness: 0.22, emissive: 0x3a2a08 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), gold); ball.position.set(POLE.x, POLE.h + 0.15, POLE.z);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 20), gold); collar.position.set(POLE.x, POLE.h - 0.02, POLE.z);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.05, 0.5, 32), new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.7 })); plinth.position.set(POLE.x, 0.25, POLE.z); plinth.receiveShadow = plinth.castShadow = true;
    this.group.add(this.cloth, pole, ball, collar, plinth);
  }
  update(t, st) {
    const f = clamp((t - REC_T0) * FPS, 0, this.frames.length - 1.001), i = Math.floor(f), u = f - i;
    const A = this.frames[i], B = this.frames[Math.min(this.frames.length - 1, i + 1)], P = this.pos;
    for (let k = 0; k < P.length; k++) P[k] = A[k] + (B[k] - A[k]) * u;
    this.geo.attributes.position.needsUpdate = true; this.geo.computeVertexNormals();
    this.U.uSunDir.value.copy(st.dir); this.U.uSunCol.value.copy(st.sunCol);
    this.U.uSunI.value = st.sunI * clamp((st.elev + 2) / 4); this.U.uSky.value.copy(st.hemiSky); this.U.uGnd.value.copy(st.hemiGnd); this.U.uHemiI.value = st.hemiI;
    this.U.uFlood.value = 2.2 * smooth(37.6, 39.5, t);
  }
}

// ---------------------------------------------------------------- the square, streets and buildings
function pavingTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); const r = rng(1902);
  g.fillStyle = '#b9ae9c'; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const v = 168 + r() * 30; g.fillStyle = `rgb(${v + 8},${v},${v - 12})`;
    g.fillRect(x * 32 + 1, y * 32 + 1, 30, 30);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(120, 120); t.anisotropy = 8; return t;
}

export const SQUARE = { x0: 140, x1: 395, z0: -56, z1: 64 };
export const STREETS = [
  // [x0, z0, x1, z1]: from the square's edge outward
  [175, -56, 175, -420], [262, -56, 262, -420], [350, -56, 350, -420],
  [175, 64, 175, 420], [262, 64, 262, 420], [350, 64, 350, 420],
  [140, 4, -200, 4], [395, 4, 720, 4],
];

export class City {
  constructor() {
    this.group = new THREE.Group();
    const S = SQUARE;
    // ground: asphalt city floor, the paved square on top
    const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ color: 0x4a4644, roughness: 0.95 }));
    asphalt.rotation.x = -Math.PI / 2; asphalt.position.set(TX, -0.02, 0); asphalt.receiveShadow = true; this.group.add(asphalt);
    const sq = new THREE.Mesh(new THREE.PlaneGeometry(S.x1 - S.x0, S.z1 - S.z0), new THREE.MeshStandardMaterial({ color: 0xffffff, map: pavingTexture(), roughness: 0.85 }));
    sq.material.map.repeat.set((S.x1 - S.x0) / 8, (S.z1 - S.z0) / 8);
    sq.rotation.x = -Math.PI / 2; sq.position.set((S.x0 + S.x1) / 2, 0, (S.z0 + S.z1) / 2); sq.receiveShadow = true; this.group.add(sq);
    // buildings in the blocks around the square, windows lit at dusk
    const rand = rng(41);
    const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
    this.night = { value: 0 };
    const mat = new THREE.MeshStandardMaterial({ color: 0xe8dccb, roughness: 0.85 });
    mat.onBeforeCompile = sh => {
      sh.uniforms.uNight = this.night;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN; varying float vId;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 wp4 = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nwp4 = instanceMatrix * wp4;\nvId = float(gl_InstanceID);\n#endif\nvWP = (modelMatrix * wp4).xyz;\nvWN = normalize(mat3(modelMatrix) * normal);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN; varying float vId; uniform float uNight;\nfloat h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (abs(vWN.y) < 0.5) {
          float u = abs(vWN.x) > 0.5 ? vWP.z : vWP.x;
          vec2 cell = floor(vec2(u / 3.2, vWP.y / 3.1)); vec2 f = fract(vec2(u / 3.2, vWP.y / 3.1));
          float win = step(0.28, f.x) * step(f.x, 0.72) * step(0.3, f.y) * step(f.y, 0.82) * step(1.2, vWP.y);
          float lit = step(0.42, h21(cell + vId * 7.13));
          float warm = h21(cell * 1.7 + vId);
          diffuseColor.rgb *= 1.0 - 0.45 * win;
          totalEmissiveRadiance += mix(vec3(1.0, 0.72, 0.42), vec3(1.0, 0.86, 0.66), warm) * win * lit * uNight * (0.7 + 0.6 * warm);
        }`);
    };
    const blocks = [];
    const inStreet = (x, z, w, d) => STREETS.some(([a, b, c, e]) => {
      const minx = Math.min(a, c) - 9, maxx = Math.max(a, c) + 9, minz = Math.min(b, e) - 9, maxz = Math.max(b, e) + 9;
      return x + w / 2 > minx && x - w / 2 < maxx && z + d / 2 > minz && z - d / 2 < maxz;
    });
    for (let gx = -260; gx < 760; gx += 26) for (let gz = -420; gz < 420; gz += 24) {
      const x = gx + (rand() - 0.5) * 6, z = gz + (rand() - 0.5) * 6, w = 14 + rand() * 9, d = 13 + rand() * 8;
      if (x + w / 2 > S.x0 - 30 && x - w / 2 < S.x1 + 30 && z + d / 2 > S.z0 - 40 && z - d / 2 < S.z1 + 30) continue;
      if (inStreet(x, z, w, d)) continue;
      const dist = Math.hypot(x - 260, z);
      const h = 8 + rand() * 10 + (dist > 220 ? 5 : 0) + (rand() < 0.07 ? 12 : 0);
      blocks.push([x, z, w, d, h]);
    }
    const im = new THREE.InstancedMesh(box, mat, blocks.length), M4 = new THREE.Matrix4(), col = new THREE.Color();
    blocks.forEach(([x, z, w, d, h], i) => {
      M4.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(w, h, d)); im.setMatrixAt(i, M4);
      im.setColorAt(i, col.setHSL(0.07 + rand() * 0.05, 0.18 + rand() * 0.2, 0.72 + rand() * 0.16));
    });
    im.castShadow = true; im.receiveShadow = true; this.group.add(im);
    // hills around the city with lights on their slopes (İzmit's hillside neighbourhoods)
    const hillMat = new THREE.MeshBasicMaterial({ color: 0x3a3a62, fog: true });
    const segs = 220, hp = [], R0 = 900;
    const hh = a => 70 + 55 * Math.sin(a * 3 + 1) + 30 * Math.sin(a * 7.3) + 14 * Math.sin(a * 17.1 + 2);
    for (let i = 0; i <= segs; i++) { const a = i / segs * Math.PI * 2, x = TX + 60 + Math.cos(a) * R0, z = Math.sin(a) * R0; hp.push(x, -5, z, x, hh(a), z); }
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3));
    const hi = []; for (let i = 0; i < segs; i++) { const a = i * 2; hi.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } hg.setIndex(hi);
    this.hills = new THREE.Mesh(hg, hillMat); this.hills.material.side = THREE.DoubleSide; this.group.add(this.hills);
    this.hillMat = hillMat;
    const NL = 2600, lp = new Float32Array(NL * 3), lc = new Float32Array(NL * 4), ls = new Float32Array(NL);
    for (let i = 0; i < NL; i++) {
      const a = rand() * Math.PI * 2, top = hh(a), y = rand() * top * 0.85, r = R0 - 4 - (top - y) * 0.2;
      lp.set([TX + 60 + Math.cos(a) * r, y, Math.sin(a) * r], i * 3); const w = rand(); lc.set([1, 0.72 + 0.2 * w, 0.42 + 0.3 * w, 0], i * 4); ls[i] = 1.2 + rand() * 1.6;
    }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lp, 3)); lg.setAttribute('aColor', new THREE.BufferAttribute(lc, 4)); lg.setAttribute('aSize', new THREE.BufferAttribute(ls, 1));
    this.hillLights = new THREE.Points(lg, pointsMaterial()); this.hillLights.frustumCulled = false; this.group.add(this.hillLights);
    this.hlc = lc; this.hlRand = Float32Array.from({ length: NL }, () => rand());
  }
  update(t, st, camera) {
    const night = smooth(37.2, 40.5, t);
    this.night.value = night * 1.4;
    this.hillMat.color.copy(st.hor).lerp(st.zen, 0.55).multiplyScalar(0.55);
    const c = this.hlc;
    for (let i = 0; i < this.hlRand.length; i++) c[i * 4 + 3] = clamp((night - this.hlRand[i] * 0.6) * 2.5) * 0.9;
    this.hillLights.geometry.attributes.aColor.needsUpdate = true;
    this.hillLights.material.uniforms.uScale.value = 1080 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  }
}

// ---------------------------------------------------------------- the lantern procession
// Each lantern walks in along a street and takes its place in the flag of light (or in "103").
export const NL = 10000;
export class Lanterns {
  constructor() {
    const rand = rng(2026);
    const F = FORM, G = F.G;
    // "103" mask
    const font = '500 400px "Bodoni"';
    const mc = document.createElement('canvas'), mg = mc.getContext('2d'); mg.font = font;
    const m = mg.measureText('103'), asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
    mc.width = Math.ceil(m.width) + 20; mc.height = Math.ceil(asc + desc) + 20; mg.font = font; mg.fillStyle = '#fff'; mg.fillText('103', 10, 10 + asc);
    const md = mg.getImageData(0, 0, mc.width, mc.height).data;
    const ns = F.num.h / asc, nw = m.width * ns;
    const numX0 = F.num.x - nw / 2, numZ0 = F.num.z - F.num.h / 2;
    const inNum = (x, z) => { const px = Math.round((x - numX0) / ns + 10), py = Math.round((z - numZ0) / ns + 10); return px >= 0 && py >= 0 && px < mc.width && py < mc.height && md[(py * mc.width + px) * 4 + 3] > 128; };
    this.numBox = [numX0, numX0 + nw];
    // flag field (in flag units p = ((x - x0)/G, -(z)/G)); white = sleeve or emblem
    const starSide = (px, py, R) => {
      const seg = 2 * Math.PI / 5; let a = Math.atan2(py, -px); a = ((a + seg / 2) % seg + seg) % seg - seg / 2;
      const L = Math.hypot(px, py), qx = L * Math.cos(a), qy = L * Math.abs(Math.sin(a)), r = R * 0.381966;
      const Ax = R, Ay = 0, Bx = r * Math.cos(seg / 2), By = r * Math.sin(seg / 2), ex = Bx - Ax, ey = By - Ay, wx = qx - Ax, wy = qy - Ay;
      return (ex * wy - ey * wx) / Math.hypot(ex, ey);
    };
    const emblem = (px, py) => {
      const outer = Math.hypot(px - FLAG.outer, py) - 0.25, inner = Math.hypot(px - FLAG.inner, py) - 0.2;
      const st = Math.max(-starSide(px - FLAG.starC, py, 0.125), Math.hypot(px - FLAG.starC, py) - 0.126);
      return Math.min(Math.max(outer, -inner), st) < 0;
    };
    const kind = (x, z) => {
      const px = (x - F.x0) / G, py = -z / G;
      if (px >= 0 && px <= 1.5 && Math.abs(py) <= 0.5) return px < FLAG.M || emblem(px, py) ? 1 : 0;   // 1 white, 0 red
      if (inNum(x, z)) return 2;                                                                          // 2 gold
      return -1;
    };
    // keep clear of the tower base and the flag pole
    const blocked = (x, z) => (Math.abs(x - TX) < 4.2 && Math.abs(z) < 4.2) || Math.hypot(x - POLE.x, z - POLE.z) < 1.6;
    // rejection-sample targets: white and gold denser than the red field
    const T3 = [], K = [];
    const bx0 = F.x0, bx1 = numX0 + nw, bz0 = -G / 2, bz1 = G / 2;
    while (T3.length < NL * 2) {
      const x = bx0 + rand() * (bx1 - bx0), z = bz0 + rand() * (bz1 - bz0), k = kind(x, z);
      if (k < 0 || blocked(x, z)) continue;
      if (k === 0 && rand() > 0.42) continue;
      T3.push(x, z); K.push(k);
    }
    this.kind = new Uint8Array(NL); this.tgt = new Float32Array(NL * 2);
    for (let i = 0; i < NL; i++) { this.tgt[i * 2] = T3[i * 2]; this.tgt[i * 2 + 1] = T3[i * 2 + 1]; this.kind[i] = K[i]; }
    // street for each lantern: nearest mouth, so rivers converge from all sides
    const mouths = STREETS.map(([a, b, c, d]) => ({ mx: a, mz: b, dx: (c - a) / Math.hypot(c - a, d - b), dz: (d - b) / Math.hypot(c - a, d - b) }));
    this.street = new Uint8Array(NL); this.lane = new Float32Array(NL); this.arrive = new Float32Array(NL); this.r = new Float32Array(NL * 3);
    for (let i = 0; i < NL; i++) {
      const x = this.tgt[i * 2], z = this.tgt[i * 2 + 1];
      let best = 0, bd = 1e9; mouths.forEach((mo, s) => { const d = Math.hypot(x - mo.mx, z - mo.mz) * (0.8 + 0.4 * rand()); if (d < bd) { bd = d; best = s; } });
      this.street[i] = best; this.lane[i] = (rand() - 0.5) * 12;
      this.r[i * 3] = rand(); this.r[i * 3 + 1] = rand(); this.r[i * 3 + 2] = rand();
      // the flag fills from its centre outward, then "103"
      const px = (x - F.x0) / G;
      const order = this.kind[i] === 2 ? 0.75 + 0.25 * rand() : Math.min(1, Math.hypot(px - 0.75, z / G) * 1.1) * 0.7 + rand() * 0.12;
      this.arrive[i] = T.lanterns + 2.0 + 1.5 * order;
    }
    this.mouths = mouths;
    this.pos = new Float32Array(NL * 3); this.col = new Float32Array(NL * 4); this.size = new Float32Array(NL);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4)); g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    this.mat = pointsMaterial();
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false;
  }
  update(t, camera) {
    const on = t > T.lanterns - 0.2;
    this.points.visible = on; if (!on) return;
    const V = 38;                      // walking speed of the river of light (stylised)
    const { pos, col, size, r } = this;
    const top = smooth(T.top - 0.6, T.top + 0.6, t);
    for (let i = 0; i < NL; i++) {
      const tx = this.tgt[i * 2], tz = this.tgt[i * 2 + 1], mo = this.mouths[this.street[i]];
      const mx = mo.mx + (mo.dz !== 0 ? this.lane[i] : 0), mz = mo.mz + (mo.dx !== 0 ? this.lane[i] : 0);
      // distance still to walk at time t; path: far street -> mouth -> target
      let d = Math.max(0, (this.arrive[i] - t) * V);
      const leg = Math.hypot(tx - mx, tz - mz);
      let x, z;
      if (d <= leg) { const u = d / leg; x = tx + (mx - tx) * u; z = tz + (mz - tz) * u; }
      else { const e = d - leg; x = mx + mo.dx * e; z = mz + mo.dz * e; }
      const walking = d > 0 ? 1 : 0, settle = clamp((t - this.arrive[i]) / 0.6);
      const sway = Math.sin(t * 2.6 + r[i * 3] * 40) * 0.25 * (1 - settle * 0.6);
      x += sway * 0.6; z += Math.cos(t * 2.1 + r[i * 3 + 1] * 30) * 0.2;
      const y = 2.0 + 0.08 * Math.sin(t * 5.2 + r[i * 3 + 2] * 50) * walking;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      // lights come on one by one along the streets
      const lightOn = smooth(T.lanterns + r[i * 3 + 1] * 0.9, T.lanterns + r[i * 3 + 1] * 0.9 + 0.3, t);
      const flick = 0.85 + 0.15 * Math.sin(t * (11 + r[i * 3] * 9) + r[i * 3 + 2] * 60);
      const k = this.kind[i];
      // walking: warm lanterns; in place: red field, white emblem, gold numerals
      let cr = 1, cg = 0.74, cb = 0.36;
      if (k === 0) { cr = 1; cg = lerp(0.74, 0.035, settle); cb = lerp(0.36, 0.03, settle); }
      if (k === 1) { cg = lerp(0.74, 0.95, settle); cb = lerp(0.36, 0.86, settle); }
      if (k === 2) { cg = 0.8; cb = 0.42; }
      col[i * 4] = cr; col[i * 4 + 1] = cg; col[i * 4 + 2] = cb;
      col[i * 4 + 3] = lightOn * flick * (k === 0 ? lerp(1, 0.62, settle) : 1.1);
      size[i] = lerp(0.42, k === 0 ? 1.15 : 1.35, top) * (0.85 + 0.3 * r[i * 3 + 2]);
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = g.attributes.aColor.needsUpdate = g.attributes.aSize.needsUpdate = true;
    this.mat.uniforms.uScale.value = 1080 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  }
}

// ---------------------------------------------------------------- the whole tower world
export class TowerWorld {
  constructor() {
    this.group = new THREE.Group();
    const tower = new Tower();
    this.tower = tower;
    tower.wire.visible = false; tower.ground.visible = false; tower.clip.constant = 1000;
    tower.group.children.filter(o => o.isHemisphereLight || o.isDirectionalLight).forEach(o => tower.group.remove(o));
    tower.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    // warm light behind the windows and the door at dusk
    tower.mats.wood.emissive = new THREE.Color(0xffa04a); tower.mats.wood.emissiveIntensity = 0;
    this.group.add(tower.group);
    this.city = new City(); this.group.add(this.city.group);
    this.flag = new FlagCloth(); this.group.add(this.flag.group);
    this.lanterns = new Lanterns(); this.group.add(this.lanterns.points);
  }
  update(t, st, camera) {
    const on = t >= T.dial - 0.1;
    this.group.visible = on; if (!on) return;
    const night = smooth(37.0, 40.0, t);
    this.tower.lights.forEach(l => { l.visible = night > 0.01; l.intensity = (l.isSpotLight ? 34 : l.userData.i0 || (l.userData.i0 = l.intensity)) * night * (l.isSpotLight ? 1 : 1); });
    this.tower.lights.forEach(l => { if (l.isSpotLight) l.intensity = 40 * night; });
    this.tower.mats.wood.emissiveIntensity = 0.15 + 0.5 * night;
    // the dial: 20:29 at rest, spins through 103 years
    const spin = ease.inOut(clamp((t - T.years0) / (T.years1 - T.years0)));
    this.tower.setTime(18 + 47 / 60 + spin * 103 * 0.25 + (t - T.dial) / 60);
    this.city.update(t, st, camera);
    this.flag.update(t, st);
    this.lanterns.update(t, camera);
  }
}
