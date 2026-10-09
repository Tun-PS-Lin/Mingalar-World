// Gun range: pick a weapon at the counter, then shoot pop-up dummies and
// bullseye boards for 60 seconds. First person uses a view model on the
// camera; third person puts the gun in the avatar's hands.
import * as THREE from 'three';
import { box, rbox, cyl, ball, sign, drawTexture, clamp, damp } from './builders.js';
import { m, neon, compact } from './gfx.js';
import { ui, h } from './ui.js';

export const RANGE = { x0: 20, x1: 60, z0: 24, z1: 116, h: 9 };
const FLOOR = 0.25;
const LINE_Z = 48; // firing line (bench)
const ROUND = 60;

export const WEAPONS = {
  pistol: { name: 'Pistol', icon: '🔫', auto: false, rate: 0.16, mag: 12, reload: 1.2, spread: 0.004, recoil: 0.025, pellets: 1, desc: 'Accurate and quick. A good place to start.' },
  revolver: { name: 'Revolver', icon: '🤠', auto: false, rate: 0.42, mag: 6, reload: 2.0, spread: 0.002, recoil: 0.07, pellets: 1, desc: 'Six heavy rounds, pin-point accurate.' },
  smg: { name: 'SMG', icon: '💨', auto: true, rate: 0.07, mag: 32, reload: 1.6, spread: 0.022, recoil: 0.012, pellets: 1, desc: 'Hold to spray. Very fast, not very precise.' },
  rifle: { name: 'Assault Rifle', icon: '🎯', auto: true, rate: 0.11, mag: 30, reload: 2.0, spread: 0.008, recoil: 0.018, pellets: 1, desc: 'Full-auto with a red-dot sight.' },
  shotgun: { name: 'Shotgun', icon: '💥', auto: false, rate: 0.8, mag: 6, reload: 2.4, spread: 0.06, recoil: 0.09, pellets: 8, desc: 'Eight pellets per shot. Get close.' },
  sniper: { name: 'Sniper Rifle', icon: '🔭', auto: false, rate: 1.1, mag: 5, reload: 2.6, spread: 0.0, recoil: 0.11, pellets: 1, scope: true, desc: 'Right-click (or Q) to scope in. Long range kills.' },
};

