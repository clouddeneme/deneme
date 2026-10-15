"""Assembles dist/gokyuzu.html from src/template.html, src/astro.js and src/data.json."""
import pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'src' / 'template.html').read_text(encoding='utf-8')
html = html.replace('/*ASTRO*/', (root / 'src' / 'astro.js').read_text(encoding='utf-8'))
html = html.replace('/*DATA*/null', (root / 'src' / 'data.json').read_text(encoding='utf-8'))
out = root / 'dist' / 'gokyuzu.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding='utf-8')
print(out, out.stat().st_size, 'bytes')
