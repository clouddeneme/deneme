import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { clamp, smooth, ease, rng } from './util.js';
import { T, TOWER_X } from './timeline.js';
import { N } from './particles.js';

// İzmit Saat Kulesi (1902, project: Vedat Tek), modelled from photographs and written descriptions:
// a low square base (3.65 m) with arched fountain niches and marble columns, topped by a terrace
// with a brown balustrade; a cream shaft with corner pilasters in three storeys (arched door and
// round medallions, a tall arched window, the clock storey with Roman-numeral dials on all four
// faces under a row of small arched windows); a bracketed cornice and a flared, concave spire.

const STONE_BASE = 0xcfc6b5, CREAM = 0xe6d8b8, TRIM = 0xf1e9d6, MARBLE = 0xf2eee6, WOOD = 0x4a3020, ROOF = 0xa7acb0, RAIL = 0x5b3d29, BRONZE = 0x2a2420;

function flatArch(shape, w, h, rise, x0 = 0, y0 = 0) {
  shape.moveTo(x0 - w / 2, y0);
  shape.lineTo(x0 - w / 2, y0 + h - rise);
  shape.absellipse(x0, y0 + h - rise, w / 2, rise, Math.PI, 0, true);
  shape.lineTo(x0 + w / 2, y0);
  shape.lineTo(x0 - w / 2, y0);
  return shape;
}
function ogeeArch(shape, w, spring, apex, x0 = 0, y0 = 0) {
  const a = apex - spring;
  shape.moveTo(x0 - w / 2, y0);
  shape.lineTo(x0 - w / 2, y0 + spring);
  shape.bezierCurveTo(x0 - w / 2, y0 + spring + a * 0.55, x0 - w * 0.02, y0 + spring + a * 0.45, x0, y0 + apex);
  shape.bezierCurveTo(x0 + w * 0.02, y0 + spring + a * 0.45, x0 + w / 2, y0 + spring + a * 0.55, x0 + w / 2, y0 + spring);
  shape.lineTo(x0 + w / 2, y0);
  shape.lineTo(x0 - w / 2, y0);
  return shape;
}
function panelWithHole(w, h, hole) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0);
  s.holes.push(hole);
  return s;
}

