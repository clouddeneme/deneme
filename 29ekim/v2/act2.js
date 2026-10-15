import * as THREE from 'three';
import { clamp, lerp, smooth, ease, rng } from '../src/util.js';
import { T } from './timeline.js';

// ACT 2 · SEKA 1936: a 1930s paper machine on the Kocaeli block. Pulp enters the nip, a long
// white web runs west over the gulf, a sheet is cut, lifted, written on, and taken by the wind.

const ROLL_R = 0.07, ROLL_L = 0.5, GAP = 0.03, WEB_W = 0.36, WEB_L = 3.4;
export const SHEET = { w: 0.64, h: 0.36, s0: 1.45 };        // sheet = web from s0 to s0 + w (s = distance from the nip)

function fibreCanvas(w, h, seed, base = '#f6f1e5') {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, w, h);
  const rand = rng(seed);
  for (let i = 0; i < w * h / 90; i++) {
    const x = rand() * w, y = rand() * h, l = 4 + rand() * 22, a = rand() * Math.PI;
    g.strokeStyle = `rgba(${120 + rand() * 50},${100 + rand() * 40},${70 + rand() * 40},${0.05 + rand() * 0.07})`;
    g.lineWidth = 0.5 + rand() * 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  for (let i = 0; i < w * h / 6000; i++) {
    const x = rand() * w, y = rand() * h, r = 30 + rand() * 160, gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(160,130,90,${0.012 + rand() * 0.018})`); gr.addColorStop(1, 'rgba(160,130,90,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return c;
}
function heightNormal(src, strength) {
  const s = src.width, t = src.height, d = src.getContext('2d').getImageData(0, 0, s, t).data;
  const c = document.createElement('canvas'); c.width = s; c.height = t;
  const o = c.getContext('2d'), img = o.createImageData(s, t);
  const H = (x, y) => d[(((y + t) % t) * s + ((x + s) % s)) * 4 + 1] / 255;
  for (let y = 0; y < t; y++) for (let x = 0; x < s; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * s + x) * 4;
    img.data[i] = (-dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  o.putImageData(img, 0, 0); return c;
}

export class PaperMachine {
  constructor(I, topY) {
    this.group = new THREE.Group();
    const mx = I[0] + 0.05, mz = I[2];
    this.mx = mx; this.mz = mz;
    const lowY = topY + ROLL_R + 0.012, upY = lowY + 2 * ROLL_R + GAP;
    this.nipY = lowY + ROLL_R + 0.004;                    // web leaves just above the lower roller
    this.nip = new THREE.Vector3(mx, this.nipY, mz);

    // ---- materials
    const iron = new THREE.MeshStandardMaterial({ color: 0x2f3d34, roughness: 0.55, metalness: 0.35 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xd2a24c, roughness: 0.3, metalness: 0.85, emissive: 0x2a1a04 });
    const rc = document.createElement('canvas'); rc.width = 512; rc.height = 64; const rg = rc.getContext('2d');
    rg.fillStyle = '#9aa4a0'; rg.fillRect(0, 0, 512, 64);
    for (let i = 0; i < 90; i++) { rg.fillStyle = `rgba(${i % 2 ? 255 : 30},${i % 2 ? 255 : 40},${i % 2 ? 255 : 40},${0.04 + (i * 37 % 10) / 120})`; rg.fillRect((i * 97) % 512, 0, 2 + (i % 5), 64); }
    this.rollTex = new THREE.CanvasTexture(rc); this.rollTex.wrapS = this.rollTex.wrapT = THREE.RepeatWrapping; this.rollTex.colorSpace = THREE.SRGBColorSpace;
    const steel = new THREE.MeshStandardMaterial({ color: 0xe8ece8, map: this.rollTex, roughness: 0.28, metalness: 0.6 });
    const steel2 = steel.clone(); steel2.map = this.rollTex.clone(); steel2.map.needsUpdate = true;
    this.steel = [steel, steel2];

    // ---- the two press rollers (axis north-south)
    const mkRoll = (y, mat) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(ROLL_R, ROLL_R, ROLL_L, 64, 1), mat); body.rotation.x = Math.PI / 2;
      g.add(body);
      for (const s of [-1, 1]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(ROLL_R * 1.01, 0.006, 10, 64), brass); ring.position.z = s * (ROLL_L / 2 - 0.012); g.add(ring);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(ROLL_R * 0.45, ROLL_R * 0.45, 0.03, 32), brass); hub.rotation.x = Math.PI / 2; hub.position.z = s * (ROLL_L / 2 + 0.015); g.add(hub);
      }
      g.position.set(mx, y, mz); g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      this.group.add(g); return g;
    };
    this.rollLow = mkRoll(lowY, steel); this.rollUp = mkRoll(upY, steel2);

    // ---- side frames: tapered cast-iron plates with bearing blocks
    const fs = new THREE.Shape();
    fs.moveTo(-0.17, 0); fs.lineTo(0.17, 0); fs.lineTo(0.11, upY + ROLL_R + 0.05 - topY); fs.lineTo(-0.11, upY + ROLL_R + 0.05 - topY); fs.closePath();
    const hole = new THREE.Path(); hole.absarc(0, 0.05, 0.035, 0, Math.PI * 2, true); fs.holes.push(hole);
    const fg = new THREE.ExtrudeGeometry(fs, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 });
    for (const s of [-1, 1]) {
      const f = new THREE.Mesh(fg, iron); f.position.set(mx, topY, mz + s * (ROLL_L / 2 + 0.04) - 0.011); f.castShadow = f.receiveShadow = true; this.group.add(f);
      for (const y of [lowY, upY]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.03), brass); b.position.set(mx, y, mz + s * (ROLL_L / 2 + 0.04)); b.castShadow = true; this.group.add(b);
      }
    }
    // top beam
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, ROLL_L + 0.14), iron); beam.position.set(mx, upY + ROLL_R + 0.065, mz); beam.castShadow = true; this.group.add(beam);

    // ---- pulp vat on the east side (a shallow trough of swirling stock)
    const vat = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, ROLL_L - 0.04), iron); vat.position.set(mx + 0.2, topY + 0.025, mz); vat.castShadow = vat.receiveShadow = true; this.group.add(vat);
    const pc = fibreCanvas(256, 256, 3, '#efe7d6');
    this.pulpTex = new THREE.CanvasTexture(pc); this.pulpTex.wrapS = this.pulpTex.wrapT = THREE.RepeatWrapping; this.pulpTex.colorSpace = THREE.SRGBColorSpace;
    const pulp = new THREE.Mesh(new THREE.PlaneGeometry(0.2, ROLL_L - 0.06), new THREE.MeshStandardMaterial({ color: 0xf4eee2, map: this.pulpTex, roughness: 0.3 }));
    pulp.rotation.x = -Math.PI / 2; pulp.position.set(mx + 0.2, topY + 0.051, mz); this.group.add(pulp);
    // stock flowing over a lip into the nip
    const lip = new THREE.Mesh(new THREE.PlaneGeometry(0.16, ROLL_L - 0.08, 8, 1), new THREE.MeshStandardMaterial({ color: 0xf6f1e6, map: this.pulpTex, roughness: 0.35, side: THREE.DoubleSide }));
    lip.geometry.rotateX(-Math.PI / 2);
    { const p = lip.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const u = (p.getX(i) + 0.08) / 0.16; p.setY(i, (this.nipY - topY - 0.05) * (1 - u) * (1 - u) * 0.0 + (this.nipY - (topY + 0.05)) * (1 - u)); } p.needsUpdate = true; lip.geometry.computeVertexNormals(); }
    lip.position.set(mx + 0.08, topY + 0.05, mz); this.group.add(lip);

    // ---- the web: a long ribbon leaving the nip westward; scrolls, ripples, then is cut
    this.sheet = new Sheet();
    const webTex = new THREE.CanvasTexture(this.sheet.base); webTex.wrapS = webTex.wrapT = THREE.RepeatWrapping; webTex.colorSpace = THREE.SRGBColorSpace; webTex.anisotropy = 8;
    const webNrm = new THREE.CanvasTexture(heightNormal(fibreCanvas(512, 288, 77, '#808080'), 3)); webNrm.wrapS = webNrm.wrapT = THREE.RepeatWrapping;
    this.webU = { uOff: { value: 0 }, uTime: { value: 0 }, uHole: { value: 0 }, uX0: { value: mx }, uY0: { value: this.nipY }, uS0: { value: SHEET.s0 }, uSW: { value: SHEET.w }, uFade: { value: 1 } };
    const webMat = new THREE.MeshStandardMaterial({ color: 0xf4efe6, map: webTex, normalMap: webNrm, normalScale: new THREE.Vector2(0.25, 0.25), roughness: 0.55, side: THREE.DoubleSide, transparent: true });
    webMat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, this.webU);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uOff, uTime, uX0, uY0;\nvarying float vS;\nfloat webY(float s, float z){ float drop = -0.035 * smoothstep(0.0, 0.6, s); float a = 0.006 + 0.014 * smoothstep(0.2, 3.0, s); return drop + a * sin((s - uOff) * 9.0) * 0.7 + a * 0.45 * sin((s - uOff * 0.8) * 17.0 + z * 9.0) + 0.0025 * sin(z * 22.0 + uTime * 3.0) * smoothstep(0.1, 1.0, s); }')
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n{ float s0 = -position.x; float e = 0.01; float dyds = (webY(s0 + e, position.y) - webY(s0 - e, position.y)) / (2.0 * e); float dydz = (webY(s0, position.y + e) - webY(s0, position.y - e)) / (2.0 * e); objectNormal = normalize(vec3(dyds, -dydz, 1.0)); }')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat s = -position.x; vS = s; transformed.z += webY(s, position.y);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uHole, uS0, uSW, uFade;\nvarying float vS;')
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (uHole > 0.5 && vS > uS0 && vS < uS0 + uSW) discard;')
        .replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= (1.0 - smoothstep(' + (WEB_L - 1.2).toFixed(2) + ', ' + WEB_L.toFixed(2) + ', vS)) * uFade;');
    };
    this.webTex = webTex;
    // plane in XY with x = -s (0..WEB_L), y = across; rotated to lie flat: local z -> world +y
    const wg = new THREE.PlaneGeometry(WEB_L, WEB_W, 340, 16); wg.translate(-WEB_L / 2, 0, 0);
    this.web = new THREE.Mesh(wg, webMat);
    this.web.rotation.x = -Math.PI / 2; this.web.position.set(mx, this.nipY, mz);
    this.web.castShadow = true; this.web.receiveShadow = true;
    this.group.add(this.web);
    // web texture scale: one texture tile = 0.64 x 0.36 (the sheet size)
    webTex.repeat.set(WEB_L / SHEET.w, 1); webNrm.repeat.set(WEB_L / SHEET.w * 1.5, 1.5);

    // ---- blade flashes at the cut
    const bm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending });
    this.blades = [SHEET.s0, SHEET.s0 + SHEET.w].map(s => { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.006, WEB_W * 1.15), bm); b.rotation.x = -Math.PI / 2; b.position.set(mx - s, this.nipY + 0.002, mz); this.group.add(b); return b; });
    this.bladeMat = bm;

    // ---- the sheet: its own mesh, written on, then curled by the wind
    this.group.add(this.sheet.mesh);
    // texture phase so that at the cut a whole tile lies exactly where the sheet is
    const offCut = this.offset(T.cut), k = (WEB_L - SHEET.s0 - SHEET.w + offCut) / SHEET.w;
    this.phase = -(k - Math.floor(k));
    this.sheetHome = new THREE.Vector3(mx - SHEET.s0 - SHEET.w / 2, this.nipY, mz);
    this.sheetLift = 0.3;
  }

  // distance the paper has travelled (integral of the speed)
  offset(t) {
    const a = T.nip - 0.3, b = T.cut - 0.7, c = T.cut, v = 0.42;
    if (t <= a) return 0;
    if (t <= b) return v * (t - a);
    const u = clamp((t - b) / (c - b));
    return v * (b - a) + v * (c - b) * (u - u * u / 2);  // decelerate to a stop at the cut
  }
  sheetPos(t) {
    const u = ease.inOut(clamp((t - T.cut - 0.1) / 1.4));
    return new THREE.Vector3(this.sheetHome.x, this.sheetHome.y + 0.0015 + this.sheetLift * u, this.sheetHome.z);
  }

  update(t, sunDir) {
    const on = t > T.dive + 0.4 && t < T.dial + 0.05;
    this.group.visible = on; if (!on) return;
    // the machine rises with the block
    const rise = ease.out(clamp((t - (T.block + 0.3)) / 1.0));
    this.group.position.y = -0.4 * (1 - rise); this.group.scale.setScalar(Math.max(0.001, rise));
    this.group.scale.set(1, Math.max(0.001, rise), 1);
    const off = this.offset(t);
    // rollers turn with the paper (surface speed = paper speed)
    const ang = off / ROLL_R + (t - T.machine) * 0.4;
    this.rollLow.rotation.z = -ang; this.rollUp.rotation.z = ang;
    this.pulpTex.offset.set(t * 0.05, Math.sin(t * 0.7) * 0.03);
    // web
    this.webU.uOff.value = off; this.webU.uTime.value = t;
    this.webTex.offset.x = off / SHEET.w + this.phase;  // paper moves west; a tile boundary sits under each blade at the cut
    this.web.material.normalMap.offset.x = this.webTex.offset.x * 1.5;
    const grow = clamp((t - (T.nip - 0.3)) / 0.9);       // the web is born at the nip and grows out
    this.web.visible = t > T.nip - 0.35 && t < T.wind + 0.6;
    this.web.scale.x = Math.max(0.001, ease.out(grow));
    this.webU.uHole.value = t > T.cut ? 1 : 0;
    this.webU.uFade.value = 1 - smooth(T.write - 0.4, T.write + 0.6, t);
    // blades
    this.bladeMat.opacity = Math.exp(-Math.pow((t - T.cut) / 0.06, 2)) * 1.5;
    this.blades.forEach(b => { b.visible = this.bladeMat.opacity > 0.01; });
    // the sheet
    const sv = t > T.cut - 0.02;
    this.sheet.mesh.visible = sv;
    if (sv) {
      this.sheet.mesh.position.copy(this.sheetPos(t));
      this.sheet.update(t);
    }
  }
}

// ---------------------------------------------------------------- the written sheet
const LINES = ['Türkiye Cumhuriyeti', 'ilelebet payidar kalacaktır.'];
const CW = 2048, CH = 1152;
export class Sheet {
  constructor() {
    this.canvas = document.createElement('canvas'); this.canvas.width = CW; this.canvas.height = CH;
    this.g = this.canvas.getContext('2d');
    this.base = fibreCanvas(CW, CH, 1936);
    // the same fibres as the web tile, so the cut sheet is continuous with the web it came from
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    this.buf = document.createElement('canvas'); this.buf.width = CW; this.buf.height = 260; this.bg = this.buf.getContext('2d');
    const nrm = new THREE.CanvasTexture(heightNormal(fibreCanvas(512, 288, 77, '#808080'), 3)); nrm.wrapS = nrm.wrapT = THREE.RepeatWrapping; nrm.repeat.set(1.5, 1.5);
    this.mat = new THREE.MeshLambertMaterial({ map: this.tex, normalMap: nrm, normalScale: new THREE.Vector2(0.25, 0.25), side: THREE.FrontSide });
    const backTex = new THREE.CanvasTexture(this.base); backTex.colorSpace = THREE.SRGBColorSpace;
    this.backMat = new THREE.MeshLambertMaterial({ map: backTex, normalMap: nrm, normalScale: new THREE.Vector2(0.25, 0.25), side: THREE.BackSide });
    this.geo = new THREE.PlaneGeometry(SHEET.w, SHEET.h, 96, 54);
    this.geo.rotateX(-Math.PI / 2);                      // lies flat, text up = north (-z)
    this.rest = this.geo.attributes.position.array.slice();
    this.mesh = new THREE.Mesh(this.geo, this.mat); this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    const back = new THREE.Mesh(this.geo, this.backMat); back.receiveShadow = true; this.mesh.add(back);
    this.last = '';
    this.draw(0, 0, 0);
  }
  // p1, p2: writing progress of the two lines; sg: signature
  draw(p1, p2, sg) {
    const g = this.g;
    g.drawImage(this.base, 0, 0);
    // watermark in the corner: Kocaeli · 1936
    g.save(); g.globalAlpha = 0.1; g.fillStyle = '#6b5a40'; g.font = '500 30px "Plex Mono"'; g.textAlign = 'right';
    if ('letterSpacing' in g) g.letterSpacing = '8px';
    g.fillText('KOCAELİ · 1936', CW - 110, CH - 90); g.restore();
    g.font = 'italic 600 168px "Cormorant"'; g.textBaseline = 'alphabetic';
    const ys = [500, 700];
    [p1, p2].forEach((p, li) => {
      if (p <= 0) return;
      const text = LINES[li], w = g.measureText(text).width, x0 = CW / 2 - w / 2, pen = x0 + w * p;
      // draw the full line into a buffer, then reveal it up to the pen with a soft edge
      const b = this.bg; b.clearRect(0, 0, CW, 260); b.font = g.font; b.textBaseline = 'alphabetic';
      b.fillStyle = 'rgba(28,22,18,0.22)'; b.fillText(text, x0 + 2, 202);          // faint bleed
      b.fillStyle = '#1e1813'; b.fillText(text, x0, 200);
      b.globalCompositeOperation = 'source-atop';                                    // wet ink near the pen: darker, bluish
      const wet = b.createLinearGradient(pen - 340, 0, pen, 0); wet.addColorStop(0, 'rgba(12,14,40,0)'); wet.addColorStop(1, p < 1 ? 'rgba(12,14,40,0.85)' : 'rgba(12,14,40,0)');
      b.fillStyle = wet; b.fillRect(0, 0, CW, 260);
      b.globalCompositeOperation = 'destination-in';
      const m = b.createLinearGradient(pen - 30, 0, pen + 6, 0); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
      b.fillStyle = m; b.fillRect(0, 0, CW, 260);
      b.globalCompositeOperation = 'source-over';
      g.drawImage(this.buf, 0, ys[li] - 200);
    });
    if (sg > 0) {
      g.save(); g.globalAlpha = sg; g.fillStyle = '#a3141c'; g.font = '500 54px "Cormorant"'; g.textAlign = 'center';
      if ('letterSpacing' in g) g.letterSpacing = '10px';
      g.fillText('— MUSTAFA KEMAL ATATÜRK', CW / 2, 900); g.restore();
    }
    this.tex.needsUpdate = true;
  }
  update(t) {
    const p1 = ease.inOutSine(clamp((t - T.write) / 1.7)), p2 = ease.inOutSine(clamp((t - (T.write + 1.8)) / 1.9));
    const sg = smooth(T.sign, T.sign + 0.7, t);
    const key = Math.round(p1 * 300) + ':' + Math.round(p2 * 300) + ':' + Math.round(sg * 20);
    if (key !== this.last) { this.last = key; this.draw(p1, p2, sg); }
    this.curl(t);
  }
  // the wind lifts the far corner and rolls the page back over itself (cylindrical page curl)
  curl(t) {
    const w = ease.inOut(clamp((t - (T.wind - 0.3)) / 0.85));
    const P = this.geo.attributes.position.array, R = this.rest;
    // fold line sweeps from the south-east corner toward the north-west, rotated 30 degrees
    const dir = new THREE.Vector2(-Math.cos(0.5), -Math.sin(0.5));         // in sheet plane (x, z); the curl starts at the south-east corner
    const corner = new THREE.Vector2(SHEET.w / 2, SHEET.h / 2);
    const c0 = corner.dot(dir), sweep = c0 + w * 0.52, r = 0.15 + 0.05 * w;
    for (let i = 0; i < P.length; i += 3) {
      const x = R[i], z = R[i + 2];
      const d = sweep - (x * dir.x + z * dir.y);                            // >0: beyond the fold line (toward the corner)
      if (w <= 0 || d <= 0) { P[i] = x; P[i + 1] = 0; P[i + 2] = z; continue; }
      const th = d / r;
      let along, up;
      if (th < Math.PI) { along = r * Math.sin(th); up = r * (1 - Math.cos(th)); }
      else { along = -(d - Math.PI * r); up = 2 * r; }
      const dd = d - along;                                                // move back toward the fold line
      P[i] = x + dir.x * dd; P[i + 1] = up + 0.08 * w * w * d; P[i + 2] = z + dir.y * dd;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.computeVertexNormals();
  }
}