// ------------------------------------------------------------- gun models
// Barrel points along -z, grip hangs down; origin at the grip.
const black = () => m('metal', 0x23262f);
export function gunModel(id) {
  const g = new THREE.Group();
  const B = black(), wood = m('wood', 0x7a4a26), steel = m('metal', 0x8b919c);
  const barrel = (len, r, z, y = 0.07) => { const c = cyl(g, r, len, 0, 0, 0, steel, 10); c.rotation.x = Math.PI / 2; c.position.set(0, y, z - len / 2); return c; };
  let muzzle = -0.3;
  switch (id) {
    case 'pistol':
      box(g, 0.07, 0.07, 0.3, 0, 0.04, -0.12, B);
      box(g, 0.06, 0.16, 0.08, 0, -0.12, 0.0, B).rotation.x = 0.2;
      box(g, 0.02, 0.06, 0.06, 0, -0.02, -0.06, B);
      muzzle = -0.28;
      break;
    case 'revolver':
      barrel(0.28, 0.022, -0.06, 0.06);
      cyl(g, 0.05, 0.08, 0, 0.03, -0.05, steel, 6).rotation.x = Math.PI / 2;
      box(g, 0.06, 0.18, 0.08, 0, -0.14, 0.03, wood).rotation.x = 0.35;
      box(g, 0.05, 0.05, 0.12, 0, 0.06, 0, B);
      muzzle = -0.36;
      break;
    case 'smg':
      box(g, 0.08, 0.12, 0.42, 0, 0.02, -0.15, B);
      box(g, 0.06, 0.18, 0.07, 0, -0.14, 0.0, B);
      box(g, 0.05, 0.22, 0.06, 0, -0.18, -0.16, B);
      barrel(0.14, 0.02, -0.36, 0.05);
      box(g, 0.04, 0.04, 0.24, 0, 0.04, 0.16, steel);
      muzzle = -0.52;
      break;
    case 'rifle':
      box(g, 0.08, 0.13, 0.62, 0, 0.02, -0.18, B);
      box(g, 0.07, 0.17, 0.08, 0, -0.13, 0.02, B).rotation.x = 0.25;
      box(g, 0.06, 0.24, 0.1, 0, -0.2, -0.18, B).rotation.x = -0.15;
      box(g, 0.08, 0.13, 0.3, 0, -0.02, 0.36, B);
      barrel(0.32, 0.022, -0.48, 0.06);
      box(g, 0.05, 0.07, 0.12, 0, 0.12, -0.12, B);
      box(g, 0.04, 0.04, 0.01, 0, 0.17, -0.12, neon(0xff3b30, 2));
      muzzle = -0.82;
      break;
    case 'shotgun':
      barrel(0.7, 0.03, -0.12, 0.07);
      barrel(0.62, 0.025, -0.12, 0.02);
      box(g, 0.08, 0.1, 0.26, 0, 0.02, 0.02, B);
      box(g, 0.08, 0.16, 0.36, 0, -0.06, 0.32, wood).rotation.x = 0.15;
      box(g, 0.09, 0.08, 0.2, 0, -0.01, -0.36, wood);
      muzzle = -0.84;
      break;
    case 'sniper':
      box(g, 0.08, 0.12, 0.6, 0, 0.02, -0.1, m('metal', 0x4a5236));
      box(g, 0.08, 0.15, 0.38, 0, -0.04, 0.38, m('metal', 0x4a5236)).rotation.x = 0.1;
      box(g, 0.06, 0.16, 0.08, 0, -0.12, 0.08, B);
      barrel(0.7, 0.02, -0.4, 0.06);
      { const sc = cyl(g, 0.04, 0.42, 0, 0, 0, B, 12); sc.rotation.x = Math.PI / 2; sc.position.set(0, 0.17, -0.1); }
      { const l = cyl(g, 0.045, 0.01, 0, 0, 0, new THREE.MeshStandardMaterial({ color: 0x223355, metalness: 1, roughness: 0 }), 12); l.rotation.x = Math.PI / 2; l.position.set(0, 0.17, -0.32); }
      for (const s of [-1, 1]) box(g, 0.015, 0.2, 0.015, s * 0.05, -0.12, -0.6, B).rotation.z = s * 0.4;
      muzzle = -1.1;
      break;
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  g.userData.muzzle = new THREE.Vector3(0, 0.06, muzzle);
  return g;
}

// ---------------------------------------------------------------- building
export function buildGunRange(W) {
  const S = W.static;
  const { x0, x1, z0, z1, h: H } = RANGE;
  const wall = m('concrete', 0x4d5446), stripe = m(0xff7a3d);
  W.slab(x0, x1, z0, z1, FLOOR, m('concrete', 0x9a9d96), 0.3);
  W.solid(x0, x1, z0, z1, -1, FLOOR);
  W.slab(x0 + 1, x1 - 1, z0 + 1, 40, FLOOR + 0.01, m('tiles', 0x2f3440), 0.2);
  const T = 0.8;
  W.wallBox(x0, x0 + T, z0, z1, 0, H, wall);
  W.wallBox(x1 - T, x1, z0, z1, 0, H, wall);
  W.wallBox(x0, x1, z1 - T, z1, 0, H, wall);
  W.wallBox(x0, 35, z0, z0 + T, 0, H, wall);
  W.wallBox(45, x1, z0, z0 + T, 0, H, wall);
  W.wallBox(35, 45, z0, z0 + T, 5.5, H, wall);
  // roof with baffles
  W.slab(x0 - 0.5, x1 + 0.5, z0 - 0.5, z1 + 0.5, H + 0.5, m('concrete', 0x3a3f36), 0.5);
  W.solid(x0 - 0.5, x1 + 0.5, z0 - 0.5, z1 + 0.5, H, H + 1, true);
  for (let z = 50; z < z1 - 4; z += 8) box(S, x1 - x0 - 2, 1.6, 0.4, (x0 + x1) / 2, H - 1.6, z, m('concrete', 0x6b6f66));
  for (let z = 48; z < z1; z += 8) box(S, 0.4, 0.1, 0.4, 25, H - 0.1, z, neon(0xffffff, 1)), box(S, 0.4, 0.1, 0.4, 55, H - 0.1, z, neon(0xffffff, 1));
  box(S, x1 - x0, 0.6, 0.25, (x0 + x1) / 2, H - 2, z0 - 0.1, stripe);
  box(S, 0.25, 0.6, z1 - z0, x0 - 0.1, H - 2, (z0 + z1) / 2, stripe);
  box(S, 0.25, 0.6, z1 - z0, x1 + 0.1, H - 2, (z0 + z1) / 2, stripe);
  // sign with a target logo
  sign(S, 'GUN RANGE', 14, 2.2, 40, H - 3.2, z0 - 0.12, Math.PI, { bg: '#14182b', fg: '#ff7a3d', glow: true, border: '#ff7a3d' });
  const tgt = drawTexture(256, 256, (g) => { const c = ['#ffffff', '#e2483d']; for (let i = 6; i > 0; i--) { g.fillStyle = c[i % 2]; g.beginPath(); g.arc(128, 128, i * 20, 0, 7); g.fill(); } });
  const logo = new THREE.Mesh(new THREE.CircleGeometry(1.6, 32), new THREE.MeshBasicMaterial({ map: tgt }));
  logo.position.set(51, H - 3.2, z0 - 0.13); logo.rotation.y = Math.PI; S.add(logo);
  const logo2 = logo.clone(); logo2.position.x = 29; S.add(logo2);
  box(S, 12, 0.4, 3, 40, 5.5, z0 - 1.5, m(0x23262f));
  W.indoors.push({ x0, x1, z0, z1, h: H });
  W.mapRect(x0, x1, z0, z1, '#4d5446', 'Gun Range');
  W.slab(x0, x1, 11.5, z0, 0.2, m('tiles', 0xd4d7dc));

  // ---- interior (only drawn near the range)
  W.beginArea('range', RANGE, 14);
  const S2 = W.static;
  // lobby: counter + weapon wall
  W.block(16, 1.15, 1.4, 40, FLOOR, 33.5, m('wood', 0x3a2a1f));
  box(S2, 16.3, 0.08, 1.7, 40, FLOOR + 1.15, 33.5, m('marble', 0xe8e8e8));
  box(S2, 18, 4.2, 0.2, 40, FLOOR + 1, 39, m('wood', 0x5a3b22));
  const ids = Object.keys(WEAPONS);
  ids.forEach((id, i) => {
    const gm = gunModel(id);
    gm.scale.setScalar(2.2);
    gm.rotation.set(0, Math.PI / 2, 0);
    gm.position.set(33 + (i % 3) * 7, FLOOR + 3.9 - Math.floor(i / 3) * 1.6, 38.6);
    S2.add(gm);
  });
  sign(S2, 'Press E at the counter to pick a weapon', 10, 0.7, 40, FLOOR + 5.7, 38.85, Math.PI, { bg: '#14182b', fg: '#ffffff' });
  W.zone('range', 40, 30.5, 4, 'Pick a weapon');
  // wall between the lobby and the range (you reach the firing line from the counter)
  W.wallBox(x0, x1, 39.8, 40.4, 0, H, wall);

  // firing line: bench + lane dividers
  W.block(x1 - x0 - 2, 1.1, 0.8, (x0 + x1) / 2, FLOOR, LINE_Z, m('wood', 0x7a5234), false);
  for (let x = x0 + 1; x <= x1 - 1; x += 6.4) box(S2, 0.12, 2.6, 3, x, FLOOR, LINE_Z - 1.2, m('concrete', 0xd8d8d8));
  for (let i = 0; i < 6; i++) sign(S2, `LANE ${i + 1}`, 1.6, 0.5, x0 + 4.2 + i * 6.4, FLOOR + 0.6, LINE_Z - 0.42, Math.PI, { bg: '#ff7a3d', fg: '#fff', radius: 10 });
  // berm at the back
  const berm = box(S2, x1 - x0 - 2, 6, 4, (x0 + x1) / 2, FLOOR - 1.5, z1 - 3.5, m('concrete', 0xb08a5a));
  berm.rotation.x = 0.4;
  // lane markers on the floor
  for (const z of [58, 73, 88, 103]) { box(S2, x1 - x0 - 2, 0.02, 0.2, (x0 + x1) / 2, FLOOR + 0.01, z, m(0xffc83d)).castShadow = false; sign(S2, `${z - LINE_Z} m`, 2, 0.6, x0 + 1.5, FLOOR + 0.03, z + 0.6, 0, { bg: null, fg: '#ffc83d' }).rotation.x = -Math.PI / 2; }

  // ---- targets (dynamic)
  const targets = [];
  const dummyMat = m('fabric', 0xd9c49a), headMat = m('fabric', 0xe6d3a8);
  const ringTex = drawTexture(256, 256, (g) => {
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, 256, 256);
    for (let i = 5; i > 0; i--) { g.fillStyle = i % 2 ? '#e2483d' : '#ffffff'; g.beginPath(); g.arc(128, 128, i * 24, 0, 7); g.fill(); }
    g.fillStyle = '#14182b'; g.beginPath(); g.arc(128, 128, 10, 0, 7); g.fill();
  });
  const chestTex = drawTexture(128, 128, (g) => {
    g.fillStyle = '#d9c49a'; g.fillRect(0, 0, 128, 128);
    for (let i = 3; i > 0; i--) { g.fillStyle = i % 2 ? '#e2483d' : '#ffffff'; g.beginPath(); g.arc(64, 56, i * 14, 0, 7); g.fill(); }
  });
  const chestMat = new THREE.MeshStandardMaterial({ map: chestTex, roughness: 0.9 });
  const boardMat = new THREE.MeshStandardMaterial({ map: ringTex, roughness: 0.8 });
  const addDummy = (x, z, move = 0, speed = 1) => {
    const root = new THREE.Group(); root.position.set(x, FLOOR, z); W.dyn.add(root);
    cyl(root, 0.5, 0.15, 0, 0, 0, m('metal', 0x23262f), 12);
    const pivot = new THREE.Group(); pivot.position.y = 0.15; root.add(pivot);
    box(pivot, 0.12, 1.1, 0.12, 0, 0, 0, m('wood', 0x7a5234));
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.2, 0.5), chestMat);
    body.position.y = 1.7; body.castShadow = true; pivot.add(body);
    for (const s of [-1, 1]) box(pivot, 0.35, 1, 0.4, s * 0.75, 1.2, 0, dummyMat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), headMat);
    head.position.y = 2.6; head.castShadow = true; pivot.add(head);
    body.userData.part = 'body'; head.userData.part = 'head';
    // merge everything that can't be shot into a couple of draw calls
    body.userData.keep = head.userData.keep = true;
    compact(pivot); pivot.userData.keep = true; compact(root);
    const t = { root, pivot, parts: [body, head], x, z, move, speed, phase: Math.random() * 6, down: 0, fall: 0, kind: 'dummy' };
    body.userData.target = head.userData.target = t;
    targets.push(t);
  };
  const addBoard = (x, z, move = 0, speed = 1) => {
    const root = new THREE.Group(); root.position.set(x, FLOOR, z); W.dyn.add(root);
    for (const s of [-1, 1]) box(root, 0.1, 1.6, 0.1, s * 0.8, 0, 0, m('wood', 0x7a5234));
    const pivot = new THREE.Group(); pivot.position.y = 1.6; root.add(pivot);
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 0.06), boardMat);
    board.position.y = 0.8; board.castShadow = true; pivot.add(board);
    board.userData.part = 'board';
    pivot.userData.keep = true; compact(root);
    const t = { root, pivot, parts: [board], x, z, move, speed, phase: Math.random() * 6, down: 0, fall: 0, kind: 'board' };
    board.userData.target = t;
    targets.push(t);
  };
  for (let i = 0; i < 6; i++) addDummy(x0 + 4.2 + i * 6.4, 58 + (i % 2) * 6);
  for (let i = 0; i < 5; i++) addBoard(x0 + 7.4 + i * 6.4, 76, i % 2 ? 2.2 : 0, 0.8 + i * 0.15);
  for (let i = 0; i < 4; i++) addDummy(x0 + 8 + i * 8, 92, 3.5, 0.6 + i * 0.2);
  for (let i = 0; i < 3; i++) addBoard(x0 + 10 + i * 10, 106, 0, 1);
  W.endArea();
  W.refs.range = { targets };
  W.updaters.push((dt, t) => {
    for (const tg of targets) {
      if (tg.move) tg.root.position.x = tg.x + Math.sin(t * tg.speed + tg.phase) * tg.move;
      if (tg.down > 0) { tg.down -= dt; tg.fall = Math.min(1, tg.fall + dt * 7); }
      else tg.fall = Math.max(0, tg.fall - dt * 4);
      tg.pivot.rotation.x = tg.fall * (tg.kind === 'board' ? 1.4 : 1.5);
    }
  });
}

