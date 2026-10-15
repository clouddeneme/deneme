import * as THREE from 'three';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { clamp, lerp, smooth, ease, rng, wobble, pointInRing, textPoints } from '../src/util.js';
import { T, W } from './timeline.js';

// ---------------------------------------------------------------- the date, typed in the night sky
// Real 3D digits (IBM Plex Mono outlines, extruded) so the "0" stays crisp when the camera flies through it.
export class DateText {
  // center: world position; right: world direction of the text's +x (the text faces the viewer)
  constructor(center, right, fontData) {
    this.text = '29.10.1923';
    this.font = '400 150px "Plex Mono"';
    const font = new Font(fontData);
    const size = 0.5, sc = size / fontData.resolution;
    const adv = fontData.glyphs['0'].ha * sc;
    this.textW = adv * this.text.length;
    this.scale = this.textW / (this.text.length * 90);   // world units per canvas pixel at 150px (advance 0.6 em)
    const g0 = new TextGeometry('0', { font, size, depth: 0.03, curveSegments: 14, bevelEnabled: false });
    g0.computeBoundingBox(); this.capH = g0.boundingBox.max.y;
    this.mat = new THREE.MeshBasicMaterial({ color: 0xfff4e2, toneMapped: false, transparent: true });
    this.side = new THREE.MeshBasicMaterial({ color: 0xffb070, toneMapped: false, transparent: true });
    this.mesh = new THREE.Group();
    this.digits = [...this.text].map((ch, i) => {
      const g = new TextGeometry(ch, { font, size, depth: 0.03, curveSegments: 14, bevelEnabled: false });
      g.translate(-this.textW / 2 + i * adv, -this.capH / 2, -0.015);
      const m = new THREE.Mesh(g, [this.mat, this.side]); this.mesh.add(m); return m;
    });
    this.cursor = new THREE.Mesh(new THREE.BoxGeometry(adv * 0.58, this.capH * 1.18, 0.02), this.mat);
    this.mesh.add(this.cursor);
    this.mesh.position.set(...center);
    this.mesh.rotation.y = Math.atan2(-right[2], right[0]);
    this.center = new THREE.Vector3(...center);
    this.right = new THREE.Vector3(...right).normalize();
    this.adv = adv;
    this.zeroX = -this.textW / 2 + 4.5 * adv;            // the "0" of "10"
  }
  place(center) { this.mesh.position.copy(center); this.center.copy(center); }
  zero() { return this.center.clone().addScaledVector(this.right, this.zeroX); }
  update(t) {
    this.mesh.visible = t < T.burst + 0.02;
    if (!this.mesh.visible) return;
    const n = Math.max(0, Math.min(10, Math.floor((t - T.type0) / T.typeStep) + 1));
    const heat = smooth(T.heat, T.burst, t);
    this.digits.forEach((d, i) => { d.visible = i < n; const k = i < n ? Math.exp(-(t - (T.type0 + i * T.typeStep)) * 8) : 0; d.scale.setScalar(1 + 0.08 * k); });
    const blink = (Math.floor(t * 2.2) % 2 === 0 || (t > T.type0 && n < 10)) && t < T.heat;
    this.cursor.visible = blink;
    this.cursor.position.set(-this.textW / 2 + n * this.adv + this.adv * 0.4, 0, 0);
    this.mat.color.setRGB(1.6, lerp(1.5, 0.75, heat), lerp(1.3, 0.3, heat));
    this.side.color.setRGB(1.2, lerp(0.7, 0.35, heat), lerp(0.45, 0.1, heat));
    const o = 1 - smooth(T.burst - 0.12, T.burst, t);
    this.mat.opacity = this.side.opacity = o;
  }
}

// ---------------------------------------------------------------- embers: digits -> fall -> land -> flashes -> pulp
const VERT = /* glsl */`
attribute float aSize; attribute vec4 aColor; uniform float uScale; varying vec4 vColor;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
  float px = aSize * uScale / -mv.z; gl_PointSize = clamp(px, 1.0, 40.0); vColor = aColor; vColor.a *= clamp(px / 1.5, 0.0, 1.0) * smoothstep(0.04, 0.3, -mv.z); }`;
const FRAG = /* glsl */`varying vec4 vColor; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0;
  float a = exp(-r * r * 5.0) * vColor.a; if (a < 0.003) discard; gl_FragColor = vec4(vColor.rgb * a, a); }`;
