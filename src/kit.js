// World-building kit shared by every area: collision grid, interaction zones,
// minimap shapes, and the street furniture / vegetation props.
import * as THREE from 'three';
import { box, cyl, cone, ball, sign, seeded } from './builders.js';
import { m, neon, glass } from './gfx.js';

export const C = {
  grass: 0x6cc24a,
  grassDark: 0x58a53c,
  road: 0x55595f,
  walk: 0xc9cdd1,
  curb: 0xe8e8e8,
  paving: 0xe2d6bf,
  brick: 0xb5573b,
  brickCap: 0xe9e2d6,
  white: 0xf4f1ea,
  dark: 0x2f3440,
  wood: 0xa9713f,
  hedge: 0x3f8f3a,
  trunk: 0x7a5234,
  leaf: 0x3fa34d,
  leaf2: 0x55b85a,
  leaf3: 0x2f8a46,
  metal: 0x5d636e,
  lamp: 0xfff2b0,
  water: 0x2bb3e6,
  yellow: 0xffc83d,
};

const GRID = 12;

/** Create an empty world container with helper functions bound to it. */
export function createWorld(scene) {
  const W = {
    colliders: [], zones: [], updaters: [], refs: {},
    static: new THREE.Group(), // baked into a few big meshes after building
    dyn: new THREE.Group(), // animated things stay as they are
    map: { shapes: [], labels: [], lines: [] },
    grid: new Map(),
    pools: [],
    indoors: [], // roofed areas: the lighting is adjusted while you are inside
  };
  W.static.name = 'static';
  W.dyn.name = 'dynamic';
  scene.add(W.static, W.dyn);
  const S = W.static;

  /** Register a collision box. cam:true also stops the camera passing through. */
  W.solid = (x0, x1, z0, z1, y0, y1, cam = false) => {
    const c = { x0, x1, z0, z1, y0, y1, cam };
    W.colliders.push(c);
    if (W.gridReady) addToGrid(W, c);
    return c;
  };
  /** Visible box + matching collider. */
  W.block = (w, h, d, x, y, z, material, cam = true) => {
    const mesh = box(S, w, h, d, x, y, z, material);
    W.solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y, y + h, cam);
    return mesh;
  };
  /** Wall between two corners (axis aligned), with collider. */
  W.wallBox = (x0, x1, z0, z1, y0, y1, material, cam = true) =>
    W.block(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, y0, (z0 + z1) / 2, material, cam);
  /** Flat slab between two corners, top surface at `top`. */
  W.slab = (x0, x1, z0, z1, top, material, thick = 0.5) => {
    const mesh = box(S, x1 - x0, thick, z1 - z0, (x0 + x1) / 2, top - thick, (z0 + z1) / 2, material);
    mesh.castShadow = false;
    return mesh;
  };
  W.zone = (id, x, z, r, label, extra = {}) => { const zz = { id, x, z, r, label, ...extra }; W.zones.push(zz); return zz; };
  W.mapRect = (x0, x1, z0, z1, color, label = null) => {
    W.map.shapes.push({ x0, x1, z0, z1, color });
    if (label) W.map.labels.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, text: label });
  };
  W.mapLabel = (x, z, text) => W.map.labels.push({ x, z, text });
  W.mapLine = (pts, color, width, closed = true) => W.map.lines.push({ pts, color, width, closed });

  /** Colliders near a point (anything within a cell of it). */
  const EMPTY = [];
  W.near = (x, z) => W.grid.get(`${Math.floor(x / GRID)},${Math.floor(z / GRID)}`) || EMPTY;
  /** Colliders near a segment (for camera rays). */
  W.alongRay = (x0, z0, x1, z1) => {
    const out = new Set();
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / (GRID * 0.5)));
    for (let i = 0; i <= n; i++) for (const c of W.near(x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n)) out.add(c);
    return out;
  };
  W.finalize = () => {
    for (const c of W.colliders) addToGrid(W, c);
    W.gridReady = true;
  };
  /** Height of the walkable ground (pools are the only dips). */
  W.groundAt = (x, z) => {
    for (const p of W.pools) if (x > p.x0 + 0.3 && x < p.x1 - 0.3 && z > p.z0 + 0.3 && z < p.z1 - 0.3) return p.floatY;
    return 0;
  };
  /**
   * Areas: interiors that are only drawn while the camera is near them.
   * Between beginArea and endArea, everything added to W.static / W.dyn goes
   * into the area's own groups (baked separately, hidden when far away).
   */
  W.areas = [];
  W.beginArea = (name, b, margin = 10) => {
    const area = { name, ...b, margin, static: new THREE.Group(), dyn: new THREE.Group(), prev: [W.static, W.dyn] };
    area.static.userData.area = name; area.static.name = 'area:' + name;
    area.dyn.name = 'area-dyn:' + name;
    W.static.add(area.static); W.dyn.add(area.dyn);
    W.static = area.static; W.dyn = area.dyn;
    W.areas.push(area);
    return area;
  };
  W.endArea = ({ shadows = false } = {}) => {
    const a = W.areas[W.areas.length - 1];
    [W.static, W.dyn] = a.prev;
    delete a.prev;
    // under a roof the sun can't reach, so interior parts skip the shadow pass
    if (!shadows) for (const g of [a.static, a.dyn]) g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  };
  W.forest = new Forest();
  return W;
}

