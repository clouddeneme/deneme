import { Track } from './camera.js';
import { T } from './timeline.js';

// The single camera move of the film, as keyframes. Positions are world coordinates
// (x east, y up, z south). Each act appends its keys; the track interpolates them all.
export function mapKeys(ctx) {
  const { I, A, date, world } = ctx;
  const Z0 = date.zero(), C = date.center;
  const K = [];
  const k = (t, p, q, o = {}) => K.push({ t, p, q, ...o });

  // PLAN 1 · the cursor types the date in the dawn sky, the camera creeps in
  k(0.0, [C.x - 5.6, 5.0, C.z], [C.x, C.y, C.z], { fov: 35 });
  k(3.3, [C.x - 5.3, 5.06, C.z - 0.03], [C.x, C.y, C.z - 0.06], { fov: 35 });
  // G1 · push through the zero of "10"
  k(4.05, [Z0.x, Z0.y, Z0.z], [Z0.x + 3, Z0.y - 0.2, Z0.z], { fov: 41 });
  // G2 · chase the hero ember, pitch down, it lands on Kocaeli
  const hero = ctx.heroAt;
  const h46 = hero(4.6), h53 = hero(5.3), h60 = hero(6.0);
  k(4.6, [Z0.x + 0.12, Z0.y + 0.02, Z0.z + 0.03], h46, { fov: 41, roll: 2 });
  k(5.3, [h53[0] - 0.75, h53[1] + 0.75, I[2] + 0.1], h53, { fov: 40, roll: 3 });
  k(6.0, [h60[0] - 0.7, h60[1] + 0.55, I[2] + 0.14], h60, { fov: 38, roll: 1 });
  k(6.6, [I[0] - 1.2, 1.55, I[2] + 0.16], [I[0], 0.04, I[2]], { fov: 36 });
  // level out over the gulf into the sunrise, Kocaeli ahead and below
  k(7.3, [I[0] - 1.1, 0.9, I[2] + 0.2], [I[0] - 0.05, 0.0, I[2]], { fov: 35 });
  // PLAN 3 · along the gulf toward Kocaeli, a gentle bank
  k(8.1, [I[0] - 0.95, 0.68, I[2] + 0.26], [I[0] + 0.05, 0.0, I[2] + 0.02], { fov: 35, roll: -1 });
  k(9.0, [I[0] - 0.5, 0.6, I[2] + 0.4], [I[0] + 0.5, 0.0, I[2] + 0.15], { fov: 35, roll: -4 });
  // G3 · bank right toward Ankara
  k(9.8, [I[0] + 0.25, 0.75, I[2] + 0.58], [A[0] - 0.3, 0.0, A[2] + 0.05], { fov: 36, roll: -8 });
  // PLAN 4 · dive at Ankara; the ring of light passes under the camera
  k(10.4, [A[0] - 1.1, 0.95, A[2] - 0.12], [A[0], 0.0, A[2]], { fov: 38, roll: -4 });
  k(11.0, [A[0] - 0.55, 0.72, A[2] - 0.04], [A[0] + 0.25, 0.02, A[2] + 0.1], { fov: 37, roll: -1 });
  // G4 · tilt up to the rising letters, then fly into them
  const a = ctx.corridor[0], b = ctx.corridor[1];
  const cd = [b[0] - a[0], b[2] - a[2]], cl = Math.hypot(...cd), cu = [cd[0] / cl, cd[1] / cl];
  const at = (s, y) => [a[0] + cu[0] * s, y, a[2] + cu[1] * s];
  k(11.8, at(-0.42, 0.42), at(0.9, 0.3), { fov: 36, roll: 2 });
  k(12.4, at(0.0, 0.29), at(1.1, 0.25), { fov: 38, roll: 3 });
  k(13.05, at(cl * 0.5, 0.27), at(cl * 0.5 + 1.1, 0.22), { fov: 40, roll: -3 });
  k(13.7, at(cl, 0.26), at(cl + 0.9, 0.12), { fov: 40, roll: 2 });
  // G5 + PLAN 6 · drop beside the light train and race it east
  const lead = 0.14;
  for (let t = 14.1; t <= T.vote + 0.01; t += 0.3) {
    const [x, y] = world.trainAt(world.trainProgress(t)), [x2, y2] = world.trainAt(Math.min(1, world.trainProgress(t) + 0.02));
    let hx = x2 - x, hz = -(y2 - y); const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
    const rx = -hz, rz = hx;                     // right of heading
    const u = (t - 14.1) / (T.vote - 14.1);
    k(+t.toFixed(2), [x + rx * 0.17 - hx * (0.3 - 0.08 * u), 0.15 + 0.025 * Math.sin(u * 6), -y + rz * 0.17 - hz * (0.3 - 0.08 * u)],
      [x + hx * lead, 0.03, -y + hz * lead], { fov: 40 + 2 * u, roll: -3 - 2 * u });
  }
  // G6 · PLAN 7 · crane up off the train over Erzurum, the country blooms
  const E = ctx.E;
  k(16.7, [E[0] + 0.25, 1.9, E[2] + 1.0], [E[0] - 1.6, 0.0, E[2] - 0.2], { fov: 38, roll: 3 });
  // G7 · wide banked turn west and dive on Kocaeli
  k(17.4, [E[0] - 0.9, 3.4, E[2] + 1.9], [E[0] - 5.0, 0.0, E[2] - 0.4], { fov: 36, roll: 9 });
  k(18.2, [-0.6, 2.6, 0.9], [I[0] + 0.5, 0.1, I[2] + 0.1], { fov: 38, roll: 7 });
  k(19.0, [I[0] + 1.25, 0.95, I[2] + 0.35], [I[0] + 0.1, 0.2, I[2]], { fov: 40, roll: 1 });
  return K;
}

