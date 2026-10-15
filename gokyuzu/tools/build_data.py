"""Compacts the d3-celestial catalog (BSD-3, Olaf Frohn) into src/data.json.

Usage: python3 tools/build_data.py <d3-celestial data dir>
Stars are stored as flat arrays [ra, dec, mag, bv, ...] with RA in 0..360.
"""
import json, sys, pathlib

src = pathlib.Path(sys.argv[1])
out = pathlib.Path(__file__).resolve().parent.parent / 'src' / 'data.json'
load = lambda n: json.load(open(src / n, encoding='utf-8'))
r = lambda x, n=2: round(x, n)
ra360 = lambda x: r(x % 360, 3)

stars = load('stars.6.json')['features']
names = load('starnames.json')
star_flat, named = [], {}
for f in sorted(stars, key=lambda f: f['properties']['mag']):
    ra, dec = f['geometry']['coordinates']
    p = f['properties']
    try:
        bv = float(p['bv'])
    except (TypeError, ValueError):
        bv = 0.6
    star_flat += [ra360(ra), r(dec, 3), r(p['mag'], 2), r(bv, 2)]
    nm = names.get(str(f['id']), {}).get('name', '')
    if nm:
        named[nm] = len(star_flat) // 4 - 1

cons = {}
for f in load('constellations.json')['features']:
    p = f['properties']
    lon, lat = f['geometry']['coordinates']
    cons.setdefault(f['id'], {'tr': p['tr'].replace(' ', ' '), 'la': p['name'],
                              'pos': [ra360(lon), r(lat)], 'rank': int(p['rank'])})

lines = {}
for f in load('constellations.lines.json')['features']:
    lines[f['id']] = [[[ra360(a), r(b)] for a, b in seg] for seg in f['geometry']['coordinates']]

bounds = {}
for f in load('constellations.bounds.json')['features']:
    g = f['geometry']
    polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    bounds.setdefault(f['id'], [])
    for poly in polys:
        bounds[f['id']].append([[ra360(a), r(b, 3)] for a, b in poly[0]])

mw = []
for f in load('mw.json')['features']:
    level = []
    for poly in f['geometry']['coordinates']:
        ring = poly[0]
        step = 2 if len(ring) > 40 else 1
        pts = [[ra360(a), r(b, 1)] for a, b in ring[::step]]
        if len(pts) >= 4:
            level.append(pts)
    mw.append(level)

data = {'stars': star_flat, 'named': named, 'cons': cons, 'lines': lines, 'bounds': bounds, 'mw': mw}
out.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(out, out.stat().st_size, 'bytes,', len(star_flat) // 4, 'stars,', len(named), 'named')
