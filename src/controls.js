// Keyboard, mouse and touch input.
// Desktop: WASD/arrows, Shift, Space, E, mouse drag + wheel.
// Touch: floating joystick on the left, drag elsewhere to look, pinch to zoom, on-screen buttons.

export const isTouch = () => window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

export class Controls {
  constructor(canvas) {
    this.keys = new Set();
    this.joy = { x: 0, y: 0, id: null, ox: 0, oy: 0 };
    this.look = { dx: 0, dy: 0, zoom: 0 };
    this.jumpQueued = false;
    this.runToggle = false;
    this.actionHeld = false; // Space / touch action button held (used by golf)
    this.touchAction = false;
    this.onInteract = () => {};
    this.onEscape = () => {};
    this.enabled = false;

    const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') { this.onEscape(); return; }
      if (typing(e) || !this.enabled) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'Space') this.jumpQueued = true;
      if (e.code === 'KeyE' || e.code === 'Enter') this.onInteract();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    // ---- pointer: joystick (touch, left side) or camera drag
    const joyEl = document.getElementById('joy');
    const knob = document.getElementById('joy-knob');
    const cams = new Map();
    let pinch = 0;

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
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
      if (e.pointerId === this.joy.id) {
        this.joy.id = null; this.joy.x = this.joy.y = 0; joyEl.hidden = true;
      }
      cams.delete(e.pointerId);
      pinch = 0;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.look.zoom += e.deltaY * 0.01; }, { passive: false });

    // ---- on-screen buttons
    const jump = document.getElementById('btn-jump');
    const run = document.getElementById('btn-run');
    const hold = (el, down, upFn) => {
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); down(); });
      el.addEventListener('pointerup', upFn);
      el.addEventListener('pointercancel', upFn);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    };
    hold(jump, () => { this.jumpQueued = true; this.touchAction = true; }, () => { this.touchAction = false; });
    hold(run, () => { this.runToggle = !this.runToggle; run.classList.toggle('on', this.runToggle); }, () => {});
  }

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
  /** Read-and-clear accumulated look deltas. */
  takeLook() { const l = { ...this.look }; this.look.dx = this.look.dy = this.look.zoom = 0; return l; }
}
