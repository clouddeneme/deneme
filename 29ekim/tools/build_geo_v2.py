"""Builds v2/geo.json: Türkiye (detailed), neighbours, Kocaeli, provinces and places.
Same projection as v1: x = (lon - 35.2) * cos(39 deg), y = lat - 39 (1 unit = 1 deg latitude)."""
import json, math, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
LON0, LAT0 = 35.2, 39.0
K = math.cos(math.radians(LAT0))
proj = lambda lon, lat: [round((lon - LON0) * K, 4), round(lat - LAT0, 4)]
def rings_of(g):
    polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    return [p[0] for p in polys]
def simplify(r, tol):
    out = [r[0]]
    for p in r[1:]:
        if math.hypot(p[0] - out[-1][0], p[1] - out[-1][1]) >= tol: out.append(p)
    return out
def area(r): return abs(sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r)))) / 2
world = json.load(open(root / 'data' / 'tur.geojson'))['features']
turkey, neigh = [], []
for f in world:
    a3 = f['properties'].get('ADM0_A3')
    for ring in rings_of(f['geometry']):
        lons = [p[0] for p in ring]; lats = [p[1] for p in ring]
        if max(lons) < 14 or min(lons) > 56 or max(lats) < 26 or min(lats) > 52: continue
        pr = [proj(*p) for p in ring]
        if a3 == 'TUR':
            if area(pr) > 0.003: turkey.append(simplify(pr, 0.012))
        elif area(pr) > 0.02:
            neigh.append(simplify(pr, 0.05))
cities = json.load(open(root / 'data' / 'tr-cities.json'))['features']
koc = None; prov = []
POP = {'İstanbul': 15.7, 'Ankara': 5.8, 'İzmir': 4.5, 'Bursa': 3.2, 'Antalya': 2.7, 'Konya': 2.3, 'Adana': 2.3, 'Şanlıurfa': 2.2,
       'Gaziantep': 2.2, 'Kocaeli': 2.1, 'Mersin': 1.9, 'Diyarbakır': 1.8, 'Hatay': 1.5, 'Manisa': 1.5, 'Kayseri': 1.4, 'Samsun': 1.4}
for f in cities:
    rs = [[proj(*p) for p in r] for r in rings_of(f['geometry'])]
    big = max(rs, key=area)
    if f['properties']['name'] == 'Kocaeli': koc = simplify(big, 0.008)
    prov.append({'n': f['properties']['name'], 'c': [round(sum(p[0] for p in big) / len(big), 3), round(sum(p[1] for p in big) / len(big), 3)], 'w': POP.get(f['properties']['name'], 0.5)})
PLACES = {'Ankara': (32.86, 39.93), 'İzmit': (29.92, 40.77), 'İstanbul': (28.98, 41.01), 'Kayseri': (35.49, 38.73), 'Sivas': (37.02, 39.75),
          'Samsun': (36.33, 41.29), 'Erzurum': (41.27, 39.90), 'Irmak': (33.52, 39.85), 'Zonguldak': (31.79, 41.45), 'Fevzipaşa': (36.63, 37.10),
          'Malatya': (38.31, 38.35), 'Diyarbakır': (40.24, 37.91), 'Ulukışla': (34.48, 37.55), 'Elazığ': (39.22, 38.67), 'Niğde': (34.68, 37.97)}
out = {'turkey': turkey, 'neighbours': neigh, 'kocaeli': koc, 'provinces': prov, 'places': {k: proj(*v) for k, v in PLACES.items()}}
(root / 'v2' / 'geo.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('turkey rings', len(turkey), sum(len(r) for r in turkey), 'pts | neighbours', len(neigh), sum(len(r) for r in neigh), 'pts | kocaeli', len(koc), '| size', (root / 'v2' / 'geo.json').stat().st_size)
