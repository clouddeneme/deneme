// Doğduğun Gecenin Gökyüzü: astronomy core.
// Positions of stars (J2000 catalog, precessed to date), Sun, Moon and planets
// for a given UTC instant and observer. Accuracy goal: well under 1 degree,
// which is far finer than the chart can show.
(function (root) {
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const norm360 = x => ((x % 360) + 360) % 360;
  const sind = x => Math.sin(x * D2R), cosd = x => Math.cos(x * D2R);

  function julianDay(date) { return date.getTime() / 86400000 + 2440587.5; }
  function centuries(jd) { return (jd - 2451545.0) / 36525; }

  // Greenwich mean sidereal time, degrees.
  function gmst(jd) {
    const T = centuries(jd);
    return norm360(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T - T * T * T / 38710000);
  }

  // IAU 1976 precession matrix, J2000 -> mean equator of date.
  function precessionMatrix(T) {
    const as = 1 / 3600;
    const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T * T * T) * as * D2R;
    const z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T * T * T) * as * D2R;
    const th = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T * T * T) * as * D2R;
    const cz = Math.cos(z), sz = Math.sin(z), ct = Math.cos(th), st = Math.sin(th), cZ = Math.cos(zeta), sZ = Math.sin(zeta);
    return [
      [cz * ct * cZ - sz * sZ, -cz * ct * sZ - sz * cZ, -cz * st],
      [sz * ct * cZ + cz * sZ, -sz * ct * sZ + cz * cZ, -sz * st],
      [st * cZ, -st * sZ, ct],
    ];
  }
  function radecToVec(ra, dec) {
    const cd = cosd(dec);
    return [cd * cosd(ra), cd * sind(ra), sind(dec)];
  }
  function vecToRadec(v) {
    const r = Math.hypot(v[0], v[1], v[2]);
    return { ra: norm360(Math.atan2(v[1], v[0]) * R2D), dec: Math.asin(v[2] / r) * R2D };
  }
  function mul(M, v) {
    return [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
            M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
            M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]];
  }

  // Keplerian elements, JPL "Approximate Positions of the Planets", valid 1800-2050.
  // [a, e, I, L, varpi, Omega] and their rates per Julian century.
  const ELEMENTS = {
    mercury: [[0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593],
              [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]],
    venus:   [[0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255],
              [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418]],
    earth:   [[1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
              [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0]],
    mars:    [[1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
              [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]],
    jupiter: [[5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
              [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]],
    saturn:  [[9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
              [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]],
    uranus:  [[19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503],
              [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589]],
    neptune: [[30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
              [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]],
  };

  // Heliocentric ecliptic J2000 rectangular coordinates (AU).
  function helio(name, T) {
    const [e0, r] = ELEMENTS[name];
    const a = e0[0] + r[0] * T, e = e0[1] + r[1] * T, I = e0[2] + r[2] * T;
    const L = e0[3] + r[3] * T, varpi = e0[4] + r[4] * T, Om = e0[5] + r[5] * T;
    const w = varpi - Om;
    let M = norm360(L - varpi); if (M > 180) M -= 360;
    const eDeg = e * R2D;
    let E = M + eDeg * sind(M);
    for (let i = 0; i < 12; i++) {
      const dM = M - (E - eDeg * sind(E));
      const dE = dM / (1 - e * cosd(E));
      E += dE;
      if (Math.abs(dE) < 1e-8) break;
    }
    const xp = a * (cosd(E) - e), yp = a * Math.sqrt(1 - e * e) * sind(E);
    const cw = cosd(w), sw = sind(w), cO = cosd(Om), sO = sind(Om), cI = cosd(I), sI = sind(I);
    return [
      (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
      (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
      (sw * sI) * xp + (cw * sI) * yp,
    ];
  }
  const EPS0 = 23.43928;
  function eclToEq(v, eps) {
    const ce = cosd(eps), se = sind(eps);
    return [v[0], ce * v[1] - se * v[2], se * v[1] + ce * v[2]];
  }

  // Geocentric equatorial J2000 for a planet or the Sun, plus distance (AU).
  function planetJ2000(name, T) {
    const E = helio('earth', T);
    const P = name === 'sun' ? [0, 0, 0] : helio(name, T);
    const g = [P[0] - E[0], P[1] - E[1], P[2] - E[2]];
    const q = eclToEq(g, EPS0);
    const rd = vecToRadec(q);
    rd.dist = Math.hypot(g[0], g[1], g[2]);
    rd.rHelio = Math.hypot(P[0], P[1], P[2]);
    return rd;
  }

  // Moon, low-precision series (Meeus ch. 47 main terms). Returns equatorial of date.
  function moonOfDate(T) {
    const Lp = 218.3164477 + 481267.88123421 * T;
    const D = 297.8501921 + 445267.1114034 * T;
    const M = 357.5291092 + 35999.0502909 * T;
    const Mp = 134.9633964 + 477198.8675055 * T;
    const F = 93.2720950 + 483202.0175233 * T;
    const lon = Lp + 6.289 * sind(Mp) + 1.274 * sind(2 * D - Mp) + 0.658 * sind(2 * D) + 0.214 * sind(2 * Mp)
      - 0.186 * sind(M) - 0.114 * sind(2 * F) + 0.059 * sind(2 * D - 2 * Mp) + 0.057 * sind(2 * D - M - Mp)
      + 0.053 * sind(2 * D + Mp) + 0.046 * sind(2 * D - M) + 0.041 * sind(Mp - M) - 0.035 * sind(D)
      - 0.031 * sind(M + Mp) - 0.015 * sind(2 * F - 2 * D) + 0.011 * sind(Mp - 4 * D);
    const lat = 5.128 * sind(F) + 0.281 * sind(Mp + F) + 0.278 * sind(Mp - F) + 0.173 * sind(2 * D - F)
      + 0.055 * sind(2 * D - Mp + F) + 0.046 * sind(2 * D - Mp - F) + 0.033 * sind(2 * D + F) + 0.017 * sind(2 * Mp + F);
    const dist = 385001 - 20905 * cosd(Mp) - 3699 * cosd(2 * D - Mp) - 2956 * cosd(2 * D) - 570 * cosd(2 * Mp)
      + 246 * cosd(2 * Mp - 2 * D) - 205 * cosd(M - 2 * D) - 171 * cosd(Mp + 2 * D) - 152 * cosd(Mp + M - 2 * D);
    const eps = 23.439291 - 0.0130042 * T;
    const v = eclToEq(radecToVec(norm360(lon), lat), eps);
    const rd = vecToRadec(v);
    rd.dist = dist; rd.eclLon = norm360(lon); rd.eclLat = lat;
    return rd;
  }

  function altAz(ra, dec, lst, lat) {
    const H = lst - ra;
    const sa = sind(lat) * sind(dec) + cosd(lat) * cosd(dec) * cosd(H);
    const alt = Math.asin(Math.max(-1, Math.min(1, sa))) * R2D;
    const az = norm360(Math.atan2(-cosd(dec) * sind(H), sind(dec) * cosd(lat) - cosd(dec) * sind(lat) * cosd(H)) * R2D);
    return { alt, az };
  }

  function sepDeg(a, b) {
    const va = radecToVec(a.ra, a.dec), vb = radecToVec(b.ra, b.dec);
    const d = va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
    return Math.acos(Math.max(-1, Math.min(1, d))) * R2D;
  }

  // Constellation containing (ra, dec) J2000, from boundary polygons {id: [[ra,dec],...][]}.
  function constellationAt(ra, dec, bounds) {
    for (const id in bounds) {
      for (const ring of bounds[id]) {
        // RA relative to the test point, in -180..180. A ring with an edge jumping
        // across ±180 lies on the far side of the sky and cannot contain the point
        // (polar rings aside, which the Sun, Moon and planets never reach).
        const xs = ring.map(p => ((p[0] - ra + 540) % 360) - 180);
        let far = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) if (Math.abs(xs[i] - xs[j]) > 180) { far = true; break; }
        if (far) continue;
        let inside = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const xi = xs[i], yi = ring[i][1], xj = xs[j], yj = ring[j][1];
          if ((yi > dec) !== (yj > dec) && 0 < (xj - xi) * (dec - yi) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) return id;
      }
    }
    return null;
  }

  const PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

  // Everything the chart needs for one instant and place.
  function sky(date, lat, lon) {
    const jd = julianDay(date), T = centuries(jd);
    const P = precessionMatrix(T);
    const lst = norm360(gmst(jd) + lon);
    const toDate = (ra, dec) => vecToRadec(mul(P, radecToVec(ra, dec)));
    const bodies = {};
    const sunJ = planetJ2000('sun', T);
    for (const name of ['sun'].concat(PLANETS)) {
      const j = name === 'sun' ? sunJ : planetJ2000(name, T);
      const d = toDate(j.ra, j.dec);
      bodies[name] = Object.assign({ j2000: { ra: j.ra, dec: j.dec }, dist: j.dist, rHelio: j.rHelio }, d, altAz(d.ra, d.dec, lst, lat));
      bodies[name].elong = name === 'sun' ? 0 : sepDeg(j, sunJ);
    }
    const m = moonOfDate(T);
    const mh = altAz(m.ra, m.dec, lst, lat);
    const hp = Math.asin(6378.14 / m.dist) * R2D;
    mh.alt -= hp * cosd(mh.alt); // topocentric parallax in altitude
    // Moon J2000 for constellation lookup: inverse precession = transpose.
    const PT = [[P[0][0], P[1][0], P[2][0]], [P[0][1], P[1][1], P[2][1]], [P[0][2], P[1][2], P[2][2]]];
    const mj = vecToRadec(mul(PT, radecToVec(m.ra, m.dec)));
    const sunD = bodies.sun;
    const elong = sepDeg(m, sunD);
    const phaseAngle = Math.atan2(149597870.7 * sunJ.dist * sind(elong), m.dist - 149597870.7 * sunJ.dist * cosd(elong)) * R2D;
    const illum = (1 + cosd(phaseAngle)) / 2;
    const waxing = norm360(m.ra - sunD.ra) < 180; // Moon east of the Sun
    // Position angle of the bright limb (Meeus 48.5), measured from celestial north toward east.
    const chi = norm360(Math.atan2(cosd(sunD.dec) * sind(sunD.ra - m.ra),
      sind(sunD.dec) * cosd(m.dec) - cosd(sunD.dec) * sind(m.dec) * cosd(sunD.ra - m.ra)) * R2D);
    bodies.moon = Object.assign({ j2000: mj, dist: m.dist, illum, waxing, elong, limbPA: chi }, m, mh);
    return { jd, T, lst, lat, lon, P, toDate, bodies, altAzOf: (ra, dec) => altAz(ra, dec, lst, lat) };
  }

  const api = { julianDay, centuries, gmst, precessionMatrix, radecToVec, vecToRadec, mul, altAz, sepDeg,
    planetJ2000, moonOfDate, constellationAt, sky, PLANETS, norm360 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ASTRO = api;
})(typeof window !== 'undefined' ? window : this);
