// Entry point: renderer, lights, camera rig, game loop and interaction wiring.
import './style.css';
import * as THREE from 'three';
import { buildWorld, SPAWN } from './world.js';
import { Player } from './player.js';
import { Controls, isTouch } from './controls.js';
import { Golf } from './golf.js';
import { openMall } from './mall.js';
import { openGarage, openHome, openOffice } from './panels.js';
import { ui } from './ui.js';
import { clamp, damp } from './builders.js';

const canvas = document.getElementById('game');
const touch = isTouch();

// ------------------------------------------------------------------ renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !touch, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, touch ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = skyTexture();
scene.fog = new THREE.Fog(0xd4eeff, 110, 330);

const camera = new THREE.PerspectiveCamera(60, 1, 0.3, 600);

scene.add(new THREE.HemisphereLight(0xe8f6ff, 0xa9c48a, 1.9));
const sun = new THREE.DirectionalLight(0xfff4dc, 1.8);
sun.castShadow = true;
sun.shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048);
const sc = sun.shadow.camera;
sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 1; sc.far = 220;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const SUN_OFFSET = new THREE.Vector3(50, 80, -30);

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
  mode: 'walk', // walk | golf | workout
  cam: { yaw: SPAWN.yaw, pitch: 0.36, dist: touch ? 13 : 11, cur: 11, target: new THREE.Vector3() },
  focus: null, // mini-games may point the camera somewhere else
  world: null, player: null, controls: null, golf: null,
};

async function boot() {
  // signs are drawn with the web font, so wait for it (but never block on it)
  try { await Promise.race([document.fonts.load('700 40px Fredoka'), new Promise((r) => setTimeout(r, 1500))]); } catch { /* fall back */ }

  game.world = buildWorld(scene);
  game.player = new Player(scene);
  game.player.teleport(SPAWN.x, 0, SPAWN.z, 0);
  game.controls = new Controls(canvas);
  game.golf = new Golf(game);
  game.cam.target.set(SPAWN.x, 1.9, SPAWN.z);

  game.controls.onInteract = interact;
  game.controls.onEscape = () => {
    if (ui.closePanel()) return;
    if (game.mode === 'golf') game.golf.exit();
    else if (game.mode === 'workout') stopWorkout();
  };

  setupStart();
  renderer.setAnimationLoop(frame);
}

// ---------------------------------------------------------------- interaction
let nearZone = null;

const ACTIONS = {
  home: (z) => openHome(game.world, z.id),
  garage: (z) => openGarage(game.world, z.id),
  office: (z) => openOffice(z.id),
  golf: () => game.golf.start(),
  gym: () => startWorkout(),
};

