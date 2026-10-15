# Builds zaman-aynasi.html from template.html, injecting the exact GLSL used by
# the TouchDesigner build script so the web and TD versions stay identical.
import json, pathlib, re
here = pathlib.Path(__file__).parent
src = (here.parent / 'build_zaman_aynasi.py').read_text(encoding='utf-8')
grab = lambda n: re.search(n + r" = r'''([\s\S]*?)'''", src).group(1)
shaders = {'write': grab('WRITE_GLSL'), 'read': grab('READ_GLSL'), 'demo': grab('DEMO_GLSL')}
html = (here / 'template.html').read_text(encoding='utf-8')
(here / 'zaman-aynasi.html').write_text(html.replace('/*SHADERS*/null', json.dumps(shaders, ensure_ascii=False)), encoding='utf-8')
