import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { clamp, smooth, ease } from './util.js';
import { T } from './timeline.js';

// Glowing outline of Türkiye, Kocaeli's border and the 1930s railways ("demir ağlar").
const RAILS = [
  ['Ankara', 'Irmak', 'Kayseri'], ['Kayseri', 'Sivas'], ['Samsun', 'Sivas'], ['Sivas', 'Erzurum'],
  ['Irmak', 'Zonguldak'], ['Fevzipaşa', 'Malatya', 'Elazığ', 'Diyarbakır'], ['Kayseri', 'Ulukışla'],
];

function makeLine(points, color, width, z = 0.02) {
  const g = new LineGeometry();
  g.setPositions(points.flatMap(([x, y]) => [x, y, z]));
  const m = new LineMaterial({ color, linewidth: width, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  m.resolution.set(1920, 1080);
  const l = new Line2(g, m);
  l.computeLineDistances();
  l.userData.segments = points.length - 1;
  l.frustumCulled = false;
  return l;
}

// Densify a polyline so the "drawing" reveal looks continuous.
function densify(pts, step) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    for (let k = 1; k <= n; k++) out.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]);
  }
  return out;
}

export class MapLines {
  constructor(geo) {
    this.group = new THREE.Group();
    this.border = geo.outline.map(r => makeLine(r, 0xffd99a, 2.2));
    this.border.forEach(l => this.group.add(l));
    this.koc = makeLine(geo.kocaeli[0], 0xff3b3b, 3.2, 0.04);
    this.group.add(this.koc);
    this.rails = RAILS.map(names => {
      // slight curve between towns so lines don't look ruled
      const pts = names.map(n => geo.places[n]);
      const curved = [];
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
        const nx = -(by - ay), ny = bx - ax, bend = 0.035;
        for (let k = 0; k <= 12; k++) {
          const u = k / 12, s = Math.sin(u * Math.PI) * bend;
          if (i > 1 && k === 0) continue;
          curved.push([ax + (bx - ax) * u + nx * s, ay + (by - ay) * u + ny * s]);
        }
      }
      return makeLine(densify(curved, 0.05), 0xfff1d6, 3.0, 0.06);
    });
    this.rails.forEach(l => this.group.add(l));
    this.railDelay = this.rails.map((_, i) => i * 0.22);
  }

  update(t) {
    const vis = 1 - smooth(39.4, 39.9, t);
    this.group.visible = t > T.mapIn && t < 40;
    // outline draws itself as the embers land
    const draw = ease.inOut(clamp((t - (T.mapIn + 0.8)) / 3.0));
    for (const l of this.border) {
      l.geometry.instanceCount = Math.floor(l.userData.segments * draw);
      l.material.opacity = 0.85 * vis;
    }
    const kf = Math.max(smooth(18.6, 19.6, t) * (1 - smooth(24.6, 25.4, t)), smooth(37.6, 38.3, t) * (1 - smooth(39.4, 39.9, t)));
    this.koc.visible = kf > 0.001;
    this.koc.material.opacity = kf;
    this.koc.geometry.instanceCount = Math.floor(this.koc.userData.segments * clamp((t - 18.6) / 1.2 + (t > 30 ? 1 : 0)));
    this.rails.forEach((l, i) => {
      const p = ease.inOut(clamp((t - (T.rail + 0.2 + this.railDelay[i])) / 1.5));
      l.visible = p > 0;
      l.geometry.instanceCount = Math.floor(l.userData.segments * p);
      l.material.opacity = (0.9 - 0.45 * smooth(T.rail + 3.2, T.rail + 4.5, t)) * vis;
    });
  }
}
