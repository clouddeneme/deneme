import * as THREE from 'three';
import { clamp, smooth, ease, envelope } from './util.js';
import { T } from './timeline.js';

// All typography, drawn crisp on top of the post-processed 3D frame.
const W = 1920, H = 1080;
const GOLD = '#ecc77f', IVORY = '#f4efe4', SOFT = 'rgba(232,224,208,0.86)';

const CAPTIONS = [
  { a: 7.4, b: 10.2, main: 'Yorgun bir ülke.' },
  { a: 10.6, b: 12.9, main: 'Ve bir karar.' },
  { a: 19.2, b: 21.9, kicker: '28 HAZİRAN 1921 · KOCAELİ', main: 'Kocaeli kurtuldu.' },
  { a: 22.1, b: 24.8, kicker: '16–17 OCAK 1923 · KOCAELİ', main: 'Atatürk basına konuştu.', sub: 'Cumhuriyet’in ilanına dokuz ay vardı.' },
  { a: 25.4, b: 28.2, kicker: '29 EKİM 1923', main: 'Cumhuriyet ilan edildi.' },
  { a: 28.7, b: 31.7, kicker: '1 KASIM 1928', main: 'Yeni harfler.' },
  { a: 32.2, b: 34.8, kicker: '1930’LAR', main: 'Demir ağlar.' },
  { a: 35.2, b: 37.3, kicker: '5 ARALIK 1934', main: 'Kadınlara seçme ve seçilme hakkı.' },
  { a: 37.7, b: 39.7, kicker: '1936 · KOCAELİ', main: 'İlk yerli kâğıt üretildi.' },
  { a: 43.0, b: 46.6, kicker: 'İZMİT SAAT KULESİ', main: '1902’den beri', sub: 'Kocaeli’nin saatini tutuyor.' },
];

