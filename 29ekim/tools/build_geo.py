"""Builds src/geo.json: Turkey outline, Kocaeli outline and weighted city-light seeds.

Inputs (data/): turkey.json (Natural Earth 10m, public domain),
tr-cities.json (cihadturhan/tr-geojson, province polygons).
Projection: x = (lon - LON0) * cos(LAT0), y = lat - LAT0  (1 unit = 1 degree of latitude).
"""
import json, math, pathlib, random

root = pathlib.Path(__file__).resolve().parent.parent
LON0, LAT0 = 35.2, 39.0
K = math.cos(math.radians(LAT0))
proj = lambda lon, lat: (round((lon - LON0) * K, 4), round(lat - LAT0, 4))

def rings_of(geom):
    polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
    return [poly[0] for poly in polys]

def simplify(ring, tol):
    # Radial distance simplification, enough for a glowing outline.
    out = [ring[0]]
    for p in ring[1:]:
        if math.hypot(p[0] - out[-1][0], p[1] - out[-1][1]) >= tol:
            out.append(p)
    if out[-1] != ring[-1]:
        out.append(ring[-1])
    return out

def area(ring):
    return abs(sum(ring[i][0] * ring[i - 1][1] - ring[i - 1][0] * ring[i][1] for i in range(len(ring)))) / 2

turkey = json.load(open(root / 'data' / 'turkey.json'))
outline = []
for ring in rings_of(turkey):
    pr = [proj(*p) for p in ring]
    if area(pr) < 0.01:
        continue
    outline.append(simplify(pr, 0.03))

cities = json.load(open(root / 'data' / 'tr-cities.json'))['features']
# Approximate provincial populations in millions (TÜİK, rounded). Only used to weight light density.
POP = {'İstanbul': 15.7, 'Ankara': 5.8, 'İzmir': 4.5, 'Bursa': 3.2, 'Antalya': 2.7, 'Konya': 2.3, 'Adana': 2.3,
       'Şanlıurfa': 2.2, 'Gaziantep': 2.2, 'Kocaeli': 2.1, 'Mersin': 1.9, 'Diyarbakır': 1.8, 'Hatay': 1.5,
       'Manisa': 1.5, 'Kayseri': 1.4, 'Samsun': 1.4, 'Balıkesir': 1.3, 'Tekirdağ': 1.2, 'Kahramanmaraş': 1.1,
       'Aydın': 1.1, 'Van': 1.1, 'Sakarya': 1.1, 'Denizli': 1.0, 'Muğla': 1.0, 'Eskişehir': 0.9, 'Mardin': 0.9,
       'Trabzon': 0.8, 'Malatya': 0.8, 'Erzurum': 0.75, 'Ordu': 0.75, 'Batman': 0.6, 'Afyonkarahisar': 0.75,
       'Sivas': 0.64, 'Tokat': 0.6, 'Elazığ': 0.6, 'Zonguldak': 0.6, 'Adıyaman': 0.6, 'Kütahya': 0.58,
       'Çorum': 0.53, 'Osmaniye': 0.55, 'Isparta': 0.45, 'Aksaray': 0.43, 'Düzce': 0.4, 'Çanakkale': 0.56,
       'Edirne': 0.41, 'Kırklareli': 0.37, 'Niğde': 0.37, 'Yozgat': 0.42, 'Uşak': 0.37, 'Muş': 0.4,
       'Siirt': 0.33, 'Bitlis': 0.35, 'Ağrı': 0.5, 'Rize': 0.35, 'Giresun': 0.45, 'Kastamonu': 0.38}
lights = []
rng = random.Random(1923)
kocaeli = None
for f in cities:
    name = f['properties']['name']
    rings = [[proj(*p) for p in r] for r in rings_of(f['geometry'])]
    if name == 'Kocaeli':
        kocaeli = [simplify(r, 0.01) for r in rings if area(r) > 0.002]
    big = max(rings, key=area)
    cx = sum(p[0] for p in big) / len(big)
    cy = sum(p[1] for p in big) / len(big)
    lights.append({'name': name, 'c': [round(cx, 3), round(cy, 3)], 'w': POP.get(name, 0.3),
                   'ring': simplify(big, 0.04)})

PLACES = {'Ankara': (32.86, 39.93), 'İzmit': (29.92, 40.77), 'İstanbul': (28.98, 41.01), 'Kayseri': (35.49, 38.73),
          'Sivas': (37.02, 39.75), 'Samsun': (36.33, 41.29), 'Erzurum': (41.27, 39.90), 'Irmak': (33.52, 39.85),
          'Zonguldak': (31.79, 41.45), 'Fevzipaşa': (36.63, 37.10), 'Malatya': (38.31, 38.35),
          'Diyarbakır': (40.24, 37.91), 'Ulukışla': (34.48, 37.55), 'Elazığ': (39.22, 38.67), 'Eskişehir': (30.52, 39.78)}
places = {k: proj(*v) for k, v in PLACES.items()}

out = {'outline': outline, 'kocaeli': kocaeli, 'provinces': lights, 'places': places}
(root / 'src' / 'geo.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('outline rings', len(outline), 'points', sum(len(r) for r in outline), '| kocaeli rings', len(kocaeli),
      '| provinces', len(lights), '| size', (root / 'src' / 'geo.json').stat().st_size)