function mirrorStoneTexture() {
  // Fountain mirror stone: crescent and star inside an arc, a wreath below.
  const c = document.createElement('canvas'); c.width = 256; c.height = 384;
  const g = c.getContext('2d');
  g.fillStyle = '#e4ddcf'; g.fillRect(0, 0, 256, 384);
  g.strokeStyle = '#b9b0a0'; g.lineWidth = 6; g.strokeRect(10, 10, 236, 364);
  g.beginPath(); g.arc(128, 150, 92, Math.PI, 0); g.stroke();
  g.fillStyle = '#a99f8f';
  g.beginPath(); g.arc(112, 130, 34, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e4ddcf'; g.beginPath(); g.arc(121, 130, 27, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#a99f8f'; star(g, 156, 130, 15, 6, -Math.PI);
  g.strokeStyle = '#a99f8f'; g.lineWidth = 5;
  for (const side of [-1, 1]) {
    g.beginPath(); g.ellipse(128 + side * 34, 250, 40, 22, side * 0.5, 0, Math.PI * 2); g.stroke();
  }
  g.beginPath(); g.moveTo(128, 232); g.lineTo(128, 300); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function star(g, cx, cy, R, r, rot) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + i * Math.PI / 5, rr = i % 2 ? R * 0.382 : R;
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath(); g.fill();
}
function dialTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(512, 512, 40, 512, 512, 512);
  grd.addColorStop(0, '#fffaf0'); grd.addColorStop(1, '#efe6d2');
  g.fillStyle = grd; g.beginPath(); g.arc(512, 512, 512, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#1c1a17';
  for (let i = 0; i < 60; i++) {
    const a = i / 60 * Math.PI * 2, big = i % 5 === 0;
    g.lineWidth = big ? 16 : 5;
    const r0 = big ? 420 : 446, r1 = 478;
    g.beginPath(); g.moveTo(512 + Math.sin(a) * r0, 512 - Math.cos(a) * r0); g.lineTo(512 + Math.sin(a) * r1, 512 - Math.cos(a) * r1); g.stroke();
  }
  g.lineWidth = 4; g.beginPath(); g.arc(512, 512, 488, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(512, 512, 300, 0, Math.PI * 2); g.lineWidth = 2; g.stroke();
  const ROMAN = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  g.fillStyle = '#1c1a17'; g.font = '600 92px "Bodoni"'; g.textAlign = 'center'; g.textBaseline = 'middle';
  ROMAN.forEach((r, i) => {
    const a = i / 12 * Math.PI * 2;
    g.save(); g.translate(512 + Math.sin(a) * 345, 512 - Math.cos(a) * 345); g.rotate(a);
    g.scale(0.78, 1); g.fillText(r, 0, 4); g.restore();
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export class Tower {
  constructor() {
    this.group = new THREE.Group();
    this.group.position.set(TOWER_X, 0, 0);
    this.meshes = [];
    this.clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.0, clippingPlanes: [this.clip], ...extra });
    this.mats = { base: mat(STONE_BASE), cream: mat(CREAM), trim: mat(TRIM, { roughness: 0.7 }), marble: mat(MARBLE, { roughness: 0.5 }),
      roof: mat(ROOF, { roughness: 0.55, metalness: 0.1 }), wood: mat(WOOD, { roughness: 0.75 }), rail: mat(RAIL, { roughness: 0.6, metalness: 0.2 }),
      dark: mat(0x15100c, { roughness: 1 }), bronze: mat(BRONZE, { roughness: 0.4, metalness: 0.6 }), gold: mat(0xc9a14a, { roughness: 0.3, metalness: 0.9 }),
      mirror: mat(0xffffff, { map: mirrorStoneTexture(), roughness: 0.6 }) };
    this.build();
    this.buildGround();
    this.buildLights();
    this.group.updateMatrixWorld(true);
    this.buildWire();
  }

  add(geo, m, x, y, z, ry = 0, sample = true) {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z); mesh.rotation.y = ry;
    this.group.add(mesh);
    if (sample) this.meshes.push(mesh);
    return mesh;
  }
  box(w, h, d, m, x, y, z) { return this.add(new THREE.BoxGeometry(w, h, d), m, x, y + h / 2, z); }

  build() {
    const M = this.mats;
    const face = (ry, fn) => { const g = new THREE.Group(); g.rotation.y = ry; this.group.add(g); fn((geo, m, x, y, z) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); g.add(mesh); this.meshes.push(mesh); return mesh; }); };
    const FACES = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

    // ---- base (kaide) with fountains on three faces, terrace and balustrade on top
    this.box(4.3, 0.22, 4.3, M.base, 0, 0, 0);
    this.box(3.65, 2.98, 3.65, M.base, 0, 0.22, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * 1.7, z = sz * 1.7;
      this.add(new THREE.CylinderGeometry(0.14, 0.15, 2.5, 20), M.marble, x, 0.22 + 0.2 + 1.25, z);
      this.box(0.38, 0.2, 0.38, M.marble, x, 0.22, z);
      this.box(0.4, 0.2, 0.4, M.marble, x, 0.22 + 0.2 + 2.5, z);
    }
    for (const ry of [0, -Math.PI / 2, Math.PI / 2]) face(ry, put => {
      const hole = flatArch(new THREE.Path(), 1.5, 2.2, 0.3, 0, 0);
      put(new THREE.ExtrudeGeometry(panelWithHole(2.3, 2.6, hole), { depth: 0.12, bevelEnabled: false }), M.marble, 0, 0.42, 1.825);
      put(new THREE.ShapeGeometry(flatArch(new THREE.Shape(), 1.5, 2.2, 0.3)), M.base, 0, 0.42, 1.83);
      put(new THREE.PlaneGeometry(0.72, 1.05), M.mirror, 0, 1.75, 1.84);
      put(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 8).rotateX(Math.PI / 2), M.bronze, 0, 1.05, 1.93);
      put(new THREE.BoxGeometry(1.3, 0.4, 0.5), M.marble, 0, 0.42 + 0.2, 1.825 + 0.25);
      for (const sx of [-1, 1]) put(new THREE.CylinderGeometry(0.08, 0.08, 2.0, 16), M.marble, sx * 0.88, 0.42 + 1.0, 1.97);
    });
    this.box(1.0, 2.2, 0.06, M.wood, 0, 0.22, -1.83);
    this.box(3.95, 0.22, 3.95, M.trim, 0, 3.2, 0);
    // balustrade around the terrace
    const RY = 3.42, RH = 0.92, E = 1.86;
    for (const ry of FACES) face(ry, put => {
      put(new THREE.BoxGeometry(3.8, 0.08, 0.1), M.rail, 0, RY + RH, E);
      put(new THREE.BoxGeometry(3.8, 0.06, 0.08), M.rail, 0, RY + 0.08, E);
      put(new THREE.BoxGeometry(3.8, 0.04, 0.05), M.rail, 0, RY + RH * 0.62, E);
      for (let k = -9; k <= 9; k++) put(new THREE.CylinderGeometry(0.022, 0.022, RH, 6), M.rail, k * 0.2, RY + RH / 2, E).userData.noWire = true;
      for (const px of [-1.86, 0, 1.86]) put(new THREE.BoxGeometry(0.13, RH + 0.1, 0.13), M.rail, px, RY + RH / 2, E);
    });

    // ---- shaft
    const W = 2.3, Hh = W / 2, S0 = 3.42;
    this.box(W, 8.0, W, M.cream, 0, S0, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.box(0.3, 8.0, 0.3, M.trim, sx * (Hh - 0.1), S0, sz * (Hh - 0.1));
    // storey 1: arched door (front), arched windows, round medallions, corner consoles
    for (const ry of FACES) face(ry, put => {
      const front = ry === 0;
      const w = front ? 0.95 : 0.7, h = front ? 2.15 : 1.6, y0 = front ? S0 + 0.02 : S0 + 0.55;
      put(new THREE.ShapeGeometry(flatArch(new THREE.Shape(), w + 0.24, h + 0.14, (w + 0.24) / 2)), M.trim, 0, y0, Hh + 0.005);
      put(new THREE.ShapeGeometry(flatArch(new THREE.Shape(), w, h, w / 2)), M.wood, 0, y0, Hh + 0.012);
      const ring = put(new THREE.TorusGeometry(0.27, 0.045, 10, 40), M.trim, 0, S0 + 2.62, Hh + 0.03);
      put(new THREE.CircleGeometry(0.23, 40), M.marble, 0, S0 + 2.62, Hh + 0.01);
    });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const c = this.add(new THREE.ConeGeometry(0.2, 0.55, 4), M.marble, sx * (Hh + 0.02), S0 + 2.95, sz * (Hh + 0.02));
      c.rotation.y = Math.PI / 4;
      this.add(new THREE.SphereGeometry(0.1, 12, 10), M.marble, sx * (Hh + 0.02), S0 + 3.3, sz * (Hh + 0.02));
    }
    this.box(2.62, 0.22, 2.62, M.trim, 0, S0 + 3.1, 0);
    this.box(2.44, 0.28, 2.44, M.cream, 0, S0 + 3.32, 0);
    this.box(2.56, 0.08, 2.56, M.trim, 0, S0 + 3.6, 0);
    // storey 2: tall arched window
    for (const ry of FACES) face(ry, put => {
      put(new THREE.ShapeGeometry(flatArch(new THREE.Shape(), 0.72, 1.68, 0.36)), M.trim, 0, S0 + 4.12, Hh + 0.005);
      put(new THREE.ShapeGeometry(flatArch(new THREE.Shape(), 0.5, 1.52, 0.25)), M.wood, 0, S0 + 4.2, Hh + 0.012);
      put(new THREE.BoxGeometry(0.78, 0.07, 0.12), M.trim, 0, S0 + 4.1, Hh + 0.05);
    });
    this.box(2.56, 0.16, 2.56, M.trim, 0, S0 + 6.0, 0);
    // storey 3: clocks with a row of small arched windows above
    this.hands = [];
    const dialTex = dialTexture();
    const dialMat = new THREE.MeshStandardMaterial({ map: dialTex, emissive: 0xfff2d6, emissiveMap: dialTex, emissiveIntensity: 0.32, roughness: 0.5, clippingPlanes: [this.clip] });
    this.dialY = S0 + 6.62;
    for (let f = 0; f < 4; f++) {
      const ry = f * Math.PI / 2;
      const g = new THREE.Group(); g.rotation.y = ry; g.position.y = this.dialY; this.group.add(g);
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.4, 64), dialMat); d.position.z = Hh + 0.03; g.add(d); this.meshes.push(d);
      const bez = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.04, 12, 64), this.mats.bronze); bez.position.z = Hh + 0.03; g.add(bez); this.meshes.push(bez);
      const hourPivot = new THREE.Group(), minPivot = new THREE.Group();
      hourPivot.position.z = minPivot.position.z = Hh + 0.06;
      const hm = new THREE.MeshStandardMaterial({ color: 0x15120e, roughness: 0.5, metalness: 0.4, clippingPlanes: [this.clip] });
      const hh = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.21, 0.012), hm); hh.position.y = 0.08; hourPivot.add(hh);
      const mh = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.32, 0.012), hm); mh.position.y = 0.13; minPivot.add(mh);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 16).rotateX(Math.PI / 2), this.mats.bronze); cap.position.z = Hh + 0.075;
      g.add(hourPivot, minPivot, cap);
      this.hands.push([hourPivot, minPivot]);
    }
    for (const ry of FACES) face(ry, put => {
      for (const x of [-0.48, 0, 0.48]) {
        put(new THREE.ShapeGeometry(flatArch(new THREE.Shape(), 0.3, 0.6, 0.15)), M.trim, x, S0 + 7.22, Hh + 0.005);
        put(new THREE.ShapeGeometry(flatArch(new THREE.Shape(), 0.2, 0.5, 0.1)), M.wood, x, S0 + 7.26, Hh + 0.012);
      }
    });
    // cornice with brackets
    const C0 = S0 + 8.0;
    this.box(2.62, 0.12, 2.62, M.trim, 0, C0, 0);
    for (const ry of FACES) face(ry, put => { for (let k = -4; k <= 4; k++) put(new THREE.BoxGeometry(0.1, 0.16, 0.2), M.trim, k * 0.29, C0 + 0.2, Hh + 0.12); });
    this.box(3.0, 0.2, 3.0, M.trim, 0, C0 + 0.28, 0);
    // flared concave spire (square in plan), lead-grey
    const R0 = 2.3, RH0 = 3.75;
    const prof = [new THREE.Vector2(0.001, RH0)];
    for (let i = 12; i >= 0; i--) { const u = i / 12; prof.push(new THREE.Vector2(0.05 + R0 * Math.pow(1 - u, 2.7) * (1 - u * 0.08), u * RH0)); }
    prof.push(new THREE.Vector2(R0 * 0.98, -0.06));
    const spire = new THREE.LatheGeometry(prof.reverse(), 4); spire.rotateY(Math.PI / 4);
    this.add(spire, M.roof, 0, C0 + 0.5, 0);
    const top = C0 + 0.5 + RH0;
    this.add(new THREE.CylinderGeometry(0.03, 0.05, 0.4, 10), M.roof, 0, top + 0.18, 0);
    this.add(new THREE.SphereGeometry(0.075, 16, 12), M.gold, 0, top + 0.4, 0);
    this.add(new THREE.ConeGeometry(0.03, 0.22, 10), M.gold, 0, top + 0.56, 0);
    this.height = top + 0.67;
  }

  buildGround() {
    const g = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.MeshStandardMaterial({ color: 0x24211f, roughness: 0.95 }));
    g.rotation.x = -Math.PI / 2; g.position.y = -0.001; this.group.add(g);
    this.ground = g;
  }

  buildLights() {
    const G = this.group;
    this.lights = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const s = new THREE.SpotLight(0xffc98f, 34, 40, 0.55, 0.65, 1.4);
      s.position.set(sx * 3.6, 0.2, sz * 3.6);
      s.target.position.set(0, 10, 0);
      G.add(s, s.target);
      this.lights.push(s);
    }
    const fill = new THREE.PointLight(0xffd6a8, 5, 18, 1.5); fill.position.set(0, 4.4, 2.6); G.add(fill); this.lights.push(fill);
    const roofLight = new THREE.PointLight(0xffd2a0, 9, 14, 1.6); roofLight.position.set(1.2, 12.8, 4.2); G.add(roofLight); this.lights.push(roofLight);
    const hemi = new THREE.HemisphereLight(0x3a4c7a, 0x1a140f, 0.5); G.add(hemi); this.hemi = hemi;
    const moon = new THREE.DirectionalLight(0x9fb4ff, 0.35); moon.position.set(-20, 30, -10); moon.target.position.set(0, 0, 0); G.add(moon, moon.target);
  }

  buildWire() {
    // All feature edges, in group space, drawn by a height-revealed line shader.
    const pos = [];
    const v = new THREE.Vector3();
    const inv = new THREE.Matrix4().copy(this.group.matrixWorld).invert();
    for (const m of this.meshes) {
      if (m.userData.noWire) continue;
      const eg = new THREE.EdgesGeometry(m.geometry, 28);
      const mat = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
      const a = eg.attributes.position;
      for (let i = 0; i < a.count; i++) { v.fromBufferAttribute(a, i).applyMatrix4(mat); pos.push(v.x, v.y, v.z); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.wireMat = new THREE.ShaderMaterial({
      uniforms: { uReveal: { value: -1 }, uAlpha: { value: 1 } },
      vertexShader: `varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uReveal; uniform float uAlpha; varying float vY;
        void main(){ float vis = smoothstep(uReveal + 0.05, uReveal - 0.25, vY); float head = exp(-pow((vY - uReveal) / 0.35, 2.0));
          vec3 c = mix(vec3(1.0, 0.78, 0.45), vec3(1.0, 0.97, 0.9), head); gl_FragColor = vec4(c * (vis * 0.7 + head * 0.7) * uAlpha, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.wire = new THREE.LineSegments(g, this.wireMat);
    this.group.add(this.wire);
  }

  // N surface points (group space -> world space) for the particles, plus their heights.
  samplePoints() {
    const rand = rng(1902);
    const areas = this.meshes.map(m => { const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry; let a = 0; const p = g.attributes.position, A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(); for (let i = 0; i < p.count; i += 3) { A.fromBufferAttribute(p, i); B.fromBufferAttribute(p, i + 1); C.fromBufferAttribute(p, i + 2); a += B.sub(A).cross(C.sub(A)).length() / 2; } return Math.sqrt(a + 0.02); });
    const total = areas.reduce((s, a) => s + a, 0);
    const pts = new Float32Array(N * 3), hs = new Float32Array(N);
    const v = new THREE.Vector3();
    let idx = 0;
    this.meshes.forEach((m, mi) => {
      const count = mi === this.meshes.length - 1 ? N - idx : Math.round(N * areas[mi] / total);
      const s = new MeshSurfaceSampler(m).setRandomGenerator(rand).build();
      for (let k = 0; k < count && idx < N; k++, idx++) {
        s.sample(v); v.applyMatrix4(m.matrixWorld);
        pts[idx * 3] = v.x; pts[idx * 3 + 1] = v.y; pts[idx * 3 + 2] = v.z; hs[idx] = v.y;
      }
    });
    return { pts, hs };
  }

  setTime(clockHours) {
    // clockHours: time shown on the dials, in hours (can grow past 12 for spinning)
    for (const [h, m] of this.hands) {
      h.rotation.z = -(clockHours % 12) / 12 * Math.PI * 2;
      m.rotation.z = -((clockHours * 60) % 60) / 60 * Math.PI * 2;
    }
  }

  update(t) {
    const on = t > T.tower - 0.1 && t < T.quote + 0.1 || t > T.end - 0.2;
    this.group.visible = on;
    if (!on) return;
    // wireframe draws bottom -> top, stone fills in behind it
    const draw = 16.7 * ease.inOut(clamp((t - (T.tower + 0.4)) / 4.2));
    this.wireMat.uniforms.uReveal.value = draw;
    this.wireMat.uniforms.uAlpha.value = 1 - smooth(47.0, 48.5, t) * 0.92;
    const stone = 16.8 * ease.inOut(clamp((t - (T.tower + 3.0)) / 3.6));
    this.clip.constant = stone;
    this.lights.forEach(l => { l.visible = stone > 0.5; });
    this.ground.visible = true;
    // clock: shows 20:29 at rest; spins through 103 years on the dial
    const spin = ease.inOut(clamp((t - T.years0) / (T.years1 - T.years0)));
    this.setTime(20 + 29 / 60 + spin * 8 + (t - T.tower) / 3600);
  }
}
