import * as THREE from 'three';
import { T, TOWER_X } from './timeline.js';

// Türk Bayrağı, drawn analytically from the measurements in Law 2893 (G = flag width/height):
//   uçkurluk (white sleeve at the hoist)            M = 1/30 G
//   outer crescent centre from the sleeve           1/2 G
//   outer crescent circle diameter                  1/2 G
//   distance between inner and outer centres        0.0625 G
//   inner crescent circle diameter                  0.4 G
//   star circle from the inner crescent circle      1/3 G
//   star circle diameter                            1/4 G
//   length                                          1.5 G
// Colour: Türk kırmızısı #E30A17 (converted to linear light for the renderer).
export const FLAG = (() => {
  const M = 1 / 30;
  const outer = M + 0.5, inner = outer + 0.0625;
  const starC = (inner - 0.2) + 1 / 3 + 0.125;
  return { M, outer, rOuter: 0.25, inner, rInner: 0.2, starC, rStar: 0.125, L: 1.5 };
})();

const VERT = /* glsl */`
uniform float uTime, uG, uAmp;
varying vec2 vF;
varying vec3 vN;
varying vec3 vWorld;
varying float vH;
float h(vec2 p, float t) {
  // pinned along the sleeve, growing toward the fly end
  float k = pow(clamp(p.x / 1.5, 0.0, 1.0), 1.15);
  float fly = smoothstep(1.0, 1.5, p.x);
  float w = 0.080 * sin(p.x * 4.4 - t * 2.9 + p.y * 0.9)
          + 0.042 * sin(p.x * 8.9 - t * 4.6 - p.y * 1.7 + 1.3)
          + 0.020 * sin(p.x * 15.0 - t * 7.3 + p.y * 3.1 + 2.1) * k
          + 0.055 * sin(p.x * 2.1 - t * 1.5 + 0.4)
          + 0.012 * sin(p.x * 23.0 - t * 11.0 + p.y * 6.0) * fly
          + 0.006 * sin(p.x * 31.0 - t * 13.0 - p.y * 9.0 + 0.7) * fly;
  // the hoist is held at top and bottom: small scallops between the ties
  w += 0.006 * sin(p.y * 6.2832) * (1.0 - smoothstep(0.0, 0.12, p.x));
  return w * k * uAmp;
}
void main() {
  vec2 f = vec2(uv.x * 1.5, uv.y - 0.5);
  vF = f;
  float z = h(f, uTime);
  float e = 0.003;
  float dx = (h(f + vec2(e, 0.0), uTime) - z) / e;
  float dy = (h(f + vec2(0.0, e), uTime) - z) / e;
  vH = z;
  vec3 n = normalize(vec3(-dx, -dy, 1.0));
  // cloth takes up length in its folds and sags slightly at the fly end
  vec3 pos = vec3(f.x * uG * (1.0 - 0.02 * uAmp * f.x / 1.5), f.y * uG - f.x * f.x * 0.025 * uG * uAmp, z * uG);
  vec4 wp = modelMatrix * vec4(pos, 1.0);
  vWorld = wp.xyz;
  vN = normalize(mat3(modelMatrix) * n);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG = /* glsl */`
uniform float uFlash;
uniform vec3 uFlashColor;
uniform float uLit;
uniform float uTime;
varying vec2 vF;
varying vec3 vN;
varying vec3 vWorld;
varying float vH;
const float M = ${FLAG.M.toFixed(6)};
const float OUTER = ${FLAG.outer.toFixed(6)};
const float INNER = ${FLAG.inner.toFixed(6)};
const float STARC = ${FLAG.starC.toFixed(6)};
const float PI = 3.14159265359;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

