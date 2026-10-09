// Keyboard, mouse and touch input.
// Desktop: WASD/arrows, Shift, Space, E, mouse drag (or pointer lock) + wheel.
// Touch: floating joystick on the left, drag elsewhere to look, pinch to zoom, on-screen buttons.

export const isTouch = () => window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

export class Controls {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.joy = { x: 0, y: 0, id: null, ox: 0, oy: 0 };
    this.look = { dx: 0, dy: 0, zoom: 0 };
    this.jumpQueued = false;
    this.runToggle = false;
    this.touchAction = false;
    this.fireHeld = false; // left mouse / touch fire button
    this.fireQueued = false;
    this.onInteract = () => {};
    this.onEscape = () => {};
    this.onKey = () => {}; // extra hotkeys (V, C, M, R...)
    this.onLockChange = () => {};
    this.enabled = false;
    this.wantLock = false; // modes that use pointer lock (first person, shooting)

    const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') { this.onEscape(); return; }
      if (typing(e) || !this.enabled) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'Space') this.jumpQueued = true;
      if (e.code === 'KeyE' || e.code === 'Enter') this.onInteract();
      else this.onKey(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.fireHeld = false; });

    // ---- pointer lock (desktop first person / shooting)
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (!this.locked) this.fireHeld = false;
      this.onLockChange(this.locked);
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      // some browsers report huge spikes on lock; ignore them
      if (Math.abs(e.movementX) > 300 || Math.abs(e.movementY) > 300) return;
      this.look.dx += e.movementX;
      this.look.dy += e.movementY;
    });

    // ---- pointer: joystick (touch, left side) or camera drag
    const joyEl = document.getElementById('joy');
    const knob = document.getElementById('joy-knob');
    const cams = new Map();
    let pinch = 0;

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      if (e.pointerType === 'mouse') {
        if (this.wantLock && !this.locked) { this.lock(); return; }
        if (this.locked) {
          if (e.button === 0) { this.fireHeld = true; this.fireQueued = true; }
          return;
        }
      }
      canvas.setPointerCapture(e.pointerId);
      if (e.pointerType === 'touch' && this.joy.id === null && e.clientX < window.innerWidth * 0.42) {
        this.joy.id = e.pointerId; this.joy.ox = e.clientX; this.joy.oy = e.clientY;
        joyEl.hidden = false;
        joyEl.style.left = e.clientX + 'px'; joyEl.style.top = e.clientY + 'px';
        knob.style.transform = '';
        return;
      }
      cams.set(e.pointerId, { x: e.clientX, y: e.clientY });
      pinch = 0;
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.joy.id) {
        const max = 52;
        let dx = e.clientX - this.joy.ox, dy = e.clientY - this.joy.oy;
        const l = Math.hypot(dx, dy);
        if (l > max) { dx *= max / l; dy *= max / l; }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        this.joy.x = dx / max; this.joy.y = -dy / max;
        return;
      }
      const c = cams.get(e.pointerId);
      if (!c) return;
      if (cams.size === 2) {
        c.x = e.clientX; c.y = e.clientY;
        const [a, b] = [...cams.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) this.look.zoom += (pinch - d) * 0.04;
        pinch = d;
        return;
      }
      this.look.dx += e.clientX - c.x;
      this.look.dy += e.clientY - c.y;
      c.x = e.clientX; c.y = e.clientY;
    });
    const up = (e) => {
      if (e.pointerType === 'mouse' && e.button === 0) this.fireHeld = false;
      if (e.pointerId === this.joy.id) {
        this.joy.id = null; this.joy.x = this.joy.y = 0; joyEl.hidden = true;
      }
      cams.delete(e.pointerId);
      pinch = 0;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.fireHeld = false; });
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.look.zoom += e.deltaY * 0.01; }, { passive: false });

    // ---- on-screen buttons
    const jump = document.getElementById('btn-jump');
    const run = document.getElementById('btn-run');
    const fire = document.getElementById('btn-fire');
    const hold = (el, down, upFn) => {
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); down(); });
      el.addEventListener('pointerup', upFn);
      el.addEventListener('pointercancel', upFn);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    };
    hold(jump, () => { this.jumpQueued = true; this.touchAction = true; }, () => { this.touchAction = false; });
    hold(run, () => { this.runToggle = !this.runToggle; run.classList.toggle('on', this.runToggle); }, () => {});
    hold(fire, () => { this.fireHeld = true; this.fireQueued = true; }, () => { this.fireHeld = false; });
  }

  lock() {
    if (this.locked || !this.canvas.requestPointerLock) return;
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => { try { this.canvas.requestPointerLock(); } catch { /* unsupported */ } });
    } catch { /* unsupported */ }
  }
  unlock() { if (this.locked) document.exitPointerLock(); }

  /** Movement intent: x = strafe right, y = forward, both in [-1, 1]. */
  move() {
    const k = this.keys;
    let x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let y = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    x += this.joy.x; y += this.joy.y;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }
  get run() { return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.runToggle; }
  get action() { return this.keys.has('Space') || this.touchAction; }

  /** Read-and-clear the queued jump. */
  takeJump() { const j = this.jumpQueued; this.jumpQueued = false; return j; }
  takeFire() { const f = this.fireQueued; this.fireQueued = false; return f; }
  /** Read-and-clear accumulated look deltas. */
  takeLook() { const l = { ...this.look }; this.look.dx = this.look.dy = this.look.zoom = 0; return l; }
}
