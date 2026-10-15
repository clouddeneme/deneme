import * as THREE from 'three';
import { clamp, smooth, ease, envelope } from '../src/util.js';
import { T } from './timeline.js';

// Typography on top of the post-processed frame. Ink on bright scenes, ivory on dark ones.
const W = 1920, H = 1080;
const GOLD = '#c9963c', GOLD_L = '#f0cf86', INK = '#1d1a17', IVORY = '#f7f1e3';

// tone: 'ink' (dark text with a cream halo) or 'ivory' (light text with a soft shadow)
const CAPTIONS = [
  { a: 7.6, b: 9.25, kicker: '28 HAZİRAN 1921 · KOCAELİ', main: 'Kocaeli kurtuldu.' },
  { a: 9.2, b: 10.75, kicker: '16–17 OCAK 1923 · İZMİT', main: 'Atatürk basına konuştu.' },
  { a: 10.7, b: 12.3, kicker: '29 EKİM 1923', main: 'Cumhuriyet ilan edildi.' },
  { a: 12.25, b: 13.95, kicker: '1 KASIM 1928', main: 'Yeni harfler.' },
  { a: 13.9, b: 15.95, kicker: '1930’LAR', main: 'Demir ağlar.' },
  { a: 15.9, b: 18.0, kicker: '5 ARALIK 1934', main: 'Kadınlara seçme ve seçilme hakkı.' },
  { a: 21.3, b: 24.3, kicker: '1936 · KOCAELİ', main: 'İlk yerli kâğıt.' },
];

export class Overlay {
  constructor() {
    this.canvas = document.createElement('canvas'); this.canvas.width = W; this.canvas.height = H;
    this.g = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const m = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, toneMapped: false, depthTest: false, depthWrite: false });
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m));
    this.pins = [];
  }
  spaced(text, x, y, sp) {
    const g = this.g;
    if ('letterSpacing' in g) { g.letterSpacing = sp + 'px'; g.fillText(text, x, y); g.letterSpacing = '0px'; } else g.fillText(text, x, y);
  }
  // a bright scene (0) or a dark one (1) decides the ink
  caption(t, c, dark, x = 140, y = 850) {
    const e = envelope(t, c.a, c.b, 0.45, 0.4);
    if (e <= 0) return;
    const g = this.g, rise = (1 - ease.out(clamp((t - c.a) / 0.8))) * 18;
    g.save();
    // soft halo behind the words: cream for ink, dusk for ivory
    g.globalAlpha = e * 0.9;
    const sc = g.createRadialGradient(x + 330, y - 10, 30, x + 330, y - 10, 560);
    sc.addColorStop(0, dark ? 'rgba(10,14,40,0.45)' : 'rgba(255,248,232,0.62)'); sc.addColorStop(1, dark ? 'rgba(10,14,40,0)' : 'rgba(255,248,232,0)');
    g.fillStyle = sc; g.fillRect(x + 330 - 560, y - 10 - 560, 1120, 1120);
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    let yy = y + rise;
    if (c.kicker) {
      g.globalAlpha = e;
      const lw = 60 * ease.out(clamp((t - c.a) / 0.6));
      g.fillStyle = dark ? GOLD_L : GOLD;
      g.fillRect(x, yy - 70, lw, 2);
      g.fillStyle = dark ? GOLD_L : '#6b4a1a';
      g.globalAlpha = e * smooth(c.a + 0.15, c.a + 0.5, t);
      g.font = '500 24px "Plex Mono"';
      this.spaced(c.kicker, x, yy - 24, 6);
      yy += 58;
    }
    g.globalAlpha = e;
    g.fillStyle = dark ? IVORY : INK;
    if (dark) { g.shadowColor = 'rgba(0,0,20,0.6)'; g.shadowBlur = 22; }
    g.font = '600 72px "Cormorant"';
    g.fillText(c.main, x, yy);
    g.restore();
  }

  draw(t, s) {
    const g = this.g;
    g.clearRect(0, 0, W, H);
    // night prologue line
    const pe = envelope(t, 5.0, 6.9, 0.45, 0.45);
    if (pe > 0) {
      g.save(); g.textAlign = 'center'; g.globalAlpha = pe; g.fillStyle = IVORY; g.shadowColor = 'rgba(10,10,40,0.7)'; g.shadowBlur = 20;
      g.font = 'italic 500 50px "Cormorant"';
      g.fillText('Yorgun bir ülke.', W / 2 - 160, H - 150);
      g.globalAlpha = pe * smooth(5.7, 6.1, t);
      g.fillText('Ve bir karar.', W / 2 + 190, H - 150);
      g.restore();
    }
    for (const c of CAPTIONS) this.caption(t, c, s.dark);

    // city stamps of the light train
    for (const p of this.pins) {
      if (p.a <= 0.01) continue;
      g.save(); g.globalAlpha = p.a;
      g.fillStyle = s.dark ? IVORY : INK; g.strokeStyle = s.dark ? IVORY : INK; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(p.x, p.y - 10); g.lineTo(p.x, p.y - 62); g.stroke();
      g.beginPath(); g.arc(p.x, p.y, 5, 0, Math.PI * 2); g.fill();
      g.font = '500 22px "Plex Mono"'; g.textAlign = 'left';
      g.fillStyle = s.dark ? GOLD_L : '#a8331c'; this.spaced(p.year, p.x + 10, p.y - 72, 4);
      g.fillStyle = s.dark ? IVORY : INK; this.spaced(p.label, p.x + 10, p.y - 44, 5);
      g.restore();
    }

    // the dial counts the Republic's years
    if (t > T.dial && t < T.reveal + 1.4) {
      const e = envelope(t, T.dial + 0.5, T.reveal + 1.3, 0.6, 0.7);
      const spin = ease.inOut(clamp((t - T.years0) / (T.years1 - T.years0)));
      const year = Math.round(1923 + spin * 103);
      g.save(); g.globalAlpha = e; g.textAlign = 'center';
      g.fillStyle = GOLD_L; g.font = '500 25px "Plex Mono"';
      this.spaced('CUMHURİYET', 1430, 330, 10);
      g.fillStyle = IVORY; g.shadowColor = 'rgba(40,20,40,0.5)'; g.shadowBlur = 30;
      g.font = '500 270px "Bodoni"';
      g.fillText(String(year), 1430, 590);
      g.globalAlpha = e * smooth(T.years1 + 0.05, T.years1 + 0.6, t);
      g.font = '600 66px "Cormorant"';
      g.fillText('Cumhuriyet’in 103 yılı', 1430, 715);
      g.restore();
    }

    // closing greeting (no place name: the whole country celebrates)
    if (t > T.greet) {
      const e = smooth(T.greet, T.greet + 0.9, t);
      g.save(); g.textAlign = 'center'; g.globalAlpha = e;
      const sc = g.createRadialGradient(W / 2, 905, 30, W / 2, 905, 760);
      sc.addColorStop(0, 'rgba(8,16,60,0.55)'); sc.addColorStop(1, 'rgba(8,16,60,0)');
      g.fillStyle = sc; g.fillRect(0, 600, W, 480);
      g.fillStyle = IVORY; g.shadowColor = 'rgba(0,0,30,0.7)'; g.shadowBlur = 26;
      g.font = '600 74px "Cormorant"';
      g.fillText('29 Ekim Cumhuriyet Bayramımız kutlu olsun.', W / 2, 930 + (1 - ease.out(clamp((t - T.greet) / 1.0))) * 16);
      g.restore();
    }
    this.tex.needsUpdate = true;
  }
}
