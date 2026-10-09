// Entry point: renderer, lights, camera rig, game loop and interaction wiring.
import './style.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildWorld, finishWorld, SPAWN, GYM_MAT } from './world.js';
import { buildSky, buildClouds } from './gfx.js';
import { Player, EYE } from './player.js';
import { Controls, isTouch } from './controls.js';
import { Golf } from './golf.js';
import { Race } from './race.js';
import { GunRange } from './gunrange.js';
import { openDisplay, setMallHooks } from './mall.js';
import { openGarageCar, GARAGE } from './garage.js';
import { openLink, OFFICE_DOOR, INSIDE_SPAWN, INTERIOR } from './office.js';
import { openHome, openReception } from './panels.js';
import { openCustomizer, loadLook, saveLook } from './customize.js';
import { Minimap } from './minimap.js';
import { spawnTownsfolk } from './npc.js';
import { ui } from './ui.js';
import { clamp, damp, seeded } from './builders.js';

const canvas = document.getElementById('game');
const touch = isTouch();
const params = new URLSearchParams(location.search);

// ------------------------------------------------------------------ renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !touch, powerPreference: 'high-performance' });
const maxDpr = Number(params.get('dpr')) || (touch ? 1.5 : 1.75);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xdff2ff, 180, 900);
scene.background = new THREE.Color(0xbfe4ff);
buildSky(scene);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;

const BASE_FOV = 65;
const camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.1, 2600);
scene.add(camera); // so the gun view model (a child of the camera) renders

const hemi = new THREE.HemisphereLight(0xdcefff, 0x8db36b, 1.05);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d6, 2.3);
sun.castShadow = true;
const SHADOW = touch ? 1024 : 2048;
sun.shadow.mapSize.set(SHADOW, SHADOW);
const sc = sun.shadow.camera;
sc.left = -75; sc.right = 75; sc.top = 75; sc.bottom = -75; sc.near = 1; sc.far = 320;
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.05;
scene.add(sun, sun.target);
const SUN_OFFSET = new THREE.Vector3(60, 110, -45);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------------- game
const game = {
  scene, camera, renderer, touch,
  mode: 'walk', // walk | golf | workout | race | range | customize
  view: 'third', // third | first
  cam: { yaw: SPAWN.yaw, pitch: 0.32, dist: touch ? 13 : 11, cur: 11, target: new THREE.Vector3() },
  focus: null, // mini-games may point the camera somewhere else
  zoomFov: null,
  world: null, player: null, controls: null, golf: null, race: null, range: null, minimap: null,
  sfx: () => {}, // sound hook: called with 'jump', 'buy', 'shot:pistol', 'hit', 'bump'...
  fadeTo: (fn) => ui.fade(fn),
};

async function boot() {
  // signs are drawn with the web font, so wait for it (but never block on it)
  try { await Promise.race([document.fonts.load('700 40px Fredoka'), new Promise((r) => setTimeout(r, 1500))]); } catch { /* fall back */ }

  const t0 = performance.now();
  game.world = buildWorld(scene);
  game.golf = new Golf(game);
  const merged = finishWorld(game.world);
  game.cloudTick = buildClouds(scene, seeded(99));
  game.player = new Player(scene, loadLook());
  game.player.teleport(SPAWN.x, 0.15, SPAWN.z, SPAWN.yaw + Math.PI);
  game.townsfolk = spawnTownsfolk(scene, 8);
  game.controls = new Controls(canvas);
  game.race = new Race(game);
  game.range = new GunRange(game);
  game.minimap = new Minimap(game.world, [
    { x0: -330, x1: 330, z0: -300, z1: 300 },
    { x0: INTERIOR.x - 45, x1: INTERIOR.x + 45, z0: -35, z1: 35, range: 30, bg: '#2a2d33' },
  ]);
  game.cam.target.set(SPAWN.x, 1.9, SPAWN.z);
  game.buildMs = Math.round(performance.now() - t0);
  game.mergedMeshes = merged;

  setMallHooks({
    tryOn: (patch) => { const look = { ...game.player.av.look, ...patch }; game.player.setLook(look); saveLook(look); },
    onBuy: (k) => game.sfx(k === 'checkout' ? 'checkout' : 'buy'),
  });

  const c = game.controls;
  c.onInteract = interact;
  c.onEscape = onEscape;
  c.onKey = (code) => {
    if (code === 'KeyV') toggleView();
    else if (code === 'KeyC' && game.mode === 'walk') customize();
    else if (code === 'KeyM') game.minimap.toggle();
    else if (code === 'KeyR' && game.mode === 'range') game.range.reload();
    else if (code === 'KeyQ' && game.mode === 'range') game.range.setScope(!game.range.scoped);
  };
  c.onLockChange = (locked) => {
    document.body.classList.toggle('locked', locked);
    if (!locked && game.mode === 'range') game.range.setScope(false);
  };
  canvas.addEventListener('mousedown', (e) => { if (e.button === 2 && game.mode === 'range') game.range.setScope(!game.range.scoped); });

  document.getElementById('btn-customize').addEventListener('click', () => (ui.panelZone === 'customize' ? ui.closePanel() : customize()));
  document.getElementById('btn-view').addEventListener('click', toggleView);

  setupStart();
  renderer.setAnimationLoop(frame);
}