export class Overlay {
  constructor() {
    this.canvas = document.createElement('canvas'); this.canvas.width = W; this.canvas.height = H;
    this.g = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const m = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, toneMapped: false, depthTest: false, depthWrite: false, premultipliedAlpha: false });
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m));
  }

  spaced(text, x, y, sp) {
    const g = this.g;
    if ('letterSpacing' in g) { g.letterSpacing = sp + 'px'; g.fillText(text, x, y); g.letterSpacing = '0px'; }
    else g.fillText(text, x, y);
  }

  caption(t, c, x = 150, y = 820, align = 'left') {
    const e = envelope(t, c.a, c.b, 0.55, 0.5);
    if (e <= 0) return;
    const g = this.g, rise = (1 - ease.out(clamp((t - c.a) / 0.9))) * 22;
    g.save();
    // soft scrim so captions read over bright frames
    g.globalAlpha = e * 0.85;
    const sc = g.createRadialGradient(x + 320, y + 40, 40, x + 320, y + 40, 620);
    sc.addColorStop(0, 'rgba(0,0,0,0.6)'); sc.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sc; g.fillRect(x - 300, y - 400, 1300, 760);
    g.textAlign = align; g.textBaseline = 'alphabetic';
    let yy = y + rise;
    if (c.kicker) {
      g.globalAlpha = e;
      const lw = 64 * ease.out(clamp((t - c.a) / 0.8));
      g.fillStyle = GOLD;
      if (align === 'left') g.fillRect(x, yy - 38, lw, 2); else g.fillRect(x - lw / 2, yy - 38, lw, 2);
      g.font = '400 25px "Plex Mono"';
      this.spaced(c.kicker, x, yy, 6);
      yy += 84;
    }
    g.globalAlpha = e;
    g.fillStyle = IVORY;
    g.shadowColor = 'rgba(0,0,0,0.65)'; g.shadowBlur = 24;
    g.font = '600 76px "Cormorant"';
    g.fillText(c.main, x, yy);
    if (c.sub) {
      g.globalAlpha = e * smooth(c.a + 0.35, c.a + 1.0, t);
      g.fillStyle = SOFT; g.font = 'italic 500 46px "Cormorant"';
      g.fillText(c.sub, x, yy + 62);
    }
    g.restore();
  }

  draw(t, extra) {
    const g = this.g;
    g.clearRect(0, 0, W, H);

    // 1. the terminal types the date
    if (t < T.burst) {
      g.save();
      g.font = '400 150px "Plex Mono"'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
      const full = '29.10.1923', width = g.measureText(full).width;
      const asc = extra.dateAscent;
      const x0 = W / 2 - width / 2, base = H / 2 + asc / 2;
      const n = Math.max(0, Math.min(full.length, Math.floor((t - T.type0) / T.typeStep) + 1));
      const alpha = 1 - smooth(T.burst - 0.45, T.burst - 0.15, t);
      g.globalAlpha = alpha;
      g.fillStyle = '#fff4e2'; g.shadowColor = 'rgba(255,190,120,0.55)'; g.shadowBlur = 30;
      const shown = full.slice(0, n);
      g.fillText(shown, x0, base);
      const cw = width / full.length;
      const blink = Math.floor(t * 2) % 2 === 0 || (t > T.type0 && t < T.type0 + full.length * T.typeStep);
      if (blink && t < T.burst - 0.6) { g.shadowBlur = 18; g.fillRect(x0 + g.measureText(shown).width + 8, base - asc * 0.95, cw * 0.62, asc * 1.12); }
      g.restore();
    }

    for (const p of this.pins || []) {
      g.save(); g.globalAlpha = p.a;
      const pulse = (t * 0.9) % 1;
      g.strokeStyle = 'rgba(255,240,220,' + (1 - pulse) * 0.9 + ')'; g.lineWidth = 2;
      g.beginPath(); g.arc(p.x, p.y, 8 + pulse * 26, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#fff6ea'; g.beginPath(); g.arc(p.x, p.y, 4, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,240,220,0.7)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(p.x + 7, p.y - 7); g.lineTo(p.x + 40, p.y - 40); g.lineTo(p.x + 70, p.y - 40); g.stroke();
      g.fillStyle = '#fff6ea'; g.font = '400 22px "Plex Mono"'; g.shadowColor = 'rgba(0,0,0,0.8)'; g.shadowBlur = 10;
      this.spaced(p.label, p.x + 78, p.y - 33, 6);
      g.restore();
    }
    for (const c of CAPTIONS) this.caption(t, c);

    // 5. the dial counts the Republic's years
    if (t > T.dial && t < T.flag + 0.2) {
      const e = envelope(t, T.dial + 0.6, T.flag - 0.2, 0.7, 0.6);
      const spin = ease.inOut(clamp((t - T.years0) / (T.years1 - T.years0)));
      const year = Math.round(1923 + spin * 103);
      g.save();
      g.globalAlpha = e; g.textAlign = 'center';
      g.fillStyle = GOLD; g.font = '400 25px "Plex Mono"';
      this.spaced('CUMHURİYET', 1430, 330, 10);
      g.fillStyle = IVORY; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 30;
      g.font = '500 270px "Bodoni"';
      g.fillText(String(year), 1430, 590);
      const done = smooth(T.years1 + 0.1, T.years1 + 0.7, t);
      g.globalAlpha = e * done;
      g.font = '600 64px "Cormorant"';
      g.fillText('Cumhuriyet’in 103 yılına', 1430, 720);
      g.font = 'italic 500 50px "Cormorant"';
      g.fillStyle = SOFT;
      g.fillText('tanıklık etti.', 1430, 785);
      g.restore();
    }

    // 8. closing words
    if (t > T.end + 0.6) {
      const e = smooth(T.end + 0.8, T.end + 1.8, t);
      g.save();
      g.textAlign = 'center'; g.globalAlpha = e;
      g.fillStyle = IVORY; g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 30;
      g.font = '600 78px "Cormorant"';
      g.fillText('29 Ekim Cumhuriyet Bayramımız', W / 2, 560);
      g.font = 'italic 500 64px "Cormorant"';
      g.fillText('kutlu olsun.', W / 2, 632);
      g.globalAlpha = smooth(T.end + 1.6, T.end + 2.4, t);
      g.fillStyle = GOLD; g.font = '400 24px "Plex Mono"';
      this.spaced('KOCAELİ', W / 2 + 6, 690, 12);
      g.restore();
    }
    this.tex.needsUpdate = true;
  }
}
