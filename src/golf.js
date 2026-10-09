// Mini golf: three holes played inside the 3D world.
// Aim with the camera (drag, or A/D), hold Space to charge, release to putt.
import * as THREE from 'three';
import { box, cyl, sign, clamp } from './builders.js';
import { m } from './gfx.js';
import { ui, h } from './ui.js';
import { GOLF_OFFSET } from './world.js';

const R = 0.22; // ball radius
const CUP_R = 0.4;
const GREEN_Y = 0.24;
const OX = GOLF_OFFSET.x, OZ = GOLF_OFFSET.z;

// Lanes run west to east. Obstacles are axis-aligned boxes; `move` slides one along z.
const HOLES = [
  { par: 2, z: 16, obstacles: [] },
  {
    par: 3, z: 26,
    obstacles: [
      { x0: 44, x1: 45.2, z0: 23, z1: 26.7 },
      { x0: 50, x1: 51.2, z0: 25.3, z1: 29 },
    ],
  },
  {
    par: 3, z: 36,
    obstacles: [
      { x0: 46, x1: 47.2, z0: 34.8, z1: 37.2, move: { amp: 1.3, speed: 1.3 } },
      { x0: 52.2, x1: 53.2, z0: 33, z1: 34.7 },
      { x0: 52.2, x1: 53.2, z0: 37.3, z1: 39 },
    ],
  },
].map((hole) => {
  // holes are laid out in course coordinates, then moved to the course's spot in town
  const z = hole.z + OZ;
  return {
    ...hole,
    z,
    obstacles: hole.obstacles.map((o) => ({ ...o, x0: o.x0 + OX, x1: o.x1 + OX, z0: o.z0 + OZ, z1: o.z1 + OZ })),
    bounds: { x0: 36 + OX, x1: 58 + OX, z0: z - 3, z1: z + 3 },
    tee: { x: 38.5 + OX, z },
    cup: { x: 55.3 + OX, z },
  };
});

const SCORE_NAMES = { '-2': 'Eagle!', '-1': 'Birdie!', 0: 'Par', 1: 'Bogey', 2: 'Double bogey' };