// ---------------------------------------------------------------- interaction
let nearZone = null;

const ACTIONS = {
  home: (z) => openHome(game.world, z.id),
  golf: () => game.golf.start(),
  gym: () => startWorkout(),
  range: (z) => game.range.openPicker(z.id),
  'office-enter': () => game.fadeTo(() => {
    game.player.teleport(INSIDE_SPAWN.x, 0, INSIDE_SPAWN.z, INSIDE_SPAWN.heading);
    game.cam.yaw = INSIDE_SPAWN.heading + Math.PI;
    snapCamera();
    ui.toast('Welcome to the Virtual Office', 1800);
  }),
  'office-exit': () => game.fadeTo(() => {
    game.player.teleport(OFFICE_DOOR.x - 3, 0.2, OFFICE_DOOR.z, -Math.PI / 2);
    game.cam.yaw = Math.PI / 2;
    snapCamera();
  }),
  'office-reception': (z) => openReception(z.id),
};

function interact() {
  if (game.mode === 'workout') { stopWorkout(); return; }
  if (game.mode !== 'walk' || !nearZone) return;
  if (ui.panelZone === nearZone.id) { ui.closePanel(); return; }
  const id = nearZone.id;
  if (id.startsWith('mall:')) openDisplay(id.slice(5), id);
  else if (id.startsWith('link:')) openLink(id.slice(5), id);
  else if (id.startsWith('car:')) openGarageCar(game.world, id.slice(4), id, startRace);
  else ACTIONS[id](nearZone);
}

function onEscape() {
  if (ui.closePanel()) return;
  if (game.mode === 'golf') game.golf.exit();
  else if (game.mode === 'workout') stopWorkout();
  else if (game.mode === 'race') game.race.leave();
  else if (game.mode === 'range') game.range.leave();
}

function updateZones() {
  if (game.mode !== 'walk') { nearZone = null; ui.prompt(null); return; }
  const p = game.player.pos;
  let best = null, bestD = Infinity;
  for (const z of game.world.zones) {
    const d = Math.hypot(p.x - z.x, p.z - z.z);
    if (d < z.r && d < bestD) { best = z; bestD = d; }
  }
  nearZone = best;
  const open = ui.panelZone;
  if (best && open !== best.id) ui.prompt(best.label, interact, touch);
  else ui.prompt(null);
  // walking away from a building closes its panel
  if (open) {
    const z = game.world.zones.find((q) => q.id === open);
    if (z && Math.hypot(p.x - z.x, p.z - z.z) > z.r + 3) ui.closePanel();
  }
}

// gym: jumping jacks on the mat
function startWorkout() {
  const pl = game.player;
  game.mode = 'workout';
  pl.teleport(GYM_MAT.x, 0.25, GYM_MAT.z, Math.PI / 2);
  pl.pose = { type: 'workout' };
  pl.reps = 0; pl._jack = Math.floor((time * 7) / (Math.PI * 2));
  ui.hint(touch ? 'Jumping jacks! Move the stick to stop' : 'Jumping jacks! Move or press E to stop');
}
function stopWorkout() {
  const reps = game.player.reps;
  game.mode = 'walk';
  game.player.pose = null;
  ui.hud(null); ui.hint(null);
  if (reps > 0) ui.toast(`Workout done: ${reps} jumping jack${reps === 1 ? '' : 's'}`);
}

// customise screen: camera swings round to the front of the avatar
function customize() {
  if (game.mode !== 'walk') return;
  game.mode = 'customize';
  game.controls.unlock();
  game.custom = { yaw: game.player.heading, pitch: 0.12, dist: 6.5 };
  openCustomizer(() => game.player.av.look, (look) => game.player.setLook(look), () => {
    game.mode = 'walk';
    game.cam.yaw = game.player.heading + Math.PI;
    document.body.classList.remove('customizing');
  });
  document.body.classList.add('customizing');
}