// ACT 2 · into the nip, ride the web, rise over the cut sheet, read it, lose it to the wind
export function paperKeys(ctx) {
  const { machine: M } = ctx, mx = M.mx, mz = M.mz, ny = M.nipY;
  const K = [], k = (t, p, q, o = {}) => K.push({ t, p, q, ...o });
  k(19.7, [mx + 0.85, 0.5, mz + 0.18], [mx, 0.34, mz], { fov: 40 });
  k(20.25, [mx + 0.3, ny + 0.035, mz + 0.03], [mx - 0.3, ny + 0.01, mz], { fov: 44 });
  k(20.6, [mx, ny + 0.015, mz], [mx - 0.8, ny, mz], { fov: 46 });
  k(21.0, [mx - 0.24, ny + 0.06, mz + 0.01], [mx - 0.9, ny - 0.03, mz], { fov: 42 });
  k(22.2, [mx - 0.62, ny + 0.09, mz + 0.03], [mx - 1.3, ny - 0.04, mz - 0.01], { fov: 40, roll: 2 });
  k(23.3, [mx - 1.0, ny + 0.12, mz + 0.01], [mx - 1.78, ny - 0.02, mz], { fov: 38, roll: 0 });
  const S = t => M.sheetPos(t);
  const s24 = S(24.2), s25 = S(25.0), sEnd = S(30);
  k(24.2, [s24.x + 0.16, s24.y + 0.42, s24.z + 0.02], [s24.x, s24.y, s24.z], { fov: 36, up: [-0.6, 0, -0.8] });
  k(25.0, [s25.x, s25.y + 0.54, s25.z], [s25.x, s25.y, s25.z], { fov: 35, up: [0, 0, -1] });
  k(27.0, [sEnd.x - 0.006, sEnd.y + 0.52, sEnd.z], [sEnd.x - 0.006, sEnd.y, sEnd.z], { fov: 35, up: [0, 0, -1] });
  k(29.0, [sEnd.x + 0.006, sEnd.y + 0.5, sEnd.z], [sEnd.x + 0.006, sEnd.y, sEnd.z], { fov: 35, up: [0, 0, -1] });
  k(30.6, [sEnd.x, sEnd.y + 0.49, sEnd.z], [sEnd.x, sEnd.y, sEnd.z], { fov: 35, up: [0, 0, -1] });
  // G10 · the wind curls the page toward the camera; dive into its white
  k(31.5, [sEnd.x - 0.01, sEnd.y + 0.44, sEnd.z + 0.01], [sEnd.x - 0.01, sEnd.y, sEnd.z + 0.01], { fov: 40, up: [-0.34, 0, -0.94] });
  return K;
}

// ACT 3 · out of the dial's white, pull back to the tower and the flag, crane over the spire,
// spiral up to look straight down on the flag of lanterns
export function towerKeys(ctx) {
  const { tower, form, numBox } = ctx, TX = tower.group.position.x, dy = tower.dialY, dz = 1.18;
  const K = [], k = (t, p, q, o = {}) => K.push({ t, p, q, ...o });
  k(31.52, [TX + 0.03, dy + 0.01, dz + 0.3], [TX + 0.03, dy + 0.01, dz], { fov: 38 });
  k(32.6, [TX + 0.98, dy, dz + 3.5], [TX + 0.98, dy, dz], { fov: 35 });
  k(36.3, [TX + 0.94, dy, dz + 3.22], [TX + 0.94, dy, dz], { fov: 35 });
  // G11 · pull back with an arc to the right: tower left third, flag right third
  k(37.4, [TX + 2.8, 8.4, 12.5], [TX + 3.6, 10.2, 0], { fov: 36 });
  k(38.5, [TX + 5.4, 3.4, 27], [TX + 5.6, 10.8, 0], { fov: 37 });
  // G12 · crane up between tower and flag, over the spire
  k(39.5, [TX + 5.2, 13.5, 17], [TX + 3.0, 14.5, -6], { fov: 38 });
  k(40.4, [TX + 3.5, 30, 3], [TX + 18, 0, -18], { fov: 40, up: [0.3, 0.8, -0.5] });
  // G13 · spiral up to straight down
  const cx = (form.x0 + numBox[1]) / 2, span = numBox[1] - form.x0, h = span * 1.12 / (2 * 0.5605), cz = 18;
  k(41.1, [cx - 20, h * 0.45, cz + 30], [cx - 6, 0, cz + 4], { fov: 38, up: [0.45, 0.3, -0.85] });
  k(41.9, [cx, h, cz + 0.4], [cx, 0, cz], { fov: 35, up: [0.08, 0, -1] });
  k(45.0, [cx, h * 1.06, cz + 0.4], [cx, 0, cz], { fov: 35, up: [Math.sin(0.17), 0, -Math.cos(0.17)] });
  return K;
}

export function buildTrack(ctx) {
  const A = new Track([...mapKeys(ctx), ...paperKeys(ctx)].sort((a, b) => a.t - b.t));
  const B = new Track(towerKeys(ctx));
  return { at: t => (t < 31.51 ? A : B).at(t) };
}
