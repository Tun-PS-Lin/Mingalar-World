// Virtual Garage: a big showroom with five cars on turntables and a mod shop.
// Walk up to a car and press E to customise it, then take it to the raceway.
import * as THREE from 'three';
import { box, cyl, ball, sign, hex, drawTexture, panel } from './builders.js';
import { m, neon, glass, compact } from './gfx.js';
import { buildCar, MODELS, MOD_OPTIONS, PAINTS, RIMS, GLOW, defaultMods, carStats } from './cars.js';
import { ui, h } from './ui.js';
import { planter, lamp, tree } from './kit.js';

export const GARAGE = { x0: -130, x1: -40, z0: 24, z1: 70, h: 12 };
const FLOOR = 0.25;
const TURN_Z = 42;
const LINEUP = [
  { kind: 'apex', paint: 0xe2483d, x: -118 },
  { kind: 'summit', paint: 0x2e6fdb, x: -101.5 },
  { kind: 'vortex', paint: 0x16181d, x: -85 },
  { kind: 'breeze', paint: 0xffc83d, x: -68.5 },
  { kind: 'thunder', paint: 0x2fa37a, x: -52 },
];

const STORE_KEY = 'mw-car-mods-v1';
function loadMods() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
}
function saveMods(all) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(all)); } catch { /* private mode */ }
}

/** A parked car baked into the scenery, with a collider. */
export function parkedCar(W, x, z, rot, kind, paint) {
  const c = buildCar(kind, defaultMods(paint), { fixed: true });
  c.group.position.set(x, 0, z);
  c.group.rotation.y = rot;
  W.static.add(c.group);
  const along = Math.abs(Math.cos(rot)) > 0.5;
  const hl = c.length / 2, hw = c.width / 2;
  W.solid(x - (along ? hw : hl), x + (along ? hw : hl), z - (along ? hl : hw), z + (along ? hl : hw), 0, 1.6);
}

