// Mingalar Raceway: a circuit around the outside of the city wall, arcade
// driving physics, three AI rivals, laps, timing and chase / cockpit cameras.
import * as THREE from 'three';
import { box, cyl, sign, drawTexture, clamp, damp, dampAngle, wrapAngle } from './builders.js';
import { m, neon } from './gfx.js';
import { buildCar, carStats, defaultMods, MODELS } from './cars.js';
import { ui, h } from './ui.js';

const WIDTH = 18; // asphalt width
const CURB_W = 1.6;
const WALL = WIDTH / 2 + 6; // barrier distance from the centre line
const N = 900; // centre-line samples
const LAPS = 3;

const CONTROL = [
  [0, -196], [90, -201], [168, -197], [214, -172], [232, -112], [220, -52], [242, 8], [228, 76], [238, 138],
  [206, 190], [140, 206], [62, 194], [0, 212], [-70, 198], [-148, 207], [-210, 186], [-237, 122], [-222, 52],
  [-241, -18], [-226, -88], [-234, -148], [-192, -194], [-100, -203],
];

/** Build the circuit; stores the centre line in W.refs.track. */
export function buildTrack(W) {
  const S = W.static;
  const curve = new THREE.CatmullRomCurve3(CONTROL.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
  const pts = curve.getSpacedPoints(N).slice(0, N);
  const length = curve.getLength();
  const T = [], R = [];
  for (let i = 0; i < N; i++) {
    const a = pts[(i - 1 + N) % N], b = pts[(i + 1) % N];
    const t = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
    T.push(t);
    R.push(new THREE.Vector3(-t.z, 0, t.x)); // right-hand side when driving
  }
  // curvature (for the AI's braking points)
  const K = pts.map((_, i) => {
    const a = T[(i - 6 + N) % N], b = T[(i + 6) % N];
    return Math.acos(clamp(a.dot(b), -1, 1)) / ((12 * length) / N);
  });
  const track = { pts, T, R, K, N, length, step: length / N, width: WIDTH, wall: WALL };
  W.refs.track = track;

  // ---- ribbons
  const ribbon = (o0, o1, y, mat, vScale = 0.1) => {
    const pos = [], uv = [], nor = [], idx = [];
    let dist = 0;
    for (let i = 0; i <= N; i++) {
      const k = i % N, p = pts[k], r = R[k];
      if (i > 0) dist += pts[k].distanceTo(pts[(i - 1) % N]);
      pos.push(p.x + r.x * o0, y, p.z + r.z * o0, p.x + r.x * o1, y, p.z + r.z * o1);
      nor.push(0, 1, 0, 0, 1, 0);
      uv.push(0, dist * vScale, 1, dist * vScale);
      if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    // make sure the faces point up whichever way the curve winds
    const tri = new THREE.Triangle(new THREE.Vector3(...pos.slice(0, 3)), new THREE.Vector3(...pos.slice(6, 9)), new THREE.Vector3(...pos.slice(3, 6)));
    const n = new THREE.Vector3(); tri.getNormal(n);
    if (n.y < 0) { for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]]; g.setIndex(idx); }
    const mesh = new THREE.Mesh(g, mat);
    mesh.receiveShadow = true;
    S.add(mesh);
    return mesh;
  };
  const wallRibbon = (o, y0, y1, mat, uScale = 0.25) => {
    const pos = [], uv = [], nor = [], idx = [];
    let dist = 0;
    for (let i = 0; i <= N; i++) {
      const k = i % N, p = pts[k], r = R[k];
      if (i > 0) dist += pts[k].distanceTo(pts[(i - 1) % N]);
      const x = p.x + r.x * o, z = p.z + r.z * o;
      pos.push(x, y0, z, x, y1, z);
      const s = -Math.sign(o);
      nor.push(r.x * s, 0, r.z * s, r.x * s, 0, r.z * s);
      uv.push(dist * uScale, 0, dist * uScale, 1);
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    S.add(mesh);
    return mesh;
  };
  const stripes = (a, b, w = 64) => {
    const t = drawTexture(w, 64, (g) => { g.fillStyle = a; g.fillRect(0, 0, w, 64); g.fillStyle = b; g.fillRect(0, 0, w / 2, 64); });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };
  const curbTex = stripes('#ffffff', '#e2483d');
  curbTex.rotation = 0;
  const vt = drawTexture(64, 64, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#e2483d'; g.fillRect(0, 0, 64, 32); });
  vt.wrapS = vt.wrapT = THREE.RepeatWrapping;
  ribbon(-WIDTH / 2 - 4, WIDTH / 2 + 4, 0.03, m('concrete', 0x9a9a8c), 0.1); // run-off
  ribbon(-WIDTH / 2, WIDTH / 2, 0.06, m('asphalt', 0x3c4047));
  ribbon(-WIDTH / 2 - CURB_W, -WIDTH / 2, 0.08, new THREE.MeshStandardMaterial({ map: vt, roughness: 0.6 }), 0.25);
  ribbon(WIDTH / 2, WIDTH / 2 + CURB_W, 0.08, new THREE.MeshStandardMaterial({ map: vt, roughness: 0.6 }), 0.25);
  ribbon(-WIDTH / 2 + 0.6, -WIDTH / 2 + 0.85, 0.07, m(0xffffff), 0.1);
  ribbon(WIDTH / 2 - 0.85, WIDTH / 2 - 0.6, 0.07, m(0xffffff), 0.1);
  const bt = stripes('#2e6fdb', '#ffffff', 128);
  for (const s of [-1, 1]) {
    wallRibbon(s * WALL, 0, 1.2, new THREE.MeshStandardMaterial({ map: bt, roughness: 0.5, side: THREE.DoubleSide }), 0.12);
    wallRibbon(s * (WALL + 0.4), 0, 1.2, m(0x8b919c), 0.1);
    ribbon(s > 0 ? WALL : -WALL - 0.4, s > 0 ? WALL + 0.4 : -WALL, 1.2, m(0xe9e2d6), 0.1);
  }
  W.mapLine(pts.map((p) => [p.x, p.z]), '#6d7178', WIDTH + 8);
  W.mapLine(pts.map((p) => [p.x, p.z]), '#3c4047', WIDTH);
  W.mapLabel(0, -214, 'Raceway');

  // ---- start / finish line + grid boxes
  const p0 = pts[0], t0 = T[0], r0 = R[0];
  const yaw0 = Math.atan2(t0.x, t0.z);
  const checker = drawTexture(256, 32, (g) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#111' : '#fff'; g.fillRect(i * 16, j * 16, 16, 16); } });
  const line = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, 2), new THREE.MeshStandardMaterial({ map: checker, roughness: 0.6 }));
  line.rotation.set(-Math.PI / 2, 0, yaw0 + Math.PI / 2);
  line.position.set(p0.x, 0.075, p0.z);
  line.receiveShadow = true;
  S.add(line);
  for (let i = 1; i <= 4; i++) {
    const k = (N - i * 4) % N, p = pts[k], r = R[k];
    for (const side of [i % 2 ? -1 : 1]) {
      const g = new THREE.Group(); g.position.set(p.x + r.x * side * 4, 0.075, p.z + r.z * side * 4); g.rotation.y = yaw0;
      S.add(g);
      box(g, 3.2, 0.01, 0.2, 0, 0, 2.6, m(0xffffff)).castShadow = false;
      box(g, 0.2, 0.01, 2.2, -1.5, 0, 1.6, m(0xffffff)).castShadow = false;
      box(g, 0.2, 0.01, 2.2, 1.5, 0, 1.6, m(0xffffff)).castShadow = false;
    }
  }
  // gantry with start lights
  const gantry = new THREE.Group();
  gantry.position.set(p0.x, 0, p0.z);
  gantry.rotation.y = yaw0;
  S.add(gantry);
  for (const s of [-1, 1]) {
    box(gantry, 1, 9, 1, s * (WIDTH / 2 + 2.5), 0, 0, m('metal', 0x23262f));
    W.solid(p0.x + r0.x * s * (WIDTH / 2 + 2.5) - 0.6, p0.x + r0.x * s * (WIDTH / 2 + 2.5) + 0.6, p0.z + r0.z * s * (WIDTH / 2 + 2.5) - 0.6, p0.z + r0.z * s * (WIDTH / 2 + 2.5) + 0.6, 0, 9);
  }
  box(gantry, WIDTH + 6, 1.8, 1.2, 0, 7.6, 0, m('metal', 0x23262f));
  sign(gantry, 'MINGALAR RACEWAY', WIDTH + 2, 1.5, 0, 8.5, -0.62, Math.PI, { bg: '#14182b', fg: '#ffc83d', glow: true });
  sign(gantry, 'MINGALAR RACEWAY', WIDTH + 2, 1.5, 0, 8.5, 0.62, 0, { bg: '#14182b', fg: '#ffc83d', glow: true });
  const lights = [];
  for (let i = 0; i < 5; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2a2a, emissiveIntensity: 0 });
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16), mat);
    l.rotation.x = Math.PI / 2;
    l.position.set(p0.x + r0.x * (i - 2) * 1.1 - t0.x * 0.7, 7.3, p0.z + r0.z * (i - 2) * 1.1 - t0.z * 0.7);
    W.dyn.add(l);
    lights.push(mat);
  }
  track.lights = lights;
  // grandstand on the outside of the start straight
  {
    const g = new THREE.Group();
    const k = N - 30, p = pts[k], r = R[k];
    const side = -1; // left of the track at the start = away from the city
    g.position.set(p.x + r.x * side * (WALL + 9), 0, p.z + r.z * side * (WALL + 9));
    g.rotation.y = yaw0 + Math.PI / 2 * side * -1;
    S.add(g);
    const seatCols = [0xe2483d, 0x2e6fdb, 0xffc83d, 0x5be28a];
    for (let i = 0; i < 6; i++) {
      box(g, 46, 1, 2, 0, i, -i * 2, m('concrete', 0xd8d8d8));
      for (let j = 0; j < 22; j++) box(g, 1.4, 0.5, 0.8, -21 + j * 2, i + 1, -i * 2 - 0.3, m(seatCols[(i + j) % 4]));
    }
    for (const s of [-1, 1]) box(g, 0.6, 12, 0.6, s * 23, 0, -12, m('metal', 0x8b919c));
    box(g, 48, 0.4, 14, 0, 12, -6, m(0x14182b));
    sign(g, 'GRANDSTAND', 14, 1.6, 0, 10.4, 0.4, 0, { bg: '#14182b', fg: '#ffffff', glow: true });
    const cx = g.position.x, cz = g.position.z;
    W.solid(cx - 24, cx + 24, cz - 24, cz + 24, 0, 13);
  }
  // sponsor boards + tyre stacks at the sharpest corners
  const boards = ['MINGALAR NEWS', 'ALACRITY RESEARCH', 'VIRTUAL GARAGE', 'MINGALAR WORLD', 'VIRTUAL MALL'];
  let b = 0;
  for (let i = 40; i < N; i += 75) {
    const p = pts[i], r = R[i], side = K[i] > 0.012 ? 1 : -1;
    const s = sign(S, boards[b++ % boards.length], 9, 1.2, p.x + r.x * side * (WALL + 0.3), 1.9, p.z + r.z * side * (WALL + 0.3), Math.atan2(-r.x * side, -r.z * side), { bg: ['#e2483d', '#2e6fdb', '#14182b', '#ffc83d'][b % 4], fg: '#ffffff' });
    s.position.y = 1.9;
  }
  for (let i = 0; i < N; i += 9) {
    if (K[i] < 0.016) continue;
    const r = R[i], p = pts[i];
    const sgn = Math.sign(r.x * (pts[(i + 20) % N].x - p.x) + r.z * (pts[(i + 20) % N].z - p.z)) || 1; // outside of the bend
    const x = p.x - r.x * sgn * (WALL - 0.8), z = p.z - r.z * sgn * (WALL - 0.8);
    for (let j = 0; j < 3; j++) cyl(S, 0.5, 0.42, x, j * 0.42, z, m(j % 2 ? 0xffffff : 0x1a1b1f), 12);
  }
  // access road from the north gate
  W.slab(-7, 7, -196 + WIDTH / 2 + CURB_W + 4, -151.5, 0.02, m('asphalt', 0x55595f));
  return track;
}

