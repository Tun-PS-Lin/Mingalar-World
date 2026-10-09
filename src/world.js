// The town: ground, city blocks, roads, wall, the smaller attractions (home,
// pool, gym, mini golf course, parks) and the call-outs to the big buildings.
// Axes: +x is east, +z is south, y is up. One unit is roughly a metre.
import * as THREE from 'three';
import { box, cyl, ball, sign, seeded } from './builders.js';
import { m, neon, glass, bakeStatic } from './gfx.js';
import {
  C, createWorld, tree, pine, palm, lamp, bench, hedge, planter, flowerBed, trashCan, hydrant,
  rock, flagPole, trafficLight, busStop, fenceLine,
} from './kit.js';
import { buildMall } from './mall.js';
import { buildGarage, parkedCar } from './garage.js';
import { buildOffice } from './office.js';
import { buildGunRange } from './gunrange.js';
import { buildTrack } from './race.js';

export const SPAWN = { x: 0, z: -112, yaw: Math.PI };
export const CITY = { x0: -170, x1: 170, z0: -150, z1: 150 };
export const POOL = { x0: 98, x1: 122, z0: -102, z1: -88, floatY: -1.5 };
export const GOLF_OFFSET = { x: 60, z: 4 };
export const GYM_MAT = { x: 92, z: 86 };

const CURB = 0.15; // raised blocks: the road is at y = 0, pavements at y = CURB

/** Rectangle minus an optional hole, as up to four rectangles. */
function minus(r, h) {
  if (!h) return [r];
  return [
    { x0: r.x0, x1: h.x0, z0: r.z0, z1: r.z1 },
    { x0: h.x1, x1: r.x1, z0: r.z0, z1: r.z1 },
    { x0: h.x0, x1: h.x1, z0: r.z0, z1: h.z0 },
    { x0: h.x0, x1: h.x1, z0: h.z1, z1: r.z1 },
  ].filter((q) => q.x1 - q.x0 > 0.01 && q.z1 - q.z0 > 0.01);
}