function startRace(entry) {
  game.controls.unlock();
  game.fadeTo(() => { game.race.start(entry); });
}
game.returnFromRace = () => {
  const c = game.world.refs.garage.cars.find((q) => q.kind === game.race.entry.kind);
  game.player.teleport(c.x, 0.25, 30, Math.PI);
  game.cam.yaw = 0;
  camera.fov = BASE_FOV; camera.updateProjectionMatrix();
  snapCamera();
};

function toggleView() {
  if (game.mode === 'race') { game.race.toggleView(); updateViewButton(); return; }
  if (!['walk', 'range', 'workout'].includes(game.mode)) return;
  game.view = game.view === 'first' ? 'third' : 'first';
  if (game.view === 'first') { game.controls.wantLock = true; if (!touch) game.controls.lock(); }
  else if (game.mode !== 'range') { game.controls.wantLock = false; game.controls.unlock(); }
  updateViewButton();
  ui.toast(game.view === 'first' ? 'First person (V to switch)' : 'Third person (V to switch)', 1200);
}
function updateViewButton() {
  const first = game.mode === 'race' ? game.race.view === 'cockpit' : game.view === 'first';
  const b = document.getElementById('btn-view');
  b.textContent = first ? '👁 1st' : '🎥 3rd';
  b.title = first ? 'First person (V)' : 'Third person (V)';
}

// ------------------------------------------------------------------- camera
const _dir = new THREE.Vector3();
const _want = new THREE.Vector3();
const _look = new THREE.Vector3();

function snapCamera() {
  const p = game.player.pos;
  game.cam.target.set(p.x, p.y + 2, p.z);
  game.cam.cur = game.cam.dist;
}
game.snapCamera = snapCamera;

function updateCamera(dt) {
  const c = game.cam;
  const look = game.controls.takeLook();
  const scope = game.zoomFov ? game.zoomFov / BASE_FOV : 1;
  const sens = (touch ? 0.0065 : game.controls.locked ? 0.0026 : 0.0048) * scope;

  if (game.mode === 'race') {
    const at = game.race.updateCamera(camera, dt, look);
    c.target.set(at.x, 1.5, at.z);
    return;
  }
  if (game.mode === 'customize') {
    const cu = game.custom;
    cu.yaw -= look.dx * sens;
    cu.pitch = clamp(cu.pitch + look.dy * sens, -0.3, 0.9);
    cu.dist = clamp(cu.dist + look.zoom * 0.5, 3.5, 10);
    const p = game.player.pos;
    _want.set(p.x, p.y + 1.55, p.z);
    c.target.lerp(_want, 1 - Math.exp(-8 * dt));
    _dir.set(Math.sin(cu.yaw) * Math.cos(cu.pitch), Math.sin(cu.pitch), Math.cos(cu.yaw) * Math.cos(cu.pitch));
    // keep the avatar left of the side panel on wide screens
    const side = window.innerWidth > 720 ? 1.3 : 0;
    camera.position.copy(c.target).addScaledVector(_dir, cu.dist);
    camera.position.x += Math.cos(cu.yaw) * side; camera.position.z -= Math.sin(cu.yaw) * side;
    _look.copy(c.target); _look.x += Math.cos(cu.yaw) * side; _look.z -= Math.sin(cu.yaw) * side;
    camera.lookAt(_look);
    return;
  }

  c.yaw -= look.dx * sens;
  const first = game.view === 'first' && game.mode !== 'golf';
  if (first) c.pitch = clamp(c.pitch + look.dy * sens, -1.35, 1.35);
  else c.pitch = clamp(c.pitch + look.dy * sens, -0.45, 1.38);
  c.dist = clamp(c.dist + look.zoom, 3, 24);

  // smooth FOV changes (sniper scope)
  const fov = game.zoomFov || BASE_FOV;
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = damp(camera.fov, fov, 14, dt); camera.updateProjectionMatrix(); }

  const p = game.player.pos;
  if (first) {
    // eye camera: yaw/pitch straight from the mouse, body hidden
    const eye = _want.set(p.x, p.y + EYE + (game.player.body.position.y - game.player.av.chest), p.z);
    c.target.copy(eye);
    camera.position.copy(eye);
    _dir.set(-Math.sin(c.yaw) * Math.cos(c.pitch), -Math.sin(c.pitch), -Math.cos(c.yaw) * Math.cos(c.pitch));
    camera.lookAt(_look.copy(eye).add(_dir));
    return;
  }

  if (game.focus && game.mode === 'golf') _want.copy(game.focus);
  else _want.set(p.x, Math.max(p.y, -0.4) + 2.0, p.z);
  c.target.x = damp(c.target.x, _want.x, 16, dt);
  c.target.z = damp(c.target.z, _want.z, 16, dt);
  c.target.y = damp(c.target.y, _want.y, 9, dt);

  let dist = c.dist;
  const target = _look.copy(c.target);
  if (game.mode === 'range') {
    // over the right shoulder while aiming (camera-right is (cos yaw, -sin yaw))
    dist = 4.2;
    target.x += Math.cos(c.yaw) * 1.4; target.z -= Math.sin(c.yaw) * 1.4;
    target.y += 0.5;
  }
  _dir.set(Math.sin(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch), Math.cos(c.yaw) * Math.cos(c.pitch));
  const free = cameraClearance(target, _dir, dist);
  c.cur = free < c.cur ? free : damp(c.cur, free, 5, dt);
  camera.position.copy(target).addScaledVector(_dir, c.cur);
  if (camera.position.y < 0.4) camera.position.y = 0.4;
  camera.lookAt(target);
}

