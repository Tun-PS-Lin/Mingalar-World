// The town: ground, roads, buildings, props, colliders and interaction zones.
// Axes: +x is east, +z is south, y is up. One unit is roughly a metre.
import * as THREE from 'three';
import { box, cyl, mat, sign, seeded } from './builders.js';

export const POOL = { x0: 37, x1: 55, z0: -36, z1: -24, floatY: -1.5 };
export const SPAWN = { x: 0, z: -38, yaw: Math.PI };

const C = {
  grass: 0x6cc24a,
  grassDark: 0x58a53c,
  road: 0x4a4f57,
  walk: 0xd3d7da,
  paving: 0xe8dcc4,
  brick: 0xb5573b,
  brickCap: 0xe9e2d6,
  white: 0xf4f1ea,
  dark: 0x2f3440,
  wood: 0xa9713f,
  glass: 0x8fd0f5,
  hedge: 0x3f8f3a,
  trunk: 0x7a5234,
  leaf: 0x3fa34d,
  leaf2: 0x4fb85a,
  metal: 0x555b66,
  lamp: 0xfff2b0,
  water: 0x2bb3e6,
};

export function buildWorld(scene) {
  const W = { colliders: [], zones: [], updaters: [], refs: {}, root: new THREE.Group() };
  const root = W.root;
  scene.add(root);

  /** Register a collision box. cam:true also stops the camera passing through. */
  const solid = (x0, x1, z0, z1, y0, y1, cam = false) => W.colliders.push({ x0, x1, z0, z1, y0, y1, cam });
  /** Visible box + matching collider. */
  const block = (w, h, d, x, y, z, color, cam = true, opts) => {
    const m = box(root, w, h, d, x, y, z, color, opts);
    solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y, y + h, cam);
    return m;
  };
  /** Flat slab between two corners, top surface at `top`. */
  const slab = (x0, x1, z0, z1, top, color) => {
    const m = box(root, x1 - x0, 1, z1 - z0, (x0 + x1) / 2, top - 1, (z0 + z1) / 2, color);
    m.castShadow = false;
    return m;
  };
  /** Four slabs forming a frame around a rectangular hole. */
  const frame = (o, i, top, color) => {
    slab(o.x0, i.x0, o.z0, o.z1, top, color);
    slab(i.x1, o.x1, o.z0, o.z1, top, color);
    slab(i.x0, i.x1, o.z0, i.z0, top, color);
    slab(i.x0, i.x1, i.z1, o.z1, top, color);
  };
  const zone = (id, x, z, r, label) => W.zones.push({ id, x, z, r, label });

  // ---------------------------------------------------------------- ground
  frame({ x0: -420, x1: 420, z0: -420, z1: 420 }, POOL, 0, C.grass);

  // ----------------------------------------------------------------- roads
  const roads = [
    [-26, -18, -44, 44], // west avenue
    [18, 26, -44, 44], // east avenue
    [-26, 26, -44, -36], // north street
    [-18, 18, 0, 8], // cross street
    [-26, 26, 36, 44], // south street
    [-4, 4, -90, -44], // north gate road
    [-4, 4, 44, 90], // south gate road
  ];
  for (const [x0, x1, z0, z1] of roads) slab(x0 - 2.5, x1 + 2.5, z0 - 2.5, z1 + 2.5, 0.03, C.walk);
  for (const [x0, x1, z0, z1] of roads) slab(x0, x1, z0, z1, 0.06, C.road);
  // lane dashes
  const dash = (x, z, alongX) => {
    const m = box(root, alongX ? 2 : 0.25, 0.02, alongX ? 0.25 : 2, x, 0.05, z, 0xffffff);
    m.castShadow = false;
  };
  for (let z = -32; z <= 32; z += 6) { dash(-22, z, false); dash(22, z, false); }
  for (let x = -14; x <= 14; x += 6) { dash(x, -40, true); dash(x, 4, true); dash(x, 40, true); }
  for (let z = 50; z <= 86; z += 6) { dash(0, z, false); dash(0, -z, false); }

  // -------------------------------------------------------- perimeter wall
  const wallH = 3;
  const wall = (x0, x1, z0, z1) => {
    const w = x1 - x0, d = z1 - z0, x = (x0 + x1) / 2, z = (z0 + z1) / 2;
    block(w, wallH, d, x, 0, z, C.brick);
    box(root, w + 0.3, 0.3, d + 0.3, x, wallH, z, C.brickCap);
  };
  wall(-64.5, -5, -52.5, -51.5); wall(5, 64.5, -52.5, -51.5);
  wall(-64.5, -5, 51.5, 52.5); wall(5, 64.5, 51.5, 52.5);
  wall(-64.5, -63.5, -51.5, 51.5); wall(63.5, 64.5, -51.5, 51.5);
  for (const s of [-1, 1]) {
    const z = s * 52;
    block(1.6, 5, 1.6, -5.4, 0, z, C.brickCap);
    block(1.6, 5, 1.6, 5.4, 0, z, C.brickCap);
    box(root, 13, 1.3, 1.2, 0, 5, z, C.dark);
    // inward face
    sign(root, 'VIRTUAL LUXURY HOME', 11, 1, 0, 5.65, z - s * 0.62, s > 0 ? Math.PI : 0, { bg: null, fg: '#ffc83d' });
    // boom barrier: the world ends at the gates
    box(root, 0.4, 1.2, 0.4, -4.3, 0, z, C.dark);
    for (let i = 0; i < 8; i++) box(root, 1.08, 0.22, 0.22, -3.7 + i * 1.08, 1, z, i % 2 ? 0xffffff : 0xe2483d);
    solid(-5, 5, z - 0.4, z + 0.4, 0, 30, true);
  }

  // ------------------------------------------------------------ small props
  function tree(x, z, s = 1, collide = true) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    root.add(g);
    box(g, 0.8 * s, 2.6 * s, 0.8 * s, 0, 0, 0, C.trunk);
    box(g, 3.4 * s, 1.6 * s, 3.4 * s, 0, 2.4 * s, 0, C.leaf);
    box(g, 2.5 * s, 1.4 * s, 2.5 * s, 0.2 * s, 3.9 * s, -0.1 * s, C.leaf2);
    box(g, 1.4 * s, 1.0 * s, 1.4 * s, -0.1 * s, 5.2 * s, 0.1 * s, C.leaf);
    if (collide) solid(x - 0.5 * s, x + 0.5 * s, z - 0.5 * s, z + 0.5 * s, 0, 2.6 * s);
  }
  function lamp(x, z, towardX) {
    cyl(root, 0.16, 4.6, x, 0, z, C.metal, 8);
    box(root, 1.3, 0.14, 0.2, x + towardX * 0.55, 4.5, z, C.metal);
    box(root, 0.7, 0.2, 0.45, x + towardX * 1.05, 4.3, z, C.lamp, { emissive: 0xffe9a0, emissiveIntensity: 0.9 });
    solid(x - 0.25, x + 0.25, z - 0.25, z + 0.25, 0, 4.6);
  }
  /** rot 0: faces +z, 1: faces +x, 2: faces -z, 3: faces -x */
  function bench(x, z, rot = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = (rot * Math.PI) / 2;
    root.add(g);
    box(g, 2.6, 0.16, 0.8, 0, 0.45, 0, C.wood);
    box(g, 2.6, 0.7, 0.14, 0, 0.6, -0.4, C.wood);
    box(g, 0.14, 0.45, 0.7, -1.1, 0, 0, C.metal);
    box(g, 0.14, 0.45, 0.7, 1.1, 0, 0, C.metal);
    const along = rot % 2 === 0;
    solid(x - (along ? 1.3 : 0.45), x + (along ? 1.3 : 0.45), z - (along ? 0.45 : 1.3), z + (along ? 0.45 : 1.3), 0, 0.62);
  }
  function hedge(x0, x1, z0, z1, h = 1.1) {
    block(x1 - x0, h, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, C.hedge, false);
  }
  function planter(x, z, flower = 0xff6b9a) {
    block(1.4, 0.7, 1.4, x, 0, z, C.brickCap, false);
    box(root, 1.1, 0.5, 1.1, x, 0.7, z, C.leaf2);
    box(root, 0.5, 0.3, 0.5, x, 1.2, z, flower);
  }

  // ====================================================== LUXURY HOME GALLERY
  // Centre block, front door faces north towards the main gate.
  {
    const glass = mat(C.glass, { emissive: 0xffd27a, emissiveIntensity: 0 });
    W.refs.homeGlass = glass;
    block(22, 5, 16, 0, 0, -18, C.white);
    box(root, 23.4, 0.45, 17.4, 0, 5, -18, C.dark); // first floor slab
    box(root, 15, 4.5, 12, -3, 5.45, -17, C.white);
    box(root, 16.4, 0.45, 13.4, -3, 9.95, -17, C.dark); // roof
    box(root, 6, 5.02, 0.3, 7.5, 0, -26.05, C.wood); // timber feature wall
    // door + canopy
    box(root, 2.4, 3.4, 0.25, 0, 0, -26.1, 0x5a3b22);
    box(root, 0.18, 0.5, 0.12, 0.8, 1.5, -26.25, 0xffc83d);
    box(root, 5, 0.25, 2.4, 0, 3.7, -27.2, C.dark);
    cyl(root, 0.12, 3.7, -2.2, 0, -28.2, C.metal, 8);
    cyl(root, 0.12, 3.7, 2.2, 0, -28.2, C.metal, 8);
    // windows (north, south, sides)
    box(root, 6.5, 3, 0.2, -6.5, 1, -26.06, glass);
    box(root, 4, 2.2, 0.2, 7.5, 1.6, -26.22, glass);
    box(root, 12, 2.8, 0.2, -3, 6.3, -23.06, glass);
    box(root, 12, 2.8, 0.2, -3, 6.3, -10.94, glass);
    box(root, 16, 3, 0.2, 0, 1, -9.94, glass);
    box(root, 0.2, 3, 9, -11.06, 1, -18, glass);
    box(root, 0.2, 3, 9, 11.06, 1, -18, glass);
    box(root, 0.2, 2.8, 8, -10.56, 6.3, -17, glass);
    // roof terrace on the east side
    for (const [w, d, x, z] of [[6.4, 0.12, 8.2, -25.8], [6.4, 0.12, 8.2, -10.2], [0.12, 15.6, 11.4, -18]])
      box(root, w, 1, d, x, 5.45, z, mat(C.glass, { transparent: true, opacity: 0.45 }));
    box(root, 2.2, 0.5, 1, 8.5, 5.45, -20, 0xf6f6f6);
    box(root, 2.2, 0.5, 1, 8.5, 5.45, -17.5, 0xf6f6f6);
    cyl(root, 0.08, 2.4, 8.5, 5.45, -14, C.metal, 6);
    box(root, 3, 0.15, 3, 8.5, 7.85, -14, 0xff7a3d);
    // solar panels
    for (let i = 0; i < 3; i++) {
      const p = box(root, 3.2, 0.12, 2.2, -7.5 + i * 3.8, 10.6, -17, 0x24408f);
      p.rotation.x = 0.35;
    }
    sign(root, 'LUXURY HOME GALLERY', 9, 1.1, -5, 4.2, -26.2, Math.PI, { bg: '#14182b', fg: '#ffc83d' });
    // front garden
    slab(-1.6, 1.6, -33.5, -26, 0.04, C.paving);
    hedge(-15, -3, -33.2, -32.2); hedge(3, 15, -33.2, -32.2);
    planter(-2.6, -27.2); planter(2.6, -27.2, 0xffc83d);
    tree(-13, -29.5, 0.8); tree(13, -29.5, 0.8);
    tree(-13.5, -5.5, 0.9); tree(13.5, -5.5, 0.9); tree(0, -5.5, 0.75);
    zone('home', 0, -29, 4, 'Tour the Luxury Home Gallery');
  }

  // =========================================================== VIRTUAL GARAGE
  // South of the cross street, bays open towards the south street.
  {
    slab(-13, 13, 15, 27, 0.05, 0xdadde2);
    slab(-13, 13, 27, 33.5, 0.04, 0xbfc4ca);
    block(26, 6, 0.8, 0, 0, 15.4, C.dark);
    block(0.8, 6, 12, -12.6, 0, 21, C.dark);
    block(0.8, 6, 12, 12.6, 0, 21, C.dark);
    block(0.8, 6, 0.8, -4.3, 0, 26.6, C.dark);
    block(0.8, 6, 0.8, 4.3, 0, 26.6, C.dark);
    box(root, 27, 0.6, 13.4, 0, 6, 21.2, 0x23262f);
    solid(-13.5, 13.5, 14.5, 27.9, 6, 6.6, true);
    box(root, 26, 1.4, 0.6, 0, 4.6, 26.7, 0x23262f);
    sign(root, 'VIRTUAL GARAGE', 12, 1.1, 0, 5.3, 27.02, 0, { bg: null, fg: '#ffc83d' });
    box(root, 26, 0.12, 0.2, 0, 4.5, 27.02, 0xffc83d, { emissive: 0xffc83d, emissiveIntensity: 0.8 });

    const defs = [
      { name: 'Apex GT', kind: 'sport', color: 0xe2483d, x: -8.6, top: '310 km/h', zero: '3.1 s', range: '520 km' },
      { name: 'Summit X', kind: 'suv', color: 0x2e6fdb, x: 0, top: '220 km/h', zero: '5.4 s', range: '640 km' },
      { name: 'Breeze Roadster', kind: 'roadster', color: 0xffc83d, x: 8.6, top: '260 km/h', zero: '4.2 s', range: '480 km' },
    ];
    const cars = [];
    const doors = [];
    for (const d of defs) {
      const z = 20.6;
      cyl(root, 3.3, 0.16, d.x, 0.05, z, 0x8b919c, 24);
      const ring = cyl(root, 3.45, 0.1, d.x, 0.05, z, 0xffffff, 24, { emissive: 0xffc83d, emissiveIntensity: 0 });
      const car = buildCar(d.color, d.kind);
      car.group.position.set(d.x, 0.21, z);
      car.group.rotation.y = 0.6;
      root.add(car.group);
      solid(d.x - 2.2, d.x + 2.2, z - 2.2, z + 2.2, 0, 1.7);
      box(root, 5, 0.1, 0.5, d.x, 5.85, 21, 0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.9 });
      cars.push({ ...d, group: car.group, bodyMat: car.bodyMat, ring });
      const door = box(root, 7.8, 1, 0.2, d.x, 0, 26.6, 0x8b919c);
      doors.push(door);
    }
    W.refs.cars = cars;
    W.refs.garage = { selected: 0, panelOpen: false, door: 0 };
    W.updaters.push((dt, t, p) => {
      const g = W.refs.garage;
      const near = Math.abs(p.x) < 20 && p.z > 12 && p.z < 46;
      g.door += ((near ? 1 : 0) - g.door) * Math.min(1, dt * 2.5);
      const h = 4.6 - g.door * 4.3;
      for (const d of doors) { d.scale.y = h; d.position.y = 4.6 - h / 2; }
      cars.forEach((c, i) => {
        const hot = g.panelOpen && g.selected === i;
        c.group.rotation.y += dt * (hot ? 1.1 : 0.25);
        c.ring.material.emissiveIntensity += ((hot ? 1 : 0) - c.ring.material.emissiveIntensity) * Math.min(1, dt * 6);
      });
    });
    tree(-13, 11.5, 0.8); tree(13, 11.5, 0.8); tree(0, 11.5, 0.7);
    planter(-13.6, 32); planter(13.6, 32, 0xffc83d);
    zone('garage', 0, 30, 4.5, 'Open the Garage showroom');
  }

  // ============================================================= VIRTUAL MALL
  // North-west. A walk-in hall with four kiosks; entrance on the east wall.
  {
    const x0 = -58, x1 = -32, z0 = -36, z1 = -12, h = 7;
    slab(x0, x1, z0, z1, 0.05, 0xf2ece4);
    slab(x1, -28.5, -28, -20, 0.04, C.paving);
    const wallC = 0x3b3f73;
    block(0.6, h, 24, x0 + 0.3, 0, -24, wallC);
    block(26, h, 0.6, -45, 0, z0 + 0.3, wallC);
    block(26, h, 0.6, -45, 0, z1 - 0.3, wallC);
    const shop = mat(C.glass, { transparent: true, opacity: 0.35 });
    block(0.3, 4.5, 8.4, x1 - 0.3, 0, -31.8, shop);
    block(0.3, 4.5, 8.4, x1 - 0.3, 0, -16.2, shop);
    block(0.6, 4.5, 0.6, x1 - 0.3, 0, -27.3, 0xffffff);
    block(0.6, 4.5, 0.6, x1 - 0.3, 0, -20.7, 0xffffff);
    box(root, 0.6, h - 4.5, 24, x1 - 0.3, 4.5, -24, wallC);
    box(root, 27, 0.5, 25, -45, h, -24, 0x2c2f55);
    solid(x0 - 0.5, x1 + 0.5, z0 - 0.5, z1 + 0.5, h, h + 0.5, true);
    // striped awning + sign
    for (let i = 0; i < 8; i++) {
      const a = box(root, 2.2, 0.15, 1, x1 + 0.9, 4.3, -27.5 + i * 1, i % 2 ? 0xffffff : 0xff5b8a);
      a.rotation.z = -0.3;
    }
    sign(root, 'VIRTUAL MALL', 12, 1.6, x1 + 0.05, 5.8, -24, Math.PI / 2, { bg: '#14182b', fg: '#ff7ab0', border: '#ff7ab0' });
    // ceiling lights + centre rug
    for (const lx of [-52, -45, -38]) for (const lz of [-30, -18])
      box(root, 3, 0.1, 1.2, lx, h - 0.12, lz, 0xffffff, { emissive: 0xffffff, emissiveIntensity: 1 });
    slab(-56, -34, -25.2, -22.8, 0.07, 0xff7ab0);

    const kiosks = [
      { id: 'fashion', name: 'FASHION', color: 0xff5b8a, x: -51, z: -31, items: [0xffffff, 0x2e6fdb, 0xffc83d, 0x14182b] },
      { id: 'tech', name: 'TECH', color: 0x2e6fdb, x: -40, z: -31, items: [0x23262f, 0x8b919c, 0x5be28a, 0xffffff] },
      { id: 'home', name: 'HOME', color: 0x2fa37a, x: -51, z: -17, items: [0xffe9a0, 0xa9713f, 0xf4f1ea, 0xff7a3d] },
      { id: 'play', name: 'PLAY', color: 0xff9a2e, x: -40, z: -17, items: [0xe2483d, 0x2e6fdb, 0xffc83d, 0x5be28a] },
    ];
    for (const k of kiosks) {
      const north = k.z < -24;
      const back = north ? -1 : 1; // direction away from the aisle
      block(5.4, 1.1, 1.8, k.x, 0, k.z, k.color, false);
      box(root, 5.6, 0.12, 2, k.x, 1.1, k.z, 0xffffff);
      block(6, 3.6, 0.5, k.x, 0, k.z + back * 2.6, 0xf4f1ea, false);
      for (let s = 0; s < 2; s++) box(root, 5.6, 0.1, 0.9, k.x, 1.5 + s * 1.2, k.z + back * 2.1, 0xcfd3d6);
      k.items.forEach((col, i) => {
        box(root, 0.7, 0.5 + (i % 2) * 0.25, 0.7, k.x - 1.9 + i * 1.25, 1.22, k.z, col);
        box(root, 0.8, 0.7, 0.6, k.x - 1.9 + i * 1.25, 1.6, k.z + back * 2.1, k.items[(i + 1) % 4]);
        box(root, 0.6, 0.6, 0.6, k.x - 1.9 + i * 1.25, 2.8, k.z + back * 2.1, k.items[(i + 2) % 4]);
      });
      sign(root, k.name, 4.4, 1, k.x, 5, k.z + back * 2.3, north ? 0 : Math.PI, {
        bg: '#' + k.color.toString(16).padStart(6, '0'), fg: '#ffffff',
      });
      zone('mall:' + k.id, k.x, k.z - back * 2.2, 3.4, `Browse ${k.name[0] + k.name.slice(1).toLowerCase()}`);
    }
    planter(-30.5, -29.5); planter(-30.5, -18.5, 0xffc83d);
  }

  // =========================================================== VIRTUAL OFFICE
  // South-west glass tower, door on the east side.
  {
    block(20, 12, 16, -45, 0, 22, 0x4f9ccf);
    for (const y of [0, 4, 8, 12]) box(root, 20.6, 0.4, 16.6, -45, y, 22, 0xffffff);
    for (let i = 0; i <= 4; i++) {
      box(root, 0.25, 12, 0.25, -34.95, 0, 14.2 + i * 3.9, 0xffffff);
      box(root, 0.25, 12, 0.25, -55.05, 0, 14.2 + i * 3.9, 0xffffff);
    }
    for (let i = 0; i <= 5; i++) {
      box(root, 0.25, 12, 0.25, -54.8 + i * 3.92, 0, 13.95, 0xffffff);
      box(root, 0.25, 12, 0.25, -54.8 + i * 3.92, 0, 30.05, 0xffffff);
    }
    box(root, 0.3, 3.3, 3.6, -34.9, 0.4, 22, 0x1d3550);
    box(root, 0.35, 3.3, 0.12, -34.85, 0.4, 22, 0xffffff);
    box(root, 2.6, 0.25, 5.2, -33.7, 3.8, 22, C.dark);
    sign(root, 'VIRTUAL OFFICE', 10, 1.3, -34.7, 9.9, 22, Math.PI / 2, { bg: '#14182b', fg: '#ffffff' });
    // rooftop spinning logo
    const logo = new THREE.Group();
    logo.position.set(-45, 14.4, 22);
    root.add(logo);
    box(logo, 2.4, 2.4, 2.4, 0, -1.2, 0, 0xffc83d);
    logo.rotation.z = Math.PI / 4;
    const spin = new THREE.Group();
    root.add(spin); spin.add(logo);
    spin.position.copy(logo.position); logo.position.set(0, 0, 0);
    box(root, 0.4, 1.2, 0.4, -45, 12.4, 22, C.metal);
    W.updaters.push((dt) => { spin.rotation.y += dt * 0.8; });
    slab(-35, -28.5, 16, 28, 0.04, C.paving);
    planter(-33.5, 17.2); planter(-33.5, 26.8, 0xffc83d);
    bench(-30.5, 18.2, 3);
    zone('office', -32.3, 22, 3.8, 'Visit the Office reception');
  }

  // --------------------------------------------- park between mall and office
  {
    slab(-52, -28.5, -1.5, 3.5, 0.04, C.paving);
    cyl(root, 3.2, 0.7, -45, 0, 1, 0xcfd3d6, 20);
    cyl(root, 2.8, 0.1, -45, 0.62, 1, C.water, 20, { emissive: 0x1a7fb0, emissiveIntensity: 0.3 });
    cyl(root, 0.5, 1.8, -45, 0, 1, 0xcfd3d6, 12);
    cyl(root, 1.2, 0.2, -45, 1.8, 1, 0xcfd3d6, 12);
    const jet = cyl(root, 0.18, 1.2, -45, 2, 1, mat(0xbfe9ff, { transparent: true, opacity: 0.8 }), 8);
    W.updaters.push((dt, t) => { jet.scale.y = 1.1 + Math.sin(t * 3) * 0.35; jet.position.y = 2 + jet.scale.y / 2; });
    solid(-48, -42, -2, 4, 0, 0.72);
    bench(-45, -4, 0); bench(-45, 6, 2); bench(-50.5, 1, 1);
    for (const [x, z] of [[-58, -7], [-36, -7.5], [-58, 7], [-52, 9.5], [-37, 9], [-60, 36], [-60, 47], [-48, 40], [-36, 37], [-31, 47], [-60, -45], [-45, -44.5], [-33, -45]])
      tree(x, z, 0.85 + ((x * 7 + z * 3) % 5) * 0.06);
  }

  // =================================================================== POOL
  // North-east. Walk off the deck into the water to swim.
  {
    const deck = { x0: 32, x1: 60, z0: -42, z1: -18 };
    const rim = { x0: POOL.x0 - 0.7, x1: POOL.x1 + 0.7, z0: POOL.z0 - 0.7, z1: POOL.z1 + 0.7 };
    frame(deck, rim, 0.04, C.paving);
    frame(rim, POOL, 0.1, 0xffffff);
    slab(28.5, 32, -32, -28, 0.04, C.paving);
    // basin
    const tile = 0xbfeeff;
    box(root, 18, 0.2, 12, 46, -2.1, -30, tile);
    box(root, 18, 2.1, 0.2, 46, -2, POOL.z0 + 0.1, tile);
    box(root, 18, 2.1, 0.2, 46, -2, POOL.z1 - 0.1, tile);
    box(root, 0.2, 2.1, 12, POOL.x0 + 0.1, -2, -30, tile);
    box(root, 0.2, 2.1, 12, POOL.x1 - 0.1, -2, -30, tile);
    for (let i = 1; i < 4; i++) box(root, 17.6, 0.02, 0.25, 46, -1.9, POOL.z0 + i * 3, 0x2e6fdb);
    const water = box(root, 17.6, 0.1, 11.6, 46, -0.28, -30, mat(C.water, { transparent: true, opacity: 0.62 }));
    W.updaters.push((dt, t) => { water.position.y = -0.23 + Math.sin(t * 1.6) * 0.03; });
    // ladder
    for (const z of [-25.2, -24.6]) {
      cyl(root, 0.06, 1.2, POOL.x0 + 0.3, -0.2, z, C.metal, 6);
      cyl(root, 0.06, 1.2, POOL.x0 - 0.3, 0, z, C.metal, 6);
    }
    // loungers + umbrellas
    for (const x of [39, 44.5, 50]) {
      block(1.1, 0.4, 2.6, x, 0, -39.6, 0xffffff, false);
      box(root, 1.1, 0.7, 0.3, x, 0.4, -40.75, 0xffffff);
      box(root, 1, 0.08, 1.6, x, 0.4, -39.4, 0x2bb3e6);
    }
    for (const [x, c] of [[41.7, 0xff5b8a], [47.2, 0xffc83d]]) {
      cyl(root, 0.08, 3, x, 0, -39.8, C.metal, 6);
      box(root, 3, 0.18, 3, x, 3, -39.8, c);
      box(root, 2, 0.18, 2, x, 3.18, -39.8, 0xffffff);
      solid(x - 0.2, x + 0.2, -40, -39.6, 0, 3);
    }
    // pool sign post
    cyl(root, 0.1, 2.4, 33.4, 0, -26.6, C.metal, 6);
    sign(root, 'POOL\njump in to swim', 3, 1.3, 33.4, 2.9, -26.6, -Math.PI / 2, { bg: '#2bb3e6', fg: '#ffffff', doubleSided: true });
    bench(57.5, -30, 3);
    hedge(32, 60, -43.6, -42.6); hedge(60.4, 61.4, -42.6, -18);
    for (const [x, z] of [[31, -46.5], [45, -47], [61, -47], [33.5, -14.5], [59.5, -14.5]]) tree(x, z, 0.85);
  }

  // ==================================================================== GYM
  {
    block(18, 5.5, 10, 46, 0, -6, 0x39404d);
    box(root, 18.3, 0.7, 10.3, 46, 4.2, -6, 0xff7a3d);
    box(root, 18.6, 0.35, 10.6, 46, 5.5, -6, 0x23262f);
    const g = mat(C.glass, { emissive: 0x2b6a8f, emissiveIntensity: 0.25 });
    box(root, 0.2, 2.6, 6, 36.95, 1, -6, g);
    box(root, 12, 2.6, 0.2, 46, 1, -0.95, g);
    box(root, 12, 2.6, 0.2, 46, 1, -11.05, g);
    sign(root, 'GYM', 5, 1.4, 36.9, 4.55, -6, -Math.PI / 2, { bg: null, fg: '#ffffff' });
    // outdoor workout mat
    slab(29.5, 36.4, -10.5, -1.5, 0.07, 0x2e6fdb);
    slab(30.3, 35.6, -8.2, -3.8, 0.09, 0x23408f);
    // dumbbell rack
    block(2.6, 0.9, 0.7, 34.6, 0, -9.8, C.metal, false);
    for (let i = 0; i < 3; i++) {
      box(root, 0.6, 0.22, 0.22, 33.8 + i * 0.8, 0.95, -9.8, 0xcfd3d6);
      for (const s of [-1, 1]) box(root, 0.16, 0.42, 0.42, 33.8 + i * 0.8 + s * 0.3, 0.85, -9.8, [0xe2483d, 0xffc83d, 0x5be28a][i]);
    }
    // weight bench
    block(0.8, 0.5, 2.2, 31, 0, -9.4, 0x23262f, false);
    cyl(root, 0.06, 1.3, 30.4, 0, -10.2, C.metal, 6);
    cyl(root, 0.06, 1.3, 31.6, 0, -10.2, C.metal, 6);
    const bar = cyl(root, 0.06, 2.4, 31, 1.3, -10.2, 0xcfd3d6, 6);
    bar.rotation.z = Math.PI / 2; bar.position.y = 1.3;
    for (const s of [-1, 1]) { const p = cyl(root, 0.4, 0.14, 31 + s * 1.05, 1.3, -10.2, 0xe2483d, 12); p.rotation.z = Math.PI / 2; p.position.y = 1.3; }
    for (const [x, z] of [[60, 2.5], [34, 4.5], [46, 4.5], [57.5, 5.5]]) tree(x, z, 0.85);
    zone('gym', 33, -6, 2.6, 'Start a workout');
  }

  // ============================================================== MINI GOLF
  // Lanes themselves are built in golf.js; this is the surrounding course.
  {
    slab(32, 61, 11, 41, 0.03, C.grassDark);
    slab(28.5, 32, 24, 28, 0.04, C.paving);
    hedge(31, 62, 10, 11); hedge(31, 62, 41, 42); hedge(61, 62, 11, 41);
    hedge(31, 32, 11, 22.8); hedge(31, 32, 29.2, 41);
    block(1, 4.6, 1, 31.5, 0, 22.6, 0xffffff, false);
    block(1, 4.6, 1, 31.5, 0, 29.4, 0xffffff, false);
    box(root, 1.2, 1.5, 8.2, 31.5, 4.2, 26, 0x2fa84f);
    sign(root, 'MINI GOLF', 7, 1.2, 30.88, 4.95, 26, -Math.PI / 2, { bg: null, fg: '#ffffff' });
    // a little decorative windmill
    const mill = new THREE.Group();
    mill.position.set(58.6, 0, 21);
    root.add(mill);
    box(mill, 2, 3.4, 2, 0, 0, 0, 0xe2483d);
    box(mill, 2.4, 0.9, 2.4, 0, 3.4, 0, 0xffffff);
    const blades = new THREE.Group();
    blades.position.set(-1.25, 3.2, 0);
    mill.add(blades);
    box(blades, 0.12, 5, 0.6, 0, -2.5, 0, 0xffffff);
    box(blades, 0.12, 0.6, 5, 0, -0.3, 0, 0xffffff);
    W.updaters.push((dt) => { blades.rotation.x += dt * 1.2; });
    solid(57.6, 59.6, 20, 22, 0, 3.4);
    bench(34, 31, 1);
    for (const [x, z] of [[34, 47], [46, 47.5], [58, 47]]) tree(x, z, 0.9);
    zone('golf', 33.5, 26, 3.6, 'Play Mini Golf');
  }

  // ----------------------------------------------------- lamps and benches
  for (const z of [-32, -16, 0, 16, 32]) { lamp(-27.6, z, 1); lamp(27.6, z, -1); }
  for (const x of [-10, 10]) { lamp(x, -45.6, 0); lamp(x, 45.6, 0); }
  bench(-16.7, -20, 3); bench(16.7, -20, 1);
  bench(-16.7, 21, 3); bench(16.7, 21, 1);
  bench(-9, 46, 2); bench(9, 46, 2);

  // ------------------------------------------------ scenery outside the wall
  const rnd = seeded(7);
  for (let i = 0; i < 70; i++) {
    const x = (rnd() - 0.5) * 300, z = (rnd() - 0.5) * 280;
    if (Math.abs(x) < 70 && Math.abs(z) < 58) continue;
    if (Math.abs(x) < 9) continue;
    tree(x, z, 0.9 + rnd() * 0.8, false);
  }
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    g.position.set((rnd() - 0.5) * 380, 55 + rnd() * 25, (rnd() - 0.5) * 380);
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: false });
    for (let j = 0; j < 4; j++) {
      const b = box(g, 10 + rnd() * 10, 3 + rnd() * 2, 7 + rnd() * 6, (j - 1.5) * 6, rnd() * 2, (rnd() - 0.5) * 5, m);
      b.castShadow = false; b.receiveShadow = false;
    }
    root.add(g);
    clouds.push(g);
  }
  W.updaters.push((dt) => {
    for (const c of clouds) { c.position.x += dt * 1.2; if (c.position.x > 200) c.position.x = -200; }
  });

  /** Height of the walkable ground (the pool is the only dip). */
  W.groundAt = (x, z) =>
    x > POOL.x0 + 0.3 && x < POOL.x1 - 0.3 && z > POOL.z0 + 0.3 && z < POOL.z1 - 0.3 ? POOL.floatY : 0;

  return W;
}

