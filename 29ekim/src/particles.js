import * as THREE from 'three';
import { clamp, lerp, smooth, ease, rng, wobble, pointInRing, textPoints } from './util.js';
import { T, TOWER_X } from './timeline.js';

// One particle system carries the whole story: digits -> embers -> map -> letters -> tower -> "103".
export const N = 30000;

const VERT = /* glsl */`
attribute float aSize;
attribute vec4 aColor;
uniform float uScale;
uniform float uSizeMul;
varying vec4 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float px = aSize * uSizeMul * uScale / -mv.z;
  gl_PointSize = max(1.0, px);
  vColor = aColor;
  // keep sub-pixel points from popping: fade alpha instead of shrinking below ~1.5px
  vColor.a *= clamp(px / 1.5, 0.0, 1.0);
}`;
const FRAG = /* glsl */`
varying vec4 vColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d) * 2.0;
  float core = exp(-r * r * 6.0);
  float a = core * vColor.a;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vColor.rgb * a, a);
}`;

export class Particles {
  constructor(geo, cameraInfo) {
    this.geo = geo;
    const rand = rng(29101923);
    this.r = new Float32Array(N * 4);
    for (let i = 0; i < N * 4; i++) this.r[i] = rand();

    this.pos = new Float32Array(N * 3);
    this.col = new Float32Array(N * 4);
    this.size = new Float32Array(N);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { uScale: { value: 1080 / (2 * Math.tan(THREE.MathUtils.degToRad(35) / 2)) }, uSizeMul: { value: 1 } },
      transparent: true, depthWrite: false, blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.cam = cameraInfo;
    this.buildShapes(rand);
  }