export function buildGarage(W) {
  const S = W.static;
  const { x0, x1, z0, z1, h: H } = GARAGE;
  const shell = m('concrete', 0x2a2d33), trim = m(0xffc83d);

  W.slab(x0, x1, z0, z1, FLOOR, m('tiles', 0x8d939c), 0.3);
  W.solid(x0, x1, z0, z1, -1, FLOOR);
  W.slab(x0 + 1, x1 - 1, 52, z1 - 1, FLOOR + 0.01, m('concrete', 0x6b7079), 0.2); // workshop floor
  // walls (front/north is glass with an entrance)
  const T = 0.8;
  W.wallBox(x0, x0 + T, z0, z1, 0, H, shell);
  W.wallBox(x1 - T, x1, z0, z1, 0, H, shell);
  W.wallBox(x0, x1, z1 - T, z1, 0, H, shell);
  W.wallBox(x0, x1, z0, z0 + T, 7, H, shell);
  for (const [a, b] of [[x0, -92], [-78, x1]]) {
    box(S, b - a, 7, 0.25, (a + b) / 2, 0, z0 + 0.4, glass(0xbfe4ff, 0.28));
    W.solid(a, b, z0, z0 + T, 0, 7, false);
    for (let x = a; x <= b; x += 6) box(S, 0.3, 7, 0.4, x, 0, z0 + 0.4, m('metal', 0x23262f));
  }
  // roof + facade
  W.slab(x0 - 0.6, x1 + 0.6, z0 - 3, z1 + 0.6, H + 0.6, m('concrete', 0x23262f), 0.6);
  W.solid(x0 - 0.6, x1 + 0.6, z0 - 3, z1 + 0.6, H, H + 1, true);
  box(S, x1 - x0 + 1.2, 0.25, 0.3, (x0 + x1) / 2, H - 1.2, z0 - 0.3, neon(0xffc83d, 1.4));
  sign(S, 'VIRTUAL GARAGE', 26, 3, (x0 + x1) / 2, H - 3.2, z0 - 0.05, Math.PI, { bg: null, fg: '#ffc83d', glow: true });
  for (let x = x0 + 4; x < x1; x += 12) box(S, 0.25, H, 0.25, x, 0, z0 - 2.8, m('metal', 0x23262f));
  // inner ceiling LED strips + spotlights over each car
  for (let x = x0 + 6; x < x1 - 3; x += 9) box(S, 0.3, 0.1, z1 - z0 - 6, x, H - 0.7, (z0 + z1) / 2, neon(0xffffff, 0.9)).castShadow = false;
  // entrance doors (sliding)
  const doorMat = glass(0xcfe9ff, 0.3);
  const doors = [];
  for (const s of [-1, 1]) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(7, 7, 0.15), doorMat);
    d.position.set(-85 + s * 3.5, 3.5 + FLOOR, z0 + 0.4);
    W.dyn.add(d);
    doors.push({ d, s });
  }
  W.updaters.push((dt, t, p) => {
    const near = Math.abs(p.z - z0) < 9 && Math.abs(p.x + 85) < 9;
    for (const { d, s } of doors) d.position.x += (-85 + s * (near ? 10.5 : 3.5) - d.position.x) * Math.min(1, dt * 6);
  });
  W.indoors.push({ x0, x1, z0, z1, h: H });
  W.mapRect(x0, x1, z0, z1, '#3a3e46', 'Virtual Garage');

  // forecourt
  W.slab(x0, x1, 11.5, z0, 0.2, m('tiles', 0xd4d7dc));
  for (const x of [-124, -46]) planter(W, x, 18, 0xffc83d, 2);

  // ------------------------------------------------------ turntables + cars
  W.beginArea('garage', GARAGE, 45);
  const all = loadMods();
  const cars = LINEUP.map((d) => {
    const mods = { ...defaultMods(d.paint), ...(all[d.kind] || {}) };
    const g = new THREE.Group();
    g.position.set(d.x, FLOOR, TURN_Z);
    W.dyn.add(g);
    const base = cyl(W.static, 4.2, 0.18, d.x, FLOOR, TURN_Z, m('metal', 0x5d636e), 40);
    base.castShadow = false;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.9, 3.9, 0.08, 40), m('tiles', 0xbfc4ca));
    disc.position.y = 0.2;
    disc.receiveShadow = true;
    g.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.05, 0.06, 6, 48), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffc83d, emissiveIntensity: 0.15 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(d.x, FLOOR + 0.22, TURN_Z);
    W.dyn.add(ring);
    W.solid(d.x - 3.4, d.x + 3.4, TURN_Z - 3.4, TURN_Z + 3.4, 0, 1.8);
    // name plate on a stand facing the walkway
    box(W.static, 0.1, 1, 0.1, d.x, FLOOR, TURN_Z - 5.2, m('metal', 0x23262f));
    sign(W.static, `${MODELS[d.kind].name}\n${MODELS[d.kind].tag}`, 2.6, 0.9, d.x, FLOOR + 1.4, TURN_Z - 5.25, Math.PI, { bg: '#14182b', fg: '#ffffff', radius: 14 });
    // ceiling spot
    cyl(W.static, 1.2, 0.15, d.x, H - 0.95, TURN_Z, neon(0xfff4dc, 1.6), 20).castShadow = false;
    const entry = { ...d, mods, g, ring, model: null, spin: 0 };
    rebuild(entry);
    W.zone('car:' + d.kind, d.x, TURN_Z - 6, 3.6, `Customise the ${MODELS[d.kind].name}`);
    return entry;
  });
  function rebuild(c) {
    if (c.model) { c.g.remove(c.model.group); c.model.dispose(); }
    c.model = buildCar(c.kind, c.mods, { fixed: true });
    c.model.group.position.y = 0.24;
    c.g.add(c.model.group);
  }
  W.refs.garage = {
    cars, selected: null,
    rebuild,
    save() { const o = {}; for (const c of cars) o[c.kind] = c.mods; saveMods(o); },
  };
  W.updaters.push((dt) => {
    for (const c of cars) {
      const hot = W.refs.garage.selected === c;
      c.g.rotation.y += dt * (hot ? 0.9 : 0.2);
      const e = c.ring.material;
      e.emissiveIntensity += ((hot ? 2 : 0.15) - e.emissiveIntensity) * Math.min(1, dt * 6);
    }
  });

  // -------------------------------------------------------------- workshop
  {
    const S = W.static;
    const z = 62;
    // two lifts, one with a car up in the air
    for (const [x, up] of [[-118, true], [-100, false]]) {
      for (const s of [-1, 1]) box(S, 0.6, 3.6, 0.6, x + s * 2.4, FLOOR, z, m(0xe2483d));
      for (const s of [-1, 1]) box(S, 0.3, 0.2, 4.6, x + s * 1.2, up ? 2.2 : 0.4, z, m('metal', 0x8b919c));
      W.solid(x - 2.8, x + 2.8, z - 0.4, z + 0.4, 0, 3.6);
      if (up) {
        const car = buildCar('apex', { ...defaultMods(0xb8bec6), finish: 'matte' }, { fixed: true });
        car.group.position.set(x, 2.4, z);
        car.group.rotation.y = Math.PI / 2;
        S.add(car.group);
      }
    }
    // tyre rack
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.18, 8, 18), m(0x1a1b1f));
      t.position.set(-82 + j * 1.1, FLOOR + 0.6 + i * 1.1, z1 - 1.6);
      t.castShadow = true;
      S.add(t);
    }
    box(S, 5, 0.1, 1, -80.4, FLOOR + 1.1, z1 - 1.6, m('metal', 0x5d636e));
    box(S, 5, 0.1, 1, -80.4, FLOOR + 2.2, z1 - 1.6, m('metal', 0x5d636e));
    W.solid(-83, -77.6, z1 - 2.2, z1 - 1, 0, 3.5);
    // tool chests + workbench
    for (const [x, c] of [[-70, 0xe2483d], [-66.6, 0x2e6fdb]]) {
      W.block(3, 1.8, 1.2, x, FLOOR, z1 - 1.8, m('metal', c));
      for (let i = 0; i < 5; i++) box(S, 2.8, 0.03, 0.05, x, FLOOR + 0.3 + i * 0.3, z1 - 2.42, m('metal', 0xd0d0d0));
    }
    W.block(6, 1, 1.4, -56, FLOOR, z1 - 1.9, m('wood', 0xa9713f));
    box(S, 6, 2.4, 0.1, -56, FLOOR + 1.6, z1 - 1.0, m('metal', 0x5d636e));
    for (let i = 0; i < 8; i++) box(S, 0.08, 0.5, 0.05, -58.6 + i * 0.7, FLOOR + 2.4, z1 - 1.08, m('metal', 0xd0d0d0));
    sign(S, 'MOD SHOP', 9, 1.6, -85, 8.2, z1 - 0.9, Math.PI, { bg: '#14182b', fg: '#ffc83d', glow: true, border: '#ffc83d' });
    // posters
    const poster = drawTexture(256, 360, (g, w, hh) => {
      const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#ff7a3d'); gr.addColorStop(1, '#e2483d');
      g.fillStyle = gr; g.fillRect(0, 0, w, hh);
      g.fillStyle = '#fff'; g.font = '700 46px Fredoka, Arial'; g.textAlign = 'center';
      g.fillText('RACE', w / 2, 90); g.fillText('DAY', w / 2, 140);
      g.font = '600 22px Fredoka, Arial'; g.fillText('MINGALAR RACEWAY', w / 2, 320);
      g.fillStyle = '#14182b'; for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2) g.fillRect(i * 32, 180 + j * 32, 32, 32);
    });
    panel(S, poster, 2.6, 3.6, x0 + 0.92, 4.4, 48, Math.PI / 2, { glow: false });
    panel(S, poster, 2.6, 3.6, x1 - 0.92, 4.4, 48, -Math.PI / 2, { glow: false });
    sign(S, 'Press E at a car to customise it and race at the Mingalar Raceway', 18, 0.9, (x0 + x1) / 2, 9.6, z0 + 0.95, 0, { bg: '#14182b', fg: '#ffffff', radius: 12 });
  }
  W.endArea();

  // ------------------------------------------------------ parking lot (south)
  {
    W.slab(-132, -56, 76, 120, 0.2, m('asphalt', 0x4a4f57));
    for (let x = -126; x <= -62; x += 6) {
      box(S, 0.18, 0.02, 5, x, 0.2, 82.5, m(0xffffff)).castShadow = false;
      box(S, 0.18, 0.02, 5, x, 0.2, 113.5, m(0xffffff)).castShadow = false;
    }
    const lot = [['summit', 0x8b919c, -123], ['apex', 0xffc83d, -111], ['thunder', 0xe2483d, -93], ['breeze', 0x2bb3e6, -75]];
    lot.forEach(([k, c, x], i) => parkedCar(W, x, i % 2 ? 113.5 : 82.5, i % 2 ? Math.PI : 0, k, c));
    for (const x of [-120, -96, -72]) lamp(W, x, 98, 0);
    W.mapRect(-132, -56, 76, 120, '#4a4f57', 'Parking');
  }
}

