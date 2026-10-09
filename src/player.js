// The player: avatar model, movement, collision and procedural animation.
import * as THREE from 'three';
import { damp, dampAngle, clamp } from './builders.js';
import { buildAvatar, disposeAvatar } from './avatar.js';

const WALK = 8;
const RUN = 14.5;
const SWIM = 4.5;
const JUMP = 10.5;
const GRAVITY = 30;
const RADIUS = 0.6;
const HEIGHT = 2.7;
export const EYE = 2.38;

export class Player {
  constructor(scene, look) {
    this.group = new THREE.Group();
    this.pos = this.group.position;
    this.vel = new THREE.Vector3();
    this.heading = 0;
    this.grounded = true;
    this.swimming = false;
    this.speed = 0;
    this.phase = 0;
    this.pose = null; // { type: 'putt', swing } | { type: 'workout' } | { type: 'aim' }
    this.reps = 0;
    this._jack = 0;
    this.jumped = false; // true for the frame a jump starts (sound hook)
    this.setLook(look);
    this._blob();
    scene.add(this.group);
  }

  /** (Re)build the avatar from an appearance description. */
  setLook(look) {
    const keep = this.av ? { putter: this.putter.visible, held: this.held } : null;
    if (this.av) { this.group.remove(this.av.root); disposeAvatar(this.av); }
    this.av = buildAvatar(look);
    this.group.add(this.av.root);
    Object.assign(this, { body: this.av.body, head: this.av.head, armL: this.av.armL, armR: this.av.armR, legL: this.av.legL, legR: this.av.legR });

    // putter, only shown while playing golf
    this.putter = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: 0xcfd3d6, metalness: 0.8, roughness: 0.3 });
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.15, 0.07), steel);
    grip.position.y = -0.62; this.putter.add(grip);
    const headM = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.12), new THREE.MeshStandardMaterial({ color: 0x23262f }));
    headM.position.set(0.12, -1.2, 0); this.putter.add(headM);
    this.putter.visible = keep ? keep.putter : false;
    this.av.handR.add(this.putter);
    this.held = null;
    if (keep && keep.held) this.hold(keep.held);
  }

  /** Put an object in the right hand (or null to empty it). */
  hold(obj) {
    if (this.held) this.held.removeFromParent();
    this.held = obj;
    if (obj) this.av.handR.add(obj);
  }

  _blob() {
    // soft blob shadow helps read jump height
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.7, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false })
    );
    blob.rotation.x = -Math.PI / 2;
    this.blob = blob;
    this.group.add(blob);
  }

  teleport(x, y, z, heading = this.heading) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
    this.heading = heading;
    this.group.rotation.y = heading;
  }

  /**
   * @param input { x: strafe right, y: forward, run, jump }
   * @param camYaw camera orbit angle; movement is relative to it
   * @param locked when true the player is being posed by a mini-game
   * @param face heading to turn towards (the camera's look direction), or null to face the movement
   */
  update(dt, t, input, camYaw, world, locked, face = null) {
    const p = this.pos;
    this.jumped = false;
    if (!locked) {
      const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
      const rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      let mx = fx * input.y + rx * input.x;
      let mz = fz * input.y + rz * input.x;
      const mag = Math.min(1, Math.hypot(mx, mz));
      if (mag > 0.01) { const l = Math.hypot(mx, mz); mx /= l; mz /= l; }
      // running backwards is slower, like most third-person games
      const back = input.y < -0.1 ? 0.7 : 1;
      const top = (this.swimming ? SWIM : input.run ? RUN : WALK) * back;
      const accel = this.grounded ? 14 : 5;
      this.vel.x = damp(this.vel.x, mx * top * mag, accel, dt);
      this.vel.z = damp(this.vel.z, mz * top * mag, accel, dt);
      if (face !== null) this.heading = dampAngle(this.heading, face, 18, dt);
      else if (mag > 0.05) this.heading = dampAngle(this.heading, Math.atan2(mx, mz), 14, dt);
      this.moveDir = mag > 0.05 ? Math.atan2(mx, mz) - this.heading : null;

      if (input.jump && this.grounded) {
        this.vel.y = this.swimming ? 5 : JUMP;
        this.grounded = false;
        this.jumped = true;
      }
      this.vel.y -= GRAVITY * dt;
      if (p.y < -0.25) this.vel.y = Math.max(this.vel.y, -4); // water drag

      // sub-step fast movement so we never tunnel through thin walls
      const steps = Math.max(1, Math.ceil((Math.hypot(this.vel.x, this.vel.z) * dt) / (RADIUS * 0.8)));
      let ground = 0;
      for (let i = 0; i < steps; i++) {
        p.x += (this.vel.x * dt) / steps;
        p.z += (this.vel.z * dt) / steps;
        p.y += (this.vel.y * dt) / steps;
        ground = this._collide(world);
      }

      if (p.y <= ground && this.vel.y <= 0) {
        // smooth step-up (kerbs, stairs, climbing out of the pool)
        p.y = ground - p.y > 0.02 ? Math.min(ground, p.y + Math.max(6 * dt, (ground - p.y) * 12 * dt)) : ground;
        this.vel.y = 0;
        this.grounded = true;
      } else if (p.y > ground + 0.05) {
        this.grounded = false;
      }
      // never fall out of the world
      if (p.y < -20) this.teleport(world.spawn.x, 0, world.spawn.z);
      this.swimming = p.y < -0.6;
      this.group.rotation.y = this.heading;
    }
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    this._animate(dt, t, locked);

    const floor = world.groundAt(p.x, p.z);
    this.blob.position.y = Math.max(floor, this.groundBelow ?? floor) - p.y + 0.06;
    this.blob.visible = !this.swimming && p.y - floor < 6;
  }

  /** Push the player out of colliders; returns the ground height underfoot. */
  _collide(world) {
    const p = this.pos;
    let ground = world.groundAt(p.x, p.z);
    for (const c of world.near(p.x, p.z)) {
      if (p.x < c.x0 - 1 || p.x > c.x1 + 1 || p.z < c.z0 - 1 || p.z > c.z1 + 1) continue;
      if (p.y >= c.y1 - 0.42) {
        // on top of it (or low enough to step onto)
        const m = RADIUS * 0.5;
        if (p.x > c.x0 - m && p.x < c.x1 + m && p.z > c.z0 - m && p.z < c.z1 + m) ground = Math.max(ground, c.y1);
        continue;
      }
      if (p.y + HEIGHT <= c.y0) continue;
      const nx = clamp(p.x, c.x0, c.x1), nz = clamp(p.z, c.z0, c.z1);
      const dx = p.x - nx, dz = p.z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= RADIUS * RADIUS) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2), push = RADIUS - d;
        p.x += (dx / d) * push;
        p.z += (dz / d) * push;
      } else {
        // centre is inside the box: leave by the nearest face
        const l = p.x - c.x0, r = c.x1 - p.x, n = p.z - c.z0, s = c.z1 - p.z;
        const mn = Math.min(l, r, n, s);
        if (mn === l) p.x = c.x0 - RADIUS;
        else if (mn === r) p.x = c.x1 + RADIUS;
        else if (mn === n) p.z = c.z0 - RADIUS;
        else p.z = c.z1 + RADIUS;
      }
    }
    // hitting a ceiling
    if (this.vel.y > 0) {
      for (const c of world.near(p.x, p.z)) {
        if (p.x > c.x0 && p.x < c.x1 && p.z > c.z0 && p.z < c.z1 && p.y + HEIGHT > c.y0 && p.y < c.y0) { this.vel.y = 0; p.y = c.y0 - HEIGHT; }
      }
    }
    this.groundBelow = ground;
    return ground;
  }

  _animate(dt, t, locked) {
    let aLx = 0, aRx = 0, aLz = 0.06, aRz = -0.06, lLx = 0, lRx = 0, lLz = 0, lRz = 0;
    let tilt = 0, lift = 0, headX = 0, rate = 14, twist = 0;
    const pose = this.pose;

    if (pose && pose.type === 'putt') {
      const s = pose.swing;
      aLx = aRx = -0.55;
      aLz = s * 0.85 - 0.3; aRz = s * 0.85 + 0.3;
      tilt = 0.22; headX = 0.25; rate = 30;
    } else if (pose && pose.type === 'workout') {
      const w = t * 7;
      const s = (1 - Math.cos(w)) / 2;
      aLz = 0.1 + s * 2.6; aRz = -0.1 - s * 2.6;
      lLz = s * 0.38; lRz = -s * 0.38;
      lift = Math.abs(Math.sin(w / 2)) * 0.28;
      rate = 40;
      const cycle = Math.floor(w / (Math.PI * 2));
      if (cycle !== this._jack) { this._jack = cycle; this.reps++; }
    } else if (pose && pose.type === 'sit') {
      lLx = lRx = -1.45; aLx = aRx = -0.9; lift = -0.85; rate = 10;
    } else if (this.swimming) {
      const moving = this.speed > 0.6;
      this.phase += dt * (moving ? 6 : 2.2);
      const s = Math.sin(this.phase);
      tilt = moving ? 1.15 : 0.25;
      aLx = (moving ? -2.2 : -1.2) + s * (moving ? 0.9 : 0.25);
      aRx = (moving ? -2.2 : -1.2) - s * (moving ? 0.9 : 0.25);
      aLz = moving ? 0.1 : 0.7 + s * 0.2; aRz = moving ? -0.1 : -0.7 - s * 0.2;
      lLx = s * 0.45; lRx = -s * 0.45;
      headX = moving ? -0.8 : 0;
      lift = Math.sin(t * 2.4) * 0.06;
    } else if (!this.grounded && !locked) {
      aLx = aRx = -0.4; aLz = 0.9; aRz = -0.9;
      lLx = -0.5; lRx = 0.35;
    } else if (this.speed > 0.6 && !locked) {
      const running = this.speed > WALK + 1.5;
      this.phase += dt * this.speed * (running ? 0.9 : 1.2);
      const s = Math.sin(this.phase);
      const amp = running ? 1.0 : 0.65;
      // strafing/backpedalling: legs swing along the travel direction
      const md = this.moveDir ?? 0;
      const fwd = Math.cos(md), side = Math.sin(md);
      lLx = s * amp * fwd; lRx = -s * amp * fwd;
      lLz = s * amp * side * 0.5; lRz = -s * amp * side * 0.5;
      aLx = -s * amp; aRx = s * amp;
      tilt = (running ? 0.18 : 0.05) * fwd;
      lift = Math.abs(Math.cos(this.phase)) * (running ? 0.12 : 0.05);
    } else {
      // idle: breathe
      const s = Math.sin(t * 2);
      aLz = 0.07 + s * 0.03; aRz = -0.07 - s * 0.03;
      lift = s * 0.015;
      headX = Math.sin(t * 0.7) * 0.04;
    }
    // aiming a weapon overrides the arms
    if (pose && pose.type === 'aim') {
      aRx = -Math.PI / 2 - (pose.pitch || 0); aRz = 0.05;
      aLx = -Math.PI / 2 - (pose.pitch || 0) + 0.15; aLz = -0.55;
      twist = 0; rate = 30;
      headX = -(pose.pitch || 0) * 0.6;
    }

    const k = 1 - Math.exp(-rate * dt);
    const to = (obj, x, z) => { obj.rotation.x += (x - obj.rotation.x) * k; obj.rotation.z += (z - obj.rotation.z) * k; };
    to(this.armL, aLx, aLz); to(this.armR, aRx, aRz);
    to(this.legL, lLx, lLz); to(this.legR, lRx, lRz);
    this.body.rotation.x += (tilt - this.body.rotation.x) * k;
    this.body.rotation.y += (twist - this.body.rotation.y) * k;
    this.body.position.y += (this.av.chest + lift - this.body.position.y) * k;
    this.head.rotation.x += (headX - this.head.rotation.x) * k;
  }
}
