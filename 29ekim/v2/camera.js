import * as THREE from 'three';

// One continuous camera. Keyframes are interpolated with a time-parameterised cubic Hermite
// spline (Catmull-Rom tangents), so velocity never jumps: the camera has inertia.
// key: { t, p:[x,y,z], q:[x,y,z] (look target), roll (deg), fov (deg), up:[x,y,z] }
function hermite(p0, p1, m0, m1, u, dt) {
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * dt * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * dt * m1;
}
export class Track {
  constructor(keys) {
    this.keys = keys.map(k => ({ roll: 0, fov: 35, up: [0, 1, 0], ...k }));
    const ch = k => [...k.p, ...k.q, k.roll, k.fov, ...k.up];
    this.vals = this.keys.map(ch);
    const n = this.keys.length, dim = this.vals[0].length;
    this.tan = this.vals.map((v, i) => {
      if (i === 0 || i === n - 1 || this.keys[i].stop) return new Array(dim).fill(0);
      const a = this.vals[i - 1], b = this.vals[i + 1], dt = this.keys[i + 1].t - this.keys[i - 1].t;
      return v.map((_, c) => (b[c] - a[c]) / dt);
    });
  }
  at(t) {
    const K = this.keys;
    if (t <= K[0].t) return this.unpack(this.vals[0]);
    if (t >= K[K.length - 1].t) return this.unpack(this.vals[K.length - 1]);
    let i = 0; while (K[i + 1].t < t) i++;
    const dt = K[i + 1].t - K[i].t, u = (t - K[i].t) / dt;
    const v = this.vals[i].map((_, c) => hermite(this.vals[i][c], this.vals[i + 1][c], this.tan[i][c], this.tan[i + 1][c], u, dt));
    return this.unpack(v);
  }
  unpack(v) { return { p: v.slice(0, 3), q: v.slice(3, 6), roll: v[6], fov: v[7], up: v.slice(8, 11) }; }
}

const _m = new THREE.Matrix4(), _f = new THREE.Vector3(), _u = new THREE.Vector3(), _q = new THREE.Quaternion();
export function applyCamera(cam, s) {
  cam.position.set(...s.p);
  _u.set(...s.up).normalize();
  _m.lookAt(cam.position, _f.set(...s.q), _u);
  cam.quaternion.setFromRotationMatrix(_m);
  if (s.roll) cam.quaternion.multiply(_q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(s.roll)));
  if (Math.abs(cam.fov - s.fov) > 1e-4) { cam.fov = s.fov; cam.updateProjectionMatrix(); }
  cam.updateMatrixWorld();
}
