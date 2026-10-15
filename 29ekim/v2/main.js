import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { clamp, lerp, smooth } from '../src/util.js';
import { T, DURATION, W as MW } from './timeline.js';
import { applyCamera } from './camera.js';
import { Sky } from './sky.js';
import { MapWorld } from './world.js';
import { DateText, Embers, buildLetters, Train } from './act1.js';
import { buildTrack } from './path.js';
import { PaperMachine } from './act2.js';
import { TowerWorld, FORM } from './act3.js';
import { Overlay } from './overlay.js';

const W = 1920, H = 1080;
const DEEP = new THREE.Color('#14286e');

const FINISH = {
  uniforms: { tDiffuse: { value: null }, uFade: { value: 1 }, uFadeCol: { value: new THREE.Vector3(0.08, 0.16, 0.43) }, uWhite: { value: 0 },
    uWhiteCol: { value: new THREE.Vector3(0.97, 0.95, 0.9) }, uTime: { value: 0 }, uGrain: { value: 0.03 }, uVignette: { value: 0.28 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uFade, uWhite, uTime, uGrain, uVignette; uniform vec3 uFadeCol, uWhiteCol; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime * 37.0) * 43758.5453); }
    void main(){
      vec2 d = vUv - 0.5;
      float ca = 0.0012 * dot(d, d) * 4.0;
      vec3 c = vec3(texture2D(tDiffuse, vUv + d * ca).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - d * ca).b);
      float v = 1.0 - uVignette * smoothstep(0.25, 0.85, length(d * vec2(1.0, 0.85)) * 1.25);
      c *= v;
      c += (hash(vUv * 1000.0) - 0.5) * uGrain;
      c = mix(c, uWhiteCol, uWhite);
      gl_FragColor = vec4(mix(uFadeCol, c, uFade), 1.0);
    }`,
};

async function init() {
  await Promise.all(['500 40px "Plex Mono"', '400 150px "Plex Mono"', '600 40px "Cormorant"', 'italic 500 40px "Cormorant"', '500 40px "Bodoni"']
    .map(f => document.fonts.load(f)));
  const geo = await (await fetch('./geo.json')).json();

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.domElement.style.width = '100vw'; renderer.domElement.style.height = '56.25vw';
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.01, 2500);
  scene.add(camera);

  // ---- act 1: the map world
  const sky = new Sky(); scene.add(sky.mesh, sky.sun, sky.sun.target, sky.hemi);
  const world = new MapWorld(geo); scene.add(world.group);
  const iz = geo.places['İzmit'], an = geo.places['Ankara'], er = geo.places['Erzurum'];
  const I = MW(iz[0], iz[1]), A = MW(an[0], an[1]), E = MW(er[0], er[1]);
  // the date hangs in the dawn sky west of Kocaeli, facing the camera (reads north -> south)
  const plex = await new Promise((res, rej) => new TTFLoader().load('../fonts/IBMPlexMono-Regular.ttf', res, undefined, rej));
  const date = new DateText([0, 0, 0], [0, 0, 1], plex);
  date.place(new THREE.Vector3(I[0] - 2.2, 6.0, I[2] - date.zeroX));
  scene.add(date.mesh);
  const machine = new PaperMachine(I, 0.175); scene.add(machine.group);
  const embers = new Embers(geo, date, machine.nip); scene.add(embers.points);
  const corridor = [[A[0] + 0.2, 0, A[2] + 0.05], [0.0, 0, 0.45]];
  const letters = await buildLetters(corridor); scene.add(letters.group);
  const train = new Train(world); scene.add(train.group);

  // ---- act 3: the tower world (far from the map, at x = 200)
  const tw = new TowerWorld(); scene.add(tw.group);

  const fog = new THREE.Fog(0xffffff, 4, 20);
  scene.fog = fog;

  const track = buildTrack({ I, A, E, date, world, corridor, machine, tower: tw.tower, form: FORM, numBox: tw.lanterns.numBox, heroAt: t => embers.heroAt(t) });
  window.__track = track; window.__world = world; window.__train = train; window.__renderer = renderer; window.__machine = machine; window.__camera = camera;

  // ---- post
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
  composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.8, 0.5, 0.3);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const finish = new ShaderPass(FINISH); composer.addPass(finish);
  const overlay = new Overlay();

  const focus = { x: 0, y: 0, z: 0, span: 2 };
  const v = new THREE.Vector3();
  // motion blur: average a few sub-frames on the fast camera moves (180-degree shutter)
  const accRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), qScene = new THREE.Scene(); qScene.add(quad);
  const accMat = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uW: { value: 1 } }, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D tSrc; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb * uW, 1.0); }' });
  const copyMat = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: accRT.texture } }, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb, 1.0); }' });
  const BLUR = [[3.9, 4.7], [13.3, 16.2], [16.9, 19.3], [20.1, 21.0], [30.9, 31.5], [36.4, 37.6], [39.6, 41.9]];
  const subframes = t => (window.noBlur ? 1 : BLUR.some(([a, b]) => t >= a && t <= b) ? 6 : 1);

  function renderAt(t) {
    const n = subframes(t);
    if (n === 1) { composer.renderToScreen = true; renderScene(t); }
    else {
      composer.renderToScreen = false;
      for (let i = 0; i < n; i++) {
        renderScene(t + ((i + 0.5) / n - 0.5) * (0.4 / 30));
        renderer.setRenderTarget(accRT); if (i === 0) renderer.clear();
        accMat.uniforms.tSrc.value = composer.readBuffer.texture; accMat.uniforms.uW.value = 1 / n; quad.material = accMat;
        renderer.autoClear = false; renderer.render(qScene, ortho); renderer.autoClear = true;
      }
      renderer.setRenderTarget(null); quad.material = copyMat; renderer.render(qScene, ortho);
    }
    overlayFor(t);
    renderer.autoClear = false; renderer.clearDepth();
    renderer.render(overlay.scene, overlay.cam);
    renderer.autoClear = true;
  }

  function renderScene(t) {
    const cs = window.camOverride || track.at(t);
    applyCamera(camera, cs);
    const towerWorld = t >= 31.51;
    const near = t > 19.9 && t < 21.2 ? 0.002 : towerWorld ? 0.05 : 0.01;
    if (camera.near !== near) { camera.near = near; camera.updateProjectionMatrix(); }
    focus.x = cs.q[0]; focus.y = Math.max(0, cs.q[1]); focus.z = cs.q[2];
    focus.span = towerWorld ? clamp(camera.position.distanceTo(new THREE.Vector3(...cs.q)) * 0.6, 8, 90) : clamp(camera.position.distanceTo(new THREE.Vector3(...cs.q)) * 0.9, 0.6, 9);
    const st = sky.update(t, camera, focus);
    renderer.toneMappingExposure = st.exposure;
    fog.color.copy(st.hor).lerp(st.zen, 0.15);
    const alt = camera.position.y;
    fog.near = 3.5 + alt * 2.2; fog.far = 18 + alt * 6;
    if (towerWorld) { fog.near = 180; fog.far = 1300; }

    date.update(t); world.update(t); world.updateDecor(t, camera, st); machine.update(t, st.dir); tw.update(t, st, camera); embers.update(t); letters.update(t); train.update(t);
    train.smokeMat.uniforms.uScale.value = H / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    embers.mat.uniforms.uScale.value = H / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));

    // day/night grading
    const night = 1 - smooth(6.6, 8.6, t);
    bloom.strength = lerp(0.12, 0.95, night); bloom.threshold = lerp(0.97, 0.25, night); bloom.radius = lerp(0.3, 0.55, night);
    if (towerWorld) { const dusk = smooth(37.0, 40.5, t); bloom.strength = lerp(0.2, 0.75, dusk); bloom.threshold = lerp(0.92, 0.45, dusk); bloom.radius = 0.5; }

    // train stamps
    const pins = [];
    const stamp = (name, label, year, tc) => {
      const p = geo.places[name]; v.set(...MW(p[0], p[1], 0.07)).project(camera);
      const a = smooth(tc - 0.05, tc + 0.25, t) * (1 - smooth(tc + 1.1, tc + 1.5, t));
      if (v.z < 1) pins.push({ x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, label, year, a });
    };
    stamp('Ankara', 'ANKARA', '1923', T.ankara - 0.2);
    stamp('Kayseri', 'KAYSERİ', '1927', world.cityTimes.Kayseri);
    stamp('Sivas', 'SİVAS', '1930', world.cityTimes.Sivas);
    stamp('Erzurum', 'ERZURUM', '1939', world.cityTimes.Erzurum);
    overlay.pins = pins;
    finish.uniforms.uWhite.value = smooth(31.2, 31.47, t) * (1 - smooth(T.dial, T.dial + 0.7, t));
    finish.uniforms.uVignette.value = t > 24.5 && t < 31.6 ? 0.12 : 0.28;

    finish.uniforms.uTime.value = t;
    finish.uniforms.uFade.value = 1 - smooth(DURATION - 0.3, DURATION, t);

    composer.render();
  }
  function overlayFor(t) { overlay.draw(t, { dark: t < 7.4 || t > 31.5 }); }

  window.renderAt = renderAt;
  window.DURATION = DURATION;
  window.ready = true;
  const q = new URLSearchParams(location.search), hud = document.getElementById('hud');
  if (q.has('t')) { renderAt(parseFloat(q.get('t'))); hud.textContent = 't=' + q.get('t'); }
  else if (q.has('play')) {
    const t0 = performance.now() - parseFloat(q.get('play') || 0) * 1000;
    const loop = () => { const t = ((performance.now() - t0) / 1000) % DURATION; renderAt(t); hud.textContent = t.toFixed(2); requestAnimationFrame(loop); };
    loop();
  }
}
init().catch(e => { document.body.innerHTML = '<pre style="color:#f88">' + (e.stack || e) + '</pre>'; window.initError = String(e.stack || e); });