// =================================================================== RACE
const tmp = new THREE.Vector3();

export class Race {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.view = 'chase';
    this.best = loadBest();
  }

  /** Begin a race in the given showroom car entry ({ kind, mods }). */
  start(entry) {
    const g = this.game;
    const tr = g.world.refs.track;
    this.track = tr;
    this.entry = entry;
    this.stats = carStats(entry.kind, entry.mods);
    this.active = true;
    g.mode = 'race';
    g.player.group.visible = false;
    // player car on the grid (slot 4, back right)
    this.cars = [];
    const rivals = [['apex', 0xff7a3d], ['vortex', 0xf4f1ea], ['thunder', 0x8e5bd6]].filter(([k]) => k !== entry.kind).slice(0, 3);
    if (rivals.length < 3) rivals.push(['summit', 0x2bb3e6]);
    const slots = [4, 8, 12, 16];
    rivals.forEach(([kind, paint], i) => {
      const mods = { ...defaultMods(paint), wheels: ['sport', 'turbine', 'mesh'][i], spoiler: ['wing', 'gt', 'lip'][i] };
      this.cars.push(this._spawn(kind, mods, slots[i], i % 2 ? 1 : -1, true, i));
    });
    this.me = this._spawn(entry.kind, entry.mods, slots[3], 1, false);
    this.cars.push(this.me);
    this._applyView();
    this.phase = 'countdown';
    this.timer = 0;
    this.countdown = 4.2;
    this.lapStart = 0;
    this.nitro = 1;
    this.finished = false;
    this.results = null;
    // camera
    this.camYaw = this.me.h + Math.PI;
    this.lookOff = { yaw: 0, pitch: 0 };
    ui.hint(g.touch ? 'Left stick: steer & throttle · Run: nitro · Jump: handbrake' : 'W/S throttle & brake · A/D steer · Space handbrake · Shift nitro · V camera · Esc leave');
    this._hud();
  }

  _spawn(kind, mods, back, side, ai, idx = 0) {
    const tr = this.track;
    const k = (tr.N - back) % tr.N;
    const p = tr.pts[k], r = tr.R[k], t = tr.T[k];
    const model = buildCar(kind, mods);
    this.game.scene.add(model.group);
    const st = carStats(kind, mods);
    const car = {
      kind, model, ai, idx,
      x: p.x + r.x * side * 4, z: p.z + r.z * side * 4,
      h: Math.atan2(t.x, t.z), vf: 0, vs: 0, steer: 0, k,
      lap: 0, cps: 0, prog: -back, done: false, finishT: 0,
      lane: side * 4, top: ai ? st.top * (0.86 + idx * 0.04) : st.top, accel: st.accel, grip: st.grip,
      lapTimes: [],
    };
    this._place(car);
    return car;
  }

  exit() {
    if (!this.active) return;
    const g = this.game;
    this.active = false;
    for (const c of this.cars) { g.scene.remove(c.model.group); c.model.dispose(); }
    this.cars = [];
    g.player.group.visible = true;
    g.mode = 'walk';
    ui.hud(null); ui.hint(null);
    if (ui.panelZone === 'race-results') ui.closePanel();
  }

  toggleView() {
    this.view = this.view === 'chase' ? 'cockpit' : 'chase';
    this._applyView();
  }

  _applyView() {
    // look through a clear windscreen from the driver's seat
    for (const o of this.me.model.body.children) if (o.userData.cls && o.userData.cls.startsWith('glass')) o.visible = this.view !== 'cockpit';
  }

  _hud() {
    const me = this.me;
    const pos = this._position();
    const t = this.phase === 'countdown' ? 0 : this.timer;
    const sp = Math.round(Math.abs(me.vf) * 3.6);
    const lap = Math.min(LAPS, Math.max(1, me.lap + 1));
    const nitro = this.stats.nitro ? `<span>Nitro <i class="meter"><i style="width:${Math.round(this.nitro * 100)}%"></i></i></span>` : '';
    const best = this.best[this.entry.kind];
    const el = ui.hud(`<span>Lap <b>${lap}</b>/${LAPS}</span><span>Pos <b>${pos}</b>/4</span><span><b>${fmt(t)}</b></span>${best ? `<span>Best ${fmt(best)}</span>` : ''}<span><b>${sp}</b> km/h</span>${nitro}<button id="race-exit">Leave</button>`);
    el.querySelector('#race-exit').onclick = () => this.leave();
  }

  leave() { this.game.fadeTo(() => { this.exit(); this.game.returnFromRace(); }); }

  _position() {
    const me = this.me;
    let pos = 1;
    for (const c of this.cars) if (c !== me && (c.done && !me.done ? true : c.prog > me.prog)) pos++;
    return pos;
  }

  update(dt) {
    if (!this.active) return;
    const g = this.game, c = g.controls;
    const tr = this.track;

    if (this.phase === 'countdown') {
      this.countdown -= dt;
      const lit = clamp(Math.floor(4.2 - this.countdown), 0, 5);
      tr.lights.forEach((l, i) => { l.emissiveIntensity = i < Math.min(lit, 3) * 5 / 3 ? 2.5 : 0; l.emissive.setHex(0xff2a2a); });
      const n = Math.ceil(this.countdown - 1.2);
      if (n !== this._lastN) { this._lastN = n; if (n >= 1 && n <= 3) ui.toast(String(n), 700); }
      if (this.countdown <= 1.2) {
        this.phase = 'race';
        this.timer = 0;
        ui.toast('GO!', 900);
        tr.lights.forEach((l) => { l.emissive.setHex(0x34c759); l.emissiveIntensity = 2.5; });
      }
    } else {
      this.timer += dt;
      if (this.timer > 4) tr.lights.forEach((l) => { l.emissiveIntensity = 0; });
    }

    // input
    const mv = c.move();
    const racing = this.phase === 'race';
    const k = c.keys;
    const input = {
      throttle: racing && !this.me.done ? Math.max(0, mv.y) : 0,
      brake: racing ? Math.max(0, -mv.y) : 0,
      steer: -mv.x,
      handbrake: k.has('Space') || c.touchAction,
      nitro: racing && this.stats.nitro && c.run && this.nitro > 0.02,
    };
    if (input.nitro) this.nitro = Math.max(0, this.nitro - dt * 0.28);
    else this.nitro = Math.min(1, this.nitro + dt * 0.07);
    this.me.model.nitro.visible = input.nitro;

    for (const car of this.cars) {
      const inp = car.ai ? this._ai(car, racing) : input;
      this._physics(car, inp, dt);
    }
    this._collideCars();
    for (const car of this.cars) { this._progress(car); this._place(car, dt); }

    // brake lights
    this.me.model.tail.emissiveIntensity = input.brake > 0.1 || input.handbrake ? 2.5 : 0.6;
    this._hudT = (this._hudT || 0) - dt;
    if (this._hudT <= 0) { this._hudT = 0.1; if (!this.results) this._hud(); }
  }

  _ai(car, racing) {
    const tr = this.track;
    if (!racing) return { throttle: 0, brake: 0, steer: 0 };
    // look ahead along the line, slow for bends
    const look = Math.round(clamp(Math.abs(car.vf) * 0.5, 6, 30) / tr.step);
    const ahead = (car.k + look) % tr.N;
    let maxK = 0;
    for (let i = 0; i < 70; i += 5) maxK = Math.max(maxK, tr.K[(car.k + i) % tr.N]);
    const target = Math.min(car.top, Math.sqrt(26 / Math.max(maxK, 1e-4)));
    const p = tr.pts[ahead], r = tr.R[ahead];
    const tx = p.x + r.x * car.lane * 0.5, tz = p.z + r.z * car.lane * 0.5;
    const want = Math.atan2(tx - car.x, tz - car.z);
    const err = wrapAngle(want - car.h);
    return {
      throttle: car.vf < target ? 1 : 0,
      brake: car.vf > target + 3 ? 0.7 : 0,
      steer: clamp(err * 2.4, -1, 1),
      handbrake: false,
    };
  }

  _physics(car, inp, dt) {
    const tr = this.track;
    const st = car.ai ? { top: car.top, accel: car.accel, grip: car.grip } : this.stats;
    const boost = inp.nitro ? 1.25 : 1;
    // off the track?
    const p = tr.pts[car.k], r = tr.R[car.k];
    const lat = (car.x - p.x) * r.x + (car.z - p.z) * r.z;
    const off = Math.abs(lat) > WIDTH / 2 + CURB_W;
    const top = st.top * boost * (off ? 0.45 : 1);
    // longitudinal
    if (inp.throttle > 0) {
      const a = st.accel * (inp.nitro ? 1.8 : 1) * inp.throttle * Math.max(0.05, 1 - Math.max(0, car.vf) / top);
      car.vf += a * dt;
    }
    if (inp.brake > 0) car.vf -= (car.vf > 0.5 ? 34 : 12) * inp.brake * dt;
    car.vf = Math.max(car.vf, -14);
    car.vf -= car.vf * (off ? 1.4 : 0.12) * dt;
    if (car.vf > top) car.vf = damp(car.vf, top, 2, dt);
    if (inp.throttle === 0 && inp.brake === 0 && Math.abs(car.vf) < 0.3) car.vf = 0;
    // steering: tighter at low speed, softer at high speed
    const maxSteer = 0.55 / (1 + Math.abs(car.vf) / 38);
    car.steer = damp(car.steer, inp.steer * maxSteer, 9, dt);
    const yawRate = (car.vf * Math.tan(car.steer)) / 3.9;
    car.h += yawRate * dt * (inp.handbrake ? 1.35 : 1);
    // lateral slip: the car drifts when grip is exceeded (or with the handbrake)
    car.vs -= yawRate * car.vf * dt * 0.12;
    const grip = st.grip * (inp.handbrake ? 0.18 : 1) * (off ? 0.6 : 1);
    car.vs *= Math.exp(-grip * 9 * dt);
    if (inp.handbrake) car.vf -= car.vf * 0.6 * dt;
    const fx = Math.sin(car.h), fz = Math.cos(car.h);
    const rx = -Math.cos(car.h), rz = Math.sin(car.h);
    car.x += (fx * car.vf + rx * car.vs) * dt;
    car.z += (fz * car.vf + rz * car.vs) * dt;
    car.yawRate = yawRate;
    car.accelNow = inp.throttle - inp.brake;
    // barriers
    this._nearest(car);
    const q = tr.pts[car.k], rr = tr.R[car.k];
    const l2 = (car.x - q.x) * rr.x + (car.z - q.z) * rr.z;
    const lim = WALL - 1.6;
    if (Math.abs(l2) > lim) {
      const s = Math.sign(l2);
      car.x -= rr.x * (Math.abs(l2) - lim) * s;
      car.z -= rr.z * (Math.abs(l2) - lim) * s;
      // scrub speed and nudge the nose back along the track
      const t = tr.T[car.k];
      const along = Math.atan2(t.x, t.z);
      car.h = dampAngle(car.h, Math.abs(wrapAngle(along - car.h)) < Math.PI / 2 ? along : along + Math.PI, 6, dt);
      car.vf *= 1 - Math.min(0.9, 2.5 * dt);
      car.vs *= 0.3;
      if (!car.ai && !this._bumped) { this._bumped = 0.4; this.game.sfx && this.game.sfx('bump'); }
    }
    if (this._bumped) { this._bumped -= dt; if (this._bumped <= 0) this._bumped = 0; }
  }

  _nearest(car) {
    const tr = this.track;
    let best = car.k, bd = Infinity;
    for (let i = -25; i <= 25; i++) {
      const k = (car.k + i + tr.N) % tr.N, p = tr.pts[k];
      const d = (p.x - car.x) ** 2 + (p.z - car.z) ** 2;
      if (d < bd) { bd = d; best = k; }
    }
    car.prevK = car.k;
    car.k = best;
  }

  _progress(car) {
    const tr = this.track;
    const prev = car.prevK ?? car.k;
    let dk = car.k - prev;
    if (dk > tr.N / 2) dk -= tr.N;
    if (dk < -tr.N / 2) dk += tr.N;
    car.prog += dk;
    // lap = crossed the line going forwards with all three sectors seen
    const sector = Math.floor((car.k / tr.N) * 4);
    if (sector === car.cps + 1) car.cps = sector;
    if (prev > tr.N * 0.9 && car.k < tr.N * 0.1 && dk > 0) {
      if (car.cps >= 3) {
        car.lap++;
        car.cps = 0;
        const now = this.timer;
        const lapT = now - (car.lastLapAt || 0);
        car.lastLapAt = now;
        if (!car.ai) {
          car.lapTimes.push(lapT);
          if (car.lap < LAPS) ui.toast(`Lap ${car.lap}: ${fmt(lapT)}`, 1800);
          const best = this.best[this.entry.kind];
          if (!best || lapT < best) { this.best[this.entry.kind] = lapT; saveBest(this.best); if (car.lap < LAPS) ui.toast('New best lap!', 1600); }
        }
        if (car.lap >= LAPS && !car.done) {
          car.done = true; car.finishT = now;
          car.place = this.cars.filter((c) => c.done).length;
          if (!car.ai) this._finish();
        }
      } else if (car.lap === 0 && car.prog < 40) {
        car.cps = 0; // the standing start: still on the grid side of the line
      }
    }
  }

  _collideCars() {
    const cars = this.cars;
    for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i], b = cars[j];
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = 3.2;
      if (d > 0.01 && d < min) {
        const push = (min - d) / 2, nx = dx / d, nz = dz / d;
        a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push;
        const avg = (a.vf + b.vf) / 2;
        a.vf = damp(a.vf, avg, 3, 0.05); b.vf = damp(b.vf, avg, 3, 0.05);
      }
    }
  }

  _place(car, dt = 0) {
    const mdl = car.model;
    mdl.group.position.set(car.x, 0, car.z);
    mdl.group.rotation.y = car.h;
    // body roll and pitch
    const roll = clamp(-(car.yawRate || 0) * car.vf * 0.004, -0.07, 0.07);
    const pitch = clamp(-(car.accelNow || 0) * 0.025, -0.03, 0.03);
    mdl.car.rotation.z = dt ? damp(mdl.car.rotation.z, roll, 6, dt) : 0;
    mdl.car.rotation.x = dt ? damp(mdl.car.rotation.x, pitch, 6, dt) : 0;
    for (const w of mdl.wheels) {
      w.spin.rotation.x += (car.vf * dt) / mdl.r;
      if (w.front) w.steer.rotation.y = car.steer * 1.4;
    }
  }

  _finish() {
    const me = this.me;
    this.results = true;
    const ai = this.cars.filter((c) => c.ai);
    const best = Math.min(...me.lapTimes);
    const place = me.place;
    const body = h(`
      <div class="podium">${['🥇', '🥈', '🥉', '4th'][place - 1]}</div>
      <p style="text-align:center;font-size:18px"><b>${place === 1 ? 'You win!' : `You finished ${['1st', '2nd', '3rd', '4th'][place - 1]}`}</b></p>
      <table class="score">
        <tr><th>Lap</th>${me.lapTimes.map((_, i) => `<th>${i + 1}</th>`).join('')}<th>Total</th></tr>
        <tr><td>Time</td>${me.lapTimes.map((t) => `<td>${fmt(t)}</td>`).join('')}<td><b>${fmt(me.finishT)}</b></td></tr>
      </table>
      <p>Best lap ${fmt(best)} · Personal best in the ${MODELS[this.entry.kind].name}: ${fmt(this.best[this.entry.kind])}</p>
      <div class="row"><button class="btn" data-again style="flex:1">Race again</button><button class="btn ghost" data-leave>Back to garage</button></div>`);
    body.addEventListener('click', (e) => {
      if (e.target.closest('[data-again]')) { ui.closePanel(); const entry = this.entry; this.game.fadeTo(() => { this.exit(); this.start(entry); }); }
      else if (e.target.closest('[data-leave]')) { ui.closePanel(); this.leave(); }
    });
    void ai;
    ui.hud(null);
    ui.openPanel({ kicker: 'Mingalar Raceway', title: 'Race results', body, zone: 'race-results' });
  }

  /** Chase / cockpit camera. */
  updateCamera(cam, dt, look) {
    const me = this.me;
    const sens = 0.004;
    this.lookOff.yaw -= look.dx * sens;
    this.lookOff.pitch = clamp(this.lookOff.pitch - look.dy * sens, -0.5, 0.6);
    // the view drifts back behind the car when you stop dragging
    if (!look.dx) this.lookOff.yaw = damp(this.lookOff.yaw, 0, 1.6, dt);
    if (!look.dy) this.lookOff.pitch = damp(this.lookOff.pitch, 0, 1.6, dt);
    const grp = me.model.group;
    if (this.view === 'cockpit') {
      tmp.copy(me.model.eye).applyMatrix4(me.model.car.matrixWorld);
      cam.position.copy(tmp);
      const yaw = me.h + this.lookOff.yaw, pitch = this.lookOff.pitch * 0.6 - 0.08;
      cam.lookAt(tmp.x + Math.sin(yaw) * 10 * Math.cos(pitch), tmp.y + Math.sin(pitch) * 10, tmp.z + Math.cos(yaw) * 10 * Math.cos(pitch));
      if (Math.abs(cam.fov - 72) > 0.1) { cam.fov = 72; cam.updateProjectionMatrix(); }
      return grp.position;
    }
    // chase: trail behind the direction of travel
    const speed = Math.abs(me.vf);
    this.camYaw = dampAngle(this.camYaw, me.h + (me.vf < -1 ? 0 : Math.PI), 4, dt);
    const yaw = this.camYaw + this.lookOff.yaw;
    const dist = 9.5 + speed * 0.04, height = 3.6 + this.lookOff.pitch * 6;
    const want = tmp.set(grp.position.x + Math.sin(yaw) * dist, Math.max(1.2, height), grp.position.z + Math.cos(yaw) * dist);
    cam.position.lerp(want, 1 - Math.exp(-10 * dt));
    cam.lookAt(grp.position.x, 1.6, grp.position.z);
    cam.fov = damp(cam.fov, 62 + speed * 0.18, 4, dt);
    cam.updateProjectionMatrix();
    return grp.position;
  }
}

function fmt(t) {
  if (!isFinite(t)) return '--';
  const mm = Math.floor(t / 60), s = t - mm * 60;
  return `${mm}:${s.toFixed(2).padStart(5, '0')}`;
}
function loadBest() { try { return JSON.parse(localStorage.getItem('mw-best-laps')) || {}; } catch { return {}; } }
function saveBest(b) { try { localStorage.setItem('mw-best-laps', JSON.stringify(b)); } catch { /* ignore */ } }
