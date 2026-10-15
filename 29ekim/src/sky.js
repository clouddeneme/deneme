import * as THREE from 'three';
import '../../gokyuzu/src/astro.js';
import { T, TOWER_X } from './timeline.js';

// The real sky over İzmit on the night of 29 Ekim 2026, 21:00 (UTC+3), from the
// Hipparcos catalogue and the astronomy code of the "Doğduğun Gecenin Gökyüzü" project.
export async function buildSky(material) {
  const data = await (await fetch('../../gokyuzu/src/data.json')).json();
  const A = window.ASTRO;
  const sky = A.sky(new Date(Date.UTC(2026, 9, 29, 18, 0)), 40.77, 29.92);
  const S = data.stars, n = S.length / 4;
  const pos = [], col = [], size = [];
  const R = 700;
  for (let i = 0; i < n; i++) {
    const mag = S[i * 4 + 2];
    if (mag > 5.6) continue;
    const d = sky.toDate(S[i * 4], S[i * 4 + 1]);
    const { alt, az } = sky.altAzOf(d.ra, d.dec);
    if (alt < 2) continue;
    // camera looks toward -z = north; east is to the right when facing north... looking up from the square
    const a = alt * Math.PI / 180, z = az * Math.PI / 180;
    pos.push(TOWER_X + R * Math.cos(a) * Math.sin(z), R * Math.sin(a) - 40, -R * Math.cos(a) * Math.cos(z));
    const bv = S[i * 4 + 3];
    const warm = Math.max(0, Math.min(1, (bv + 0.2) / 1.8));
    col.push(0.75 + 0.25 * warm, 0.82 + 0.1 * (1 - Math.abs(warm - 0.4)), 1.0 - 0.35 * warm, Math.min(1, 0.25 + (6 - mag) * 0.16));
    size.push(1.1 + Math.max(0, 4.5 - mag) * 0.75);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 4));
  g.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
  const pts = new THREE.Points(g, material);
  pts.frustumCulled = false;
  pts.userData.update = t => { pts.visible = t > T.tower - 0.1 && t < T.quote + 0.1 || t > T.end - 0.2; };
  return pts;
}
