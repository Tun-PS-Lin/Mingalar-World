// Blocky third-person character: movement, collision and procedural animation.
import * as THREE from 'three';
import { box, mat, textTexture, damp, dampAngle, clamp } from './builders.js';

const WALK = 7.5;
const RUN = 13.5;
const SWIM = 4.2;
const JUMP = 10.5;
const GRAVITY = 30;
const RADIUS = 0.55;
const HEIGHT = 2.4;
const CHEST = 1.4; // pivot height for leaning / swimming

export class Player {
  constructor(scene) {
    this.group = new THREE.Group();
    this.pos = this.group.position;
    this.vel = new THREE.Vector3();
    this.heading = 0;
    this.grounded = true;
    this.swimming = false;
    this.speed = 0;
    this.phase = 0;
    this.pose = null; // { type: 'putt', swing } | { type: 'workout' }
    this.reps = 0;
    this._jack = 0;
    this._build();
    scene.add(this.group);
  }

  _build() {
    const skin = 0xffcf9e, shirt = 0xff5b4d, pants = 0x2b3a67, shoe = 0xffffff, hair = 0x4a2f1b;
    const body = (this.body = new THREE.Group());
    body.position.y = CHEST;
    this.group.add(body);

    box(body, 0.95, 0.9, 0.5, 0, 0.9 - CHEST, 0, shirt);
    box(body, 0.97, 0.16, 0.52, 0, 0.9 - CHEST, 0, 0x14182b); // belt

    const head = (this.head = new THREE.Group());
    head.position.y = 1.8 - CHEST;
    body.add(head);
    box(head, 0.66, 0.62, 0.62, 0, 0, 0, skin);
    box(head, 0.7, 0.2, 0.68, 0, 0.5, -0.01, hair);
    box(head, 0.7, 0.4, 0.2, 0, 0.26, -0.25, hair);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.56),
      new THREE.MeshBasicMaterial({ map: faceTexture(), transparent: true })
    );
    face.position.set(0, 0.3, 0.316);
    head.add(face);

    const limb = (x, y, w, h, d, color, tip) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y - CHEST, 0);
      body.add(pivot);
      box(pivot, w, h, d, 0, -h, 0, color);
      if (tip) box(pivot, w + 0.02, 0.2, d + 0.02, 0, -h, 0, tip);
      return pivot;
    };
    this.armL = limb(0.69, 1.76, 0.4, 0.9, 0.4, shirt, skin);
    this.armR = limb(-0.69, 1.76, 0.4, 0.9, 0.4, shirt, skin);
    this.legL = limb(0.24, 0.9, 0.45, 0.9, 0.45, pants, shoe);
    this.legR = limb(-0.24, 0.9, 0.45, 0.9, 0.45, pants, shoe);

    // putter, only shown while playing golf
    this.putter = new THREE.Group();
    this.putter.visible = false;
    box(this.putter, 0.07, 1.15, 0.07, 0, -1.95, 0, 0xcfd3d6);
    box(this.putter, 0.34, 0.12, 0.12, 0.12, -1.98, 0, 0x23262f);
    this.armR.add(this.putter);

    // soft blob shadow helps read jump height
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.62, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
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
   */
  update(dt, t, input, camYaw, world, locked) {
    const p = this.pos;
    if (!locked) {
      const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
      const rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      let mx = fx * input.y + rx * input.x;
      let mz = fz * input.y + rz * input.x;
      const mag = Math.min(1, Math.hypot(mx, mz));
      if (mag > 0.01) { const l = Math.hypot(mx, mz); mx /= l; mz /= l; }
      const top = this.swimming ? SWIM : input.run ? RUN : WALK;
      const accel = this.grounded ? 14 : 5;
      this.vel.x = damp(this.vel.x, mx * top * mag, accel, dt);
      this.vel.z = damp(this.vel.z, mz * top * mag, accel, dt);
      if (mag > 0.05) this.heading = dampAngle(this.heading, Math.atan2(mx, mz), 14, dt);

      if (input.jump && this.grounded) {
        this.vel.y = this.swimming ? 5 : JUMP;
        this.grounded = false;
      }
      this.vel.y -= GRAVITY * dt;
      if (p.y < -0.25) this.vel.y = Math.max(this.vel.y, -4); // water drag

      p.x += this.vel.x * dt;
      p.z += this.vel.z * dt;
      p.y += this.vel.y * dt;

      const ground = this._collide(world);
      if (p.y <= ground && this.vel.y <= 0) {
        // smooth step-up (kerbs, climbing out of the pool)
        p.y = ground - p.y > 0.02 ? Math.min(ground, p.y + Math.max(6 * dt, (ground - p.y) * 12 * dt)) : ground;
        this.vel.y = 0;
        this.grounded = true;
      } else if (p.y > ground + 0.05) {
        this.grounded = false;
      }
      this.swimming = p.y < -0.6;
      this.group.rotation.y = this.heading;
    }
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    this._animate(dt, t, locked);

    const floor = world.groundAt(p.x, p.z);
    this.blob.position.y = Math.max(floor, 0) - p.y + 0.09;
    this.blob.visible = !this.swimming && p.y - floor < 6;
  }

  /** Push the player out of colliders; returns the ground height underfoot. */
  _collide(world) {
    const p = this.pos;
    let ground = world.groundAt(p.x, p.z);
    for (const c of world.colliders) {
      if (p.x < c.x0 - 1 || p.x > c.x1 + 1 || p.z < c.z0 - 1 || p.z > c.z1 + 1) continue;
      if (p.y >= c.y1 - 0.32) {
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
        const m = Math.min(l, r, n, s);
        if (m === l) p.x = c.x0 - RADIUS;
        else if (m === r) p.x = c.x1 + RADIUS;
        else if (m === n) p.z = c.z0 - RADIUS;
        else p.z = c.z1 + RADIUS;
      }
    }
    return ground;
  }

  _animate(dt, t, locked) {
    // target pose
    let aLx = 0, aRx = 0, aLz = 0.06, aRz = -0.06, lLx = 0, lRx = 0, lLz = 0, lRz = 0;
    let tilt = 0, lift = 0, headX = 0, rate = 14;
    const pose = locked ? this.pose : null;

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
    } else if (!this.grounded) {
      aLx = aRx = -0.4; aLz = 0.9; aRz = -0.9;
      lLx = -0.5; lRx = 0.35;
    } else if (this.speed > 0.6) {
      const running = this.speed > WALK + 1.5;
      this.phase += dt * this.speed * (running ? 0.95 : 1.25);
      const s = Math.sin(this.phase);
      const amp = running ? 1.05 : 0.65;
      lLx = s * amp; lRx = -s * amp;
      aLx = -s * amp; aRx = s * amp;
      tilt = running ? 0.2 : 0.05;
      lift = Math.abs(Math.cos(this.phase)) * (running ? 0.12 : 0.05);
    } else {
      // idle: breathe
      const s = Math.sin(t * 2);
      aLz = 0.07 + s * 0.03; aRz = -0.07 - s * 0.03;
      lift = s * 0.015;
      headX = Math.sin(t * 0.7) * 0.04;
    }

    const k = 1 - Math.exp(-rate * dt);
    const to = (obj, x, z) => { obj.rotation.x += (x - obj.rotation.x) * k; obj.rotation.z += (z - obj.rotation.z) * k; };
    to(this.armL, aLx, aLz); to(this.armR, aRx, aRz);
    to(this.legL, lLx, lLz); to(this.legR, lRx, lRz);
    this.body.rotation.x += (tilt - this.body.rotation.x) * k;
    this.body.position.y += (CHEST + lift - this.body.position.y) * k;
    this.head.rotation.x += (headX - this.head.rotation.x) * k;
  }
}

function faceTexture() {
  const tex = textTexture('', { w: 128, h: 120, bg: null });
  const g = tex.image.getContext('2d');
  g.fillStyle = '#14182b';
  g.beginPath(); g.roundRect(30, 34, 16, 26, 6); g.fill();
  g.beginPath(); g.roundRect(82, 34, 16, 26, 6); g.fill();
  g.strokeStyle = '#14182b'; g.lineWidth = 7; g.lineCap = 'round';
  g.beginPath(); g.arc(64, 66, 26, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
  tex.needsUpdate = true;
  return tex;
}