/** Longest distance the camera can sit along `dir` before hitting a building. */
function cameraClearance(o, d, max) {
  let best = max;
  const ex = o.x + d.x * max, ez = o.z + d.z * max;
  for (const b of game.world.alongRay(o.x, o.z, ex, ez)) {
    if (!b.cam) continue;
    let t = slab(o, d, b, 0.35, best);
    if (t >= 0 && t <= 0.01) t = slab(o, d, b, 0, best);
    if (t >= 0) best = Math.min(best, t);
  }
  return Math.max(1.2, best);
}

function slab(o, d, b, mg, max) {
  let t0 = 0, t1 = max;
  for (const [a, lo, hi] of [['x', b.x0, b.x1], ['y', b.y0, b.y1], ['z', b.z0, b.z1]]) {
    const oo = o[a], dd = d[a];
    if (Math.abs(dd) < 1e-6) { if (oo < lo - mg || oo > hi + mg) return -1; continue; }
    let a0 = (lo - mg - oo) / dd, a1 = (hi + mg - oo) / dd;
    if (a0 > a1) [a0, a1] = [a1, a0];
    t0 = Math.max(t0, a0); t1 = Math.min(t1, a1);
    if (t0 > t1) return -1;
  }
  return t0;
}

// interiors are only drawn while the camera is near them
function updateAreas() {
  const c = camera.position;
  for (const a of game.world.areas) {
    const v = c.x > a.x0 - a.margin && c.x < a.x1 + a.margin && c.z > a.z0 - a.margin && c.z < a.z1 + a.margin;
    a.static.visible = a.dyn.visible = v;
  }
}

// ----------------------------------------------------------------- lighting
let indoor = 0;
function updateLighting(dt) {
  const p = game.mode === 'race' ? game.cam.target : game.player.pos;
  let inside = 0;
  for (const r of game.world.indoors) if (p.x > r.x0 && p.x < r.x1 && p.z > r.z0 && p.z < r.z1 && p.y < r.h) inside = r.interior ? 2 : 1;
  indoor = damp(indoor, inside ? 1 : 0, 4, dt);
  hemi.intensity = 1.05 + indoor * 0.55;
  sun.intensity = 2.3 - indoor * 1.5;
  scene.environmentIntensity = 0.45 + indoor * 0.35;
  // the office interior is far from town: no fog wall there
  scene.fog.far = inside === 2 ? 2000 : 900;
}

// --------------------------------------------------------------------- loop
const clock = new THREE.Timer();
let lastReps = -1;
let time = 0;
const perf = { frames: 0, acc: 0, fps: 0 };

function frame() {
  clock.update();
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
  renderer.render(scene, camera);
  perf.frames++; perf.acc += dt;
  if (perf.acc >= 0.5) { perf.fps = Math.round(perf.frames / perf.acc); perf.frames = 0; perf.acc = 0; if (debugEl) showDebug(); }
}