function addToGrid(W, c) {
  const pad = 2;
  for (let gx = Math.floor((c.x0 - pad) / GRID); gx <= Math.floor((c.x1 + pad) / GRID); gx++) {
    for (let gz = Math.floor((c.z0 - pad) / GRID); gz <= Math.floor((c.z1 + pad) / GRID); gz++) {
      const k = gx + ',' + gz;
      if (!W.grid.has(k)) W.grid.set(k, []);
      W.grid.get(k).push(c);
    }
  }
}

// ------------------------------------------------------------- vegetation
// Trees are drawn with instancing: a few draw calls for hundreds of trees.
const lowSphere = new THREE.IcosahedronGeometry(1, 1);
const trunkGeo = new THREE.CylinderGeometry(0.75, 1, 1, 7);
const coneGeo = new THREE.ConeGeometry(1, 1, 8);
const frondGeo = new THREE.BoxGeometry(1, 0.08, 0.32);

class Forest {
  constructor() { this.parts = new Map(); this.y = 0; }
  _add(kind, geo, color, p, s, r = new THREE.Euler()) {
    p.y += this.y;
    if (!this.parts.has(kind)) this.parts.set(kind, { geo, color, list: [] });
    this.parts.get(kind).list.push(new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(r), s));
  }
  round(x, z, s = 1, shade = 0) {
    const V = THREE.Vector3;
    this._add('trunk', trunkGeo, C.trunk, new V(x, 1.6 * s, z), new V(0.45 * s, 3.2 * s, 0.45 * s));
    const leaf = ['leafA', 'leafB', 'leafC'][shade % 3];
    const col = [C.leaf, C.leaf2, C.leaf3][shade % 3];
    this._add(leaf, lowSphere, col, new V(x, 4.4 * s, z), new V(2.4 * s, 2.1 * s, 2.4 * s));
    this._add(leaf, lowSphere, col, new V(x + 1.2 * s, 3.8 * s, z + 0.4 * s), new V(1.6 * s, 1.4 * s, 1.6 * s));
    this._add(leaf, lowSphere, col, new V(x - 0.9 * s, 5.4 * s, z - 0.5 * s), new V(1.5 * s, 1.3 * s, 1.5 * s));
  }
  pine(x, z, s = 1) {
    const V = THREE.Vector3;
    this._add('trunk', trunkGeo, C.trunk, new V(x, 1.2 * s, z), new V(0.35 * s, 2.4 * s, 0.35 * s));
    for (let i = 0; i < 3; i++) this._add('pine', coneGeo, 0x2c7a43, new V(x, (3 + i * 1.7) * s, z), new V((2.6 - i * 0.7) * s, 2.8 * s, (2.6 - i * 0.7) * s));
  }
  palm(x, z, s = 1, seed = 1) {
    const V = THREE.Vector3;
    const rnd = seeded(seed);
    const lean = (rnd() - 0.5) * 0.5;
    for (let i = 0; i < 6; i++) this._add('palmTrunk', trunkGeo, 0x9c7a50, new V(x + lean * i * 0.3, (0.5 + i * 1.1) * s, z), new V(0.3 * s, 1.15 * s, 0.3 * s));
    const top = new V(x + lean * 1.8, 6.9 * s, z);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rnd();
      const p = new V(top.x + Math.cos(a) * 1.5 * s, top.y - 0.35 * s, top.z + Math.sin(a) * 1.5 * s);
      this._add('frond', frondGeo, 0x3aa34a, p, new V(3.4 * s, 1, 1.4 * s), new THREE.Euler(0, -a, -0.35, 'YXZ'));
    }
    this._add('leafB', lowSphere, C.leaf2, top, new V(0.6 * s, 0.5 * s, 0.6 * s));
  }
  bush(x, z, s = 1, color = C.hedge) {
    const V = THREE.Vector3;
    const k = 'bush' + color;
    this._add(k, lowSphere, color, new V(x, 0.55 * s, z), new V(1.1 * s, 0.85 * s, 1.1 * s));
    this._add(k, lowSphere, color, new V(x + 0.7 * s, 0.45 * s, z + 0.3 * s), new V(0.8 * s, 0.65 * s, 0.8 * s));
  }
  flower(x, z, color) {
    const V = THREE.Vector3;
    this._add('flower' + color, lowSphere, color, new V(x, 0.45, z), new V(0.18, 0.16, 0.18));
    this._add('stem', trunkGeo, 0x3f8f3a, new V(x, 0.2, z), new V(0.04, 0.4, 0.04));
  }
  build(parent) {
    for (const p of this.parts.values()) {
      const mat = m(p.color);
      const inst = new THREE.InstancedMesh(p.geo, mat, p.list.length);
      p.list.forEach((mm, i) => inst.setMatrixAt(i, mm));
      inst.castShadow = true;
      inst.receiveShadow = true;
      inst.computeBoundingSphere();
      parent.add(inst);
    }
  }
}