// ------------------------------------------------------------- mod panel
const NAMES = { cyan: 'Cyan', pink: 'Pink', green: 'Green', purple: 'Purple' };

/** Customise panel for one showroom car. `onRace(entry)` starts a race. */
export function openGarageCar(world, kind, zone, onRace) {
  const G = world.refs.garage;
  const c = G.cars.find((q) => q.kind === kind);
  G.selected = c;
  const body = h('');
  const opt = (key, list) => `<div class="label">${key === 'kit' ? 'Body kit' : key[0].toUpperCase() + key.slice(1)}</div>
    <div class="opts">${list.map(([v, l]) => `<button class="opt ${String(c.mods[key]) === String(v) ? 'on' : ''}" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const sw = (key, list) => `<div class="swatches">${list.map((p) => `<button class="swatch ${c.mods[key] === p ? 'on' : ''}" data-k="${key}" data-c="${p}" style="background:${hex(p)}" aria-label="${hex(p)}"></button>`).join('')}</div>`;
  const bar = (label, v, max) => `<div class="stat"><span>${label}</span><div class="bar"><i style="width:${Math.min(100, (v / max) * 100)}%"></i></div></div>`;
  const render = () => {
    const st = carStats(kind, c.mods);
    body.innerHTML = `
      <div class="stats">
        ${bar('Top speed', st.top, 95)}${bar('Acceleration', st.accel, 34)}${bar('Grip', st.grip, 1.45)}
        <div class="note">${Math.round(st.top * 3.6)} km/h top speed${st.nitro ? ' · Nitro fitted' : ''}</div>
      </div>
      <button class="btn wide race" data-race>🏁 Race this car</button>
      <div class="label">Paint</div>${sw('paint', PAINTS)}
      ${opt('finish', MOD_OPTIONS.finish)}
      ${opt('wheels', MOD_OPTIONS.wheels)}
      <div class="label">Rim colour</div>${sw('rim', RIMS)}
      ${opt('spoiler', MOD_OPTIONS.spoiler)}
      ${opt('kit', MOD_OPTIONS.kit)}
      ${opt('underglow', MOD_OPTIONS.underglow)}
      ${opt('stripes', MOD_OPTIONS.stripes)}
      ${c.mods.stripes !== 'none' ? `<div class="label">Stripe colour</div>${sw('stripeColor', PAINTS)}` : ''}
      ${opt('tint', MOD_OPTIONS.tint)}
      ${opt('engine', MOD_OPTIONS.engine)}
      ${opt('tires', MOD_OPTIONS.tires)}
      <div class="label">Nitro</div>
      <div class="opts"><button class="opt ${c.mods.nitro ? '' : 'on'}" data-k="nitro" data-v="false">None</button><button class="opt ${c.mods.nitro ? 'on' : ''}" data-k="nitro" data-v="true">Nitro boost (Shift)</button></div>
      <button class="btn ghost wide" data-reset style="margin-top:14px">Reset to factory</button>`;
  };
  body.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if ('race' in d) { ui.closePanel(); onRace(c); return; }
    if ('reset' in d) c.mods = defaultMods(c.paint);
    else if (d.c) c.mods[d.k] = +d.c;
    else if (d.k) c.mods[d.k] = d.v === 'true' ? true : d.v === 'false' ? false : d.v;
    else return;
    G.rebuild(c);
    G.save();
    render();
  });
  render();
  ui.openPanel({
    kicker: 'Virtual Garage · Mod shop', title: MODELS[kind].name, body, zone,
    onClose: () => { if (G.selected === c) G.selected = null; },
  });
}
export { GLOW, NAMES };