  buildShapes(rand) {
    // 1) Date, sampled in screen pixels at the same size the overlay types it; 1 world unit = 57.08 px at z=0.
    const PX = 1080 / (2 * 30 * Math.tan(THREE.MathUtils.degToRad(17.5)));
    const d = textPoints('29.10.1923', '400 150px "Plex Mono"', N, rand);
    this.date = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { this.date[i * 3] = d.pts[i * 2] / PX; this.date[i * 3 + 1] = d.pts[i * 2 + 1] / PX; }
    this.dateWidthPx = d.width; this.dateAscent = d.ascent;

    // 2) Map: 70% filled interior, 30% on the coastline/border.
    const rings = this.geo.outline;
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    for (const r of rings) for (const [x, y] of r) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
    const segs = [];
    let perim = 0;
    for (const r of rings) for (let i = 1; i < r.length; i++) { const l = Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]); segs.push([r[i - 1], r[i], perim, l]); perim += l; }
    this.map = new Float32Array(N * 3);
    this.isBorder = new Uint8Array(N);
    this.kocaeli = new Uint8Array(N);
    const koc = this.geo.kocaeli[0];
    for (let i = 0; i < N; i++) {
      let x, y;
      if (i % 10 < 3) {
        const s = rand() * perim;
        let lo = 0, hi = segs.length - 1;
        while (lo < hi) { const m = (lo + hi + 1) >> 1; if (segs[m][2] <= s) lo = m; else hi = m - 1; }
        const [a, b, s0, l] = segs[lo], u = (s - s0) / l;
        x = a[0] + (b[0] - a[0]) * u; y = a[1] + (b[1] - a[1]) * u;
        this.isBorder[i] = 1;
      } else {
        do { x = minx + rand() * (maxx - minx); y = miny + rand() * (maxy - miny); } while (!rings.some(r => pointInRing(x, y, r)));
      }
      this.map[i * 3] = x; this.map[i * 3 + 1] = y; this.map[i * 3 + 2] = (rand() - 0.5) * 0.04;
      if (pointInRing(x, y, koc)) this.kocaeli[i] = 1;
    }
    // Light weight per particle: denser where people live (for 1934 and city lights).
    const prov = this.geo.provinces;
    this.light = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = this.map[i * 3], y = this.map[i * 3 + 1];
      let best = 0;
      for (const p of prov) { const dx = x - p.c[0], dy = y - p.c[1]; best += p.w * Math.exp(-(dx * dx + dy * dy) / 0.06); }
      this.light[i] = Math.min(1, best / 3);
    }

    // 3) Alphabet, on a plane facing the overview camera at 13 units.
    const L1 = 'A B C Ç D E F G Ğ H I İ J K L', L2 = 'M N O Ö P R S Ş T U Ü V Y Z';
    const a1 = textPoints(L1, '600 118px "Bodoni"', N, rand, { spacing: 6 });
    const a2 = textPoints(L2, '600 118px "Bodoni"', N, rand, { spacing: 6 });
    this.letters = this.onCameraPlane(this.cam.overview, 13, (i, out) => {
      const src = i % 2 ? a2 : a1, k = Math.floor(i / 2) * 2;
      out[0] = src.pts[k % (N * 2)] / 118 * 0.5; out[1] = src.pts[(k % (N * 2)) + 1] / 118 * 0.5 + (i % 2 ? -0.52 : 0.52);
    });

    // 4) "103", in the sky of the final shot.
    const n103 = textPoints('103', '700 420px "Bodoni"', N, rand);
    this.n103 = this.onCameraPlane(this.cam.final, 46, (i, out) => {
      out[0] = n103.pts[i * 2] / 420 * 6.2; out[1] = n103.pts[i * 2 + 1] / 420 * 6.2 + 7.2;
    });

    // Tower points are filled later by the tower module.
    this.tower = new Float32Array(N * 3);
    this.towerH = new Float32Array(N);
  }

  // Lay 2D points on a plane perpendicular to a camera's view, `dist` units in front of it.
  onCameraPlane({ pos, target }, dist, fn) {
    const p = new THREE.Vector3(...pos), tg = new THREE.Vector3(...target);
    const fwd = tg.clone().sub(p).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
    const c = p.clone().addScaledVector(fwd, dist);
    const out = new Float32Array(N * 3), v = [0, 0];
    for (let i = 0; i < N; i++) {
      fn(i, v);
      out[i * 3] = c.x + right.x * v[0] + up.x * v[1];
      out[i * 3 + 1] = c.y + right.y * v[0] + up.y * v[1];
      out[i * 3 + 2] = c.z + right.z * v[0] + up.z * v[1];
    }
    return out;
  }

  setTowerPoints(points, heights) { this.tower.set(points); this.towerH.set(heights); }

  // Ember drift: digits scatter into a slow, wind-blown cloud of sparks.
  ash(i, t, out) {
    const r = this.r, k = i * 4, tau = Math.max(0, t - T.burst);
    const bx = this.date[i * 3], by = this.date[i * 3 + 1];
    const ang = r[k] * 6.2832, burst = (1 - Math.exp(-tau * 2.2)) * (0.6 + r[k + 1] * 1.8);
    const sw = Math.min(1, tau / 1.5);
    out[0] = bx + Math.cos(ang) * burst * 1.6 + (0.3 + r[k + 2] * 1.6) * Math.pow(tau, 1.2) + Math.sin(tau * (0.5 + r[k + 1]) + r[k + 3] * 6.3) * 1.4 * sw;
    out[1] = by + Math.sin(ang) * burst * 1.2 + (r[k] - 0.42) * tau * 1.4 + Math.cos(tau * (0.4 + r[k + 2] * 0.8) + r[k] * 6.3) * 1.1 * sw;
    out[2] = (r[k + 1] - 0.5) * tau * 3.0;
  }

  update(t) {
    const { pos, col, size, r } = this;
    const tmp = [0, 0, 0];
    const izmitFocus = Math.max(smooth(18.4, 19.4, t) * (1 - smooth(24.4, 25.2, t)), smooth(37.6, 38.4, t) * (1 - smooth(39.6, 40, t)));
    const ank = this.geo.places['Ankara'];
    for (let i = 0; i < N; i++) {
      const k = i * 4, p = i * 3;
      let x, y, z, cr, cg, cb, a, s;
      if (t < T.tower - 0.1) {
        // ---- digits, embers, map, letters
        if (t < T.burst) {
          x = this.date[p]; y = this.date[p + 1]; z = 0;
          a = smooth(T.burst - 0.45, T.burst - 0.15, t) * (r[k + 3] < 0.22 ? 0.75 : 0);
          cr = 1.0; cg = 0.93; cb = 0.82; s = 0.05;
        } else {
          this.ash(i, Math.min(t, 16.5), tmp);
          const mstart = T.mapIn + r[k] * 1.1;
          const m = ease.inOut(clamp((t - mstart) / 2.0));
          const w = wobble(tmp[0] * 0.4, tmp[1] * 0.4, r[k + 2] * 3, t * 0.6);
          const turb = 0.25 * (1 - m);
          x = lerp(tmp[0] + w[0] * turb, this.map[p], m);
          y = lerp(tmp[1] + w[1] * turb, this.map[p + 1], m);
          z = lerp(tmp[2], this.map[p + 2], m);
          // ember colour -> gold map
          const flick = 0.75 + 0.25 * Math.sin(t * (6 + r[k + 3] * 9) + r[k] * 40);
          const ember = [1.0, 0.36 + r[k + 1] * 0.32, 0.08 + r[k + 1] * 0.1];
          const cool = 1 - smooth(5.6, 12.5, t) * 0.35;
          const border = this.isBorder[i];
          const gold = border ? [1.0, 0.86, 0.6] : [0.95, 0.68, 0.32];
          cr = lerp(ember[0] * flick, gold[0], m); cg = lerp(ember[1] * flick, gold[1], m); cb = lerp(ember[2] * flick, gold[2], m);
          const burning = r[k + 3] < 0.22 ? 1 : 0;
          a = lerp(burning * (0.85 - smooth(9, 13, t) * 0.25) * cool, border ? 0.75 : 0.34 + this.light[i] * 0.5, m);
          s = lerp(0.05 + r[k + 2] * 0.07, border ? 0.045 : 0.038, m);

          if (t > T.mapDone - 1) {
            // gentle life on the map
            a *= 0.85 + 0.15 * Math.sin(t * 1.7 + r[k] * 30);
            // Kocaeli glows red-white while the camera is on İzmit
            if (this.kocaeli[i] && izmitFocus > 0) {
              cr = lerp(cr, 1.0, izmitFocus); cg = lerp(cg, border ? 0.9 : 0.25, izmitFocus); cb = lerp(cb, border ? 0.9 : 0.22, izmitFocus);
              a = lerp(a, 1.0, izmitFocus); s *= 1 + izmitFocus * 0.4;
            }
            // 29 Ekim 1923: a ring of light runs out from Ankara
            if (t > T.wave && t < T.wave + 3.4) {
              const dd = Math.hypot(x - ank[0], y - ank[1]);
              const front = (t - T.wave) * 4.4;
              const wv = Math.exp(-Math.pow((dd - front) / 0.55, 2)) * (1 - smooth(T.wave + 2.4, T.wave + 3.4, t));
              const core = Math.exp(-dd * dd / 0.08) * smooth(T.wave - 0.2, T.wave + 0.3, t) * (1 - smooth(T.wave + 2.6, T.wave + 3.4, t));
              const e = wv + core;
              cr = lerp(cr, 1.0, Math.min(1, e)); cg = lerp(cg, 0.97, Math.min(1, e)); cb = lerp(cb, 0.93, Math.min(1, e));
              a = Math.min(1, a + e * 0.9); s *= 1 + e * 0.8;
            }
            // 1934: thousands of lights flare across the country
            if (t > T.vote - 0.2 && t < T.vote + 3) {
              if (r[k + 3] < 0.55) {
                const tf = T.vote + 0.2 + r[k + 1] * 1.6;
                const f = Math.exp(-Math.pow((t - tf) / 0.22, 2)) + 0.25 * smooth(tf, tf + 0.3, t) * (1 - smooth(T.vote + 2.2, T.vote + 3, t));
                cr = lerp(cr, 1.0, Math.min(1, f)); cg = lerp(cg, 0.95, Math.min(1, f)); cb = lerp(cb, 0.98, Math.min(1, f));
                a = Math.min(1, a + f); s *= 1 + f * 1.2;
              }
            }
            // 1928: the new alphabet lifts off the map and settles back
            const up = ease.inOut(clamp((t - (T.letters + r[k] * 0.7)) / 1.3));
            const down = ease.inOut(clamp((t - (T.lettersOut + r[k + 1] * 0.5)) / 1.1));
            const lf = up * (1 - down);
            a *= 1 - 0.75 * Math.sin(Math.PI * clamp((t - T.letters) / (T.lettersOut + 1.4 - T.letters)));
            if (lf > 0) {
              const arc = Math.sin(lf * Math.PI) * 0.8;
              x = lerp(x, this.letters[p], lf); y = lerp(y, this.letters[p + 1], lf) + arc * (r[k + 2] - 0.5);
              z = lerp(z, this.letters[p + 2], lf);
              cr = lerp(cr, 1.0, lf); cg = lerp(cg, 0.94, lf); cb = lerp(cb, 0.85, lf);
              a = lerp(a, 0.6, lf); s = lerp(s, 0.03, lf);
            }
          }
        }
      } else if (t < T.end - 0.4) {
        // ---- the tower assembles from a cloud of light, bottom to top
        const h = this.towerH[i];
        const start = T.tower + 0.2 + (h / 16.4) * 3.2 + r[k] * 0.6;
        const m = ease.out(clamp((t - start) / 1.4));
        const ang = r[k + 1] * 6.2832, rad = 9 + r[k + 2] * 14;
        const sx = TOWER_X + Math.cos(ang) * rad, sy = h + (r[k + 3] - 0.3) * 10, sz = Math.sin(ang) * rad;
        const w = wobble(sx * 0.1, sy * 0.1, sz * 0.1, t * 0.8);
        x = lerp(sx + w[0], this.tower[p], m); y = lerp(sy + w[1], this.tower[p + 1], m); z = lerp(sz + w[2], this.tower[p + 2], m);
        // after the stone appears, the light lifts away like sparks
        const lift = smooth(45.4 + r[k] * 0.8, 48.5 + r[k] * 1.0, t);
        y += lift * lift * (6 + r[k + 2] * 10); x += lift * (r[k + 1] - 0.5) * 6; z += lift * (r[k + 3] - 0.5) * 6;
        cr = 1.0; cg = 0.82 + 0.1 * r[k + 2]; cb = 0.55 + 0.2 * r[k + 3];
        a = smooth(T.tower, T.tower + 0.8, t) * (0.25 + 0.5 * m) * (1 - smooth(46.0, 48.6, t));
        s = 0.06 + r[k + 2] * 0.04;
      } else {
        // ---- "103" gathers in the night sky over the tower
        const ang = r[k + 1] * 6.2832, rad = 30 + r[k + 2] * 40;
        const sx = TOWER_X + Math.cos(ang) * rad, sy = 10 + r[k + 3] * 40, sz = -20 + Math.sin(ang) * rad;
        const start = T.end - 0.2 + r[k] * 1.0;
        const m = ease.inOut(clamp((t - start) / 1.6));
        x = lerp(sx, this.n103[p], m); y = lerp(sy, this.n103[p + 1], m); z = lerp(sz, this.n103[p + 2], m);
        const tw = 0.8 + 0.2 * Math.sin(t * 3 + r[k] * 50);
        cr = 1.0; cg = 0.88; cb = 0.66;
        a = smooth(T.end - 0.3, T.end + 0.5, t) * (0.3 + 0.7 * m) * tw;
        s = 0.09 + r[k + 2] * 0.05;
      }
      pos[p] = x; pos[p + 1] = y; pos[p + 2] = z;
      col[k] = cr; col[k + 1] = cg; col[k + 2] = cb; col[k + 3] = a;
      size[i] = s;
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aColor.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
  }
}