/** Advance the simulation by dt seconds (kept separate from rendering so it can be tested). */
function update(dt) {
  time += dt;
  const t = time;
  const { player, controls, world } = game;

  // panels need the mouse: release pointer lock while one is open
  if (ui.panelOpen && controls.locked) controls.unlock();
  const mv = controls.move();
  const jump = controls.takeJump();
  if (game.mode === 'workout') {
    if (Math.hypot(mv.x, mv.y) > 0.3) stopWorkout();
    else if (player.reps !== lastReps) { lastReps = player.reps; ui.hud(`<span>Jumping jacks <b>${player.reps}</b></span>`); }
  }
  const locked = !['walk', 'range'].includes(game.mode) || !controls.enabled;
  const walking = game.mode === 'walk' || game.mode === 'range';
  // in both views the avatar faces where the camera looks
  const face = walking ? game.cam.yaw + Math.PI : null;
  const input = game.mode === 'range' ? { x: 0, y: 0, run: false, jump: false } : { x: mv.x, y: mv.y, run: controls.run, jump };
  player.update(dt, t, input, game.cam.yaw, world, locked, face);
  if (player.jumped) game.sfx('jump');
  player.group.visible = game.mode !== 'race' && !(game.view === 'first' && walking);

  game.golf.update(dt, t);
  game.race.update(dt);
  game.range.update(dt);
  for (const u of world.updaters) u(dt, t, player.pos);
  game.townsfolk(dt, camera.position, player.pos);
  game.cloudTick(dt);
  updateZones();
  updateCamera(dt);
  updateAreas();
  updateLighting(dt);
  const mp = game.mode === 'race' ? game.race.me : null;
  game.minimap.update(dt, mp ? mp.x : player.pos.x, mp ? mp.z : player.pos.z, mp ? mp.h : player.heading,
    game.mode === 'race' ? game.race.cars.filter((q) => q.ai).map((q) => ({ x: q.x, z: q.z, color: '#ff4d6d' })) : []);

  const ct = game.cam.target;
  sun.target.position.set(Math.round(ct.x), 0, Math.round(ct.z));
  sun.position.copy(sun.target.position).add(SUN_OFFSET);
}
game.update = update;

// ----------------------------------------------------------------- debug HUD
const debugEl = params.has('debug') ? document.createElement('div') : null;
if (debugEl) { debugEl.id = 'debug'; document.body.appendChild(debugEl); }
function showDebug() {
  const i = renderer.info.render;
  debugEl.textContent = `${perf.fps} fps · ${i.calls} draws · ${(i.triangles / 1000).toFixed(0)}k tris · ${game.mode}`;
}
game.perf = perf;

// -------------------------------------------------------------- start screen
function setupStart() {
  const start = document.getElementById('start');
  const btn = document.getElementById('start-btn');
  const help = touch
    ? 'Left thumb: move · Drag: look · Pinch: zoom<br>Buttons: jump and run · Tap prompts to interact'
    : '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move · <kbd>Shift</kbd> run · <kbd>Space</kbd> jump<br><kbd>E</kbd> interact · <kbd>V</kbd> 1st/3rd person · <kbd>C</kbd> customise · <kbd>M</kbd> map<br>Drag to look · scroll to zoom · <kbd>Esc</kbd> close / leave';
  document.getElementById('start-controls').innerHTML = help;
  ui.setHelp(help + '<br><br><b>Places</b>: Virtual Mall · Virtual Garage &amp; Raceway · Virtual Office · Gun Range · Luxury Home · Mini Golf · Gym · Pool');
  btn.disabled = false;
  btn.textContent = 'Play';
  btn.addEventListener('click', () => {
    start.style.opacity = '0';
    setTimeout(() => start.remove(), 420);
    game.controls.enabled = true;
    document.body.classList.add('playing');
    if (touch) document.getElementById('touch-btns').hidden = false;
    ui.toast('Walk up to a building and press E', 3200);
  });
  // the jump button doubles as the putt button on touch devices
  const jumpBtn = document.getElementById('btn-jump');
  setInterval(() => {
    jumpBtn.textContent = game.mode === 'golf' ? 'Putt' : game.mode === 'race' ? 'Drift' : 'Jump';
    document.getElementById('btn-fire').hidden = !(touch && game.mode === 'range');
    document.body.classList.toggle('mode-race', game.mode === 'race');
  }, 250);
  updateViewButton();
}

// hooks for the smoke test (tests/smoke.mjs) and console debugging
game.debug = {
  zone: (id) => { nearZone = game.world.zones.find((z) => z.id === id); interact(); },
  customize, toggleView, startRace,
};

boot();
if (params.has("debug")) window.__THREE = THREE;
window.__game = game; // handy for debugging in the console and for the smoke test
