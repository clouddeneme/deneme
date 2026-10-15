// Small deterministic helpers. Every visual is a pure function of time t (seconds).
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ease = {
  inOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
};
// Progress 0..1 of window [a, b] with an easing.
export const win = (t, a, b, fn = ease.inOut) => fn(clamp((t - a) / (b - a)));
// Fade in over [a, a+fi], hold, fade out over [b-fo, b].
export const envelope = (t, a, b, fi = 0.5, fo = 0.5) => Math.min(smooth(a, a + fi, t), 1 - smooth(b - fo, b, t));

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Cheap smooth pseudo-noise from sums of sines; deterministic and good enough for drift.
export function wobble(x, y, z, t) {
  return [
    Math.sin(1.7 * y + 0.9 * t + 1.3 * z) + 0.5 * Math.sin(2.9 * z - 1.3 * t + 0.7 * x),
    Math.sin(1.9 * z + 0.7 * t + 1.1 * x) + 0.5 * Math.sin(3.1 * x + 1.1 * t - 0.5 * y),
    Math.sin(1.3 * x - 0.8 * t + 1.7 * y) + 0.5 * Math.sin(2.3 * y - 0.9 * t + 0.3 * z),
  ];
}

export function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Sample points from text drawn on a 2D canvas. Returns pixel coordinates relative to the text centre.
export function textPoints(text, font, count, rand, { spacing = 0 } = {}) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  g.font = font;
  if ('letterSpacing' in g) g.letterSpacing = spacing + 'px';
  const m = g.measureText(text);
  const w = Math.ceil(m.width) + 20, asc = Math.ceil(m.actualBoundingBoxAscent), desc = Math.ceil(m.actualBoundingBoxDescent);
  c.width = w; c.height = asc + desc + 20;
  g.font = font;
  if ('letterSpacing' in g) g.letterSpacing = spacing + 'px';
  g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
  g.fillText(text, 10, 10 + asc);
  const data = g.getImageData(0, 0, c.width, c.height).data;
  const pts = [];
  for (let y = 0; y < c.height; y += 1) for (let x = 0; x < c.width; x += 1) if (data[(y * c.width + x) * 4 + 3] > 140) pts.push([x, y]);
  const out = new Float32Array(count * 2);
  const cx = 10 + m.width / 2, cy = 10 + asc - (asc) / 2 + desc / 2 - desc / 2;
  for (let i = 0; i < count; i++) {
    const p = pts[Math.floor(rand() * pts.length)];
    out[i * 2] = p[0] + rand() - 0.5 - cx;
    out[i * 2 + 1] = -(p[1] + rand() - 0.5 - (10 + asc / 2));
  }
  return { pts: out, width: m.width, ascent: asc };
}
