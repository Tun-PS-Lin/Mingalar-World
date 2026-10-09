// Mini map (bottom left): a north-up map centred on the player with a facing
// arrow. The static map is drawn once into an offscreen canvas per region
// (the city + raceway, and the office interior); each frame just blits it.
const PX = 2; // offscreen pixels per metre

function renderRegion(map, b) {
  const c = document.createElement('canvas');
  c.width = Math.round((b.x1 - b.x0) * PX);
  c.height = Math.round((b.z1 - b.z0) * PX);
  const g = c.getContext('2d');
  const X = (x) => (x - b.x0) * PX, Z = (z) => (z - b.z0) * PX;
  g.fillStyle = b.bg || '#7cc55a';
  g.fillRect(0, 0, c.width, c.height);
  const inside = (s) => s.x1 > b.x0 && s.x0 < b.x1 && s.z1 > b.z0 && s.z0 < b.z1;
  for (const s of map.shapes) {
    if (!inside(s)) continue;
    g.fillStyle = s.color;
    g.fillRect(X(s.x0), Z(s.z0), (s.x1 - s.x0) * PX, (s.z1 - s.z0) * PX);
  }
  for (const l of map.lines) {
    g.strokeStyle = l.color;
    g.lineWidth = l.width * PX;
    g.lineJoin = 'round';
    g.beginPath();
    l.pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
    if (l.closed) g.closePath();
    g.stroke();
  }
  return { c, b, range: b.range || 70, bg: b.bg || '#7cc55a', labels: map.labels.filter((l) => l.x > b.x0 && l.x < b.x1 && l.z > b.z0 && l.z < b.z1) };
}

export class Minimap {
  constructor(world, regions) {
    this.el = document.getElementById('minimap');
    this.canvas = document.getElementById('minimap-canvas');
    this.g = this.canvas.getContext('2d');
    this.regions = regions.map((b) => renderRegion(world.map, b));
    this.range = 70; // metres from the centre to the edge
    this.acc = 0;
    let min = false;
    try { min = localStorage.getItem('mw-map-min') === '1'; } catch { /* ignore */ }
    this.setMin(min);
    document.getElementById('minimap-toggle').addEventListener('click', () => this.setMin(!this.min));
    document.getElementById('minimap-open').addEventListener('click', () => this.setMin(false));
    this.canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.range = Math.min(220, Math.max(35, this.range * (e.deltaY > 0 ? 1.15 : 0.87))); }, { passive: false });
  }

  setMin(v) {
    this.min = v;
    this.el.classList.toggle('min', v);
    try { localStorage.setItem('mw-map-min', v ? '1' : '0'); } catch { /* ignore */ }
  }

  toggle() { this.setMin(!this.min); }

  /** x, z: player position; heading: facing angle (0 = +z); extra: markers [{x, z, color}] */
  update(dt, x, z, heading, extra = []) {
    if (this.min) return;
    this.acc += dt;
    if (this.acc < 1 / 20) return; // 20 fps is plenty for a map
    this.acc = 0;
    const cv = this.canvas, g = this.g;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = cv.clientWidth;
    if (cv.width !== Math.round(size * dpr)) { cv.width = cv.height = Math.round(size * dpr); }
    const W = cv.width;
    const reg = this.regions.find((r) => x > r.b.x0 && x < r.b.x1 && z > r.b.z0 && z < r.b.z1) || this.regions[0];
    const range = this.range * (reg.range / 70);
    const scale = W / (range * 2); // canvas px per metre
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = reg.bg;
    g.fillRect(0, 0, W, W);
    // blit the region around the player
    const sx = (x - range - reg.b.x0) * PX, sz = (z - range - reg.b.z0) * PX, sw = range * 2 * PX;
    g.imageSmoothingEnabled = true;
    g.drawImage(reg.c, sx, sz, sw, sw, 0, 0, W, W);
    // labels
    g.font = `600 ${Math.round(11 * dpr)}px Fredoka, Arial`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const l of reg.labels) {
      const px = (l.x - x) * scale + W / 2, pz = (l.z - z) * scale + W / 2;
      if (px < -40 || px > W + 40 || pz < -10 || pz > W + 10) continue;
      g.lineWidth = 3 * dpr;
      g.strokeStyle = 'rgba(20,24,43,0.75)';
      g.strokeText(l.text, px, pz);
      g.fillStyle = '#fff';
      g.fillText(l.text, px, pz);
    }
    for (const m of extra) {
      g.fillStyle = m.color;
      g.beginPath();
      g.arc((m.x - x) * scale + W / 2, (m.z - z) * scale + W / 2, 4 * dpr, 0, Math.PI * 2);
      g.fill();
    }
    // player arrow
    g.translate(W / 2, W / 2);
    g.rotate(-heading + Math.PI);
    g.fillStyle = '#ffc83d';
    g.strokeStyle = '#14182b';
    g.lineWidth = 2 * dpr;
    const s = 8 * dpr;
    g.beginPath();
    g.moveTo(0, -s * 1.3); g.lineTo(s, s); g.lineTo(0, s * 0.45); g.lineTo(-s, s);
    g.closePath();
    g.fill(); g.stroke();
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
}
