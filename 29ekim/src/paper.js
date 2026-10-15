import * as THREE from 'three';
import { rng, clamp, smooth } from './util.js';
import { T, PAPER_X } from './timeline.js';

// A sheet of paper (a nod to the first domestic paper made in İzmit in 1936) on which the
// quote is written, letter by letter, in ink.
const LINES = ['Türkiye Cumhuriyeti', 'ilelebet payidar kalacaktır.'];
const W = 2048, H = 1366;

export class Paper {
  constructor() {
    this.canvas = document.createElement('canvas'); this.canvas.width = W; this.canvas.height = H;
    this.g = this.canvas.getContext('2d');
    this.base = this.makeBase();
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ map: this.tex, roughness: 0.92 });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 4.8 * H / W, 40, 26), mat);
    // a very slight curl
    const p = this.mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.025 * Math.cos(x * 0.9) + 0.015 * Math.sin(y * 1.7 + x)); }
    this.mesh.geometry.computeVertexNormals();
    this.group = new THREE.Group();
    this.group.add(this.mesh);
    const key = new THREE.SpotLight(0xfff0d8, 9, 20, 0.75, 0.85, 1.2); key.position.set(-2.2, 2.4, 3.2); key.target = this.mesh;
    const fill = new THREE.AmbientLight(0xffffff, 0.12);
    this.group.add(key, fill);
    this.group.position.set(PAPER_X, 0, 0);
    this.lastKey = '';
  }

  makeBase() {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#f2ebdb'; g.fillRect(0, 0, W, H);
    const rand = rng(1936);
    // fibres
    for (let i = 0; i < 9000; i++) {
      const x = rand() * W, y = rand() * H, l = 6 + rand() * 26, a = rand() * Math.PI;
      g.strokeStyle = `rgba(${120 + rand() * 60},${100 + rand() * 50},${70 + rand() * 40},${0.04 + rand() * 0.06})`;
      g.lineWidth = 0.6 + rand() * 0.8;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    // soft mottling and deckled light falloff
    for (let i = 0; i < 140; i++) {
      const x = rand() * W, y = rand() * H, r = 60 + rand() * 260;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(150,120,80,${0.015 + rand() * 0.02})`); gr.addColorStop(1, 'rgba(150,120,80,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(60,40,20,0.22)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    return c;
  }

  update(t) {
    const on = t > T.quote - 0.2 && t < T.end + 0.1;
    this.group.visible = on;
    if (!on) return;
    const total = LINES.join('').length;
    const typed = Math.floor(clamp((t - (T.quote + 0.7)) / 3.0) * total);
    const sig = smooth(T.quote + 4.0, T.quote + 4.8, t);
    const key = typed + ':' + Math.round(sig * 20);
    if (key === this.lastKey) return;
    this.lastKey = key;
    const g = this.g;
    g.drawImage(this.base, 0, 0);
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.font = 'italic 500 150px "Cormorant"';
    let left = typed;
    LINES.forEach((line, li) => {
      const n = Math.max(0, Math.min(line.length, left)); left -= line.length;
      const shown = line.slice(0, n);
      const full = g.measureText(line).width, x0 = W / 2 - full / 2;
      g.textAlign = 'left';
      // ink: a faint bleed under a dense stroke
      g.fillStyle = 'rgba(25,20,16,0.18)'; g.fillText(shown, x0 + 1.5, 560 + li * 190 + 1.5);
      g.fillStyle = '#1b1712'; g.fillText(shown, x0, 560 + li * 190);
    });
    if (sig > 0) {
      g.globalAlpha = sig;
      g.textAlign = 'center';
      g.fillStyle = '#5b2a1c';
      g.font = '500 54px "Cormorant"';
      if ('letterSpacing' in g) g.letterSpacing = '10px';
      g.fillText('— MUSTAFA KEMAL ATATÜRK', W / 2, 1010);
      if ('letterSpacing' in g) g.letterSpacing = '0px';
      g.globalAlpha = 1;
    }
    this.tex.needsUpdate = true;
  }
}
