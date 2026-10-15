// Sıfırdan v2 timeline (seconds). 120 BPM: one bar = 2 s.
export const DURATION = 45;
export const FPS = 30;
export const T = {
  type0: 0.6, typeStep: 0.22,       // "29.10.1923"
  heat: 3.0, burst: 4.0,            // digits glow, then burst as the camera goes through the zero
  land: 6.6,                        // the hero ember lands on Kocaeli, coastlines ignite from there
  sunrise: 7.0,
  koc: 8.0, ankara: 10.4, letters: 11.6, rail: 14.0, vote: 16.0, dive: 17.0, block: 18.2,
  machine: 19.0, nip: 20.6, web: 21.0, cut: 23.5, write: 25.4, sign: 29.2, wind: 31.0,
  dial: 31.6, years0: 32.6, years1: 36.0, reveal: 36.4, lanterns: 38.5, top: 41.6, greet: 42.8, tick: 44.6,
};
export const TOWER_X = 200;
// map units -> world (map lies on the XZ plane, north = -z, altitude = +y)
export const W = (x, y, alt = 0) => [x, alt, -y];