float starSide(vec2 p, float R) {
  // five-pointed star with one point toward the hoist (-x); > 0 inside (signed distance to the edge)
  float seg = 2.0 * PI / 5.0;
  float a = atan(p.y, -p.x);
  a = mod(a + seg * 0.5, seg) - seg * 0.5;
  vec2 q = length(p) * vec2(cos(a), abs(sin(a)));
  float r = R * 0.381966;
  vec2 A = vec2(R, 0.0), B = vec2(r * cos(seg * 0.5), r * sin(seg * 0.5));
  vec2 ed = B - A, w = q - A;
  return (ed.x * w.y - ed.y * w.x) / length(ed);
}
// signed distance to the white emblem (crescent + star), < 0 inside
float emblem(vec2 p) {
  float outer = length(p - vec2(OUTER, 0.0)) - 0.25;
  float inner = length(p - vec2(INNER, 0.0)) - 0.20;
  float crescent = max(outer, -inner);
  float st = max(-starSide(p - vec2(STARC, 0.0), 0.125), length(p - vec2(STARC, 0.0)) - 0.126);
  return min(crescent, st);
}
// dashed stitch along a line at distance off inside an edge given by signed distance d; s runs along the edge
float stitch(float d, float off, float s, float aa) {
  float line = 1.0 - smoothstep(0.0012, 0.0012 + aa, abs(d + off));
  float dash = smoothstep(0.25, 0.35, fract(s * 160.0)) * (1.0 - smoothstep(0.75, 0.85, fract(s * 160.0)));
  return line * dash;
}
// small creases and fibre: bump height in flag units
float bump(vec2 p) {
  float creases = fbm(vec2(p.x * 9.0, p.y * 3.0) + 3.7) * 0.5 + fbm(vec2(p.x * 3.0 + p.y * 7.0, p.y * 2.0) * 3.0) * 0.25;
  float pull = (1.0 - smoothstep(0.0, 0.35, p.x)) * 0.35 * sin((p.x * 1.2 + abs(p.y) * 2.4) * 60.0) * (0.5 + 0.5 * fbm(p * 8.0));
  return (creases + pull) * 0.0016;
}
void main() {
  vec3 RED = vec3(0.7681, 0.0030, 0.0080);   // #E30A17 in linear light
  vec3 WHITE = vec3(0.74);
  vec2 p = vF;
  float d = emblem(p);
  float aa = max(fwidth(d), 1e-4);
  float wm = 1.0 - smoothstep(-aa, aa, d);
  float sleeve = 1.0 - smoothstep(M - aa, M + aa, p.x);
  vec3 base = mix(RED, WHITE, max(wm, sleeve));

  // fibre and dye variation
  float fib = fbm(p * vec2(220.0, 260.0));
  float faa = clamp(1.0 - fwidth(p.x) * 300.0, 0.0, 1.0);          // fade micro detail when it would alias
  base *= 0.97 + 0.06 * mix(0.5, fib, faa);
  base *= 0.985 + 0.03 * fbm(p * 6.0 + 9.0);

  // stitches: double hem on top, bottom and fly; sleeve seam; appliqué edge of the crescent and star
  float sw = 0.0;
  float edgeT = 0.5 - p.y, edgeB = p.y + 0.5, edgeF = 1.5 - p.x;
  sw += stitch(-edgeT, 0.010, p.x, aa) + stitch(-edgeT, 0.018, p.x + 0.003, aa);
  sw += stitch(-edgeB, 0.010, p.x, aa) + stitch(-edgeB, 0.018, p.x + 0.003, aa);
  sw += stitch(-edgeF, 0.010, p.y, aa) + stitch(-edgeF, 0.018, p.y + 0.003, aa);
  sw += stitch(p.x - M, 0.004, p.y, aa);
  float ang = atan(p.y, p.x - OUTER) * 0.25 + atan(p.y, p.x - STARC) * 0.125;
  sw += stitch(d, 0.0045, ang, aa) * 0.9;
  sw = clamp(sw, 0.0, 1.0) * faa;
  // hem: a double layer of cloth, slightly denser
  float hem = 1.0 - smoothstep(0.022, 0.024, min(min(edgeT, edgeB), edgeF));
  base *= 1.0 - 0.06 * hem;

  // ---- lighting with bump-mapped creases (screen-space derivatives)
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 dpx = dFdx(vWorld), dpy = dFdy(vWorld);
  float hb = bump(p) * 7.2 + sw * 0.0006;
  float dhx = dFdx(hb), dhy = dFdy(hb);
  vec3 r1 = cross(dpy, N), r2 = cross(N, dpx);
  float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
  N = normalize(abs(det) * N - grad);

  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L1 = normalize(vec3(0.25, -0.55, 0.8));    // warm floodlights below and in front
  vec3 L2 = normalize(vec3(-0.5, 0.7, 0.5));      // cool night sky
  vec3 L3 = normalize(vec3(0.1, 0.4, -0.9));      // fireworks behind the flag
  float k1 = max(dot(N, L1), 0.0), k2 = max(dot(N, L2), 0.0);
  float wrap1 = max((dot(N, L1) + 0.35) / 1.35, 0.0);          // cloth scatters light around its folds
  float through = max(dot(-N, L3), 0.0) * 0.6 + 0.4;
  float ao = 0.74 + 0.26 * smoothstep(-0.07, 0.07, vH);
  vec3 light = vec3(1.0, 0.86, 0.72) * (0.22 + 1.0 * mix(k1, wrap1, 0.5)) * uLit + vec3(0.42, 0.5, 0.75) * 0.3 * k2
             + uFlashColor * uFlash * 0.42 * (0.35 + 0.65 * through);
  // satin sheen along the threads (Kajiya-Kay), strongest on fold crests
  vec3 Tn = normalize(dpx - N * dot(N, dpx));
  vec3 H = normalize(L1 + V);
  float th = dot(Tn, H);
  float sheen = pow(sqrt(max(1.0 - th * th, 0.0)), 140.0) * 0.07 * uLit;
  float spec = pow(max(dot(reflect(-L1, N), V), 0.0), 24.0) * 0.08 * uLit;
  vec3 thread = mix(base * 0.72, vec3(0.86), 0.25);             // thread slightly darker than the cloth, catches light
  vec3 cloth = mix(base, thread, sw * 0.8);
  vec3 col = cloth * min(light, vec3(1.25)) * ao + (sheen + spec) * mix(vec3(1.0, 0.35, 0.33), vec3(1.0), max(wm, sleeve));
  gl_FragColor = vec4(min(col, vec3(0.78)), 1.0);
}`;

export class Flag {
  constructor() {
    this.group = new THREE.Group();
    this.G = 7.2;
    const G = this.G, poleH = 32;
    this.poleH = poleH;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { uTime: { value: 0 }, uG: { value: G }, uAmp: { value: 1.75 }, uFlash: { value: 0 }, uFlashColor: { value: new THREE.Color(1, 0.85, 0.75) }, uLit: { value: 1 } },
      side: THREE.DoubleSide, extensions: { derivatives: true },
    });
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 240, 160), this.mat);
    cloth.frustumCulled = false;
    cloth.position.set(0.12, poleH - 0.5 - G / 2, 0);
    this.cloth = cloth;
    const steel = new THREE.MeshStandardMaterial({ color: 0xd9dde3, metalness: 0.95, roughness: 0.22 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, poleH, 24), steel);
    pole.position.y = poleH / 2;
    const gold = new THREE.MeshStandardMaterial({ color: 0xd8b14a, metalness: 1, roughness: 0.2, emissive: 0x3a2a08 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 20), gold);
    ball.position.y = poleH + 0.2;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 24), gold);
    collar.position.y = poleH - 0.02;
    // halyard rings where the sleeve meets the pole
    this.group.add(cloth, pole, ball, collar);
    this.group.position.set(TOWER_X + 10.5, 0, -9);
    this.group.rotation.y = -0.35;
  }
  // world position of the cloth centre (for camera framing)
  centre() {
    const v = new THREE.Vector3(0.12 + 0.75 * this.G, this.poleH - 0.5 - this.G / 2, 0);
    this.group.updateMatrixWorld();
    return v.applyMatrix4(this.group.matrixWorld);
  }
  update(t, flash = 0) {
    this.group.visible = t > T.flag - 0.5 && t < T.quote + 0.1 || t > T.end - 0.2;
    this.mat.uniforms.uTime.value = t;
    this.mat.uniforms.uFlash.value = flash;
  }
}