// ----------------------------------------------------------------- props
/** Round tree with a trunk collider. */
export function tree(W, x, z, s = 1, collide = true, shade) {
  W.forest.round(x, z, s, shade ?? Math.abs(Math.round(x * 3 + z * 7)) % 3);
  if (collide) W.solid(x - 0.45 * s, x + 0.45 * s, z - 0.45 * s, z + 0.45 * s, 0, 3 * s);
}
export function pine(W, x, z, s = 1, collide = true) {
  W.forest.pine(x, z, s);
  if (collide) W.solid(x - 0.35 * s, x + 0.35 * s, z - 0.35 * s, z + 0.35 * s, 0, 3 * s);
}
export function palm(W, x, z, s = 1) {
  W.forest.palm(x, z, s, Math.abs(Math.round(x * 13 + z * 7)));
  W.solid(x - 0.35 * s, x + 0.35 * s, z - 0.35 * s, z + 0.35 * s, 0, 6 * s);
}

/** Street lamp; `dir` is the direction the arm points (radians, 0 = +z). */
export function lamp(W, x, z, dir = 0) {
  const S = W.static;
  cyl(S, 0.32, 0.4, x, 0, z, m('metal', 0x3a3f48), 10);
  cyl(S, 0.14, 6.2, x, 0, z, m('metal', 0x3a3f48), 8);
  const g = new THREE.Group();
  g.position.set(x, 6.1, z);
  g.rotation.y = dir;
  S.add(g);
  box(g, 0.12, 0.12, 1.6, 0, 0, 0.75, m('metal', 0x3a3f48));
  box(g, 0.55, 0.22, 0.9, 0, -0.18, 1.45, m('metal', 0x3a3f48));
  box(g, 0.45, 0.06, 0.75, 0, -0.24, 1.45, neon(0xfff2c0, 1.4));
  W.solid(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 0, 6.2);
}

