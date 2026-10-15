import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { clamp, smooth, ease, rng } from '../src/util.js';
import { T, W } from './timeline.js';

// The map world: sea, neighbours, Türkiye (revealed outward from Kocaeli), coastlines, railways,
// and the Kocaeli block that rises for the paper machine. Map lies on XZ, north = -z.

function noiseCanvas(size, seed, octaves = 5, base = '#808080') {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); const rand = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  for (let o = 0; o < octaves; o++) {
    const n = 40 * (o + 1) * (o + 1), r = size / (3 + o * 3);
    for (let i = 0; i < n; i++) {
      const x = rand() * size, y = rand() * size, rr = r * (0.4 + rand());
      const v = rand() > 0.5 ? 255 : 0;
      for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
        const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rr);
        gr.addColorStop(0, `rgba(${v},${v},${v},${0.06 / (o + 1)})`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
        g.fillStyle = gr; g.fillRect(x + dx - rr, y + dy - rr, rr * 2, rr * 2);
      }
    }
  }
  return c;
}
function normalFromHeight(src, strength) {
  const s = src.width, g = src.getContext('2d'), h = g.getImageData(0, 0, s, s).data;
  const c = document.createElement('canvas'); c.width = c.height = s;
  const o = c.getContext('2d'), img = o.createImageData(s, s);
  const H = (x, y) => h[(((y + s) % s) * s + ((x + s) % s)) * 4] / 255;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * s + x) * 4;
    img.data[i] = (-dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  o.putImageData(img, 0, 0); return c;
}
// value noise / fbm for the baked terrain
function vnoise(seed) {
  const h = (i, j) => { let n = (i * 374761393 + j * 668265263 + seed * 2147483647) | 0; n = (n ^ (n >>> 13)) * 1274126177 | 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  return (x, y) => {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = h(i, j), b = h(i + 1, j), c = h(i, j + 1), d = h(i + 1, j + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
export function terrainCanvas(box, Wc = 1536, Hc = 768) {
  const n = vnoise(29), [X0, Y0, X1, Y1] = box;
  const fbm = (x, y) => { let s = 0, a = 0.5, f = 1; for (let o = 0; o < 6; o++) { s += a * n(x * f, y * f); f *= 2.03; a *= 0.5; } return s; };
  const ridge = (x, y) => { let s = 0, a = 0.5, f = 1; for (let o = 0; o < 5; o++) { s += a * (1 - Math.abs(2 * n(x * f + 7.1, y * f - 3.3) - 1)); f *= 2.1; a *= 0.5; } return s; };
  const H = new Float32Array(Wc * Hc);
  for (let py = 0; py < Hc; py++) for (let px = 0; px < Wc; px++) {
    const x = X0 + (px / Wc) * (X1 - X0), y = Y1 - (py / Hc) * (Y1 - Y0);
    // Pontic and Taurus belts, eastern highlands, central plateau
    const pontic = Math.exp(-Math.pow((y - (1.75 + 0.08 * x)) / 0.45, 2)) * smooth(-4.5, -2.5, x);
    const taurus = Math.exp(-Math.pow((y - (-1.55 + 0.12 * Math.sin(x * 0.7))) / 0.45, 2)) * smooth(-4.0, -2.0, x) * (1 - smooth(3.0, 5.0, x) * 0.4);
    const east = smooth(1.5, 5.0, x);
    const m = Math.min(1, pontic + taurus + east * 0.8);
    H[py * Wc + px] = 0.35 * fbm(x * 1.6, y * 1.6) + m * 0.75 * ridge(x * 1.3, y * 1.3);
  }
  const c = document.createElement('canvas'); c.width = Wc; c.height = Hc;
  const g = c.getContext('2d'), img = g.createImageData(Wc, Hc), D = img.data;
  const low = [176, 178, 118], mid = [232, 198, 132], high = [190, 156, 118], dry = [236, 210, 150];
  const lx = -0.55, ly = 0.6, lz = 0.58;                 // light from the north-west, high
  const k = 14;
  for (let py = 0; py < Hc; py++) for (let px = 0; px < Wc; px++) {
    const i = py * Wc + px, h = H[i];
    const dx = (H[py * Wc + Math.min(Wc - 1, px + 1)] - H[py * Wc + Math.max(0, px - 1)]) * k;
    const dy = (H[Math.max(0, py - 1) * Wc + px] - H[Math.min(Hc - 1, py + 1) * Wc + px]) * k;
    const nl = Math.hypot(dx, dy, 1), sh = Math.max(0, (-dx * lx - dy * ly + lz) / nl);
    const x = X0 + (px / Wc) * (X1 - X0), y = Y1 - (py / Hc) * (Y1 - Y0);
    const coast = Math.max(smooth(1.6, 2.3, y), smooth(-1.4, -2.3, y), smooth(-5.0, -6.2, x));   // greener near the seas
    const centre = Math.exp(-Math.pow((x + 0.6) / 1.6, 2) - Math.pow((y - 0.2) / 0.9, 2));       // drier plateau
    let col = mid.map((v, j) => v + (high[j] - v) * Math.min(1, Math.max(0, h * 1.6 - 0.45)));
    col = col.map((v, j) => v + (low[j] - v) * coast * 0.55);
    col = col.map((v, j) => v + (dry[j] - v) * centre * 0.6);
    const shade = 0.72 + 0.42 * sh;
    D[i * 4] = Math.min(255, col[0] * shade); D[i * 4 + 1] = Math.min(255, col[1] * shade); D[i * 4 + 2] = Math.min(255, col[2] * shade); D[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function shapeOf(ring) {
  const s = new THREE.Shape(); ring.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); return s;
}
// update a Line2's per-vertex colours in place (LineGeometry.setColors would allocate new buffers)
function setLineColors(l, c) {
  const a = l.geometry.attributes.instanceColorStart;
  if (!a) { l.geometry.setColors(c); return; }
  const arr = a.data.array;
  for (let i = 0, j = 0; i + 5 < c.length; i += 3, j += 6) { arr[j] = c[i]; arr[j + 1] = c[i + 1]; arr[j + 2] = c[i + 2]; arr[j + 3] = c[i + 3]; arr[j + 4] = c[i + 4]; arr[j + 5] = c[i + 5]; }
  a.data.needsUpdate = true;
}
function line(points3, color, width, opacity = 1, worldUnits = false) {
  const g = new LineGeometry(); g.setPositions(points3.flat());
  const m = new LineMaterial({ color, linewidth: width, transparent: true, opacity, depthWrite: false, worldUnits });
  m.resolution.set(1920, 1080);
  const l = new Line2(g, m); l.computeLineDistances(); l.frustumCulled = false; l.userData.n = points3.length - 1;
  return l;
}

// monotone cubic interpolation (Fritsch-Carlson) through [t, v] points, flat at both ends
export function monotone(P) {
  const n = P.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((P[i + 1][1] - P[i][1]) / (P[i + 1][0] - P[i][0]));
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : 3 * (P[i + 1][0] - P[i - 1][0]) / ((2 * P[i + 1][0] - P[i][0] - P[i - 1][0]) / d[i - 1] + (P[i + 1][0] - 2 * P[i - 1][0] + P[i][0]) / d[i]) ;
  return t => {
    if (t <= P[0][0]) return P[0][1]; if (t >= P[n - 1][0]) return P[n - 1][1];
    let i = 0; while (P[i + 1][0] < t) i++;
    const h = P[i + 1][0] - P[i][0], u = (t - P[i][0]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * P[i][1] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * P[i + 1][1] + (u3 - u2) * h * m[i + 1];
  };
}

export class MapWorld {
  constructor(geo) {
    this.geo = geo;
    this.group = new THREE.Group();
    const iz = geo.places['İzmit'];
    this.kocC = new THREE.Vector2(iz[0], -iz[1]);

    // ---- textures: land grain + relief
    const hc = noiseCanvas(512, 7);
    const landTex = new THREE.CanvasTexture(noiseCanvas(512, 7, 4, '#e6e6e6')); landTex.wrapS = landTex.wrapT = THREE.RepeatWrapping; landTex.repeat.set(0.35, 0.35);
    const landNrm = new THREE.CanvasTexture(normalFromHeight(hc, 6)); landNrm.wrapS = landNrm.wrapT = THREE.RepeatWrapping; landNrm.repeat.set(0.35, 0.35);
    const seaNrm = new THREE.CanvasTexture(normalFromHeight(noiseCanvas(512, 11, 4), 3)); seaNrm.wrapS = seaNrm.wrapT = THREE.RepeatWrapping; seaNrm.repeat.set(6, 6);

    // ---- sea
    this.seaMat = new THREE.MeshStandardMaterial({ color: 0x3f7fb8, roughness: 0.32, metalness: 0.0, normalMap: seaNrm, normalScale: new THREE.Vector2(0.35, 0.35) });
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), this.seaMat);
    sea.rotation.x = -Math.PI / 2; sea.position.y = -0.004; sea.receiveShadow = true;
    this.group.add(sea); this.sea = sea;

    // ---- neighbours: pale land
    this.neighMat = new THREE.MeshStandardMaterial({ color: 0xd8c8a4, roughness: 0.95, map: landTex, normalMap: landNrm, normalScale: new THREE.Vector2(0.5, 0.5) });
    for (const ring of geo.neighbours) {
      const m = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(ring)), this.neighMat);
      m.rotation.x = -Math.PI / 2; m.receiveShadow = true; this.group.add(m);
    }

    // ---- Türkiye: revealed outward from Kocaeli (shader reveal with a glowing front)
    this.reveal = { value: 0 };
    let X0 = 1e9, Y0 = 1e9, X1 = -1e9, Y1 = -1e9;
    for (const r of geo.turkey) for (const [x, y] of r) { X0 = Math.min(X0, x); X1 = Math.max(X1, x); Y0 = Math.min(Y0, y); Y1 = Math.max(Y1, y); }
    X0 -= 0.3; Y0 -= 0.3; X1 += 0.3; Y1 += 0.3;
    const terr = new THREE.CanvasTexture(terrainCanvas([X0, Y0, X1, Y1]));
    terr.colorSpace = THREE.SRGBColorSpace; terr.anisotropy = 8;
    terr.repeat.set(1 / (X1 - X0), 1 / (Y1 - Y0)); terr.offset.set(-X0 / (X1 - X0), -Y0 / (Y1 - Y0));
    this.landMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, map: terr, normalMap: landNrm, normalScale: new THREE.Vector2(0.2, 0.2) });
    this.landMat.onBeforeCompile = sh => {
      sh.uniforms.uReveal = this.reveal; sh.uniforms.uCenter = { value: this.kocC };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRP;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vRP;\nuniform float uReveal;\nuniform vec2 uCenter;')
        .replace('#include <map_fragment>', '#include <map_fragment>\nfloat rd = length(vRP.xz - uCenter);\nfloat lit = 1.0 - smoothstep(uReveal - 0.05, uReveal + 0.12, rd);\nvec2 gq = vRP.xz * 46.0; vec2 gi = floor(gq), gf = fract(gq); gf = gf * gf * (3.0 - 2.0 * gf);\nfloat gn = mix(mix(fract(sin(dot(gi, vec2(127.1, 311.7))) * 43758.5), fract(sin(dot(gi + vec2(1, 0), vec2(127.1, 311.7))) * 43758.5), gf.x), mix(fract(sin(dot(gi + vec2(0, 1), vec2(127.1, 311.7))) * 43758.5), fract(sin(dot(gi + vec2(1, 1), vec2(127.1, 311.7))) * 43758.5), gf.x), gf.y);\ndiffuseColor.rgb *= 0.93 + 0.12 * gn;\nvec2 gq2 = vRP.xz * 210.0; vec2 gj = floor(gq2); float gn2 = fract(sin(dot(gj, vec2(41.3, 289.1))) * 43758.5);\ndiffuseColor.rgb *= 0.97 + 0.06 * gn2;\ndiffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))) * vec3(0.52, 0.5, 0.52), diffuseColor.rgb, lit);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.62, 0.28) * exp(-pow((uReveal - rd) / 0.18, 2.0)) * 2.5 * step(0.06, uReveal);');
    };
    for (const ring of geo.turkey) {
      const g = new THREE.ExtrudeGeometry(shapeOf(ring), { depth: 0.035, bevelEnabled: false });
      g.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(g, this.landMat); m.receiveShadow = true; m.castShadow = true; this.group.add(m);
    }

    // ---- coastlines: two lines per ring, starting at the point nearest Kocaeli and running both ways
    this.coasts = [];
    for (const ring of geo.turkey) {
      let k = 0, best = 1e9;
      ring.forEach(([x, y], i) => { const d = Math.hypot(x - iz[0], y - iz[1]); if (d < best) { best = d; k = i; } });
      const fwd = ring.slice(k).concat(ring.slice(0, k + 1)), half = Math.floor(fwd.length / 2);
      const a = fwd.slice(0, half + 1), b = fwd.slice(half).reverse();
      for (const part of [a, b]) {
        const l = line(part.map(([x, y]) => W(x, y, 0.038)), 0xfff2d6, 2.2);
        l.userData.start = best; this.coasts.push(l); this.group.add(l);
      }
    }

    // ---- Kocaeli: red highlight and the block
    const koc = geo.kocaeli;
    this.kocLine = line(koc.concat([koc[0]]).map(([x, y]) => W(x, y, 0.04)), 0xe30a17, 3.4);
    this.group.add(this.kocLine);
    this.kocFillMat = new THREE.MeshBasicMaterial({ color: 0xe30a17, transparent: true, opacity: 0, depthWrite: false });
    const kf = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(koc)), this.kocFillMat); kf.rotation.x = -Math.PI / 2; kf.position.y = 0.037; this.group.add(kf);
    const bg = new THREE.ExtrudeGeometry(shapeOf(koc), { depth: 0.14, bevelEnabled: false }); bg.rotateX(-Math.PI / 2);
    this.blockTop = new THREE.MeshStandardMaterial({ color: 0xf0d6a4, roughness: 0.6, map: landTex });
    this.blockSide = new THREE.MeshStandardMaterial({ color: 0xc8101c, roughness: 0.5, emissive: 0x5a0006, emissiveIntensity: 0.6 });
    this.block = new THREE.Mesh(bg, [this.blockTop, this.blockSide]); this.block.castShadow = true; this.block.receiveShadow = true;
    this.block.position.y = 0.035; this.group.add(this.block);
    const be = new THREE.LineSegments(new THREE.EdgesGeometry(bg, 30), new THREE.LineBasicMaterial({ color: 0xff6a5a }));
    this.block.add(be);

    // ---- railways (1927 Kayseri, 1930 Sivas, 1931 Malatya, 1935 Diyarbakır, 1939 Erzurum)
    const P = geo.places;
    const path = (names, step = 0.04, stops) => {
      const pts = []; if (stops) stops.push(0); for (let i = 1; i < names.length; i++) {
        const [ax, ay] = P[names[i - 1]], [bx, by] = P[names[i]], n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
        for (let k = i > 1 ? 1 : 0; k <= n; k++) { const u = k / n, s = Math.sin(u * Math.PI) * 0.03; pts.push([ax + (bx - ax) * u - (by - ay) * s, ay + (by - ay) * u + (bx - ax) * s]); }
        if (stops) stops.push(pts.length - 1);
      } return pts;
    };
    this.stops = []; this.mainRail = path(['Ankara', 'Irmak', 'Kayseri', 'Sivas', 'Erzurum'], 0.04, this.stops);
    this.rails = [
      { pts: this.mainRail, main: true },
      { pts: path(['Samsun', 'Sivas']) }, { pts: path(['Kayseri', 'Ulukışla']) }, { pts: path(['Irmak', 'Zonguldak']) },
      { pts: path(['Fevzipaşa', 'Malatya', 'Elazığ', 'Diyarbakır']) },
    ].map((r, i) => {
      const l = line(r.pts.map(([x, y]) => W(x, y, 0.04)), 0x3a2a20, r.main ? 0.0055 : 0.0042, 1, true);
      this.group.add(l); return { ...r, line: l, delay: i * 0.25 };
    });
    this.railLen = []; let acc = 0; this.mainRail.forEach((p, i) => { if (i) acc += Math.hypot(p[0] - this.mainRail[i - 1][0], p[1] - this.mainRail[i - 1][1]); this.railLen.push(acc); });
    // timetable: Ankara -> Kayseri (1927) -> Sivas (1930) -> Erzurum (1939); the train speeds up
    const Ltot = acc, Lat = k => this.railLen[this.stops[k]] / Ltot;
    this.timetable = monotone([[T.rail - 1.6, 0], [T.rail + 0.1, Lat(2)], [T.rail + 1.0, Lat(3)], [T.vote, 1]]);
    this.cityTimes = { Kayseri: T.rail + 0.1, Sivas: T.rail + 1.0, Erzurum: T.vote };

    // ---- 29 Ekim 1923: a ring of light runs out from Ankara over the whole country
    const an = P['Ankara'];
    this.ankC = new THREE.Vector2(an[0], -an[1]);
    this.ringU = { uR: { value: 0 }, uA: { value: 0 }, uC: { value: this.ankC } };
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShaderMaterial({
      uniforms: this.ringU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: 'varying vec2 vP; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uR, uA; uniform vec2 uC; varying vec2 vP;
        void main(){ float d = length(vP - uC); float x = (d - uR);
          float ring = exp(-x * x / 0.0015) + 0.25 * exp(-x * x / 0.05) * step(x, 0.0);
          float inner = 0.12 * smoothstep(uR, 0.0, d) * step(d, uR);
          gl_FragColor = vec4(vec3(1.0, 0.82, 0.5) * (ring + inner) * uA, 1.0); }`,
    }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(an[0], 0.05, -an[1]); ring.frustumCulled = false;
    this.group.add(ring); this.ring = ring;
    // a column of light over Ankara
    const cc = document.createElement('canvas'); cc.width = 64; cc.height = 256;
    const cg = cc.getContext('2d'), gr = cg.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, 'rgba(255,220,160,0)'); gr.addColorStop(0.75, 'rgba(255,230,190,0.55)'); gr.addColorStop(1, 'rgba(255,245,225,1)');
    cg.fillStyle = gr; cg.fillRect(0, 0, 64, 256);
    const hg = cg.createLinearGradient(0, 0, 64, 0); hg.addColorStop(0, 'rgba(0,0,0,1)'); hg.addColorStop(0.5, 'rgba(0,0,0,0)'); hg.addColorStop(1, 'rgba(0,0,0,1)');
    cg.globalCompositeOperation = 'destination-out'; cg.fillStyle = hg; cg.fillRect(0, 0, 64, 256);
    this.beam = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cc), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, transparent: true }));
    this.buildDecor(geo);
    this.beam.center.set(0.5, 0); this.beam.position.set(an[0], 0.04, -an[1]); this.beam.scale.set(0.12, 1.6, 1);
    this.group.add(this.beam);
  }

  // soft clouds the camera flies past; toy towns at the stops
  buildDecor(geo) {
    const rand = rng(1934);
    const cc = document.createElement('canvas'); cc.width = cc.height = 256; const g = cc.getContext('2d');
    for (let i = 0; i < 26; i++) {
      const a = rand() * Math.PI * 2, r = rand() * 62, x = 128 + Math.cos(a) * r * 1.3, y = 140 + Math.sin(a) * r * 0.55 - rand() * 20, rr = 34 + rand() * 44;
      const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    const tex = new THREE.CanvasTexture(cc); tex.colorSpace = THREE.SRGBColorSpace;
    this.clouds = [];
    const spots = [[-3.2, 1.0], [-2.6, 0.2], [-0.9, 0.0], [0.6, 0.9], [2.2, 0.2], [3.4, 1.3], [1.4, -1.0], [-1.8, -1.2], [4.2, -0.4], [-4.8, 0.8], [0.0, 1.8], [2.8, 1.9]];
    for (const [cx, cy] of spots) for (let j = 0; j < 3; j++) {
      const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false });
      const sp = new THREE.Sprite(m);
      const s0 = 0.5 + rand() * 0.7;
      sp.position.set(cx + (rand() - 0.5) * 0.9, 0.75 + rand() * 0.9, -(cy + (rand() - 0.5) * 0.6)); sp.scale.set(s0 * 1.6, s0 * 0.7, 1);
      sp.userData.a = 0.55 + rand() * 0.35; this.group.add(sp); this.clouds.push(sp);
    }
    // towns: little cream blocks with red roofs around each stop
    const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
    const wall = new THREE.MeshStandardMaterial({ color: 0xf4ead8, roughness: 0.8 });
    const towns = ['Ankara', 'İstanbul', 'İzmit', 'Kayseri', 'Sivas', 'Erzurum', 'Samsun', 'Malatya', 'Diyarbakır', 'Elazığ', 'Zonguldak'];
    const per = 70, im = new THREE.InstancedMesh(box, wall, towns.length * per), M = new THREE.Matrix4(), col = new THREE.Color();
    let n = 0;
    for (const name of towns) {
      const [px, py] = geo.places[name], R = name === 'Ankara' || name === 'İstanbul' ? 0.11 : 0.07;
      for (let i = 0; i < per; i++) {
        const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * R, w = 0.004 + rand() * 0.005, h = 0.003 + rand() * rand() * 0.012;
        M.compose(new THREE.Vector3(...W(px + Math.cos(a) * r * 1.2, py + Math.sin(a) * r, 0.035)), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 3), new THREE.Vector3(w, h, w * (0.7 + rand() * 0.6)));
        im.setMatrixAt(n, M); im.setColorAt(n, col.setHSL(0.08 + rand() * 0.04, 0.35 + rand() * 0.2, 0.78 + rand() * 0.14)); n++;
      }
    }
    im.castShadow = true; im.receiveShadow = true; this.group.add(im); this.towns = im;
  }
  updateDecor(t, camera, st) {
    const day = smooth(6.8, 9.0, t);
    for (const c of this.clouds) {
      const d = c.position.distanceTo(camera.position);
      c.material.opacity = c.userData.a * day * smooth(0.25, 0.9, d);
      c.material.color.setRGB(1, 0.92 + 0.08 * smooth(8, 11, t), 0.86 + 0.14 * smooth(8, 11, t));
      c.visible = c.material.opacity > 0.01;
    }
    this.towns.visible = t > T.land;
  }

  // position of the light-train head along the main line at progress u (0..1 of length)
  trainAt(u) {
    const L = this.railLen[this.railLen.length - 1] * clamp(u);
    let i = 1; while (i < this.railLen.length - 1 && this.railLen[i] < L) i++;
    const a = this.mainRail[i - 1], b = this.mainRail[i], f = (L - this.railLen[i - 1]) / Math.max(1e-6, this.railLen[i] - this.railLen[i - 1]);
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, i];
  }
  trainProgress(t) { return this.timetable(t); }

  update(t) {
    this.group.visible = t < T.wind + 0.7;
    // land reveal from Kocaeli; coasts ignite from there
    this.reveal.value = t < T.land ? 0 : 0.05 + 14 * ease.out(clamp((t - T.land) / 3.6));
    const cp = ease.inOut(clamp((t - T.land) / 2.0));
    for (const l of this.coasts) {
      l.visible = t > T.land;
      l.geometry.instanceCount = Math.floor(l.userData.n * cp);
      l.material.opacity = 1 - 0.55 * smooth(T.koc, T.koc + 2, t);
    }
    // Kocaeli highlight: during the first pass and again on the return
    const kh = Math.max(smooth(T.koc - 0.2, T.koc + 0.4, t) * (1 - smooth(T.ankara - 0.6, T.ankara, t)), smooth(T.dive, T.dive + 0.8, t));
    this.kocLine.visible = kh > 0.01; this.kocLine.material.opacity = kh;
    this.kocLine.geometry.instanceCount = Math.floor(this.kocLine.userData.n * clamp((t - (T.koc - 0.2)) / 0.9 + (t > T.dive ? 1 : 0)));
    this.kocFillMat.opacity = kh * 0.26;
    // the block rises
    const bh = ease.out(clamp((t - T.block) / 1.0));
    this.block.visible = bh > 0.001; this.block.scale.set(1, Math.max(0.001, bh), 1);
    // Ankara ring
    const rr = clamp((t - T.ankara) / 2.4);
    this.ring.visible = rr > 0 && rr < 1;
    this.ringU.uR.value = 0.03 + 11 * rr * rr; this.ringU.uA.value = Math.min(1, rr * 10) * (1 - rr) * 1.1;
    const bm = smooth(T.ankara - 0.15, T.ankara + 0.1, t) * (1 - smooth(T.ankara + 0.6, T.ankara + 1.6, t));
    this.beam.visible = bm > 0.01; this.beam.material.opacity = bm * 0.9; this.beam.scale.set(0.035, 1.4 * bm, 1);
    // railways
    const prog = this.trainProgress(t);
    for (const r of this.rails) {
      const p = r.main ? prog : ease.inOut(clamp((t - (T.rail + r.delay)) / 1.6));
      const n = r.line.userData.n, head = Math.floor(n * p);
      r.line.visible = p > 0; r.line.geometry.instanceCount = head;
      r.line.material.opacity = 1 - 0.4 * smooth(T.vote + 1, T.dive + 1, t);
    }
  }
}
