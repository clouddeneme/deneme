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

# Standalone page for GitHub Pages / any static host: full document with viewport meta.
reset = (':root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
         'body{margin:0}img{max-width:100%}[hidden]{display:none!important}')
page = ('<!doctype html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<meta name="description" content="Doğduğun an, doğduğun yerden görünen gökyüzü: yıldızlar, Ay ve gezegenler.">\n'
        '<meta name="theme-color" content="#070b18">\n'
        f'<style>{reset}</style>\n</head>\n<body>\n' + html + '\n</body>\n</html>\n')
idx = root / 'index.html'
idx.write_text(page, encoding='utf-8')
print(idx, idx.stat().st_size, 'bytes')