export function pointsMaterial() {
  return new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uScale: { value: 1080 / (2 * Math.tan(THREE.MathUtils.degToRad(35) / 2)) } },
    transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
}

export const N = 22000;
export class Embers {
  constructor(geo, date, nip) {
    const rand = rng(1923);
    this.r = new Float32Array(N * 4); for (let i = 0; i < this.r.length; i++) this.r[i] = rand();
    this.start = new Float32Array(N * 3); this.target = new Float32Array(N * 3); this.tl = new Float32Array(N); this.light = new Float32Array(N);
    this.nip = nip;
    // start: glyph pixels of the date, on the date plane
    const tp = textPoints(date.text, date.font, N, rand);
    const c = date.center, R = date.right;
    for (let i = 0; i < N; i++) {
      const u = tp.pts[i * 2] * date.scale, v = tp.pts[i * 2 + 1] * date.scale;
      this.start[i * 3] = c.x + R.x * u; this.start[i * 3 + 1] = c.y + v; this.start[i * 3 + 2] = c.z + R.z * u;
    }
    // targets: points on Türkiye, sorted by distance from Kocaeli so the land fills outward
    const iz = geo.places['İzmit'], rings = geo.turkey;
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (const rr of rings) for (const [x, y] of rr) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
    const pts = [];
    while (pts.length < N) { const x = minx + rand() * (maxx - minx), y = miny + rand() * (maxy - miny); if (rings.some(rr => pointInRing(x, y, rr))) pts.push([x, y, Math.hypot(x - iz[0], y - iz[1])]); }
    pts.sort((a, b) => a[2] - b[2]);
    // particles sorted by distance from the zero, so the hero ember (index 0) lands on Kocaeli
    const z0 = date.zero();
    const dz = i => Math.hypot(this.start[i * 3] - z0.x, this.start[i * 3 + 1] - z0.y, this.start[i * 3 + 2] - z0.z);
    const order = [...Array(N).keys()].sort((a, b) => dz(a) - dz(b));
    const prov = geo.provinces;
    order.forEach((pi, k) => {
      const [x, y, d] = pts[k];
      const w = W(x, y, 0.04);
      this.target[pi * 3] = w[0]; this.target[pi * 3 + 1] = w[1]; this.target[pi * 3 + 2] = w[2];
      const front = 1 - Math.pow(Math.max(0, 1 - d / 14), 1 / 3);   // inverse of the reveal easing
      this.tl[pi] = T.land + 3.6 * front + (k === 0 ? 0 : 0.05 + this.r[pi * 4] * 0.25);
      let L = 0; for (const p of prov) { const dx = x - p.c[0], dy = y - p.c[1]; L += p.w * Math.exp(-(dx * dx + dy * dy) / 0.08); }
      this.light[pi] = Math.min(1, L / 2.5);
    });
    this.hero = order[0];
    this.tl[this.hero] = T.land;
    this.start.set([z0.x, z0.y, z0.z], this.hero * 3);
    const hw = W(iz[0], iz[1], 0.04); this.target.set(hw, this.hero * 3);

    this.pos = new Float32Array(N * 3); this.col = new Float32Array(N * 4); this.size = new Float32Array(N);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4)); g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    this.mat = pointsMaterial();
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false;
    this.heroPos = new THREE.Vector3();
  }
  // the hero ember is thrown forward out of the zero and falls on Kocaeli in a ballistic arc
  heroAt(t) {
    const p = this.hero * 3, S = this.start, G = this.target;
    const D = T.land - T.burst, tau = clamp(t - T.burst, 0, D), u = tau / D, vy = 0.5;
    const g = 2 * (S[p + 1] - G[p + 1] + vy * D) / (D * D);
    return [lerp(S[p], G[p], u), S[p + 1] + vy * tau - 0.5 * g * tau * tau, lerp(S[p + 2], G[p + 2], u)];
  }

  update(t) {
    const on = t > T.burst - 0.05 && t < T.web + 0.3;
    this.points.visible = on; if (!on) return;
    const { pos, col, size, r } = this;
    const day = smooth(T.sunrise, 10.5, t);
    for (let i = 0; i < N; i++) {
      const k = i * 4, p = i * 3;
      const sx = this.start[p], sy = this.start[p + 1], sz = this.start[p + 2];
      const tx = this.target[p], ty = this.target[p + 1], tz = this.target[p + 2];
      let x, y, z, a, s, cr = 1, cg = 0.62 + 0.25 * r[k + 1], cb = 0.25 + 0.2 * r[k + 1];
      const tl = this.tl[i];
      if (t < tl) {
        const tau = t - T.burst, u = clamp(tau / (tl - T.burst));
        const hero = i === this.hero;
        const ang = r[k] * 6.2832, pop = hero ? 0 : (1 - Math.exp(-tau * 5)) * (0.25 + r[k + 2] * 0.9);
        const px = sx + Math.cos(ang) * pop, py = sy + Math.sin(ang) * pop * 0.8, pz = sz + (r[k + 3] - 0.5) * pop;
        const fall = u * u;                                    // gravity-like
        const sw = hero ? 0 : Math.sin(u * Math.PI) * (0.4 + r[k + 1] * 0.8);
        const w = wobble(r[k] * 9, r[k + 1] * 9, r[k + 2] * 9, t * 1.3);
        x = lerp(px, tx, ease.inOut(u)) + w[0] * sw * 0.25;
        y = lerp(py, ty, fall) + w[1] * sw * 0.15;
        z = lerp(pz, tz, ease.inOut(u)) + w[2] * sw * 0.25;
        if (hero) [x, y, z] = this.heroAt(t);
        a = 0.6 * (0.6 + 0.4 * Math.sin(t * (9 + r[k + 3] * 7) + r[k] * 30)); s = 0.006 + r[k + 2] * 0.01;
        if (t < T.burst) a = 0;
      } else {
        x = tx; y = ty; z = tz;
        const since = t - tl;
        a = (Math.exp(-since * 3) * 1.0 + 0.3) * (1 - day * 0.92); s = 0.003 + r[k + 2] * 0.004 + 0.008 * Math.exp(-since * 4);
        cr = 1; cg = 0.8; cb = 0.5;
        // 1934: thousands of lights bloom across the country
        if (t > T.vote - 0.2 && t < T.vote + 2.6 && r[k + 3] < 0.3 + this.light[i] * 0.5) {
          const tf = T.vote + 0.15 + r[k + 1] * 1.7, f = Math.exp(-Math.pow((t - tf) / 0.32, 2));
          const red = r[k] < 0.3;
          cr = 1; cg = red ? 0.25 : 0.97; cb = red ? 0.25 : 0.92;
          a = Math.max(a, f * 1.2); s = 0.006 + f * 0.05; y += f * 0.04;
        }
        // pulp: particles around Kocaeli rise and spiral into the rollers
        if (t > T.machine - 0.2) {
          const d = Math.hypot(tx - this.nip.x, tz - this.nip.z);
          if (d < 1.8 && r[k + 2] < 0.6) {
            const st = T.machine + d * 0.45 + r[k] * 0.3, u = ease.inOut(clamp((t - st) / 1.0));
            const ang = Math.atan2(tz - this.nip.z, tx - this.nip.x) + u * 4.5;
            const rad = d * (1 - u);
            x = this.nip.x + Math.cos(ang) * rad; z = this.nip.z + Math.sin(ang) * rad;
            y = lerp(ty, this.nip.y, Math.pow(u, 0.7)) + Math.sin(u * Math.PI) * 0.12;
            cr = 1; cg = 0.95; cb = 0.85; a = Math.max(a, u > 0 ? 0.85 * (1 - smooth(0.92, 1, u)) : a); s = 0.012 + r[k + 1] * 0.012;
          } else if (t > T.machine + 0.6) a *= 1 - smooth(T.machine + 0.6, T.nip, t);
        }
      }
      if (i === this.hero && t < tl + 0.6) { s = 0.035; a = 1; cg = 0.75; cb = 0.4; this.heroPos.set(x, y, z); }
      pos[p] = x; pos[p + 1] = y; pos[p + 2] = z;
      col[k] = cr; col[k + 1] = cg; col[k + 2] = cb; col[k + 3] = a; size[i] = s;
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = g.attributes.aColor.needsUpdate = g.attributes.aSize.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- 1928: 3D letters rise along the flight corridor
const ABC = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
export async function buildLetters(path) {
  const json = await new Promise((res, rej) => new TTFLoader().load('../fonts/DMSerifDisplay-Regular.ttf', res, undefined, rej));
  const font = new Font(json);
  const mat = new THREE.MeshStandardMaterial({ color: 0xfffbf2, roughness: 0.35, metalness: 0.05, emissive: 0xffe2b0, emissiveIntensity: 0.12 });
  const group = new THREE.Group();
  const items = [];
  const [a, b] = path;            // corridor from a to b (world)
  const dir = new THREE.Vector3(b[0] - a[0], 0, b[2] - a[2]).normalize();
  const side = new THREE.Vector3(-dir.z, 0, dir.x);
  [...ABC].forEach((ch, i) => {
    const g = new TextGeometry(ch, { font, size: 0.16, depth: 0.03, curveSegments: 6, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 2 });
    g.computeBoundingBox(); const bb = g.boundingBox; g.translate(-(bb.max.x + bb.min.x) / 2, 0, -0.015);
    const m = new THREE.Mesh(g, mat); m.castShadow = true;
    const u = (i + 0.5) / ABC.length;
    const lr = i % 2 ? 1 : -1, off = 0.13 + (i % 4 < 2 ? 0.03 : 0.08);
    const base = new THREE.Vector3(lerp(a[0], b[0], u), 0, lerp(a[2], b[2], u)).addScaledVector(side, lr * off);
    const h = 0.16 + ((i * 7) % 5) * 0.06;
    m.lookAt(base.clone().sub(dir));          // face the oncoming camera
    group.add(m);
    items.push({ m, base, h, delay: -0.3 + u * 0.7 });
  });
  return {
    group,
    update(t) {
      group.visible = t > T.letters - 0.2 && t < T.rail + 1.0;
      for (const it of items) {
        const up = ease.out(clamp((t - (T.letters + it.delay)) / 0.7));
        it.m.position.set(it.base.x, -0.2 + (it.h + 0.2) * up + 0.02 * Math.sin(t * 2 + it.delay * 9), it.base.z);
        it.m.scale.setScalar(Math.max(0.001, up));
      }
    },
  };
}

// ---------------------------------------------------------------- light train on the main line
// A small locomotive of light with a steam trail; readable on the bright daytime map.
export class Train {
  constructor(world) {
    this.world = world;
    this.group = new THREE.Group();
    // a toy-scale steam locomotive and three wagons (length ~0.05 world units)
    const iron = new THREE.MeshStandardMaterial({ color: 0x1e1a18, roughness: 0.45, metalness: 0.4 });
    const red = new THREE.MeshStandardMaterial({ color: 0xb3121c, roughness: 0.5 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xc89a48, roughness: 0.35, metalness: 0.7 });
    const loco = new THREE.Group();
    const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.03, 16), iron); boiler.rotation.z = Math.PI / 2; boiler.position.set(0.004, 0.0105, 0);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.002, 16), brass); band.rotation.z = Math.PI / 2; band.position.set(0.012, 0.0105, 0);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.016, 0.0135), red); cab.position.set(-0.016, 0.0125, 0);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.0018, 0.0155), iron); roof.position.set(-0.016, 0.021, 0);
    const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0022, 0.009, 10), iron); chim.position.set(0.014, 0.019, 0);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.004, 0.011), iron); base.position.set(-0.002, 0.004, 0);
    this.lampMat = new THREE.MeshBasicMaterial({ color: 0xfff2c8, toneMapped: false });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.0026, 10, 8), this.lampMat); lamp.position.set(0.0195, 0.012, 0);
    loco.add(boiler, band, cab, roof, chim, base, lamp);
    loco.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.cars = [loco];
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.0125, 0.012), i === 0 ? iron : red); body.position.y = 0.0095;
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.031, 0.0016, 0.0132), iron); top.position.y = 0.0165;
      c.add(body, top); c.traverse(o => { if (o.isMesh) o.castShadow = true; });
      this.cars.push(c);
    }
    this.group.add(...this.cars);
    // steam: puffs released along the track behind the head, rising and spreading
    this.NP = 150;
    const g = new THREE.BufferGeometry();
    this.pp = new Float32Array(this.NP * 3); this.pc = new Float32Array(this.NP * 4); this.ps = new Float32Array(this.NP);
    g.setAttribute('position', new THREE.BufferAttribute(this.pp, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(this.pc, 4)); g.setAttribute('aSize', new THREE.BufferAttribute(this.ps, 1));
    // a lumpy puff texture, rotated per particle so no two puffs look alike
    const pc = document.createElement('canvas'); pc.width = pc.height = 128; const pg = pc.getContext('2d'); const pr = rng(7);
    for (let i = 0; i < 14; i++) { const x = 64 + (pr() - 0.5) * 50, y = 64 + (pr() - 0.5) * 50, r = 16 + pr() * 26;
      const gr = pg.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); pg.fillStyle = gr; pg.fillRect(0, 0, 128, 128); }
    this.smokeMat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 1500 }, uTex: { value: new THREE.CanvasTexture(pc) } }, transparent: true, depthWrite: false,
      vertexShader: 'attribute float aSize; attribute vec4 aColor; uniform float uScale; varying vec4 vC; varying float vR; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(aSize * uScale / -mv.z, 1.0, 200.0); vC = aColor; vR = fract(position.x * 91.7 + position.z * 37.3) * 6.2832; }',
      fragmentShader: 'uniform sampler2D uTex; varying vec4 vC; varying float vR; void main(){ vec2 d = gl_PointCoord - 0.5; float c = cos(vR), s = sin(vR); vec2 q = vec2(c * d.x - s * d.y, s * d.x + c * d.y) + 0.5; float a = texture2D(uTex, q).a * 1.6 * vC.a; if (a < 0.004) discard; gl_FragColor = vec4(vC.rgb * (0.92 - 0.12 * d.y), min(a, 1.0)); }',
    });
    this.smoke = new THREE.Points(g, this.smokeMat); this.smoke.frustumCulled = false;
    this.group.add(this.smoke);
    this.pos = new THREE.Vector3();
  }
  update(t) {
    const W_ = this.world, u = W_.trainProgress(t);
    this.group.visible = t > T.rail - 1.7 && t < T.vote + 1.6;
    if (!this.group.visible) return u;
    const [x, y] = W_.trainAt(u);
    this.pos.set(...W(x, y, 0.045));
    // place each car on the track behind the locomotive
    const L = W_.railLen[W_.railLen.length - 1];
    this.cars.forEach((c, i) => {
      const uc = Math.max(0, u - (i === 0 ? 0 : (0.036 + (i - 1) * 0.034)) / L);
      const [cx, cy] = W_.trainAt(uc), [dx, dy] = W_.trainAt(Math.min(1, uc + 0.004)), [bx, by] = W_.trainAt(Math.max(0, uc - 0.004));
      c.position.set(...W(cx, cy, 0.045));
      c.rotation.set(0, Math.atan2(dy - by, dx - bx), 0);
      c.visible = uc > 0.0005 || i === 0;
    });
    // puffs: puff k was released at time tk along the track
    const rate = 70;
    for (let k = 0; k < this.NP; k++) {
      const tk = Math.floor(t * rate) / rate - k / rate, age = t - tk;
      const uk = W_.trainProgress(tk), [px, py] = W_.trainAt(uk);
      const life = 1.9, f = clamp(age / life);
      const on = tk > T.rail - 1.6 && uk < 0.999 && f < 1;
      const seed = Math.sin((tk * rate) * 12.9898) * 43758.5453, rr = seed - Math.floor(seed);
      const rr2 = (rr * 7.31) % 1;
      this.pp[k * 3] = px + (rr - 0.5) * 0.035 * f; this.pp[k * 3 + 1] = 0.068 + 0.12 * Math.sqrt(f) + 0.012 * rr2 * f; this.pp[k * 3 + 2] = -py + 0.03 * f + (rr2 - 0.5) * 0.02 * f;
      const a = on ? Math.pow(1 - f, 1.6) * Math.min(1, age * 14) * 0.9 : 0;
      const gcol = 0.86 + 0.12 * rr2;
      this.pc.set([gcol, gcol, gcol * 0.99, a], k * 4);
      this.ps[k] = 0.012 + 0.07 * Math.sqrt(f) * (0.7 + 0.6 * rr);
    }
    const g = this.smoke.geometry; g.attributes.position.needsUpdate = g.attributes.aColor.needsUpdate = g.attributes.aSize.needsUpdate = true;
    return u;
  }
}