// ===================================================================== GAME
const ray = new THREE.Raycaster();
const v2 = new THREE.Vector2();
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

export class GunRange {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.best = (() => { try { return JSON.parse(localStorage.getItem('mw-range-best')) || {}; } catch { return {}; } })();
    // effects pool
    const scene = game.scene;
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: flashTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.flash.visible = false;
    this.tracers = [];
    for (let i = 0; i < 16; i++) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 1), new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      t.visible = false; t.life = 0; scene.add(t); this.tracers.push(t);
    }
    // bullet holes and sparks are instanced: one draw call each however many there are
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    this.holes = new THREE.InstancedMesh(new THREE.CircleGeometry(0.05, 8), holeMat, 60);
    this.holes.count = 0;
    this.holes.frustumCulled = false;
    // live inside the range's area group, so they are only drawn near the range
    const area = game.world.areas.find((a) => a.name === 'range');
    (area ? area.dyn : scene).add(this.holes);
    this.holeI = 0;
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    this.sparkMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), sparkMat, 40);
    this.sparkMesh.frustumCulled = false;
    this.sparkMesh.count = 40;
    this.sparkMesh.visible = false;
    (area ? area.dyn : scene).add(this.sparkMesh);
    this.sparks = Array.from({ length: 40 }, () => ({ p: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0 }));
    this.sparkI = 0;
    this._m4 = new THREE.Matrix4();
    this._hideSparks();
    this.popups = [];
  }

  /** Open the weapon picker. */
  openPicker(zone) {
    const body = h(`<div class="grid">${Object.entries(WEAPONS).map(([id, w]) => `
      <div class="product">
        <div class="art" style="background:#3a3f36">${w.icon}</div>
        <div class="name">${w.name}</div>
        <div class="desc">${w.desc}</div>
        <div class="specs mini"><span>${w.auto ? 'Auto' : 'Semi'}</span><span>${w.mag} rds</span>${this.best[id] ? `<span>Best ${this.best[id]}</span>` : ''}</div>
        <button class="btn small" data-w="${id}">Shoot</button>
      </div>`).join('')}</div>
      <div class="note">60-second rounds. Dummies score 10 (head 25), bullseye boards up to 50. Moving and far targets give a bonus.</div>`);
    body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-w]');
      if (!b) return;
      ui.closePanel();
      // pointer lock needs this click, so request it right away
      if (!this.game.touch) this.game.controls.lock();
      this.game.fadeTo(() => this.start(b.dataset.w));
    });
    ui.openPanel({ kicker: 'Gun Range', title: 'Pick a weapon', body, zone });
  }

  start(id) {
    const g = this.game;
    this.weapon = WEAPONS[id];
    this.wid = id;
    this.active = true;
    this.phase = 'ready';
    g.mode = 'range';
    this.ammo = this.weapon.mag;
    this.cool = 0; this.reloading = 0;
    this.score = 0; this.hits = 0; this.shots = 0; this.time = ROUND;
    this.kick = 0; this.scoped = false;
    // stand at lane 3, facing down range (+z)
    g.player.teleport(RANGE.x0 + 17, FLOOR, LINE_Z - 1.6, 0);
    g.cam.yaw = Math.PI; g.cam.pitch = 0.02;
    g.snapCamera();
    // models: view model on the camera, world model in the hand
    this.view = gunModel(id);
    this.view.position.set(0.3, -0.3, -0.62);
    g.camera.add(this.view);
    this.hand = gunModel(id);
    this.hand.rotation.x = -Math.PI / 2;
    this.hand.position.set(0, -0.05, 0.05);
    this.hand.scale.setScalar(1.6);
    g.player.hold(this.hand);
    g.player.pose = { type: 'aim', pitch: 0 };
    g.camera.add(this.flash);
    this.flash.position.copy(this.view.userData.muzzle).add(this.view.position).add(new THREE.Vector3(0, 0, -0.05));
    document.body.classList.add('aiming');
    g.controls.wantLock = true;
    this._hud();
    ui.hint(g.touch ? 'Drag to aim · FIRE to shoot · Run = reload' : 'Click to shoot · R reload · ' + (this.weapon.scope ? 'Right-click / Q scope · ' : '') + 'V view · Esc leave');
    ui.toast('Round starts on your first shot', 1800);
  }

  exit() {
    if (!this.active) return;
    const g = this.game;
    this.active = false;
    g.mode = 'walk';
    g.camera.remove(this.view);
    g.camera.remove(this.flash);
    g.player.hold(null);
    g.player.pose = null;
    this.setScope(false);
    document.body.classList.remove('aiming');
    g.controls.wantLock = g.view === 'first';
    if (g.view !== 'first') g.controls.unlock();
    ui.hud(null); ui.hint(null);
    if (ui.panelZone === 'range-results') ui.closePanel();
    g.player.teleport(40, FLOOR, 29, Math.PI);
  }

  setScope(on) {
    const g = this.game;
    this.scoped = !!(on && this.weapon && this.weapon.scope && this.active);
    document.body.classList.toggle('scoped', this.scoped);
    g.zoomFov = this.scoped ? 18 : null;
  }

  _hud() {
    const w = this.weapon;
    const acc = this.shots ? Math.round((this.hits / this.shots) * 100) : 0;
    const el = ui.hud(`<span>${w.icon} <b>${w.name}</b></span><span>Ammo <b>${this.reloading > 0 ? '…' : this.ammo}</b>/${w.mag}</span><span>Time <b>${Math.ceil(this.time)}</b></span><span>Score <b>${this.score}</b></span><span>Acc <b>${acc}%</b></span><button id="range-exit">Leave</button>`);
    el.querySelector('#range-exit').onclick = () => this.leave();
  }

  leave() { this.game.fadeTo(() => this.exit()); }

  reload() {
    if (this.reloading > 0 || this.ammo === this.weapon.mag) return;
    this.reloading = this.weapon.reload;
    this.setScope(false);
    this._hud();
  }

  update(dt) {
    if (!this.active) return;
    const g = this.game, c = g.controls;
    // aim pose follows camera pitch
    g.player.pose.pitch = g.view === 'first' ? 0 : clamp(-g.cam.pitch, -0.6, 0.6);
    this.view.visible = g.view === 'first';
    this.hand.visible = g.view !== 'first';
    this.cool -= dt;
    if (this.reloading > 0) {
      this.reloading -= dt;
      this.view.rotation.x = Math.sin(Math.min(1, 1 - this.reloading / this.weapon.reload) * Math.PI) * -0.8;
      if (this.reloading <= 0) { this.reloading = 0; this.ammo = this.weapon.mag; this.view.rotation.x = 0; this._hud(); }
    }
    if (this.phase === 'play') {
      this.time -= dt;
      if (this.time <= 0) { this.time = 0; this._end(); }
    }
    const wantFire = this.weapon.auto ? c.fireHeld : c.takeFire();
    if (this.weapon.auto) c.takeFire();
    if (wantFire && this.phase !== 'over' && !ui.panelOpen && (g.touch || c.locked || g.view !== 'first')) this._shoot();
    // recoil recovery
    this.kick = damp(this.kick, 0, 12, dt);
    this.view.position.z = -0.62 + this.kick * 2;
    this.view.rotation.x = this.reloading > 0 ? this.view.rotation.x : this.kick * 3;
    // effects
    if (this.flash.visible && (this.flashT -= dt) <= 0) this.flash.visible = false;
    for (const t of this.tracers) if (t.visible && (t.life -= dt) <= 0) t.visible = false;
    if (this.sparksLive) {
      let live = 0;
      this.sparks.forEach((s, i) => {
        if (s.life <= 0) return;
        s.life -= dt; s.vel.y -= 12 * dt; s.p.addScaledVector(s.vel, dt);
        const k = s.life > 0 ? 1 : 0;
        this.sparkMesh.setMatrixAt(i, this._m4.makeScale(k, k, k).setPosition(s.p));
        live += k;
      });
      this.sparkMesh.instanceMatrix.needsUpdate = true;
      this.sparksLive = live > 0;
      this.sparkMesh.visible = this.sparksLive;
    }
    this._hudT = (this._hudT || 0) - dt;
    if (this._hudT <= 0 && this.phase !== 'over') { this._hudT = 0.2; this._hud(); }
  }

  _shoot() {
    const g = this.game, w = this.weapon;
    if (this.cool > 0 || this.reloading > 0) return;
    if (this.ammo <= 0) { this.reload(); return; }
    if (this.phase === 'ready') this.phase = 'play';
    this.cool = w.rate;
    this.ammo--;
    this.shots++;
    g.sfx && g.sfx('shot:' + this.wid);
    const cam = g.camera;
    const spread = w.spread * (this.scoped ? 0.1 : 1) * (g.view === 'first' ? 1 : 1.3);
    const meshes = [];
    for (const t of g.world.refs.range.targets) if (t.fall < 0.5) meshes.push(...t.parts);
    let hitAny = false;
    for (let p = 0; p < w.pellets; p++) {
      // spread is an angle in radians; convert it to screen (NDC) units
      const k = spread / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      v2.set((Math.random() - 0.5) * 2 * k, (Math.random() - 0.5) * 2 * k);
      ray.setFromCamera(v2, cam);
      ray.far = 200;
      const hits = ray.intersectObjects(meshes, false);
      // environment: floor / walls of the range as simple planes
      const envT = this._envHit(ray.ray);
      let end;
      if (hits.length && hits[0].distance < envT) {
        const hit = hits[0];
        end = hit.point;
        if (!hitAny) { hitAny = true; this.hits++; }
        this._score(hit);
        this._spark(hit.point);
      } else {
        end = tmp.copy(ray.ray.origin).addScaledVector(ray.ray.direction, Math.min(envT, 200));
        if (envT < 200) this._hole(end, this._envNormal);
        else this._spark(end);
      }
      this._tracer(end);
    }
    // muzzle flash + recoil
    this.flash.visible = g.view === 'first';
    this.flash.rotation.z = Math.random() * Math.PI;
    this.flashT = 0.05;
    this.kick = Math.min(0.08, this.kick + w.recoil * 0.6);
    g.cam.pitch = clamp(g.cam.pitch - w.recoil * (this.scoped ? 0.3 : 1), -1.2, 1.3);
    g.cam.yaw += (Math.random() - 0.5) * w.recoil * 0.3;
    if (this.ammo === 0) setTimeout(() => this.active && this.reload(), 200);
  }

  _envHit(r) {
    // the range as a box: floor, back berm, baffles and side walls
    let t = Infinity;
    const n = (this._envNormal = this._envNormal || new THREE.Vector3());
    const tryPlane = (tt, nx, ny, nz) => { if (tt > 0 && tt < t) { t = tt; n.set(nx, ny, nz); } };
    if (r.direction.y < -1e-4) tryPlane((FLOOR - r.origin.y) / r.direction.y, 0, 1, 0);
    if (r.direction.z > 1e-4) tryPlane((RANGE.z1 - 4 - r.origin.z) / r.direction.z, 0, 0, -1);
    if (r.direction.y > 1e-4) tryPlane((RANGE.h - 1.6 - r.origin.y) / r.direction.y, 0, -1, 0);
    if (r.direction.x > 1e-4) tryPlane((RANGE.x1 - 0.8 - r.origin.x) / r.direction.x, -1, 0, 0);
    if (r.direction.x < -1e-4) tryPlane((RANGE.x0 + 0.8 - r.origin.x) / r.direction.x, 1, 0, 0);
    return t;
  }

  _score(hit) {
    const t = hit.object.userData.target;
    const part = hit.object.userData.part;
    const dist = hit.distance;
    let pts = 0;
    if (part === 'head') pts = 25;
    else if (part === 'body') pts = 10;
    else {
      // bullseye rings by distance from the board centre
      const local = hit.object.worldToLocal(tmp2.copy(hit.point));
      const r = Math.hypot(local.x, local.y) / 0.8;
      pts = r < 0.1 ? 50 : r < 0.3 ? 30 : r < 0.5 ? 20 : r < 0.75 ? 10 : 5;
    }
    const bonus = (t.move ? 1.5 : 1) * (dist > 40 ? 1.5 : dist > 25 ? 1.2 : 1);
    pts = Math.round(pts * bonus);
    if (this.phase === 'play') this.score += pts;
    if (part !== 'board' || pts >= 30) t.down = part === 'head' ? 2.5 : 1.6;
    this._popup(`+${pts}${part === 'head' ? ' HEADSHOT' : pts >= 50 ? ' BULLSEYE' : ''}`);
    this.game.sfx && this.game.sfx('hit');
  }

  _popup(text) {
    const el = document.createElement('div');
    el.className = 'hitpop';
    el.textContent = text;
    document.getElementById('hud').appendChild(el);
    setTimeout(() => el.remove(), 700);
  }

  _hideSparks() {
    this._m4.makeScale(0, 0, 0);
    for (let i = 0; i < 40; i++) this.sparkMesh.setMatrixAt(i, this._m4);
    this.sparkMesh.instanceMatrix.needsUpdate = true;
  }

  /** Bullet hole on a wall or the floor (targets fall over, so they just spark). */
  _hole(p, n) {
    if (n) {
      const i = this.holeI++ % 60;
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      this._m4.compose(tmp.copy(p).addScaledVector(n, 0.01), q, new THREE.Vector3(1, 1, 1));
      this.holes.setMatrixAt(i, this._m4);
      this.holes.count = Math.min(60, Math.max(this.holes.count, i + 1));
      this.holes.instanceMatrix.needsUpdate = true;
    }
    this._spark(p);
  }

  _spark(p) {
    for (let i = 0; i < 4; i++) {
      const s = this.sparks[this.sparkI++ % this.sparks.length];
      s.life = 0.25 + Math.random() * 0.2;
      s.p.copy(p);
      s.vel.set((Math.random() - 0.5) * 6, Math.random() * 5, (Math.random() - 0.5) * 6);
    }
    this.sparksLive = true;
    this.sparkMesh.visible = true;
  }

  _tracer(end) {
    const g = this.game;
    const t = this.tracers.find((q) => !q.visible) || this.tracers[0];
    const start = g.view === 'first'
      ? this.view.localToWorld(tmp2.copy(this.view.userData.muzzle))
      : this.hand.localToWorld(tmp2.copy(this.hand.userData.muzzle));
    const len = start.distanceTo(end);
    t.position.copy(start).lerp(end, 0.5);
    t.scale.set(1, 1, len);
    t.lookAt(end);
    t.visible = true; t.life = 0.04;
  }

  _end() {
    this.phase = 'over';
    const acc = this.shots ? Math.round((this.hits / this.shots) * 100) : 0;
    const prev = this.best[this.wid] || 0;
    if (this.score > prev) { this.best[this.wid] = this.score; try { localStorage.setItem('mw-range-best', JSON.stringify(this.best)); } catch { /* ignore */ } }
    this.game.controls.unlock();
    const body = h(`
      <div class="podium">🎯</div>
      <table class="score">
        <tr><th>Score</th><th>Hits</th><th>Shots</th><th>Accuracy</th></tr>
        <tr><td><b>${this.score}</b></td><td>${this.hits}</td><td>${this.shots}</td><td>${acc}%</td></tr>
      </table>
      <p>${this.score > prev ? 'New personal best with the ' + this.weapon.name + '!' : `Best with the ${this.weapon.name}: ${prev}`}</p>
      <div class="row"><button class="btn" data-again style="flex:1">Go again</button><button class="btn ghost" data-switch>Change weapon</button><button class="btn ghost" data-leave>Leave</button></div>`);
    body.addEventListener('click', (e) => {
      if (e.target.closest('[data-again]')) { ui.closePanel(); if (!this.game.touch) this.game.controls.lock(); const id = this.wid; this.exit(); this.start(id); }
      else if (e.target.closest('[data-switch]')) { ui.closePanel(); this.exit(); this.openPicker('range'); }
      else if (e.target.closest('[data-leave]')) { ui.closePanel(); this.leave(); }
    });
    ui.openPanel({ kicker: 'Gun Range', title: 'Round over', body, zone: 'range-results' });
  }
}

let fTex = null;
function flashTex() {
  if (fTex) return fTex;
  fTex = drawTexture(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.3, 'rgba(255,200,80,0.9)'); gr.addColorStop(1, 'rgba(255,120,0,0)');
    g.fillStyle = gr;
    g.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = i % 2 ? 12 : 32; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
    g.fill();
  });
  return fTex;
}
