// Renders the score to WAV: node tools/audio.cjs out.wav
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage();
  pg.on('pageerror', e => { console.log('pageerror', e); process.exit(1); });
  await pg.goto('http://127.0.0.1:8123/29ekim/src/audio.html');
  await pg.waitForFunction(() => window.ready);
  const t0 = Date.now();
  const b64 = await pg.evaluate(() => window.renderWav());
  require('fs').writeFileSync(process.argv[2], Buffer.from(b64, 'base64'));
  console.log('audio rendered in', Date.now() - t0, 'ms');
  await b.close();
})();
