// Detailed car models built from extruded side profiles, with every mod the
// garage offers (paint finish, wheels, spoilers, body kits, underglow...).
// Cars face +z; the origin is on the ground at the centre of the wheelbase.
import * as THREE from 'three';
import { compact } from './gfx.js';

export const CAR_SCALE = 1.3; // cars are a touch oversized to match the blocky avatars

// side profile (z forward, y up) as [z, y] points, front first along the top
export const MODELS = {
  apex: {
    name: 'Apex GT', tag: 'Sports coupe', width: 1.96, r: 0.36, track: 0.84, wf: 1.42, wr: -1.38,
    top: 64, accel: 22, grip: 1.0,
    body: [[2.28, 0.5], [2.2, 0.72], [1.4, 0.86], [0.9, 0.93], [-1.25, 0.99], [-1.9, 0.95], [-2.25, 0.86], [-2.3, 0.62], [-2.25, 0.3], [2.15, 0.3]],
    cabin: [[0.95, 0.92], [0.25, 1.33], [-0.55, 1.33], [-1.3, 0.98]],
    seatZ: -0.25, eyeY: 1.2,
  },
  summit: {
    name: 'Summit X', tag: 'Luxury SUV', width: 2.06, r: 0.44, track: 0.88, wf: 1.5, wr: -1.5,
    top: 52, accel: 17, grip: 0.9,
    body: [[2.35, 0.62], [2.3, 1.02], [1.7, 1.12], [1.05, 1.16], [-2.2, 1.18], [-2.38, 1.1], [-2.4, 0.5], [-2.3, 0.38], [2.25, 0.38]],
    cabin: [[1.1, 1.14], [0.45, 1.78], [-1.95, 1.8], [-2.3, 1.16]],
    seatZ: -0.2, eyeY: 1.65,
  },
  breeze: {
    name: 'Breeze Roadster', tag: 'Convertible', width: 1.9, r: 0.36, track: 0.82, wf: 1.35, wr: -1.3,
    top: 58, accel: 20, grip: 1.05, open: true,
    body: [[2.15, 0.48], [2.08, 0.7], [1.3, 0.86], [0.6, 0.9], [-1.4, 0.92], [-2.0, 0.9], [-2.15, 0.78], [-2.18, 0.4], [-2.1, 0.3], [2.05, 0.3]],
    cabin: [[0.62, 0.89], [0.28, 1.28], [0.18, 1.28], [0.5, 0.89]],
    seatZ: -0.45, eyeY: 1.2,
  },
  thunder: {
    name: 'Thunder 69', tag: 'Muscle car', width: 2.0, r: 0.38, track: 0.86, wf: 1.55, wr: -1.45,
    top: 60, accel: 24, grip: 0.85,
    body: [[2.45, 0.55], [2.42, 0.86], [1.9, 0.94], [0.8, 0.98], [-1.5, 0.98], [-2.3, 0.95], [-2.45, 0.85], [-2.45, 0.35], [2.4, 0.35]],
    cabin: [[0.8, 0.96], [0.15, 1.36], [-0.75, 1.36], [-1.75, 0.98]],
    seatZ: -0.3, eyeY: 1.24,
  },
  vortex: {
    name: 'Vortex R', tag: 'Hypercar', width: 2.04, r: 0.36, track: 0.86, wf: 1.48, wr: -1.42,
    top: 74, accel: 27, grip: 1.15,
    body: [[2.35, 0.38], [2.2, 0.6], [1.3, 0.78], [0.5, 0.86], [-1.3, 0.96], [-2.2, 0.92], [-2.35, 0.8], [-2.35, 0.3], [2.25, 0.26]],
    cabin: [[0.6, 0.84], [-0.1, 1.2], [-0.7, 1.2], [-1.6, 0.94]],
    seatZ: -0.35, eyeY: 1.08,
  },
};

