import * as THREE from 'three';
import { rng, clamp } from './util.js';
import { T, TOWER_X } from './timeline.js';

// Deterministic fireworks: each burst is a closed-form function of time (launch, burst, fall, fade).
const PER = 420, TRAIL = 3;
export const BURST_TIMES = [56.0, 56.6, 57.3, 57.9, 58.6, 59.0, 59.6, 60.3, 60.8, 61.3, 61.7, 62.0, 62.4, 62.7, 63.0, 63.3, 63.6, 63.9];
const COLORS = [[1, 0.16, 0.16], [1, 1, 1], [1, 0.8, 0.42], [1, 0.16, 0.16], [1, 1, 1]];

export class Fireworks {
  constructor() {
    const rand = rng(1029);
    this.bursts = [];
    // timed to the music: a first volley, then a dense finale
    BURST_TIMES.forEach((tb, i) => {
      this.bursts.push({
        tb, x: TOWER_X + (rand() - 0.5) * 60, y: 24 + rand() * 18, z: -32 - rand() * 22,
        speed: 10 + rand() * 7, life: 2.2 + rand() * 0.9, color: COLORS[i % COLORS.length], kind: i % 3,
      });
    });
    this.dirs = new Float32Array(this.bursts.length * PER * 4);
    for (let i = 0; i < this.bursts.length * PER; i++) {
      const u = rand() * 2 - 1, th = rand() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      this.dirs[i * 4] = s * Math.cos(th); this.dirs[i * 4 + 1] = u; this.dirs[i * 4 + 2] = s * Math.sin(th); this.dirs[i * 4 + 3] = rand();
    }
    const n = this.bursts.length * PER * TRAIL + this.bursts.length * 8;
    this.n = n;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 4); this.size = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    this.geo = g;
  }
  attach(material) { this.points = new THREE.Points(this.geo, material); this.points.frustumCulled = false; return this.points; }

  // How much the bursts light the scene right now (drives the light through the flag).
  flash(t) {
    let f = 0;
    for (const B of this.bursts) { const tau = t - B.tb; if (tau > 0 && tau < 3) f += Math.exp(-tau * 2.2) * (1 - tau / 3); }
    return Math.min(1.6, f) * (1 - Math.min(1, Math.max(0, (t - 64.2) / 0.8)));
  }

  update(t) {
    const on = t > T.fireworks - 1.5 && t < T.quote + 0.2;
    this.points.visible = on;
    if (!on) return;
    let w = 0;
    const put = (x, y, z, r, g, b, a, s) => { const p = w * 3, k = w * 4; this.pos[p] = x; this.pos[p + 1] = y; this.pos[p + 2] = z; this.col[k] = r; this.col[k + 1] = g; this.col[k + 2] = b; this.col[k + 3] = a; this.size[w] = s; w++; };
    this.bursts.forEach((B, bi) => {
      const tau = t - B.tb;
      // rising rocket
      for (let j = 0; j < 8; j++) {
        const rt = tau + 1.1 - j * 0.03;
        if (rt > 0 && tau < 0) { const u = rt / 1.1; put(B.x, B.y * (1 - Math.pow(1 - u, 2)), B.z, 1, 0.8, 0.5, (1 - j / 8) * 0.9, 0.35); }
        else put(0, -999, 0, 0, 0, 0, 0, 0);
      }
      for (let i = 0; i < PER; i++) {
        const d = (bi * PER + i) * 4;
        for (let k = 0; k < TRAIL; k++) {
          const tt = tau - k * 0.045;
          if (tt <= 0 || tt > B.life) { put(0, -999, 0, 0, 0, 0, 0, 0); continue; }
          const v = B.speed * (0.82 + 0.18 * this.dirs[d + 3]) * (B.kind === 1 ? 0.75 : 1);
          const drag = 1.6, r = v * (1 - Math.exp(-drag * tt)) / drag;
          const x = B.x + this.dirs[d] * r, y = B.y + this.dirs[d + 1] * r - 2.2 * tt * tt, z = B.z + this.dirs[d + 2] * r;
          const life = 1 - tt / B.life;
          const fl = B.kind === 2 ? (0.55 + 0.45 * Math.sin(tt * 40 + this.dirs[d + 3] * 30)) : 1;
          const [cr, cg, cb] = B.color;
          const hot = Math.exp(-tt * 4) * Math.min(1, tt / 0.12);
          put(x, y, z, Math.min(1, cr + hot), Math.min(1, cg + hot * 0.8), Math.min(1, cb + hot * 0.6),
              Math.pow(life, 1.4) * fl * (1 - k * 0.3) * clamp(1 - (t - 64.2) / 0.8, 0, 1) * Math.min(1, Math.pow(tt / 0.3, 2)), (0.5 - k * 0.1) * (0.8 + 0.5 * hot) * Math.min(1, 0.3 + tt * 3));
        }
      }
    });
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.setDrawRange(0, w);
  }
}