/** rot 0: faces +z, 1: faces +x, 2: faces -z, 3: faces -x */
export function bench(W, x, z, rot = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = (rot * Math.PI) / 2;
  W.static.add(g);
  const wood = m('wood', 0xb07a45), iron = m('metal', 0x2f3440);
  for (let i = 0; i < 3; i++) box(g, 2.8, 0.1, 0.24, 0, 0.5, -0.3 + i * 0.28, wood);
  for (let i = 0; i < 2; i++) box(g, 2.8, 0.22, 0.08, 0, 0.75 + i * 0.3, -0.48, wood).rotation.x = -0.12;
  for (const s of [-1, 1]) {
    box(g, 0.1, 0.5, 0.8, s * 1.2, 0, 0, iron);
    box(g, 0.1, 0.72, 0.1, s * 1.2, 0.5, -0.46, iron);
    box(g, 0.1, 0.08, 0.6, s * 1.2, 0.75, 0, iron);
  }
  const along = rot % 2 === 0;
  W.solid(x - (along ? 1.4 : 0.5), x + (along ? 1.4 : 0.5), z - (along ? 0.5 : 1.4), z + (along ? 0.5 : 1.4), 0, 0.6);
}

/** Box hedge with rounded top bushes along it. */
export function hedge(W, x0, x1, z0, z1, h = 1.2) {
  W.block(x1 - x0, h, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, m(C.hedge), false);
  const along = x1 - x0 > z1 - z0;
  const len = along ? x1 - x0 : z1 - z0;
  const n = Math.max(1, Math.floor(len / 1.6));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = along ? x0 + (x1 - x0) * t : (x0 + x1) / 2, z = along ? (z0 + z1) / 2 : z0 + (z1 - z0) * t;
    ball(W.static, 0.9, 0.35, 0.9, x, h, z, m(C.hedge));
  }
}

export function planter(W, x, z, flower = 0xff6b9a, size = 1.6) {
  W.block(size, 0.8, size, x, 0, z, m('concrete', 0xd8d2c6), false);
  box(W.static, size - 0.25, 0.1, size - 0.25, x, 0.75, z, m(0x6b4a2e));
  // sit the plants on the soil
  W.forest.y = 0.75;
  W.forest.bush(x - 0.1, z, size * 0.42, 0x4caf50);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.6;
    W.forest.flower(x + Math.cos(a) * size * 0.28, z + Math.sin(a) * size * 0.28, flower);
  }
  W.forest.y = 0;
}

export function flowerBed(W, x0, x1, z0, z1, colors = [0xff6b9a, 0xffc83d, 0xffffff, 0x8e5bd6]) {
  W.slab(x0, x1, z0, z1, 0.12, m(0x6b4a2e));
  box(W.static, x1 - x0 + 0.3, 0.25, 0.15, (x0 + x1) / 2, 0, z0 - 0.075, m('concrete', 0xd8d2c6));
  box(W.static, x1 - x0 + 0.3, 0.25, 0.15, (x0 + x1) / 2, 0, z1 + 0.075, m('concrete', 0xd8d2c6));
  box(W.static, 0.15, 0.25, z1 - z0, x0 - 0.075, 0, (z0 + z1) / 2, m('concrete', 0xd8d2c6));
  box(W.static, 0.15, 0.25, z1 - z0, x1 + 0.075, 0, (z0 + z1) / 2, m('concrete', 0xd8d2c6));
  const rnd = seeded(Math.abs(Math.round(x0 * 31 + z0 * 17)));
  for (let x = x0 + 0.4; x < x1 - 0.2; x += 0.7) for (let z = z0 + 0.4; z < z1 - 0.2; z += 0.7) {
    W.forest.flower(x + (rnd() - 0.5) * 0.3, z + (rnd() - 0.5) * 0.3, colors[Math.floor(rnd() * colors.length)]);
  }
}

export function trashCan(W, x, z) {
  cyl(W.static, 0.4, 1, x, 0, z, m('metal', 0x2f6e4a), 12);
  cyl(W.static, 0.44, 0.08, x, 1, z, m('metal', 0x23262f), 12);
  W.solid(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 0, 1.05);
}

export function hydrant(W, x, z) {
  cyl(W.static, 0.22, 0.8, x, 0, z, m(0xe2483d), 10);
  ball(W.static, 0.22, 0.18, 0.22, x, 0.82, z, m(0xe2483d));
  box(W.static, 0.6, 0.14, 0.14, x, 0.45, z, m(0xc9c9c9));
  W.solid(x - 0.25, x + 0.25, z - 0.25, z + 0.25, 0, 1);
}