export const MOD_OPTIONS = {
  finish: [['gloss', 'Gloss'], ['metallic', 'Metallic'], ['matte', 'Matte'], ['chrome', 'Chrome'], ['pearl', 'Pearl']],
  wheels: [['sport', 'Sport 5-spoke'], ['turbine', 'Turbine'], ['mesh', 'Mesh'], ['classic', 'Classic chrome'], ['offroad', 'Off-road']],
  spoiler: [['none', 'None'], ['lip', 'Lip'], ['wing', 'Wing'], ['gt', 'GT wing']],
  kit: [['stock', 'Stock'], ['street', 'Street kit'], ['race', 'Race kit']],
  underglow: [['none', 'Off'], ['cyan', 'Cyan'], ['pink', 'Pink'], ['green', 'Green'], ['purple', 'Purple']],
  tint: [['light', 'Light'], ['dark', 'Dark'], ['limo', 'Limo']],
  stripes: [['none', 'None'], ['racing', 'Racing'], ['side', 'Side']],
  engine: [['stock', 'Stock'], ['sport', 'Sport +8%'], ['race', 'Race +16%'], ['turbo', 'Turbo +25%']],
  tires: [['street', 'Street'], ['sport', 'Sport'], ['slick', 'Slicks']],
};
export const GLOW = { cyan: 0x3be8ff, pink: 0xff4fd8, green: 0x4dff88, purple: 0x9b5bff };
export const PAINTS = [0xe2483d, 0xff7a3d, 0xffc83d, 0x5be28a, 0x2fa37a, 0x2bb3e6, 0x2e6fdb, 0x1d2b6b, 0x8e5bd6, 0xff5b8a, 0xf4f1ea, 0xb8bec6, 0x5d636e, 0x16181d];
export const RIMS = [0xd8dde3, 0x23262f, 0xffc83d, 0xe2483d, 0x2e6fdb, 0xb08d57];

export const defaultMods = (paint) => ({
  paint, finish: 'metallic', wheels: 'sport', rim: 0xd8dde3, spoiler: 'none', kit: 'stock',
  underglow: 'none', tint: 'dark', stripes: 'none', stripeColor: 0xf4f1ea, engine: 'stock', nitro: false, tires: 'street',
});

/** Performance numbers for a model + mods. */
export function carStats(kind, mods) {
  const md = MODELS[kind];
  const eng = { stock: 1, sport: 1.08, race: 1.16, turbo: 1.25 }[mods.engine];
  const grip = md.grip * ({ street: 1, sport: 1.08, slick: 1.18 }[mods.tires]) * (mods.kit === 'race' ? 1.05 : 1) * (mods.spoiler === 'gt' ? 1.06 : mods.spoiler === 'wing' ? 1.03 : 1);
  return { top: md.top * eng, accel: md.accel * eng, grip, nitro: mods.nitro };
}

// ----------------------------------------------------------------- helpers
const matCache = new Map();
function cached(key, cls, make) {
  if (!matCache.has(key)) { const mm = make(); mm.userData.vc = cls; mm.userData.cached = true; matCache.set(key, mm); }
  return matCache.get(key);
}
const paintMat = (color, finish) => cached(`paint:${color}:${finish}`, 'paint:' + finish, () => makePaint(color, finish));
function makePaint(color, finish) {
  const base = { color, envMapIntensity: 1.2 };
  switch (finish) {
    case 'matte': return new THREE.MeshStandardMaterial({ ...base, roughness: 0.75, metalness: 0.1 });
    case 'chrome': return new THREE.MeshStandardMaterial({ ...base, roughness: 0.08, metalness: 1 });
    case 'pearl': return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.3, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 0.6, sheen: 0.5 });
    case 'metallic': return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.35, metalness: 0.65, clearcoat: 1, clearcoatRoughness: 0.08 });
    default: return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.3, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.04 });
  }
}

const std = (color, rough = 0.6, metal = 0) => cached(`std:${color}:${rough}:${metal}`, `car:${rough}:${metal}`, () => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));