export class Golf {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.state = 'idle'; // aim | roll | sunk | done
    this.hole = 0;
    this.strokes = 0;
    this.card = [];
    this.power = 0;
    this.charging = false;
    this.chargeT = 0;
    this.swing = 0;
    this.swingT = -1;
    this.vel = new THREE.Vector2();
    this.timer = 0;
    this._build(game.world);
  }

  _build(world) {
    const root = world.static;
    HOLES.forEach((hole, i) => {
      const b = hole.bounds;
      const w = b.x1 - b.x0, d = b.z1 - b.z0, cx = (b.x0 + b.x1) / 2;
      const green = box(root, w, 0.1, d, cx, GREEN_Y - 0.1, hole.z, m('grass', 0x35b558));
      green.castShadow = false;
      // rails
      box(root, w + 0.6, 0.34, 0.3, cx, 0.15, b.z0 - 0.15, 0xffffff);
      box(root, w + 0.6, 0.34, 0.3, cx, 0.15, b.z1 + 0.15, 0xffffff);
      box(root, 0.3, 0.34, d, b.x0 - 0.15, 0.15, hole.z, 0xffffff);
      box(root, 0.3, 0.34, d, b.x1 + 0.15, 0.15, hole.z, 0xffffff);
      // tee mat, cup, flag
      const tee = box(root, 1.2, 0.02, 1.2, hole.tee.x, GREEN_Y, hole.z, 0x1f7a3b);
      tee.castShadow = false;
      const cup = cyl(root, CUP_R, 0.02, hole.cup.x, GREEN_Y, hole.z, m(0x0b0d14), 20);
      cup.castShadow = false;
      cyl(root, 0.04, 2.2, hole.cup.x, GREEN_Y, hole.z, 0xffffff, 6);
      box(root, 0.8, 0.5, 0.04, hole.cup.x + 0.42, 1.75, hole.z, 0xe2483d);
      sign(root, String(i + 1), 0.9, 0.9, b.x0 - 0.9, 1.3, hole.z - 2.2, -Math.PI / 2, { bg: '#ffc83d', fg: '#2a1d00', doubleSided: true });
      cyl(root, 0.06, 0.9, b.x0 - 0.9, 0, hole.z - 2.2, 0x555b66, 6);
      for (const o of hole.obstacles) {
        o.mesh = box(o.move ? world.dyn : root, o.x1 - o.x0, 0.55, o.z1 - o.z0, (o.x0 + o.x1) / 2, GREEN_Y, (o.z0 + o.z1) / 2, o.move ? 0x8e5bd6 : 0xff7a3d);
        if (o.move) { o.base = (o.z0 + o.z1) / 2; o.half = (o.z1 - o.z0) / 2; }
      }
    });

    this.ball = new THREE.Mesh(new THREE.SphereGeometry(R, 16, 12), m('smooth', 0xffffff));
    this.ball.castShadow = true;
    this.ball.visible = false;
    world.dyn.add(this.ball);

    // aim arrow
    this.arrow = new THREE.Group();
    this.arrow.visible = false;
    const am = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    this.shaft = box(this.arrow, 0.12, 0.02, 1, 0, 0, 0.5, am);
    this.tip = box(this.arrow, 0.4, 0.02, 0.4, 0, 0, 0, am);
    this.tip.rotation.y = Math.PI / 4;
    world.dyn.add(this.arrow);

    // moving obstacles keep moving even when nobody is playing
    world.updaters.push((dt, t) => {
      for (const hole of HOLES) for (const o of hole.obstacles) {
        if (!o.move) continue;
        const c = o.base + Math.sin(t * o.move.speed) * o.move.amp;
        o.z0 = c - o.half; o.z1 = c + o.half;
        o.mesh.position.z = c;
      }
    });
  }

  start() {
    const g = this.game;
    this.active = true;
    g.mode = 'golf';
    this.card = [];
    this.hole = 0;
    this.saved = { dist: g.cam.dist, pitch: g.cam.pitch };
    g.cam.dist = 8.5;
    g.cam.pitch = 0.55;
    g.player.putter.visible = true;
    g.player.pose = { type: 'putt', swing: 0 };
    this._setupHole();
    ui.hint(g.touch ? 'Drag to aim · hold PUTT to charge, release to hit' : 'Drag or A / D to aim · hold Space to charge, release to putt · Esc to leave');
  }

  _setupHole() {
    const hole = HOLES[this.hole];
    this.strokes = 0;
    this.state = 'aim';
    this.vel.set(0, 0);
    this.ball.visible = true;
    this.ball.position.set(hole.tee.x, GREEN_Y + R, hole.tee.z);
    this.game.cam.yaw = -Math.PI / 2; // look east, down the lane
    this.power = 0; this.charging = false;
    this._hud();
  }

  _hud() {
    const hole = HOLES[this.hole];
    const top = ui.hud(`<span>Hole <b>${this.hole + 1}</b>/${HOLES.length}</span><span>Par <b>${hole.par}</b></span><span>Strokes <b>${this.strokes}</b></span><button id="golf-exit">Leave</button>`);
    top.querySelector('#golf-exit').onclick = () => this.exit();
  }

  exit() {
    if (!this.active) return;
    const g = this.game;
    this.active = false;
    this.state = 'idle';
    g.mode = 'walk';
    g.focus = null;
    g.cam.dist = this.saved.dist;
    g.cam.pitch = this.saved.pitch;
    g.player.putter.visible = false;
    g.player.pose = null;
    g.player.teleport(34 + OX, 0.2, 26 + OZ, Math.PI / 2);
    this.ball.visible = false;
    this.arrow.visible = false;
    ui.hud(null); ui.hint(null); ui.power(null);
    if (ui.panelZone === 'golf-card') ui.closePanel();
  }

  update(dt, t) {
    if (!this.active) return;
    const g = this.game, c = g.controls, ball = this.ball.position;
    const hole = HOLES[this.hole];
    const yaw = g.cam.yaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);

    if (this.state === 'aim') {
      const turn = (c.keys.has('KeyA') || c.keys.has('ArrowLeft') ? 1 : 0) - (c.keys.has('KeyD') || c.keys.has('ArrowRight') ? 1 : 0);
      g.cam.yaw += turn * 1.4 * dt;

      if (c.action && !ui.panelOpen) {
        if (!this.charging) { this.charging = true; this.chargeT = 0; }
        this.chargeT += dt * 0.9;
        const tri = this.chargeT % 2; // ping-pong 0 → 1 → 0
        this.power = tri < 1 ? tri : 2 - tri;
      } else if (this.charging) {
        this.charging = false;
        const speed = 3.5 + this.power * 19;
        this.vel.set(fx * speed, fz * speed);
        this.strokes++;
        this.state = 'roll';
        this.swingT = 0;
        this._hud();
      }
      ui.power(this.charging ? this.power : 0);

      // stand beside the ball, facing it
      g.player.pos.set(ball.x - rx * 0.95 - fx * 0.1, GREEN_Y - 0.05, ball.z - rz * 0.95 - fz * 0.1);
      g.player.heading = Math.atan2(rx, rz);
      g.player.group.rotation.y = g.player.heading;

      this.arrow.visible = true;
      this.arrow.position.set(ball.x, GREEN_Y + 0.03, ball.z);
      this.arrow.rotation.y = Math.atan2(fx, fz);
      const len = 1.4 + this.power * 3.2;
      this.shaft.scale.z = len; this.shaft.position.z = 0.4 + len / 2;
      this.tip.position.z = 0.4 + len;
    } else {
      this.arrow.visible = false;
      ui.power(null);
    }

    if (this.state === 'roll') this._roll(dt, hole);

    if (this.state === 'sunk') {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.hole < HOLES.length - 1) { this.hole++; this._setupHole(); }
        else this._finish();
      }
    }

    // swing animation: back while charging, through after release
    if (this.swingT >= 0) {
      this.swingT += dt;
      this.swing = this.swingT < 0.18 ? 1 : Math.max(0, 1 - (this.swingT - 0.18) * 2.5);
      if (this.swingT > 0.6) { this.swingT = -1; this.swing = 0; }
    } else this.swing = this.charging ? -(0.25 + this.power * 0.75) : 0;
    g.player.pose.swing = this.swing;

    g.focus = g.focus || new THREE.Vector3();
    g.focus.set(ball.x, 0.6, ball.z);
    this.ball.rotation.z -= this.vel.x * dt / R;
    this.ball.rotation.x += this.vel.y * dt / R;
  }

  _roll(dt, hole) {
    const p = this.ball.position, v = this.vel, b = hole.bounds;
    const steps = 6;
    const sdt = dt / steps;
    for (let i = 0; i < steps; i++) {
      p.x += v.x * sdt; p.z += v.y * sdt;
      // rails
      if (p.x < b.x0 + R) { p.x = b.x0 + R; v.x = Math.abs(v.x) * 0.75; }
      if (p.x > b.x1 - R) { p.x = b.x1 - R; v.x = -Math.abs(v.x) * 0.75; }
      if (p.z < b.z0 + R) { p.z = b.z0 + R; v.y = Math.abs(v.y) * 0.75; }
      if (p.z > b.z1 - R) { p.z = b.z1 - R; v.y = -Math.abs(v.y) * 0.75; }
      // obstacles: circle vs box
      for (const o of hole.obstacles) {
        const nx = clamp(p.x, o.x0, o.x1), nz = clamp(p.z, o.z0, o.z1);
        let dx = p.x - nx, dz = p.z - nz;
        let d = Math.hypot(dx, dz);
        if (d >= R) continue;
        if (d < 1e-6) {
          // swallowed by the moving block: pop out of the nearest face
          const l = p.x - o.x0, r = o.x1 - p.x, n = p.z - o.z0, s = o.z1 - p.z;
          const m = Math.min(l, r, n, s);
          dx = m === l ? -1 : m === r ? 1 : 0; dz = m === n ? -1 : m === s ? 1 : 0;
          if (dx) p.x = dx < 0 ? o.x0 - R : o.x1 + R; else p.z = dz < 0 ? o.z0 - R : o.z1 + R;
        } else {
          dx /= d; dz /= d;
          p.x = nx + dx * R; p.z = nz + dz * R;
        }
        const dot = v.x * dx + v.y * dz;
        if (dot < 0) { v.x -= 1.75 * dot * dx; v.y -= 1.75 * dot * dz; }
        if (o.move && v.length() < 2) v.set(dx * 2.5, dz * 2.5); // nudged by the slider
      }
      // friction
      const sp = v.length();
      if (sp > 0) {
        const ns = Math.max(0, sp - (sp * 1.0 + 1.1) * sdt);
        v.multiplyScalar(ns / sp);
      }
      // cup
      const cd = Math.hypot(p.x - hole.cup.x, p.z - hole.cup.z);
      if (cd < CUP_R && v.length() < 10) { this._sink(hole); return; }
    }
    if (v.length() < 0.06) { v.set(0, 0); this.state = 'aim'; this.power = 0; }
  }

  _sink(hole) {
    this.state = 'sunk';
    this.timer = 1.7;
    this.vel.set(0, 0);
    this.ball.visible = false;
    this.card.push(this.strokes);
    const diff = this.strokes - hole.par;
    ui.toast(this.strokes === 1 ? 'Hole in one!' : SCORE_NAMES[diff] || `+${diff}`);
  }

  _finish() {
    this.state = 'done';
    const total = this.card.reduce((a, b) => a + b, 0);
    const par = HOLES.reduce((a, b) => a + b.par, 0);
    const diff = total - par;
    const body = h(`
      <table class="score">
        <tr><th>Hole</th>${HOLES.map((_, i) => `<th>${i + 1}</th>`).join('')}<th>Total</th></tr>
        <tr><td>Par</td>${HOLES.map((x) => `<td>${x.par}</td>`).join('')}<td>${par}</td></tr>
        <tr><td>You</td>${this.card.map((s) => `<td><b>${s}</b></td>`).join('')}<td><b>${total}</b></td></tr>
      </table>
      <p>${diff < 0 ? `${-diff} under par. Superb round!` : diff === 0 ? 'Level par. Nicely played.' : `${diff} over par. Have another go?`}</p>
      <div class="row"><button class="btn" data-again style="flex:1">Play again</button><button class="btn ghost" data-leave>Leave</button></div>`);
    body.addEventListener('click', (e) => {
      if (e.target.closest('[data-again]')) { this.state = 'restart'; ui.closePanel(); this.card = []; this.hole = 0; this._setupHole(); }
      else if (e.target.closest('[data-leave]')) this.exit();
    });
    ui.hud(null); ui.power(null);
    ui.openPanel({ kicker: 'Mini Golf', title: 'Scorecard', body, zone: 'golf-card', onClose: () => { if (this.state === 'done') this.exit(); } });
  }
}