export function rock(W, x, z, s = 1) {
  const r = ball(W.static, 1.1 * s, 0.6 * s, 0.9 * s, x, 0.15 * s, z, m('concrete', 0x9a9a9a));
  r.rotation.y = x;
  W.solid(x - 0.8 * s, x + 0.8 * s, z - 0.7 * s, z + 0.7 * s, 0, 0.6 * s);
}

/** Flag pole with a waving flag (flag is animated). */
export function flagPole(W, x, z, color = 0x2e6fdb) {
  cyl(W.static, 0.1, 10, x, 0, z, m('metal', 0xd0d0d0), 8);
  ball(W.static, 0.18, 0.18, 0.18, x, 10.1, z, m(0xffc83d));
  const geo = new THREE.PlaneGeometry(3, 1.8, 10, 1);
  const flag = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.8 }));
  flag.position.set(x + 1.5, 8.9, z);
  flag.castShadow = true;
  W.dyn.add(flag);
  const pos = geo.attributes.position;
  const base = Float32Array.from(pos.array);
  let acc = 0;
  W.updaters.push((dt, t) => {
    acc += dt;
    if (acc < 1 / 30) return;
    acc = 0;
    for (let i = 0; i < pos.count; i++) {
      const u = (base[i * 3] + 1.5) / 3;
      pos.array[i * 3 + 2] = Math.sin(t * 4 - u * 5) * 0.25 * u;
    }
    pos.needsUpdate = true;
  });
  W.solid(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 0, 10);
}

/** Traffic light pole at a corner; `dir` = direction it faces. */
export function trafficLight(W, x, z, dir) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = dir;
  W.static.add(g);
  const dark = m('metal', 0x2a2d33);
  cyl(g, 0.15, 5.6, 0, 0, 0, dark, 8);
  box(g, 0.14, 0.14, 4, 0, 5.4, 2, dark);
  box(g, 0.6, 1.7, 0.5, 0, 3.9, 3.6, m(0x23262f));
  const cols = [0xff3b30, 0xffc83d, 0x34c759];
  cols.forEach((c, i) => ball(g, 0.18, 0.18, 0.1, 0, 5.2 - i * 0.5, 3.86, neon(c, i === 2 ? 2 : 0.25)));
  W.solid(x - 0.25, x + 0.25, z - 0.25, z + 0.25, 0, 5.6);
}

/** Bus stop shelter facing `rot` (0 = +z). */
export function busStop(W, x, z, rot = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  W.static.add(g);
  const frame = m('metal', 0x3a3f48);
  for (const s of [-1, 1]) box(g, 0.15, 3, 0.15, s * 2.4, 0, -0.6, frame);
  box(g, 5.2, 0.15, 1.8, 0, 3, 0, m(0x2e6fdb));
  box(g, 4.8, 2.4, 0.06, 0, 0.4, -0.7, glass(0xcfe9ff, 0.3));
  box(g, 3.6, 0.12, 0.6, 0, 0.55, -0.35, m('wood', 0xb07a45));
  sign(g, 'BUS', 1.4, 0.6, 2.4, 3.6, 0, 0, { bg: '#2e6fdb', fg: '#fff' });
  const c = Math.abs(Math.cos(rot)) > 0.5;
  W.solid(x - (c ? 2.6 : 0.9), x + (c ? 2.6 : 0.9), z - (c ? 0.9 : 2.6), z + (c ? 0.9 : 2.6), 0, 0.6);
}

export function fenceLine(W, x0, z0, x1, z1, color = 0xf4f1ea) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const g = new THREE.Group();
  g.position.set(x0, 0, z0);
  g.rotation.y = Math.atan2(x1 - x0, z1 - z0);
  W.static.add(g);
  const n = Math.max(1, Math.round(len / 1.2));
  for (let i = 0; i <= n; i++) box(g, 0.14, 1.1, 0.14, 0, 0, (i / n) * len, m(color));
  for (const y of [0.35, 0.8]) box(g, 0.08, 0.12, len, 0, y, len / 2, m(color));
  W.solid(Math.min(x0, x1) - 0.1, Math.max(x0, x1) + 0.1, Math.min(z0, z1) - 0.1, Math.max(z0, z1) + 0.1, 0, 1.1);
}

export { cone };