/** Extrude a [z, y] profile across the car's width (x), centred. */
function extrudeProfile(pts, width, bevel = 0.08, arches = null) {
  // pts run over the top from the nose to the rear; with `arches` the last two
  // points are rear-bottom and front-bottom and the wheel arches are cut between them
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  const n = arches ? pts.length - 1 : pts.length;
  for (let i = 1; i < n; i++) {
    const [z, y] = pts[i];
    const prev = pts[i - 1];
    // soften the joints along the top
    if (i < n - 1 && y > 0.45 && prev[1] > 0.45) shape.quadraticCurveTo(prev[0], prev[1], (prev[0] + z) / 2, (prev[1] + y) / 2);
    shape.lineTo(z, y);
  }
  if (arches) {
    const yb = pts[pts.length - 1][1];
    for (const a of [...arches].sort((p, q) => p.z - q.z)) {
      shape.lineTo(a.z - a.r, yb);
      shape.absarc(a.z, a.y, a.r, Math.PI, 0, true);
      shape.lineTo(a.z + a.r, yb);
    }
    shape.lineTo(pts[pts.length - 1][0], yb);
  }
  shape.closePath();
  const depth = Math.max(0.01, width - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3, curveSegments: 10 });
  geo.rotateY(-Math.PI / 2); // shape x -> +z, extrusion -> -x
  geo.translate(depth / 2, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

/** Height of a [z, y] polyline's top at z. */
function topAt(pts, z) {
  let best = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const [z0, y0] = pts[i], [z1, y1] = pts[i + 1];
    if ((z <= z0 && z >= z1) || (z >= z0 && z <= z1)) {
      const t = z1 === z0 ? 0 : (z - z0) / (z1 - z0);
      const y = y0 + (y1 - y0) * t;
      if (best === null || y > best) best = y;
    }
  }
  return best ?? 0.5;
}

function add(parent, geo, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// ------------------------------------------------------------------ wheels
function tireGeo(r, w, chunky) {
  const k = 0.06;
  const pts = [
    new THREE.Vector2(r * 0.66, -w / 2), new THREE.Vector2(r - k, -w / 2), new THREE.Vector2(r - k * 0.2, -w / 2 + k * 0.6),
    new THREE.Vector2(r, -w / 2 + k * 1.4), new THREE.Vector2(r, w / 2 - k * 1.4), new THREE.Vector2(r - k * 0.2, w / 2 - k * 0.6),
    new THREE.Vector2(r - k, w / 2), new THREE.Vector2(r * 0.66, w / 2),
  ];
  const g = new THREE.LatheGeometry(pts, chunky ? 14 : 24);
  g.rotateZ(Math.PI / 2);
  return g;
}

function buildWheel(style, rim, r, w) {
  const spin = new THREE.Group();
  const rubber = std(0x1a1b1f, 0.92);
  const rimM = std(rim, 0.25, 0.85);
  const dark = std(0x2a2c31, 0.5, 0.6);
  const offroad = style === 'offroad';
  add(spin, tireGeo(r, w, offroad), rubber);
  if (offroad) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const t = add(spin, B(w * 0.95, 0.06, 0.14), rubber, 0, Math.cos(a) * (r + 0.01), Math.sin(a) * (r + 0.01));
      t.rotation.x = a;
    }
  }
  const face = w / 2 - 0.03; // outer face offset (wheel is mirrored per side)
  const disc = add(spin, new THREE.CylinderGeometry(r * 0.66, r * 0.66, w * 0.7, 24), dark);
  disc.rotation.z = Math.PI / 2;
  const spokes = (n, width, len, twist = 0) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const s = add(spin, B(0.05, len, width), rimM, face, Math.cos(a) * len * 0.5, Math.sin(a) * len * 0.5);
      s.rotation.x = a;
      s.rotation.y = twist;
    }
  };
  const lip = add(spin, new THREE.TorusGeometry(r * 0.63, 0.025, 6, 28), rimM, face, 0, 0);
  lip.rotation.y = Math.PI / 2;
  if (style === 'sport') spokes(5, 0.09, r * 0.62);
  else if (style === 'turbine') spokes(12, 0.04, r * 0.62, 0.5);
  else if (style === 'mesh') { spokes(10, 0.025, r * 0.62, 0.35); spokes(10, 0.025, r * 0.62, -0.35); }
  else if (style === 'classic') {
    const dish = add(spin, new THREE.CylinderGeometry(r * 0.6, r * 0.6, 0.04, 24), std(0xe8ecef, 0.1, 1), face, 0, 0);
    dish.rotation.z = Math.PI / 2;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; add(spin, B(0.03, 0.04, 0.04), dark, face + 0.02, Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42); }
  } else if (offroad) {
    const steel = add(spin, new THREE.CylinderGeometry(r * 0.6, r * 0.6, 0.04, 16), rimM, face, 0, 0);
    steel.rotation.z = Math.PI / 2;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add(spin, new THREE.CylinderGeometry(0.05, 0.05, 0.05, 10), dark, face + 0.01, Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36).rotation.z = Math.PI / 2; }
  }
  const cap = add(spin, new THREE.CylinderGeometry(r * 0.13, r * 0.13, 0.06, 12), rimM, face + 0.02, 0, 0);
  cap.rotation.z = Math.PI / 2;
  return spin;
}

