import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { clamp, lerp, smooth, ease } from './util.js';
import { T, DURATION, TOWER_X, PAPER_X } from './timeline.js';
import { Particles } from './particles.js';
import { MapLines } from './maplines.js';
import { Tower } from './tower.js';
import { Flag } from './flag.js';
import { Fireworks } from './fireworks.js';
import { buildSky } from './sky.js';
import { Paper } from './paper.js';
import { Overlay } from './overlay.js';

const W = 1920, H = 1080;

// The 1936 sheet: paper with a few printed columns, like the first page off the İzmit machine.
function printedSheet(base) {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 800;
  const g = c.getContext('2d');
  g.drawImage(base, 0, 0, 1200, 800);
  g.fillStyle = 'rgba(30,26,22,0.85)'; g.font = '600 64px "Cormorant"'; g.textAlign = 'center';
  g.fillText('Kocaeli', 600, 120);
  g.font = '400 30px "Plex Mono"'; g.fillStyle = 'rgba(30,26,22,0.6)'; g.fillText('1936', 600, 170);
  g.fillStyle = 'rgba(30,26,22,0.32)';
  for (let col = 0; col < 3; col++) for (let l = 0; l < 13; l++) {
    const w = 300 - ((l * 37 + col * 53) % 90);
    g.fillRect(90 + col * 360, 240 + l * 38, l === 12 ? w * 0.5 : w, 10);
  }
  return c;
}