function interact() {
  if (game.mode === 'workout') { stopWorkout(); return; }
  if (game.mode !== 'walk' || !nearZone) return;
  if (ui.panelZone === nearZone.id) { ui.closePanel(); return; }
  if (nearZone.id.startsWith('mall:')) openMall(nearZone.id.slice(5), nearZone.id);
  else ACTIONS[nearZone.id](nearZone);
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
  pl.teleport(33, 0, -6, -Math.PI / 2);
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

// ------------------------------------------------------------------- camera
const _dir = new THREE.Vector3();
const _want = new THREE.Vector3();

function updateCamera(dt) {
  const c = game.cam;
  const look = game.controls.takeLook();
  const sens = touch ? 0.0065 : 0.0048;
  c.yaw -= look.dx * sens;
  c.pitch = clamp(c.pitch + look.dy * sens, 0.06, 1.38);
  c.dist = clamp(c.dist + look.zoom, 4.5, 24);

  if (game.focus && game.mode === 'golf') _want.copy(game.focus);
  else {
    const p = game.player.pos;
    _want.set(p.x, Math.max(p.y, -0.4) + 1.9, p.z);
  }
  c.target.x = damp(c.target.x, _want.x, 14, dt);
  c.target.z = damp(c.target.z, _want.z, 14, dt);
  c.target.y = damp(c.target.y, _want.y, 7, dt);

  _dir.set(Math.sin(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch), Math.cos(c.yaw) * Math.cos(c.pitch));
  const free = cameraClearance(c.target, _dir, c.dist);
  c.cur = free < c.cur ? free : damp(c.cur, free, 5, dt);
  camera.position.copy(c.target).addScaledVector(_dir, c.cur);
  camera.lookAt(c.target);
}

/** Longest distance the camera can sit along `dir` before hitting a building. */
function cameraClearance(o, d, max) {
  let best = max;
  for (const b of game.world.colliders) {
    if (!b.cam) continue;
    // m keeps a little air between lens and wall; retry without it when the
    // player is already hugging the wall
    let t = slab(o, d, b, 0.35, best);
    if (t >= 0 && t <= 0.01) t = slab(o, d, b, 0, best);
    if (t >= 0) best = Math.min(best, t);
  }
  return Math.max(1.6, best);
}

function slab(o, d, b, m, max) {
  let t0 = 0, t1 = max;
  for (const [a, lo, hi] of [['x', b.x0, b.x1], ['y', b.y0, b.y1], ['z', b.z0, b.z1]]) {
    const oo = o[a], dd = d[a];
    if (Math.abs(dd) < 1e-6) { if (oo < lo - m || oo > hi + m) return -1; continue; }
    let a0 = (lo - m - oo) / dd, a1 = (hi + m - oo) / dd;
    if (a0 > a1) [a0, a1] = [a1, a0];
    t0 = Math.max(t0, a0); t1 = Math.min(t1, a1);
    if (t0 > t1) return -1;
  }
  return t0;
}

// --------------------------------------------------------------------- loop
const clock = new THREE.Clock();
let lastReps = -1;

let time = 0;

function frame() {
  update(Math.min(clock.getDelta(), 0.05));
  renderer.render(scene, camera);
}

/** Advance the simulation by dt seconds (kept separate from rendering so it can be tested). */
function update(dt) {
  time += dt;
  const t = time;
  const { player, controls, world } = game;

  const mv = controls.move();
  const jump = controls.takeJump();
  if (game.mode === 'workout') {
    if (Math.hypot(mv.x, mv.y) > 0.3) stopWorkout();
    else if (player.reps !== lastReps) { lastReps = player.reps; ui.hud(`<span>Jumping jacks <b>${player.reps}</b></span>`); }
  }
  const locked = game.mode !== 'walk' || !controls.enabled;
  player.update(dt, t, { x: mv.x, y: mv.y, run: controls.run, jump }, game.cam.yaw, world, locked);

  game.golf.update(dt, t);
  for (const u of world.updaters) u(dt, t, player.pos);
  updateZones();
  updateCamera(dt);

  sun.target.position.set(Math.round(game.cam.target.x), 0, Math.round(game.cam.target.z));
  sun.position.copy(sun.target.position).add(SUN_OFFSET);
}
game.update = update;

// -------------------------------------------------------------- start screen
function setupStart() {
  const start = document.getElementById('start');
  const btn = document.getElementById('start-btn');
  const jumpBtn = document.getElementById('btn-jump');
  const help = touch
    ? 'Left thumb: move<br>Drag: look around · Pinch: zoom<br>Buttons: jump and run'
    : '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move<br><kbd>Shift</kbd> run · <kbd>Space</kbd> jump<br><kbd>E</kbd> interact · <kbd>Esc</kbd> close<br>Drag to look · scroll to zoom';
  document.getElementById('start-controls').innerHTML = help;
  ui.setHelp(help);
  btn.disabled = false;
  btn.textContent = 'Play';
  btn.addEventListener('click', () => {
    start.style.opacity = '0';
    setTimeout(() => start.remove(), 420);
    game.controls.enabled = true;
    if (touch) document.getElementById('touch-btns').hidden = false;
    ui.toast('Walk up to a building to interact', 3200);
  });
  // the jump button doubles as the putt button on touch devices
  setInterval(() => { jumpBtn.textContent = game.mode === 'golf' ? 'Putt' : 'Jump'; }, 250);
}

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#4aa8ff');
  grad.addColorStop(0.55, '#9bd8ff');
  grad.addColorStop(1, '#d4eeff');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

boot();
window.__game = game; // handy for debugging in the console
