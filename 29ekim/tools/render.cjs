// Renders the film in 10-second segments straight into ffmpeg (no frames on disk).
// Resumable: finished segments are skipped. node tools/render.cjs out/segments
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
(async () => {
  const dir = process.argv[2]; fs.mkdirSync(dir, { recursive: true });
  const FPS = 30, SEG = +(process.env.SEG || 300), WORKER = +(process.env.WORKER || 0), WORKERS = +(process.env.WORKERS || 1);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  pg.on('pageerror', e => { console.log('pageerror', e); process.exit(1); });
  await pg.goto('http://127.0.0.1:8123/29ekim/' + (process.env.PAGE || 'src') + '/index.html');
  await pg.waitForFunction(() => window.ready, null, { timeout: 300000 });
  const DUR = await pg.evaluate(() => window.DURATION), total = Math.round(FPS * DUR);
  for (let s0 = 0; s0 < total; s0 += SEG) {
    if ((s0 / SEG) % WORKERS !== WORKER) continue;
    const file = path.join(dir, `seg${String(s0 / SEG).padStart(2, '0')}.mp4`);
    if (fs.existsSync(file)) { console.log('skip', file); continue; }
    const tmp = file + '.part.mp4';
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-r', String(FPS), tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = s0; f < Math.min(total, s0 + SEG); f++) {
      const url = await pg.evaluate(t => { window.renderAt(t); return document.querySelector('canvas').toDataURL('image/png'); }, f / FPS);
      const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 30 === 0) console.log(`frame ${f}/${total}  ${((Date.now() - t0) / (f - s0 + 1) / 1000).toFixed(2)} s/frame`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    fs.renameSync(tmp, file);
    console.log('done', file, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  await b.close();
  console.log('ALL DONE');
})();
