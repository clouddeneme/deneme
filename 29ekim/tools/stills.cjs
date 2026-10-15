// Renders selected frames to PNG: node tools/stills.cjs out_dir t1 t2 ...
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path');
(async () => {
  const [out, ...times] = process.argv.slice(2);
  require('fs').mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  pg.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text()); });
  pg.on('pageerror', e => { errs.push('pageerror: ' + e); console.log('pageerror: ' + e); process.exit(1); });
  await pg.goto('http://127.0.0.1:8123/29ekim/' + (process.env.PAGE || 'src') + '/index.html');
  await pg.waitForFunction(() => window.ready || window.initError, null, { timeout: 180000 });
  const ie = await pg.evaluate(() => window.initError);
  if (ie) { console.log('INIT ERROR', ie); process.exit(1); }
  for (const t of times) {
    const t0 = Date.now();
    await pg.evaluate(t => window.renderAt(t), parseFloat(t));
    const dataUrl = await pg.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
    require('fs').writeFileSync(path.join(out, `t${String(t).padStart(5, '0')}.png`), Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log('t', t, (Date.now() - t0) + 'ms');
  }
  console.log([...new Set(errs)].slice(0, 15).join('\n') || 'no errors');
  await b.close();
})();
