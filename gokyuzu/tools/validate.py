"""Compares src/astro.js against astropy for random dates/places.
Run: python3 tools/validate.py  (needs node and astropy)."""
import json, random, subprocess, pathlib, warnings
import numpy as np
from astropy.utils import iers
iers.conf.auto_download = False
iers.conf.iers_degraded_accuracy = 'warn'
warnings.filterwarnings('ignore')
from astropy.time import Time
from astropy.coordinates import EarthLocation, AltAz, get_body, SkyCoord, solar_system_ephemeris
import astropy.units as u

root = pathlib.Path(__file__).resolve().parent.parent
random.seed(7)
cases = []
for _ in range(60):
    y = random.randint(1940, 2049)
    t = Time(f'{y}-01-01T00:00:00', scale='utc') + random.uniform(0, 365) * u.day
    cases.append((t.unix * 1000, random.uniform(-45, 65), random.uniform(-150, 150)))

js = r"""
const A = require('%s/src/astro.js');
const D = require('%s/src/data.json');
const cases = %s, out = [];
for (const [ms, lat, lon] of cases) {
  const s = A.sky(new Date(ms), lat, lon), r = {};
  for (const k in s.bodies) { const b = s.bodies[k]; r[k] = [b.alt, b.az, A.constellationAt(b.j2000.ra, b.j2000.dec, D.bounds)]; }
  r.illum = s.bodies.moon.illum;
  const vi = D.named['Vega'] * 4, si = D.named['Sirius'] * 4;
  const v = s.toDate(D.stars[vi], D.stars[vi+1]), si2 = s.toDate(D.stars[si], D.stars[si+1]);
  r.vega = Object.values(s.altAzOf(v.ra, v.dec)); r.sirius = Object.values(s.altAzOf(si2.ra, si2.dec));
  out.push(r);
}
console.log(JSON.stringify(out));
""" % (root, root, json.dumps(cases))
res = json.loads(subprocess.run(['node', '-e', js], capture_output=True, text=True, check=True).stdout)

def sep(a1, z1, a2, z2):
    a1, z1, a2, z2 = map(np.radians, (a1, z1, a2, z2))
    return np.degrees(np.arccos(np.clip(np.sin(a1)*np.sin(a2) + np.cos(a1)*np.cos(a2)*np.cos(z1-z2), -1, 1)))

errs = {}; cons_bad = []; illum_err = []
with solar_system_ephemeris.set('builtin'):
    for (ms, lat, lon), r in zip(cases, res):
        t = Time(ms / 1000, format='unix')
        loc = EarthLocation(lat=lat*u.deg, lon=lon*u.deg)
        frame = AltAz(obstime=t, location=loc, pressure=0)
        for k in ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']:
            b = get_body(k, t, loc)
            aa = b.transform_to(frame)
            errs.setdefault(k, []).append(sep(r[k][0], r[k][1], aa.alt.deg, aa.az.deg))
            ref = b.get_constellation(short_name=True)
            if r[k][2] != ref and k != 'moon' or (k == 'moon' and r[k][2] != ref):
                cons_bad.append((k, Time(ms/1000, format='unix').iso[:10], r[k][2], ref))
        for name, (ra, dec) in [('vega', (279.2347, 38.7837)), ('sirius', (101.2872, -16.7161))]:
            aa = SkyCoord(ra=ra*u.deg, dec=dec*u.deg).transform_to(frame)
            errs.setdefault(name, []).append(sep(r[name][0], r[name][1], aa.alt.deg, aa.az.deg))
        sun, moon = get_body('sun', t, loc), get_body('moon', t, loc)
        el = sun.separation(moon).rad
        pa = np.arctan2(sun.distance.km*np.sin(el), moon.distance.km - sun.distance.km*np.cos(el))
        illum_err.append(abs(r['illum'] - (1+np.cos(pa))/2))

for k, v in errs.items():
    print(f'{k:8s} max {max(v):.3f}°  mean {np.mean(v):.3f}°')
print(f'moon illumination max err {max(illum_err)*100:.2f}%')
print(f'constellation mismatches: {len(cons_bad)} / {len(cases)*9}')
for c in cons_bad: print('  ', c)
