// Evaluate an expression in the loaded page: PAGE=v2 node tools/eval.cjs "expr"
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  pg.on('pageerror', e => { console.log('pageerror: ' + e); process.exit(1); });
  await pg.goto('http://127.0.0.1:8123/29ekim/' + (process.env.PAGE || 'v2') + '/index.html');
  await pg.waitForFunction(() => window.ready || window.initError, null, { timeout: 180000 });
  const r = await pg.evaluate(e => { const v = eval(e); return typeof v === 'string' && v.startsWith('data:image') ? v : JSON.stringify(v); }, process.argv[2]);
  if (r.startsWith('data:image')) { require('fs').writeFileSync(process.argv[3] || 'eval.png', Buffer.from(r.split(',')[1], 'base64')); console.log('saved'); } else console.log(r);
  await b.close();
})();