/** Blocky car, length along x. Returns the group and its paint material. */
function buildCar(color, kind) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const dark = 0x1c1f26, glassC = 0x9fd8ff;
  const wheel = (x, z, r = 0.48) => {
    const w = cyl(group, r, 0.36, x, 0, z, dark, 14);
    w.rotation.x = Math.PI / 2; w.position.y = r;
    const hub = cyl(group, r * 0.5, 0.38, x, 0, z, 0xcfd3d6, 10);
    hub.rotation.x = Math.PI / 2; hub.position.y = r;
  };
  if (kind === 'sport') {
    box(group, 4.4, 0.55, 1.9, 0, 0.3, 0, bodyMat);
    box(group, 1.9, 0.5, 1.6, -0.3, 0.85, 0, glassC);
    box(group, 1.5, 0.08, 1.62, -0.3, 1.35, 0, bodyMat);
    box(group, 0.3, 0.35, 1.9, -2.05, 0.95, 0, bodyMat); // spoiler
    box(group, 0.12, 0.3, 0.12, -1.95, 0.7, 0.7, dark); box(group, 0.12, 0.3, 0.12, -1.95, 0.7, -0.7, dark);
  } else if (kind === 'suv') {
    box(group, 4.2, 0.9, 2, 0, 0.45, 0, bodyMat);
    box(group, 2.9, 0.8, 1.8, -0.35, 1.35, 0, glassC);
    box(group, 3, 0.1, 1.9, -0.35, 2.15, 0, bodyMat);
    box(group, 2.4, 0.08, 0.1, -0.35, 2.3, 0.75, dark); box(group, 2.4, 0.08, 0.1, -0.35, 2.3, -0.75, dark);
  } else {
    box(group, 4.2, 0.6, 1.9, 0, 0.3, 0, bodyMat);
    box(group, 0.12, 0.5, 1.7, 0.5, 0.9, 0, glassC); // windscreen only
    box(group, 0.5, 0.45, 0.6, -0.5, 0.75, 0.42, 0x5a3b22); box(group, 0.5, 0.45, 0.6, -0.5, 0.75, -0.42, 0x5a3b22);
    box(group, 1.4, 0.12, 1.9, -1.4, 0.9, 0, bodyMat);
  }
  for (const s of [-1, 1]) {
    box(group, 0.1, 0.2, 0.4, 2.15, 0.55, s * 0.6, 0xfff2b0, { emissive: 0xfff2b0, emissiveIntensity: 0.9 });
    box(group, 0.1, 0.2, 0.4, -2.15, 0.6, s * 0.6, 0xff3b30, { emissive: 0xff3b30, emissiveIntensity: 0.7 });
    wheel(1.35, s * 0.95, kind === 'suv' ? 0.56 : 0.48);
    wheel(-1.35, s * 0.95, kind === 'suv' ? 0.56 : 0.48);
  }
  return { group, bodyMat };
}