export function buildWorld(scene) {
  const W = createWorld(scene);
  const S = W.static;
  W.spawn = SPAWN;
  W.pools.push(POOL);

  // ---------------------------------------------------------------- ground
  const grass = m('grass', C.grass);
  for (const r of minus({ x0: -900, x1: 900, z0: -900, z1: 900 }, CITY)) W.slab(r.x0, r.x1, r.z0, r.z1, 0, grass, 1);
  W.slab(CITY.x0, CITY.x1, CITY.z0, CITY.z1, 0, m('asphalt', C.road), 1);
  W.mapRect(-900, 900, -900, 900, '#7cc55a');
  W.mapRect(CITY.x0, CITY.x1, CITY.z0, CITY.z1, '#5b6068');

  // --------------------------------------------------------- city blocks
  /** Raised block: pavement border + grass, with an optional hole (pool). */
  const cityBlock = (x0, x1, z0, z1, hole = null, walk = 4.5) => {
    const r = { x0, x1, z0, z1 };
    const inner = { x0: x0 + walk, x1: x1 - walk, z0: z0 + walk, z1: z1 - walk };
    for (const q of minus(r, inner)) W.slab(q.x0, q.x1, q.z0, q.z1, CURB, m('concrete', 0xd9dcdf), 0.6);
    for (const q of minus(inner, hole)) W.slab(q.x0, q.x1, q.z0, q.z1, CURB + 0.01, grass, 0.6);
    for (const q of minus(r, hole)) W.solid(q.x0, q.x1, q.z0, q.z1, -1, CURB);
    // kerb stones
    const k = m('concrete', 0xeeeeee);
    box(S, x1 - x0, CURB + 0.02, 0.3, (x0 + x1) / 2, 0, z0 + 0.15, k).castShadow = false;
    box(S, x1 - x0, CURB + 0.02, 0.3, (x0 + x1) / 2, 0, z1 - 0.15, k).castShadow = false;
    box(S, 0.3, CURB + 0.02, z1 - z0, x0 + 0.15, 0, (z0 + z1) / 2, k).castShadow = false;
    box(S, 0.3, CURB + 0.02, z1 - z0, x1 - 0.15, 0, (z0 + z1) / 2, k).castShadow = false;
    W.mapRect(x0, x1, z0, z1, '#c9ccd0');
    W.mapRect(inner.x0, inner.x1, inner.z0, inner.z1, '#86cf63');
  };
  cityBlock(-146, -7, -126, -7);
  cityBlock(7, 146, -126, -7, POOL);
  cityBlock(-146, -7, 7, 126);
  cityBlock(7, 146, 7, 126);
  // perimeter strips between the ring road and the wall
  cityBlock(-170, -7, -150, -138, null, 3); cityBlock(7, 170, -150, -138, null, 3);
  cityBlock(-170, -7, 138, 150, null, 3); cityBlock(7, 170, 138, 150, null, 3);
  cityBlock(-170, -158, -138, 138, null, 3); cityBlock(158, 170, -138, 138, null, 3);

  // --------------------------------------------------------- road markings
  const paint = m(0xf4f4f4), yellow = m(0xffc83d);
  const mark = (w, d, x, z, mat = paint) => { const b = box(S, w, 0.02, d, x, 0.005, z, mat); b.castShadow = false; return b; };
  // centre lines (double yellow) + dashed lane lines
  const lineZ = (x, z0, z1) => { mark(0.15, z1 - z0, x - 0.16, (z0 + z1) / 2, yellow); mark(0.15, z1 - z0, x + 0.16, (z0 + z1) / 2, yellow); };
  const lineX = (z, x0, x1) => { mark(x1 - x0, 0.15, (x0 + x1) / 2, z - 0.16, yellow); mark(x1 - x0, 0.15, (x0 + x1) / 2, z + 0.16, yellow); };
  lineZ(0, -126, -12); lineZ(0, 12, 126); lineZ(0, -150, -142); lineZ(0, 142, 150);
  lineX(0, -146, -12); lineX(0, 12, 146);
  for (const x of [-152, 152]) lineZ(x, -126, 126);
  for (const z of [-132, 132]) lineX(z, -146, 146);
  // crosswalks at the central crossing and where the avenue meets the ring road
  const zebraX = (cx, cz, len) => { for (let i = -5; i <= 5; i++) mark(0.7, len, cx + i * 1.25, cz); };
  const zebraZ = (cx, cz, len) => { for (let i = -5; i <= 5; i++) mark(len, 0.7, cx, cz + i * 1.25); };
  zebraX(0, -10, 3); zebraX(0, 10, 3); zebraZ(-10, 0, 3); zebraZ(10, 0, 3);
  zebraX(0, -123, 3); zebraX(0, 123, 3);
  // manholes
  for (const [x, z] of [[3, -60], [-3, 60], [60, 3], [-60, -3], [3, 100], [-100, 3]]) cyl(S, 0.6, 0.02, x, 0, z, m('metal', 0x555b66), 14).castShadow = false;
  W.mapRect(-0.4, 0.4, -126, 126, '#e8c454'); W.mapRect(-146, 146, -0.4, 0.4, '#e8c454');

  // traffic lights at the central crossing
  trafficLight(W, -8.5, -8.5, 0); trafficLight(W, 8.5, 8.5, Math.PI);
  trafficLight(W, 8.5, -8.5, -Math.PI / 2); trafficLight(W, -8.5, 8.5, Math.PI / 2);

  // ------------------------------------------------------------ city wall
  const brick = m('brick', 0xb5573b), cap = m('concrete', 0xe9e2d6);
  const wallH = 4.5;
  const wall = (x0, x1, z0, z1) => {
    W.wallBox(x0, x1, z0, z1, 0, wallH, brick);
    box(S, x1 - x0 + 0.4, 0.35, z1 - z0 + 0.4, (x0 + x1) / 2, wallH, (z0 + z1) / 2, cap);
    const along = x1 - x0 > z1 - z0;
    const len = along ? x1 - x0 : z1 - z0;
    for (let t = 0; t <= len; t += 12) {
      const x = along ? x0 + t : (x0 + x1) / 2, z = along ? (z0 + z1) / 2 : z0 + t;
      box(S, 1.6, wallH + 0.8, 1.6, x, 0, z, cap);
    }
  };
  wall(-171.5, -12, -151.5, -150); wall(12, 171.5, -151.5, -150);
  wall(-171.5, -12, 150, 151.5); wall(12, 171.5, 150, 151.5);
  wall(-171.5, -170, -150, 150); wall(170, 171.5, -150, 150);
  W.mapRect(-171.5, -12, -151.5, -150, '#a0503a'); W.mapRect(12, 171.5, -151.5, -150, '#a0503a');
  W.mapRect(-171.5, -12, 150, 151.5, '#a0503a'); W.mapRect(12, 171.5, 150, 151.5, '#a0503a');
  W.mapRect(-171.5, -170, -150, 150, '#a0503a'); W.mapRect(170, 171.5, -150, 150, '#a0503a');
  for (const s of [-1, 1]) {
    const z = s * 150.75;
    for (const x of [-10.5, 10.5]) { W.block(3, 9, 3, x, 0, z, cap); box(S, 3.6, 0.6, 3.6, x, 9, z, m(C.dark)); }
    box(S, 24, 2, 2, 0, 9, z, m(C.dark));
    sign(S, 'MINGALAR WORLD', 18, 1.6, 0, 10, z - s * 1.05, s > 0 ? Math.PI : 0, { bg: null, fg: '#ffc83d', glow: true });
    sign(S, 'MINGALAR WORLD', 18, 1.6, 0, 10, z + s * 1.05, s > 0 ? 0 : Math.PI, { bg: null, fg: '#ffc83d', glow: true });
    // boom barrier: the town ends at the gates (the race track is reached from the garage)
    box(S, 0.6, 1.4, 0.6, -8, 0, z, m(C.dark));
    for (let i = 0; i < 9; i++) box(S, 1.7, 0.3, 0.3, -6.9 + i * 1.7, 1.15, z, m(i % 2 ? 0xffffff : 0xe2483d));
    W.solid(-9, 9, z - 0.6, z + 0.6, 0, 30, true);
  }

  // ======================================================== LUXURY HOME
  // NE block, front door faces south to the cross street; pool in the back garden.
  {
    const white = m('concrete', 0xf6f4ef), wood = m('wood', 0x9a6a3e), dark = m(0x2a2d33);
    const gl = m('window', 0x9fc8e0, { emissive: 0xffd27a, emissiveIntensity: 0 });
    W.refs.homeGlass = gl;
    const x0 = 92, x1 = 128, z0 = -70, z1 = -46;
    W.slab(x0 - 2, x1 + 2, z0 - 2, z1 + 2, CURB + 0.08, m('tiles', 0xe8e4dc));
    // ground floor
    W.wallBox(x0, x1, z0, z1, CURB, CURB + 5.5, white);
    // glazing bands
    box(S, 14, 3.6, 0.2, 101, CURB + 0.8, z1 + 0.05, gl);
    box(S, 0.2, 3.6, 16, x0 - 0.05, CURB + 0.8, -58, gl);
    box(S, 0.2, 3.6, 16, x1 + 0.05, CURB + 0.8, -58, gl);
    box(S, 30, 3.6, 0.2, 110, CURB + 0.8, z0 - 0.05, gl);
    // first floor (cantilevered, timber clad)
    W.wallBox(x0 + 4, x1 - 2, z0 - 3, z1 + 3, CURB + 5.5, CURB + 11, wood);
    box(S, x1 - x0 - 6 + 0.6, 0.5, z1 - z0 + 6.6, (x0 + 4 + x1 - 2) / 2, CURB + 11, (z0 + z1) / 2, dark);
    box(S, x1 - x0 + 0.8, 0.5, z1 - z0 + 0.8, (x0 + x1) / 2, CURB + 5.5, (z0 + z1) / 2, dark);
    box(S, 22, 3.4, 0.2, 108, CURB + 6.6, z1 + 3.05, gl);
    box(S, 22, 3.4, 0.2, 108, CURB + 6.6, z0 - 3.05, gl);
    box(S, 0.2, 3.4, 22, x1 - 1.95, CURB + 6.6, -58, gl);
    // roof terrace over the west wing
    for (const [w, d, x, z] of [[4, 0.1, x0 + 2, z1], [4, 0.1, x0 + 2, z0], [0.1, 24, x0, -58]]) box(S, w, 1.1, d, x, CURB + 5.75, z, glass(0xcfe9ff, 0.35));
    // solar panels
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      const p = box(S, 4, 0.12, 2.6, 103 + i * 5, CURB + 11.8, -64 + j * 4, m('metal', 0x24408f));
      p.rotation.x = 0.3;
    }
    // front door, canopy, steps
    box(S, 2.6, 3.6, 0.3, 116, CURB, z1 + 0.1, m('wood', 0x5a3b22));
    box(S, 0.12, 1.2, 0.12, 117, CURB + 1.4, z1 + 0.3, m('metal', 0xffc83d));
    box(S, 7, 0.3, 3.4, 116, CURB + 4, z1 + 1.7, dark);
    for (let i = 0; i < 3; i++) box(S, 5 - i * 0.6, 0.12, 1.2 - i * 0.3, 116, CURB + i * 0.12, z1 + 2.2 - i * 0.2, white);
    // garage door
    box(S, 7, 3.6, 0.2, 124, CURB, z1 + 0.05, m('metal', 0x5d636e));
    for (let i = 1; i < 6; i++) box(S, 7, 0.06, 0.24, 124, CURB + i * 0.6, z1 + 0.06, dark);
    sign(S, 'LUXURY HOME GALLERY', 10, 1, 101, CURB + 4.9, z1 + 0.16, 0, { bg: '#14182b', fg: '#ffc83d' });
    // driveway + front lawn
    W.slab(120, 128, z1 + 1, -11.5, CURB + 0.05, m('cobble', 0xc9c2b4));
    W.slab(114, 118, z1 + 2.4, -11.5, CURB + 0.05, m('tiles', 0xe8dcc4));
    parkedCar(W, 124, -34, Math.PI, 'summit', 0xf4f1ea);
    hedge(W, 92, 113, -14.5, -13.5); hedge(W, 129, 140, -14.5, -13.5);
    for (const x of [96, 104, 110]) palm(W, x, -26, 1);
    palm(W, 134, -30, 1.1); palm(W, 136, -52, 1.05);
    flowerBed(W, 94, 112, -40, -37);
    planter(W, 113, -42.5); planter(W, 119, -42.5, 0xffc83d);
    lamp(W, 112, -30, Math.PI / 2);
    W.zone('home', 116, -41, 4.5, 'Tour the Luxury Home Gallery');
    W.mapRect(x0, x1, z0, z1, '#f1ede4', 'Luxury Home');

    // ---- pool garden (back)
    const deck = m('wood', 0xc49a6c);
    const rim = { x0: POOL.x0 - 0.8, x1: POOL.x1 + 0.8, z0: POOL.z0 - 0.8, z1: POOL.z1 + 0.8 };
    for (const q of minus({ x0: 90, x1: 132, z0: -110, z1: -74 }, rim)) W.slab(q.x0, q.x1, q.z0, q.z1, CURB + 0.06, deck);
    for (const q of minus(rim, POOL)) W.slab(q.x0, q.x1, q.z0, q.z1, CURB + 0.1, m('marble', 0xffffff));
    const tile = m('tiles', 0x7fd6f0);
    const pw = POOL.x1 - POOL.x0, pd = POOL.z1 - POOL.z0, pcx = (POOL.x0 + POOL.x1) / 2, pcz = (POOL.z0 + POOL.z1) / 2;
    box(S, pw, 0.2, pd, pcx, -2.6, pcz, tile);
    box(S, pw, 2.75, 0.2, pcx, -2.5, POOL.z0 + 0.1, tile);
    box(S, pw, 2.75, 0.2, pcx, -2.5, POOL.z1 - 0.1, tile);
    box(S, 0.2, 2.75, pd, POOL.x0 + 0.1, -2.5, pcz, tile);
    box(S, 0.2, 2.75, pd, POOL.x1 - 0.1, -2.5, pcz, tile);
    for (let i = 1; i < 5; i++) box(S, pw - 0.4, 0.02, 0.25, pcx, -2.38, POOL.z0 + i * (pd / 5), m(0x2e6fdb));
    const water = new THREE.Mesh(new THREE.BoxGeometry(pw - 0.4, 0.1, pd - 0.4), new THREE.MeshStandardMaterial({ color: 0x3fd0f5, emissive: 0x0b6f96, emissiveIntensity: 0.35, transparent: true, opacity: 0.78, roughness: 0.12, metalness: 0 }));
    water.position.set(pcx, -0.25, pcz);
    W.dyn.add(water);
    W.updaters.push((dt, t) => { water.position.y = -0.22 + Math.sin(t * 1.6) * 0.03; });
    for (const z of [-99.6, -99]) { cyl(S, 0.06, 1.4, POOL.x0 + 0.35, -0.6, z, m('metal', 0xd0d0d0), 6); }
    // loungers, umbrellas, cabana
    for (const x of [100, 106, 112, 118]) {
      W.block(1.2, 0.45, 2.8, x, CURB, -80, m(0xffffff), false);
      box(S, 1.2, 0.8, 0.3, x, CURB + 0.45, -81.3, m(0xffffff)).rotation.x = -0.4;
      box(S, 1.1, 0.1, 1.8, x, CURB + 0.45, -79.8, m('fabric', 0x2bb3e6));
    }
    for (const [x, c] of [[103, 0xff5b8a], [115, 0xffc83d]]) {
      cyl(S, 0.08, 3.2, x, CURB, -80.5, m('metal', 0xd0d0d0), 6);
      const u = new THREE.Mesh(new THREE.ConeGeometry(2.4, 0.9, 10), m('fabric', c));
      u.position.set(x, CURB + 3.4, -80.5); u.castShadow = true; S.add(u);
    }
    W.wallBox(124, 131, -108, -104, CURB, CURB + 0.2, deck, false);
    for (const [x, z] of [[124.3, -107.7], [130.7, -107.7], [124.3, -97.3], [130.7, -97.3]]) cyl(S, 0.15, 3.4, x, CURB, z, m(0xffffff), 8);
    box(S, 7.4, 0.3, 11.2, 127.5, CURB + 3.4, -102.5, m('fabric', 0xf4f1ea));
    box(S, 4, 0.5, 1, 127.5, CURB + 0.06, -106, m('fabric', 0x2e6fdb));
    hedge(W, 89, 133, -112, -111); hedge(W, 89, 90, -111, -72); hedge(W, 132, 133, -111, -72);
    sign(S, 'POOL', 2.4, 1, 92.2, CURB + 2.4, -94, Math.PI / 2, { bg: '#2bb3e6', fg: '#ffffff', doubleSided: true });
    cyl(S, 0.08, 1.9, 92.2, CURB, -94, m('metal', 0xd0d0d0), 6);
    W.mapRect(90, 132, -110, -74, '#d9b98f');
    W.mapRect(POOL.x0, POOL.x1, POOL.z0, POOL.z1, '#2bb3e6', 'Pool');
  }

  // ================================================================== GYM
  {
    const x0 = 100, x1 = 130, z0 = 76, z1 = 96;
    W.slab(x0 - 2, x1 + 2, z0 - 2, z1 + 2, CURB + 0.08, m('tiles', 0xd8d8d8));
    W.wallBox(x0, x1, z0, z1, CURB, CURB + 7, m('concrete', 0x3c4350));
    box(S, x1 - x0 + 0.6, 1, z1 - z0 + 0.6, (x0 + x1) / 2, CURB + 5.4, (z0 + z1) / 2, m(0xff7a3d));
    box(S, x1 - x0 + 1, 0.4, z1 - z0 + 1, (x0 + x1) / 2, CURB + 7, (z0 + z1) / 2, m(0x23262f));
    const g = m('window', 0x86b6d6);
    box(S, 0.2, 3.4, 14, x0 - 0.06, CURB + 1, 86, g);
    box(S, 22, 3.4, 0.2, 115, CURB + 1, z0 - 0.06, g);
    sign(S, 'GYM', 7, 1.8, x0 - 0.12, CURB + 5.9, 86, -Math.PI / 2, { bg: null, fg: '#ffffff' });
    // outdoor workout area
    W.slab(GYM_MAT.x - 6, GYM_MAT.x + 5, 80, 92, CURB + 0.08, m('fabric', 0x2e6fdb));
    W.slab(GYM_MAT.x - 2.5, GYM_MAT.x + 2.5, 83.5, 88.5, CURB + 0.1, m('fabric', 0x23408f));
    // dumbbell rack + bench
    W.block(3, 0.9, 0.8, 90, CURB, 81, m('metal', 0x5d636e), false);
    for (let i = 0; i < 3; i++) {
      box(S, 0.6, 0.22, 0.22, 89.2 + i * 0.8, CURB + 0.95, 81, m('metal', 0xcfd3d6));
      for (const s of [-1, 1]) box(S, 0.16, 0.42, 0.42, 89.2 + i * 0.8 + s * 0.3, CURB + 0.85, 81, m([0xe2483d, 0xffc83d, 0x5be28a][i]));
    }
    W.block(0.9, 0.55, 2.4, 95, CURB, 90, m(0x23262f), false);
    // pull-up bar
    for (const z of [80.5, 83.5]) cyl(S, 0.08, 3, 87, CURB, z, m('metal', 0x5d636e), 8);
    const bar = cyl(S, 0.05, 3, 87, CURB + 3, 82, m('metal', 0xcfd3d6), 8); bar.rotation.x = Math.PI / 2; bar.position.y = CURB + 2.9;
    W.zone('gym', GYM_MAT.x, 86, 3, 'Start a workout');
    W.mapRect(x0, x1, z0, z1, '#3c4350', 'Gym');
  }

  // ============================================================= MINI GOLF
  // Lanes themselves are built in golf.js; this is the surrounding course.
  {
    const ox = GOLF_OFFSET.x, oz = GOLF_OFFSET.z;
    W.slab(32 + ox, 61 + ox, 11 + oz, 41 + oz, CURB + 0.03, m('grass', C.grassDark));
    W.slab(28.5 + ox, 32 + ox, 24 + oz, 28 + oz, CURB + 0.05, m('tiles', C.paving));
    hedge(W, 31 + ox, 62 + ox, 10 + oz, 11 + oz); hedge(W, 31 + ox, 62 + ox, 41 + oz, 42 + oz); hedge(W, 61 + ox, 62 + ox, 11 + oz, 41 + oz);
    hedge(W, 31 + ox, 32 + ox, 11 + oz, 22.8 + oz); hedge(W, 31 + ox, 32 + ox, 29.2 + oz, 41 + oz);
    W.block(1, 4.6, 1, 31.5 + ox, CURB, 22.6 + oz, m(0xffffff), false);
    W.block(1, 4.6, 1, 31.5 + ox, CURB, 29.4 + oz, m(0xffffff), false);
    box(S, 1.2, 1.5, 8.2, 31.5 + ox, CURB + 4.2, 26 + oz, m(0x2fa84f));
    sign(S, 'MINI GOLF', 7, 1.2, 30.88 + ox, CURB + 4.95, 26 + oz, -Math.PI / 2, { bg: null, fg: '#ffffff' });
    // decorative windmill
    const mill = new THREE.Group();
    mill.position.set(58.6 + ox, CURB, 21 + oz);
    S.add(mill);
    box(mill, 2, 3.4, 2, 0, 0, 0, m(0xe2483d));
    box(mill, 2.4, 0.9, 2.4, 0, 3.4, 0, m(0xffffff));
    const blades = new THREE.Group();
    blades.position.set(58.6 + ox - 1.25, CURB + 3.2, 21 + oz);
    W.dyn.add(blades);
    box(blades, 0.12, 5, 0.6, 0, -2.5, 0, m(0xffffff));
    box(blades, 0.12, 0.6, 5, 0, -0.3, 0, m(0xffffff));
    W.updaters.push((dt) => { blades.rotation.x += dt * 1.2; });
    W.solid(57.6 + ox, 59.6 + ox, 20 + oz, 22 + oz, 0, 3.4);
    bench(W, 34 + ox, 31 + oz, 1);
    W.zone('golf', 33.5 + ox, 26 + oz, 3.6, 'Play Mini Golf');
    W.mapRect(32 + ox, 61 + ox, 11 + oz, 41 + oz, '#4f9a3a', 'Mini Golf');
  }

  // ----------------------------------------------------- the big buildings
  buildMall(W);
  buildGarage(W);
  buildOffice(W);
  buildGunRange(W);
  buildTrack(W);

  // ------------------------------------------------- parks and street life
  // fountain plaza south of the mall
  {
    const cx = -80, cz = -24;
    W.slab(cx - 16, cx + 16, cz - 10, cz + 10, CURB + 0.06, m('cobble', 0xd9cfbd));
    cyl(S, 5, 0.9, cx, CURB, cz, m('marble', 0xf2f2f2), 28);
    cyl(S, 4.5, 0.12, cx, CURB + 0.75, cz, new THREE.MeshStandardMaterial({ color: 0x2bb3e6, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85 }), 28);
    cyl(S, 0.7, 2.6, cx, CURB, cz, m('marble', 0xf2f2f2), 14);
    cyl(S, 1.8, 0.3, cx, CURB + 2.6, cz, m('marble', 0xf2f2f2), 18);
    cyl(S, 0.3, 1, cx, CURB + 2.9, cz, m('marble', 0xf2f2f2), 10);
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 1, 8), new THREE.MeshStandardMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.7 }));
    jet.position.set(cx, CURB + 4, cz);
    W.dyn.add(jet);
    const spray = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.35, depthWrite: false }));
    spray.position.set(cx, CURB + 2.9, cz);
    spray.scale.set(1.7, 1.2, 1.7);
    W.dyn.add(spray);
    W.updaters.push((dt, t) => { jet.scale.y = 1.6 + Math.sin(t * 3) * 0.4; jet.position.y = CURB + 3.9 + jet.scale.y / 2; });
    W.solid(cx - 4.6, cx + 4.6, cz - 4.6, cz + 4.6, 0, CURB + 0.9);
    for (const [x, z, r] of [[cx, cz - 7.5, 0], [cx, cz + 7.5, 2], [cx - 9, cz, 1], [cx + 9, cz, 3]]) bench(W, x, z, r);
    for (const [x, z] of [[cx - 13, cz - 7], [cx + 13, cz - 7], [cx - 13, cz + 7], [cx + 13, cz + 7]]) lamp(W, x, z, 0);
    flowerBed(W, cx - 30, cx - 19, cz - 6, cz + 6);
    flowerBed(W, cx + 19, cx + 30, cz - 6, cz + 6, [0xff7a3d, 0xffc83d, 0xffffff]);
    flagPole(W, cx - 34, cz, 0x2e6fdb); flagPole(W, cx + 34, cz, 0xe2483d);
    W.mapRect(cx - 16, cx + 16, cz - 10, cz + 10, '#d9cfbd', 'Fountain');
  }

  // SE park with a pond and a basketball court
  {
    W.slab(66, 92, 98, 120, CURB + 0.04, m('concrete', 0xb06a3a));
    W.slab(67, 91, 99, 119, CURB + 0.05, m(0xd9763f));
    for (const [w, d, x, z] of [[24, 0.15, 79, 109], [0.15, 20, 79, 109]]) box(S, w, 0.02, d, x, CURB + 0.05, z, m(0xffffff)).castShadow = false;
    for (const z of [99.5, 118.5]) {
      cyl(S, 0.12, 4.2, 79, CURB, z, m('metal', 0x5d636e), 8);
      box(S, 1.8, 1.2, 0.1, 79, CURB + 3.6, z + (z < 109 ? 0.5 : -0.5), m(0xffffff));
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 6, 16), m(0xff7a3d));
      hoop.rotation.x = Math.PI / 2; hoop.position.set(79, CURB + 3.6, z + (z < 109 ? 1 : -1)); S.add(hoop);
      W.solid(78.8, 79.2, z - 0.2, z + 0.2, 0, 4.2);
    }
    fenceLine(W, 65, 97, 93, 97); fenceLine(W, 65, 121, 93, 121);
    W.mapRect(66, 92, 98, 120, '#d9763f', 'Court');
  }

  // pond park between the gun range and the gym
  {
    const cx = 78, cz = 66;
    const pond = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.1, 40), new THREE.MeshStandardMaterial({ color: 0x3fb8e0, emissive: 0x0b5f86, emissiveIntensity: 0.3, roughness: 0.35 }));
    pond.scale.z = 0.6; pond.position.set(cx, CURB + 0.02, cz); pond.receiveShadow = true;
    S.add(pond);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(9, 0.45, 6, 40), m('concrete', 0xb9b2a4));
    rim.rotation.x = Math.PI / 2; rim.scale.y = 0.6; rim.position.set(cx, CURB + 0.05, cz); rim.castShadow = true;
    S.add(rim);
    W.solid(cx - 8.5, cx + 8.5, cz - 5, cz + 5, -1, 30); // keep walkers out of the water
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + 0.3;
      cyl(S, 0.7 + (i % 3) * 0.2, 0.05, cx + Math.cos(a) * 5, CURB + 0.06, cz + Math.sin(a) * 3, m(0x4caf50), 12).castShadow = false;
    }
    for (const [x, z, s2] of [[cx - 10, cz - 4, 1.1], [cx + 10, cz + 4, 0.9], [cx + 9, cz - 5, 0.8]]) rock(W, x, z, s2);
    for (const a of [0.4, 1.4, 2.6, 3.6, 4.6, 5.6]) tree(W, cx + Math.cos(a) * 14, cz + Math.sin(a) * 10, 1);
    bench(W, cx, cz - 8, 0); bench(W, cx, cz + 8, 2);
    flowerBed(W, cx - 6, cx + 6, cz + 10.5, cz + 12.5);
    W.mapRect(cx - 9, cx + 9, cz - 5.4, cz + 5.4, '#3fb8e0', 'Pond');
  }
  // garden between the office and the home
  {
    W.slab(68, 86, -116, -24, CURB + 0.05, m('cobble', 0xd9cfbd));
    for (let z = -110; z <= -30; z += 16) { flowerBed(W, 70, 75, z, z + 6, [0xff6b9a, 0xffffff, 0xffc83d]); flowerBed(W, 79, 84, z, z + 6, [0x8e5bd6, 0xff7a3d, 0xffffff]); }
    for (let z = -114; z <= -26; z += 16) { lamp(W, 77, z, 0); }
    for (const z of [-100, -68, -36]) bench(W, 77, z + 6, 1);
    for (const z of [-118, -22]) for (const x of [66, 88]) palm(W, x, z, 1);
    W.mapRect(68, 86, -116, -24, '#d9cfbd', 'Garden');
  }
  // trees and a picnic lawn east of the garage
  for (const [x, z] of [[-30, 30], [-22, 44], [-32, 58], [-20, 66], [-28, 76], [-16, 30], [-16, 56]]) tree(W, x, z, 1.05);
  for (const [x, z] of [[-26, 36], [-24, 62]]) {
    W.block(2.6, 0.75, 1.2, x, CURB, z, m('wood', 0xa9713f), false);
    for (const s2 of [-1, 1]) W.block(2.6, 0.45, 0.4, x, CURB, z + s2 * 1, m('wood', 0x8a5a30), false);
  }

  // street furniture along the avenue and cross street
  for (let z = -116; z <= 116; z += 24) {
    if (Math.abs(z) < 14) continue;
    lamp(W, -9.2, z, Math.PI / 2); lamp(W, 9.2, z + 12, -Math.PI / 2);
  }
  for (let x = -136; x <= 136; x += 24) {
    if (Math.abs(x) < 14) continue;
    lamp(W, x, -9.2, 0); lamp(W, x + 12, 9.2, Math.PI);
  }
  for (const [x, z] of [[-9.5, -40], [9.5, 44], [-60, 9.5], [64, -9.5], [-9.5, 90]]) trashCan(W, x, z);
  for (const [x, z] of [[-9.6, -64], [9.6, 30], [36, -9.6], [-30, 9.6]]) hydrant(W, x, z);
  busStop(W, -10.5, -100, -Math.PI / 2); busStop(W, 10.5, 100, Math.PI / 2);
  bench(W, -10, -30, 1); bench(W, 10, -30, 3); bench(W, 10, 60, 3);

  // trees: city streets, parks and the countryside
  const rnd = seeded(7);
  // keep entrances clear: mall, office, garage, gun range, golf, home garden
  const clear = [[-20, -5, -88, -64], [5, 22, -84, -60], [-96, -74, 5, 20], [30, 50, 5, 20], [86, 132, -20, -5]];
  const open = (x, z) => !clear.some(([a, b, c, d]) => x > a && x < b && z > c && z < d);
  for (let z = -112; z <= 112; z += 16) {
    if (Math.abs(z) < 16) continue;
    if (open(-13, z)) tree(W, -13, z, 0.9);
    if (open(13, z)) tree(W, 13, z, 0.9);
  }
  for (let x = -136; x <= 136; x += 16) {
    if (Math.abs(x) < 16) continue;
    if (open(x, -13)) tree(W, x, -13, 0.85);
    if (open(x, 13)) tree(W, x, 13, 0.85);
  }
  // inner wall planting
  for (let x = -160; x <= 160; x += 14) {
    if (Math.abs(x) < 16) continue;
    pine(W, x, -144, 1); pine(W, x, 144, 1);
  }
  for (let z = -130; z <= 130; z += 14) { pine(W, -164, z, 1); pine(W, 164, z, 1); }
  for (const [x, z] of [[-136, -18], [-24, -18], [-136, 116], [-20, 116], [-24, 90], [-20, 100], [140, 116], [60, 120], [140, 60], [140, 30], [66, -18], [140, -18], [80, -18]]) tree(W, x, z, 1.1);
  for (const [x, z] of [[-30, 104], [-38, 112], [-46, 104], [-16, 76], [-24, 84], [-20, 110]]) tree(W, x, z, 1);
  for (const [x, z] of [[-34, 96], [-28, 120], [138, 70]]) rock(W, x, z, 1.2);
  // countryside beyond the race track
  for (let i = 0; i < 260; i++) {
    const a = rnd() * Math.PI * 2, d = 290 + rnd() * 420;
    const x = Math.cos(a) * d * 1.05, z = Math.sin(a) * d;
    if (Math.abs(x) < 14 && z < 0) continue;
    if (rnd() < 0.45) pine(W, x, z, 1 + rnd() * 1.2, false);
    else tree(W, x, z, 1 + rnd() * 1.1, false);
  }
  // distant hills ring the world
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rnd() * 0.1, d = 760 + rnd() * 80;
    const h = ball(S, 90 + rnd() * 60, 40 + rnd() * 40, 90 + rnd() * 60, Math.cos(a) * d, -8, Math.sin(a) * d, m('grass', [0x5aa848, 0x4f9a3f, 0x63b04e][i % 3]));
    h.castShadow = false;
  }

  W.mapLabel(0, -118, 'Spawn');
  W.forest.build(S);
  return W;
}

/** Called once everything (including mini-games) has added its parts. */
export function finishWorld(W) {
  W.finalize();
  let n = bakeStatic(W.static);
  for (const a of W.areas) n += bakeStatic(a.static);
  return n;
}