const FINISH = {
  uniforms: { tDiffuse: { value: null }, uFade: { value: 1 }, uTime: { value: 0 }, uGrain: { value: 0.035 }, uVignette: { value: 0.32 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uFade, uTime, uGrain, uVignette; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime * 37.0) * 43758.5453); }
    void main(){
      vec2 d = vUv - 0.5;
      float ca = 0.0012 * dot(d, d) * 4.0;
      vec3 c = vec3(texture2D(tDiffuse, vUv + d * ca).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - d * ca).b);
      float v = 1.0 - uVignette * smoothstep(0.25, 0.85, length(d * vec2(1.0, 0.85)) * 1.25);
      c *= v;
      c += (hash(vUv * 1000.0) - 0.5) * uGrain;
      gl_FragColor = vec4(c * uFade, 1.0);
    }`,
};

function camKeys(geo) {
  const iz = geo.places['İzmit'];
  const ov = { pos: [0.4, -6.2, 21.5], target: [0.4, 0.15, 0] };
  const ovB = { pos: [0.65, -5.7, 20.6], target: [0.5, 0.2, 0] };
  const izA = { pos: [iz[0] + 0.6, iz[1] - 2.4, 6.0], target: [iz[0] + 0.35, iz[1] + 0.05, 0] };
  const izB = { pos: [iz[0] + 0.9, iz[1] - 2.0, 5.3], target: [iz[0] + 0.4, iz[1] + 0.05, 0] };
  const izC = { pos: [iz[0] + 0.5, iz[1] - 1.7, 4.6], target: [iz[0] + 0.3, iz[1] + 0.1, 0] };
  return {
    overview: ov, iz,
    final: { pos: [TOWER_X, 3.2, 39.2], target: [TOWER_X, 21, 0] },
    map: [
      [0, { pos: [0, 0, 30], target: [0, 0, 0] }],
      [5.4, { pos: [0, 0, 30], target: [0, 0, 0] }],
      [12.6, { pos: [0.3, -0.5, 27.5], target: [0, 0, 0] }],
      [16.6, ov], [18.1, ov], [20.3, izA], [24.6, izB], [26.2, ov], [37.2, ovB], [39.3, izC], [40, izC],
    ],
  };
}
function interp(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, a] = keys[i - 1], [t1, b] = keys[i];
      const u = ease.inOutSine(clamp((t - t0) / (t1 - t0)));
      return { pos: a.pos.map((v, k) => lerp(v, b.pos[k], u)), target: a.target.map((v, k) => lerp(v, b.target[k], u)) };
    }
  }
  return keys[keys.length - 1][1];
}

function cameraAt(t, K) {
  const TX = TOWER_X;
  if (window.camOverride) return window.camOverride;
  if (t < T.tower) return interp(K.map, t);
  if (t < T.dial - 0.2) {
    // slow orbit while the tower draws itself
    const u = ease.inOutSine(clamp((t - T.tower) / (T.dial - 0.2 - T.tower)));
    const ang = lerp(-0.78, 0.38, u), rad = lerp(31, 26.5, u), hgt = lerp(4.2, 7.8, u);
    return { pos: [TX + Math.sin(ang) * rad, hgt, Math.cos(ang) * rad], target: [TX, lerp(7.2, 8.8, u), 0] };
  }
  const orbitEnd = { pos: [TX + Math.sin(0.38) * 26.5, 7.8, Math.cos(0.38) * 26.5], target: [TX, 8.8, 0] };
  const dialA = { pos: [TX - 0.62, 10.04, 1.18 + 2.35], target: [TX + 0.42, 10.04, 1.18] };
  const dialB = { pos: [TX - 0.55, 10.04, 1.18 + 2.08], target: [TX + 0.38, 10.04, 1.18] };
  const fc = K.flagCentre;
  const flagA = { pos: [fc.x - 6.0, fc.y - 3.4, fc.z + 15.5], target: [fc.x + 0.3, fc.y + 0.2, fc.z] };
  const flagB = { pos: [fc.x - 1.5, fc.y - 2.6, fc.z + 13.2], target: [fc.x + 0.2, fc.y + 0.3, fc.z] };
  const wideA = { pos: [TX - 6.5, 1.7, 45], target: [TX + 3.4, 12.2, -4] };
  const wideB = { pos: [TX - 3.5, 2.0, 41], target: [TX + 3.0, 12.8, -4] };
  if (t < T.quote) return interp([[T.dial - 0.2, orbitEnd], [T.dial + 1.3, dialA], [53.5, dialB], [54.7, { pos: [TX + 2.0, 12.0, 13.5], target: [TX + 7.0, 18.5, -4] }], [55.8, flagA], [59.6, flagB], [62.4, wideA], [T.quote, wideB]], t);
  if (t < T.end) {
    const u = ease.inOutSine(clamp((t - T.quote) / (T.end - T.quote)));
    return { pos: [PAPER_X + lerp(0.18, 0, u), lerp(-0.06, 0, u), lerp(3.95, 3.3, u)], target: [PAPER_X, 0, 0] };
  }
  const u = ease.inOutSine(clamp((t - T.end) / (DURATION - T.end)));
  return { pos: [TX, lerp(3.0, 3.4, u), lerp(40, 38.4, u)], target: [TX, 21, 0] };
}

function fadeAt(t) {
  const dips = [[39.55, 40.0, 40.35], [64.55, 65.0, 65.45], [70.6, 71.0, 71.4]];
  let f = smooth(0, 0.4, t) * (1 - smooth(DURATION - 0.7, DURATION - 0.05, t));
  for (const [a, m, b] of dips) if (t > a && t < b) f *= t < m ? 1 - smooth(a, m, t) : smooth(m, b, t);
  return f;
}

async function init() {
  await Promise.all(['400 40px "Plex Mono"', '600 40px "Cormorant"', 'italic 500 40px "Cormorant"', '600 40px "Bodoni"', '500 40px "Bodoni"']
    .map(f => document.fonts.load(f)));
  const geo = await (await fetch('./geo.json')).json();
  const K = camKeys(geo);

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.domElement.style.width = '100vw'; renderer.domElement.style.height = '56.25vw';
  renderer.localClippingEnabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020308);
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.05, 3000);

  const particles = new Particles(geo, K);
  scene.add(particles.points);
  const lines = new MapLines(geo); scene.add(lines.group);
  const tower = new Tower(); scene.add(tower.group);
  const tp = tower.samplePoints(); particles.setTowerPoints(tp.pts, tp.hs);
  const flag = new Flag(); scene.add(flag.group);
  K.flagCentre = flag.centre();
  window.__flag = flag;
  const fw = new Fireworks(); scene.add(fw.attach(particles.mat));
  const sky = await buildSky(particles.mat); scene.add(sky);
  const paper = new Paper(); scene.add(paper.group);
  const overlay = new Overlay();
  // 1936: a sheet of the first domestic paper lifts off İzmit
  const sheetMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(printedSheet(paper.base)), color: 0x8f887c, transparent: true, side: THREE.DoubleSide });
  sheetMat.map.colorSpace = THREE.SRGBColorSpace;
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.48), sheetMat);
  const sheetPivot = new THREE.Group(); sheetPivot.add(sheet); scene.add(sheetPivot);
  sheet.position.y = -0.24; sheet.geometry.translate(0, 0, 0);
  const iz = K.iz;
  const fog = new THREE.FogExp2(0x05070d, 0.0045);

  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
  composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 1.0, 0.55, 0.12);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const finish = new ShaderPass(FINISH); composer.addPass(finish);

  const look = new THREE.Vector3();
  function renderAt(t) {
    particles.update(t);
    lines.update(t);
    tower.update(t);
    flag.update(t, fw.flash(t));
    fw.update(t);
    sky.userData.update(t);
    paper.update(t);

    const c = cameraAt(t, K);
    camera.position.set(...c.pos);
    look.set(...c.target); camera.lookAt(look);
    camera.updateMatrixWorld();
    const dist = camera.position.distanceTo(look);
    particles.mat.uniforms.uSizeMul.value = t < T.tower ? clamp(dist / 21, 0.32, 1.0) : 1.0;

    // 1936 paper sheet
    const sp = ease.out(clamp((t - 37.9) / 1.1));
    sheetPivot.visible = t > 37.8 && t < 40;
    sheetPivot.position.set(iz[0] + 0.42, iz[1] + 0.5 + 0.12 * sp, 0.08 + 0.55 * sp);
    sheetPivot.lookAt(camera.position);
    sheetPivot.rotateZ(-0.12 + 0.06 * Math.sin(t * 1.3));
    sheet.scale.set(1, Math.max(0.001, sp), 1); sheet.position.y = -0.24 * sp;
    sheetMat.opacity = smooth(37.8, 38.2, t) * (1 - smooth(39.4, 39.9, t));
    flag.group.position.y = t >= T.end ? 6 : 0;

    // map labels follow their places on screen
    const pins = [];
    const proj = (x, y, label, a) => { if (a <= 0.01) return; const v = new THREE.Vector3(x, y, 0).project(camera); pins.push({ x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, label, a }); };
    const izA = Math.max(smooth(18.8, 19.6, t) * (1 - smooth(24.4, 25.0, t)), smooth(37.7, 38.3, t) * (1 - smooth(39.3, 39.8, t)));
    proj(iz[0], iz[1], 'KOCAELİ', izA);
    const an = geo.places['Ankara'];
    proj(an[0], an[1], 'ANKARA', smooth(T.wave - 0.2, T.wave + 0.4, t) * (1 - smooth(T.wave + 2.4, T.wave + 2.9, t)));
    overlay.pins = pins;

    // per-act look
    const towerAct = t >= T.tower && t < T.quote, paperAct = t >= T.quote && t < T.end, finalAct = t >= T.end;
    scene.fog = towerAct || finalAct ? fog : null;
    scene.background.set(paperAct ? 0x0b0806 : towerAct || finalAct ? 0x03050b : 0x020308);
    if (towerAct) {
      const fireworks = smooth(T.fireworks - 0.5, T.fireworks + 0.5, t);
      bloom.strength = lerp(0.55, 0.85, fireworks); bloom.threshold = lerp(0.82, 0.9, fireworks); bloom.radius = 0.6;
    } else if (paperAct) { bloom.strength = 0.1; bloom.threshold = 0.95; bloom.radius = 0.4; }
    else if (finalAct) { bloom.strength = 0.8; bloom.threshold = 0.55; bloom.radius = 0.65; }
    else { bloom.strength = 0.85; bloom.threshold = 0.28; bloom.radius = 0.5; }
    overlay.draw(t, { dateAscent: particles.dateAscent });
    finish.uniforms.uFade.value = fadeAt(t);
    finish.uniforms.uTime.value = t;

    composer.render();
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(overlay.scene, overlay.cam);
    renderer.autoClear = true;
  }

  window.renderAt = renderAt;
  window.DURATION = DURATION;
  window.ready = true;

  const q = new URLSearchParams(location.search);
  const hud = document.getElementById('hud');
  if (q.has('t')) { renderAt(parseFloat(q.get('t'))); hud.textContent = 't=' + q.get('t'); }
  else if (q.has('play')) {
    const t0 = performance.now() - parseFloat(q.get('play') || 0) * 1000;
    const loop = () => { const t = ((performance.now() - t0) / 1000) % DURATION; renderAt(t); hud.textContent = t.toFixed(2); requestAnimationFrame(loop); };
    loop();
  }
}
init().catch(e => { document.body.innerHTML = '<pre style="color:#f88">' + (e.stack || e) + '</pre>'; window.initError = String(e.stack || e); });