// --------------------------------------------------------------------- car
/**
 * Build a car. Returns handles used by the showroom and the race:
 * { group, wheels[{steer, spin}], brake (material), nitro (group), eye (Vector3), r }
 */
export function buildCar(kind, mods, { fixed = false } = {}) {
  const md = MODELS[kind];
  const group = new THREE.Group();
  const car = new THREE.Group(); // body roll / pitch happens here
  group.add(car);
  car.scale.setScalar(CAR_SCALE);
  const W = md.width;
  const offroad = mods.wheels === 'offroad';
  const r = md.r * (offroad ? 1.14 : 1);
  const lift = offroad ? 0.12 : mods.kit === 'race' ? -0.03 : 0;
  const body = new THREE.Group();
  body.position.y = lift;
  car.add(body);

  const paint = paintMat(mods.paint, mods.finish);
  const trim = std(0x16181d, 0.45, 0.3);
  const chrome = std(0xe8ecef, 0.08, 1);
  const tintOp = { light: 0.45, dark: 0.75, limo: 0.92 }[mods.tint];
  const glassM = cached('glass:' + tintOp, 'glass:' + tintOp, () => new THREE.MeshStandardMaterial({ color: 0x15202c, roughness: 0.04, metalness: 0.8, transparent: true, opacity: tintOp, envMapIntensity: 1.5 }));

  const arches = [{ z: md.wf, y: md.r + 0.02, r: r + 0.08 }, { z: md.wr, y: md.r + 0.02, r: r + 0.08 }];
  add(body, extrudeProfile(md.body, W, 0.1, arches), paint);

  // cabin glass + roof
  if (!md.open) {
    const cab = md.cabin;
    add(body, extrudeProfile(cab, W * 0.8, 0.06), glassM).position.y = -0.01;
    const roofY = Math.max(cab[1][1], cab[2][1]);
    const roof = [[cab[1][0] - 0.05, roofY - 0.05], [cab[1][0] - 0.03, roofY + 0.02], [cab[2][0] + 0.02, roofY + 0.02], [cab[2][0], roofY - 0.05]];
    add(body, extrudeProfile(roof, W * 0.82, 0.04), paint);
    // pillars
    for (const s of [-1, 1]) {
      const a = add(body, B(0.06, 0.48, 0.08), paint, s * W * 0.405, (cab[0][1] + cab[1][1]) / 2, (cab[0][0] + cab[1][0]) / 2);
      a.rotation.x = Math.atan2(cab[0][0] - cab[1][0], cab[1][1] - cab[0][1]);
    }
  } else {
    // windscreen frame + roll hoops
    const cab = md.cabin;
    const ws = add(body, B(W * 0.78, 0.45, 0.04), glassM, 0, (cab[0][1] + cab[1][1]) / 2 + 0.02, (cab[0][0] + cab[1][0]) / 2);
    ws.rotation.x = -0.75;
    for (const s of [-1, 1]) add(body, new THREE.TorusGeometry(0.2, 0.035, 6, 12, Math.PI), chrome, s * 0.4, 0.95, -0.95).rotation.y = Math.PI / 2;
  }

  // interior: seats, dash, steering wheel (seen from the cockpit camera)
  const seatM = std(mods.kit === 'race' ? 0xe2483d : 0x2a2420, 0.85);
  for (const s of [-1, 1]) {
    add(body, B(0.5, 0.14, 0.5), seatM, s * 0.42, 0.62, md.seatZ);
    const back = add(body, B(0.5, 0.62, 0.12), seatM, s * 0.42, 0.95, md.seatZ - 0.3);
    back.rotation.x = -0.18;
  }
  const dashZ = md.cabin[0][0] - 0.3;
  add(body, B(W * 0.82, 0.22, 0.4), std(0x1f2126, 0.7), 0, 0.82, dashZ);
  add(body, B(0.3, 0.1, 0.02), cached('dash', 'dash', () => new THREE.MeshBasicMaterial({ color: 0x3be8ff })), 0.42, 0.9, dashZ - 0.21);
  const wheelG = new THREE.Group();
  wheelG.position.set(0.42, 0.98, dashZ - 0.32);
  wheelG.rotation.x = -0.45;
  body.add(wheelG);
  add(wheelG, new THREE.TorusGeometry(0.17, 0.025, 8, 20), trim);
  add(wheelG, B(0.3, 0.04, 0.03), trim);
  add(wheelG, new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8), trim, 0, 0, -0.12).rotation.x = Math.PI / 2;

  // nose & tail details
  const front = md.body[0][0], rear = md.body[md.body.length - 3][0];
  const noseY = md.body[0][1];
  const headM = cached('head', 'head', () => new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4d6, emissiveIntensity: 1.4, roughness: 0.1 }));
  const tailM = new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff1a1a, emissiveIntensity: 0.6, roughness: 0.2 });
  for (const s of [-1, 1]) {
    const hl = add(body, B(0.42, 0.1, 0.1), headM, s * W * 0.32, noseY + 0.1, front - 0.06);
    hl.rotation.x = 0.35;
    add(body, B(0.44, 0.14, 0.06), trim, s * W * 0.32, noseY + 0.08, front - 0.1);
    // mirrors
    add(body, B(0.18, 0.1, 0.12), paint, s * (W / 2 + 0.05), (md.cabin[0][1] + 0.12), md.cabin[0][0] - 0.25);
    // exhausts
    add(body, new THREE.CylinderGeometry(0.06, 0.06, 0.2, 10), chrome, s * 0.45, 0.42, rear - 0.02).rotation.x = Math.PI / 2;
  }
  add(body, B(W * 0.86, 0.08, 0.06), tailM, 0, md.body[md.body.length - 4][1] - 0.08, rear - 0.03);
  add(body, B(W * 0.5, 0.18, 0.06), trim, 0, noseY - 0.06, front - 0.02); // grille
  add(body, B(0.5, 0.14, 0.03), std(0xf4f1ea, 0.5), 0, 0.5, rear - 0.05); // plate

  // stripes follow the profile
  if (mods.stripes !== 'none') {
    const sm = std(mods.stripeColor, 0.4, 0.1);
    if (mods.stripes === 'racing') {
      const tops = md.body.filter((p) => p[1] > 0.6);
      const cabTop = md.open ? null : md.cabin;
      for (let z = front - 0.15; z > rear + 0.1; z -= 0.12) {
        let y = topAt(tops, z);
        if (cabTop && z < cabTop[0][0] && z > cabTop[3][0]) y = Math.max(y, topAt(cabTop, z) + (z < cabTop[1][0] && z > cabTop[2][0] ? 0.02 : -1));
        for (const s of [-1, 1]) add(body, B(0.16, 0.012, 0.13), sm, s * 0.15, y + 0.005, z).castShadow = false;
      }
    } else {
      for (const s of [-1, 1]) add(body, B(0.01, 0.08, (front - rear) * 0.8), sm, s * (W / 2 + 0.005), 0.66, (front + rear) / 2);
    }
  }

  // body kit
  if (mods.kit !== 'stock') {
    const race = mods.kit === 'race';
    for (const s of [-1, 1]) add(body, B(0.12, 0.12, (md.wf - md.wr) - r * 2.1), race ? trim : paint, s * (W / 2 - 0.02), 0.3, (md.wf + md.wr) / 2);
    add(body, B(W * 0.96, 0.05, race ? 0.32 : 0.18), trim, 0, 0.25, front - 0.05);
    add(body, B(W * 0.8, 0.1, 0.2), trim, 0, 0.3, rear + 0.05);
    if (race) for (const s of [-1, 1]) add(body, B(0.24, 0.03, 0.2), trim, s * W * 0.42, noseY - 0.05, front - 0.02).rotation.z = s * 0.3;
  }

  // spoilers
  const deckZ = rear + 0.25, deckY = topAt(md.body, deckZ);
  if (mods.spoiler === 'lip') add(body, B(W * 0.86, 0.06, 0.18), paint, 0, deckY + 0.03, deckZ).rotation.x = -0.25;
  if (mods.spoiler === 'wing' || mods.spoiler === 'gt') {
    const gt = mods.spoiler === 'gt';
    const h = gt ? 0.42 : 0.24;
    for (const s of [-1, 1]) add(body, B(0.05, h, 0.12), trim, s * 0.45, deckY + h / 2, deckZ);
    const wing = add(body, B(W * (gt ? 1.0 : 0.88), 0.05, gt ? 0.36 : 0.26), gt ? trim : paint, 0, deckY + h, deckZ - 0.04);
    wing.rotation.x = 0.12;
    if (gt) for (const s of [-1, 1]) add(body, B(0.03, 0.22, 0.42), trim, s * W * 0.5, deckY + h, deckZ - 0.04);
  }

  // underglow
  if (mods.underglow !== 'none') {
    const col = GLOW[mods.underglow];
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.25, (front - rear) * 1.05),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, map: glowTexture() }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(0, 0.04 / CAR_SCALE - lift, (front + rear) / 2);
    car.add(glow);
    add(body, B(W * 0.7, 0.03, (front - rear) * 0.7), cached('glow:' + col, 'glowstrip:' + col, () => new THREE.MeshBasicMaterial({ color: col })), 0, 0.27, (front + rear) / 2).castShadow = false;
  }

  // nitro flames (shown while boosting)
  const nitro = new THREE.Group();
  nitro.visible = false;
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.6, 10), new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending }));
    f.rotation.x = -Math.PI / 2;
    f.position.set(s * 0.45, 0.42, rear - 0.4);
    nitro.add(f);
  }
  body.add(nitro);

  // wheels
  const wheels = [];
  const wWidth = (offroad ? 0.36 : 0.3) * (mods.tires === 'slick' ? 1.1 : 1);
  for (const [z, front] of [[md.wf, true], [md.wr, false]]) {
    for (const s of [-1, 1]) {
      const steer = new THREE.Group();
      steer.position.set(s * (W / 2 - wWidth / 2 + 0.02), r, z);
      car.add(steer);
      const spin = buildWheel(mods.wheels, mods.rim, r, wWidth);
      if (s < 0) spin.scale.x = -1; // put the rim face on the outside
      steer.add(spin);
      // brake caliper (doesn't spin)
      const cal = add(steer, B(0.06, 0.16, 0.12), std(mods.kit === 'race' ? 0xe2483d : 0x8b919c, 0.5, 0.4), s * (wWidth / 2 - 0.12), r * 0.32, -r * 0.2);
      cal.castShadow = false;
      wheels.push({ steer, spin, front });
    }
  }

  // merge into a handful of draw calls: body in one go, each wheel on its own (they spin)
  nitro.userData.keep = true;
  for (const w of wheels) compact(w.spin, { dispose: true });
  compact(body, { dispose: true });
  // display cars never move their wheels: merge the whole car
  if (fixed) compact(group, { dispose: true });

  return {
    group, car, body, wheels, nitro, tail: tailM, r: r * CAR_SCALE,
    // driver's eye in the (scaled) `car` group's local space
    eye: new THREE.Vector3(0.42, md.eyeY + 0.04 + lift, md.seatZ - 0.05),
    length: (front - rear) * CAR_SCALE, width: W * CAR_SCALE,
    dispose() {
      group.traverse((o) => {
        if (!o.isMesh) return;
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((mm) => { if (!mm.userData.cached && !mm.userData.shared) mm.dispose(); });
      });
    },
  };
}

let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}
