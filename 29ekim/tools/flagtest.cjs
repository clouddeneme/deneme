// Renders the flag flat and face-on, and the reference geometry, for a side-by-side check.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('http://127.0.0.1:8123/29ekim/src/index.html');
  await pg.waitForFunction(() => window.ready);
  const png = await pg.evaluate(async () => {
    const f = window.__flag;
    f.mat.uniforms.uAmp.value = 0;
    const c = f.centre(), th = f.group.rotation.y, n = [Math.sin(th), 0, Math.cos(th)];
    window.camOverride = { pos: [c.x + n[0] * 14, c.y, c.z + n[2] * 14], target: [c.x, c.y, c.z] };
    window.renderAt(55.2);
    return document.querySelector('canvas').toDataURL('image/png');
  });
  require('fs').writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
  await b.close();
})();
