// Virtual Office: a glass tower in the city, and its interior (built far away
// from the city and reached through a fade). Inside are three business
// corners that link out to the real sites.
import * as THREE from 'three';
import { box, rbox, cyl, ball, sign, drawTexture, panel } from './builders.js';
import { m, neon, glass } from './gfx.js';
import { buildAvatar } from './avatar.js';
import { planter, palm } from './kit.js';
import { ui, h } from './ui.js';
import * as P from './products.js';

export const OFFICE = { x0: 22, x1: 62, z0: -92, z1: -52 };
export const OFFICE_DOOR = { x: 18.5, z: -72 }; // outside, in front of the entrance
export const INTERIOR = { x: 3000, z: 0, w: 64, d: 46, h: 7.5 };
export const INSIDE_SPAWN = { x: INTERIOR.x - INTERIOR.w / 2 + 4, z: 0, heading: Math.PI / 2 };

export const LINKS = {
  map: { url: 'https://map.alacrityresearch.xyz', title: 'Alacrity Research', kicker: 'City Map', text: 'An interactive map of the city by Alacrity Research. Explore neighbourhoods, data layers and points of interest.', cta: 'Open the city map' },
  news: { url: 'https://mingalar.news', title: 'Mingalar News', kicker: 'Newsroom', text: 'Breaking stories, analysis and features from the Mingalar News desk.', cta: 'Read Mingalar News' },
  github: { url: 'https://github.com/Tun-PS-Lin', title: 'Tun-PS-Lin', kicker: 'Developer studio', text: 'Projects, experiments and open source work, including this virtual world.', cta: 'Visit GitHub profile' },
};

export function openLink(id, zone) {
  const l = LINKS[id];
  const body = h(`
    <p>${l.text}</p>
    <a class="btn wide link" href="${l.url}" target="_blank" rel="noopener noreferrer">${l.cta} ↗</a>
    <div class="note">Opens ${l.url.replace('https://', '')} in a new tab.</div>`);
  ui.openPanel({ kicker: `Virtual Office · ${l.kicker}`, title: l.title, body, zone });
}

// ---------------------------------------------------------------- exterior
export function buildOffice(W) {
  const S = W.static;
  const { x0, x1, z0, z1 } = OFFICE;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const win = m('window', 0x7fb2d9), frame = m('concrete', 0xf0f0f0), dark = m(0x23262f);

  W.slab(x0 - 3, x1 + 3, z0 - 3, z1 + 3, 0.22, m('tiles', 0xd9d9d9));
  // podium (lobby), tower, setback crown
  W.wallBox(x0, x1, z0, z1, 0, 9, win);
  box(S, x1 - x0 + 0.6, 1, z1 - z0 + 0.6, cx, 9, cz, frame);
  W.wallBox(x0 + 4, x1 - 4, z0 + 4, z1 - 4, 10, 46, win);
  for (let y = 10; y <= 46; y += 4) box(S, x1 - x0 - 7.6, 0.35, z1 - z0 - 7.6, cx, y - 0.2, cz, frame);
  for (const t of [-1, 1]) for (let k = -3; k <= 3; k++) {
    box(S, 0.35, 36, 0.35, x0 + 4 + (k + 3) * 5.33, 10, t < 0 ? z0 + 3.9 : z1 - 3.9, frame);
    box(S, 0.35, 36, 0.35, t < 0 ? x0 + 3.9 : x1 - 3.9, 10, z0 + 4 + (k + 3) * 5.33, frame);
  }
  W.wallBox(x0 + 8, x1 - 8, z0 + 8, z1 - 8, 46, 54, m('window', 0x5f8fb8));
  box(S, x1 - x0 - 15, 0.6, z1 - z0 - 15, cx, 54, cz, frame);
  box(S, x1 - x0 - 6.8, 0.8, z1 - z0 - 6.8, cx, 46, cz, frame);
  W.solid(x0, x1, z0, z1, 0, 60, true);
  // helipad + antenna + spinning logo
  cyl(S, 7, 0.3, cx, 54.6, cz, m('concrete', 0x5d636e), 32);
  sign(S, 'H', 5, 5, cx, 54.95, cz, 0, { bg: null, fg: '#ffc83d' }).rotation.x = -Math.PI / 2;
  cyl(S, 0.25, 12, x1 - 10, 54.6, z0 + 10, m('metal', 0xd0d0d0), 8);
  ball(S, 0.4, 0.4, 0.4, x1 - 10, 66.8, z0 + 10, neon(0xff3b30, 2));
  const spin = new THREE.Group();
  spin.position.set(x0 + 9, 58.5, z1 - 9);
  W.dyn.add(spin);
  const cube = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), new THREE.MeshStandardMaterial({ color: 0xffc83d, metalness: 0.5, roughness: 0.3 }));
  cube.rotation.set(Math.PI / 4, 0, Math.PI / 4);
  cube.castShadow = true;
  spin.add(cube);
  W.updaters.push((dt) => { spin.rotation.y += dt * 0.8; });
  // entrance (west face)
  box(S, 0.4, 5, 12, x0 - 0.1, 0.2, -72, dark);
  box(S, 0.3, 4.4, 10.6, x0 - 0.35, 0.2, -72, m('window', 0x2a4d6e));
  const rev = cyl(S, 2.2, 4.2, x0 - 2.4, 0.22, -72, glass(0xcfe9ff, 0.3), 24);
  rev.castShadow = false;
  cyl(S, 2.3, 0.3, x0 - 2.4, 4.4, -72, dark, 24);
  const wings = new THREE.Group();
  wings.position.set(x0 - 2.4, 0.22, -72);
  W.dyn.add(wings);
  for (let i = 0; i < 4; i++) { const b = box(wings, 0.08, 4.1, 2.1, 0, 0, 0, glass(0xcfe9ff, 0.45)); b.position.set(Math.cos(i * Math.PI / 2) * 1.05, 2.05, Math.sin(i * Math.PI / 2) * 1.05); b.rotation.y = -i * Math.PI / 2 + Math.PI / 2; }
  W.updaters.push((dt) => { wings.rotation.y += dt * 0.5; });
  W.solid(x0 - 4.6, x0, -74.2, -69.8, 0, 4.6);
  box(S, 7, 0.4, 14, x0 - 3.5, 5.2, -72, dark);
  sign(S, 'VIRTUAL OFFICE', 13, 2, x0 - 0.12, 7, -72, -Math.PI / 2, { bg: '#14182b', fg: '#ffffff', glow: true, radius: 18 });
  sign(S, 'Alacrity Research  ·  Mingalar News  ·  Tun-PS-Lin', 12, 0.7, x0 - 7.05, 5.4, -72, -Math.PI / 2, { bg: null, fg: '#ffc83d', glow: true });
  planter(W, x0 - 3, -80, 0xffc83d, 2); planter(W, x0 - 3, -64, 0xff6b9a, 2);
  for (const z of [z0 + 4, z1 - 4]) palm(W, x0 - 6, z, 1.1);
  W.zone('office-enter', OFFICE_DOOR.x, OFFICE_DOOR.z, 4.5, 'Enter the Virtual Office');
  W.mapRect(x0, x1, z0, z1, '#4f8fc4', 'Virtual Office');

  buildInterior(W);
}

// ---------------------------------------------------------------- interior
function buildInterior(W) {
  const X = INTERIOR.x, Z = INTERIOR.z;
  const hw = INTERIOR.w / 2, hd = INTERIOR.d / 2, H = INTERIOR.h;
  W.beginArea('office', { x0: X - hw - 1, x1: X + hw + 1, z0: Z - hd - 1, z1: Z + hd + 1 }, 1);
  const S = W.static;
  const xa = X - hw, xb = X + hw, za = Z - hd, zb = Z + hd;
  const wallM = m('smooth', 0xf2efe9);
  // floor, carpet zones, walls, ceiling
  W.slab(xa - 1, xb + 1, za - 1, zb + 1, 0, m('wood', 0xc9a27a), 0.5);
  W.solid(xa - 1, xb + 1, za - 1, zb + 1, -1, 0);
  W.slab(X - 8, X + 8, za + 1, zb - 1, 0.02, m('carpet', 0x3b4252), 0.1);
  for (const [a, b, c, d] of [[xa - 1, xa, za, zb], [xb, xb + 1, za, zb], [xa - 1, xb + 1, za - 1, za], [xa - 1, xb + 1, zb, zb + 1]]) W.wallBox(a, b, c, d, 0, H, wallM);
  const ceil = W.slab(xa - 1, xb + 1, za - 1, zb + 1, H + 0.4, m('smooth', 0xffffff), 0.4);
  ceil.castShadow = false;
  W.solid(xa - 1, xb + 1, za - 1, zb + 1, H, H + 1, true);
  for (let x = xa + 6; x < xb - 3; x += 8) for (let z = za + 5; z < zb - 3; z += 8) box(S, 3.6, 0.08, 1.2, x, H - 0.08, z, neon(0xffffff, 1)).castShadow = false;
  // windows with the skyline outside
  const sky = drawTexture(1024, 256, (g, w, hh) => {
    const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#4aa8ff'); gr.addColorStop(1, '#d4eeff');
    g.fillStyle = gr; g.fillRect(0, 0, w, hh);
    let s = 7;
    for (let x = 0; x < w; x += 18) {
      s = (s * 9301 + 49297) % 233280;
      const bh = 50 + (s / 233280) * 150, bw = 14 + (s % 20);
      g.fillStyle = ['#6f86a3', '#8aa0bb', '#5d7390', '#a3b5ca'][s % 4];
      g.fillRect(x, hh - bh, bw, bh);
      g.fillStyle = 'rgba(255,255,220,0.5)';
      for (let y = hh - bh + 6; y < hh - 6; y += 10) for (let xx = x + 3; xx < x + bw - 3; xx += 6) if ((xx + y) % 3) g.fillRect(xx, y, 3, 4);
    }
  });
  sky.wrapS = THREE.RepeatWrapping;
  for (const [x, z, r, w] of [[X, za + 0.02, 0, 40], [X, zb - 0.02, Math.PI, 40], [xb - 0.02, Z, -Math.PI / 2, 28]]) {
    panel(S, sky, w, 3.6, x, 3.6, z, r, { glow: false });
    // mullions
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r; S.add(g);
    for (let i = -w / 2; i <= w / 2; i += 4) box(g, 0.15, 3.8, 0.12, i, 1.7, 0.05, m('metal', 0x5d636e));
    box(g, w, 0.15, 0.14, 0, 1.75, 0.05, m('metal', 0x5d636e));
    box(g, w, 0.15, 0.14, 0, 5.4, 0.05, m('metal', 0x5d636e));
  }
  // structural columns
  for (const x of [X - 10, X + 10]) for (const z of [Z - 9, Z + 9]) W.block(1.2, H, 1.2, x, 0, z, m('concrete', 0xe9e5dd));

  // ---- entrance & reception (west)
  box(S, 0.2, 4.4, 4.4, xa + 0.02, 0, Z, m('wood', 0x5a3b22));
  sign(S, 'EXIT', 1.6, 0.6, xa + 0.15, 4.9, Z, Math.PI / 2, { bg: '#2fa37a', fg: '#fff', glow: true });
  sign(S, 'VIRTUAL OFFICE', 10, 1.6, xa + 0.15, 6.2, Z - 9, Math.PI / 2, { bg: null, fg: '#14182b' });
  W.zone('office-exit', xa + 2.5, Z, 3, 'Exit to the street');
  {
    const rx = X - 20;
    W.block(1.6, 1.15, 7, rx, 0, Z, m('wood', 0x2a2d33));
    box(S, 1.9, 0.08, 7.3, rx, 1.15, Z, m('marble', 0xffffff));
    box(S, 0.05, 0.9, 6, rx - 0.82, 0.12, Z, neon(0xffc83d, 0.8));
    const rec = buildAvatar({ body: 'female', hair: 'bun', hairColor: 0x3b2414, shirt: 'jacket', shirtColor: 0x14182b, pants: 'skirt', pantsColor: 0x23262f, face: 'smile' });
    rec.root.position.set(rx + 1.4, 0, Z + 1.2);
    rec.root.rotation.y = -Math.PI / 2;
    S.add(rec.root);
    const mon = P.monitor('shop', 0.6); mon.position.set(rx + 0.3, 1.23, Z - 1.6); mon.rotation.y = Math.PI / 2; S.add(mon);
    W.zone('office-reception', rx - 2.2, Z, 2.6, 'Talk to reception');
  }
  W.indoors.push({ x0: xa, x1: xb, z0: za, z1: zb, h: H, interior: true });
  W.mapRect(xa - 1, xb + 1, za - 1, zb + 1, '#e9e2d6', 'Office');
  W.mapRect(X - 8, X + 8, za + 1, zb - 1, '#4a5263');

  const desk = (x, z, rot, screens = ['code'], chair = 0x23262f) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; S.add(g);
    box(g, 3, 0.08, 1.4, 0, 1.05, 0, m('wood', 0xd8b48a));
    for (const s of [-1, 1]) box(g, 0.08, 1.05, 1.3, s * 1.4, 0, 0, m('metal', 0x23262f));
    screens.forEach((k, i) => { const mo = P.monitor(k, 0.75); mo.position.set((i - (screens.length - 1) / 2) * 0.8, 1.13, -0.35); mo.rotation.y = (i - (screens.length - 1) / 2) * -0.3; g.add(mo); });
    const kb = P.keyboard(); kb.position.set(0, 1.13, 0.2); g.add(kb);
    // chair
    cyl(g, 0.3, 0.05, 0, 0, 1.15, m('metal', 0x23262f), 10);
    cyl(g, 0.05, 0.5, 0, 0, 1.15, m('metal', 0x5d636e), 6);
    rbox(g, 0.7, 0.12, 0.7, 0, 0.5, 1.15, m('fabric', chair), 0.05);
    rbox(g, 0.7, 0.8, 0.12, 0, 0.6, 1.5, m('fabric', chair), 0.05);
    const c = Math.abs(Math.cos(rot)) > 0.5;
    W.solid(x - (c ? 1.6 : 0.8), x + (c ? 1.6 : 0.8), z - (c ? 0.8 : 1.6), z + (c ? 0.8 : 1.6), 0, 1.1);
    return g;
  };

  // ================================== corner 1 (NW): ALACRITY RESEARCH map
  {
    const cx = X - 18, cz = Z - 13;
    W.slab(cx - 11, cx + 9, za + 0.5, cz + 6, 0.03, m('carpet', 0x1d2b45), 0.1);
    sign(S, 'ALACRITY RESEARCH', 12, 1.3, cx, 5.6, za + 0.08, 0, { bg: '#0b1630', fg: '#3be8ff', glow: true, border: '#3be8ff' });
    // big wall map
    const mapTex = drawTexture(1024, 512, (g, w, hh) => {
      g.fillStyle = '#0b1630'; g.fillRect(0, 0, w, hh);
      g.strokeStyle = 'rgba(59,232,255,0.25)'; g.lineWidth = 1;
      for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, hh); g.stroke(); }
      for (let y = 0; y < hh; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.strokeStyle = '#3be8ff'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(0, 260); g.bezierCurveTo(300, 200, 600, 340, 1024, 250); g.stroke();
      g.lineWidth = 3;
      for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(i * 120 + 30, 0); g.lineTo(i * 110 + 60, hh); g.stroke(); }
      g.fillStyle = 'rgba(59,232,255,0.18)';
      let s = 3; for (let i = 0; i < 60; i++) { s = (s * 9301 + 49297) % 233280; g.fillRect((s % 1000), (s / 233280) * 480, 18 + (s % 30), 14 + (s % 20)); }
      const pins = [[220, 140, '#ff4d6d'], [520, 300, '#ffc83d'], [800, 180, '#5be28a'], [380, 420, '#ff7a3d']];
      for (const [x, y, c] of pins) { g.fillStyle = c; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); g.beginPath(); g.moveTo(x - 10, y + 6); g.lineTo(x, y + 30); g.lineTo(x + 10, y + 6); g.fill(); }
      g.fillStyle = '#ffffff'; g.font = '700 34px Fredoka, Arial'; g.fillText('CITY MAP', 30, 50);
    });
    panel(S, mapTex, 12, 4.4, cx, 3.4 - 0.4, za + 0.06, 0);
    // holographic city table
    const tx = cx, tz = cz + 1.5;
    cyl(S, 3.3, 0.9, tx, 0, tz, m('smooth', 0x14182b), 32);
    cyl(S, 3.1, 0.06, tx, 0.9, tz, neon(0x0b4a6b, 1.2), 32);
    W.solid(tx - 3.2, tx + 3.2, tz - 3.2, tz + 3.2, 0, 1);
    const holo = new THREE.Group(); holo.position.set(tx, 0.96, tz); W.dyn.add(holo);
    let s = 11;
    const holoMat = new THREE.MeshStandardMaterial({ color: 0x3be8ff, emissive: 0x1aa7d1, emissiveIntensity: 1.1, transparent: true, opacity: 0.75, roughness: 0.3 });
    const hiMat = new THREE.MeshStandardMaterial({ color: 0xffc83d, emissive: 0xffa000, emissiveIntensity: 1.2 });
    for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
      if (i * i + j * j > 26 || i === 0 || j === 0) continue;
      s = (s * 9301 + 49297) % 233280;
      const hh = 0.08 + (s / 233280) * 0.7 * (1 - Math.hypot(i, j) / 7);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.36, hh, 0.36), (s % 17) === 0 ? hiMat : holoMat);
      b.position.set(i * 0.48, hh / 2, j * 0.48);
      holo.add(b);
    }
    for (const [a, b2] of [[0, 1], [1, 0]]) { const r = new THREE.Mesh(new THREE.BoxGeometry(a ? 5 : 0.12, 0.02, b2 ? 5 : 0.12), neon(0xffffff, 1)); holo.add(r); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.04, 6, 48), neon(0x3be8ff, 2));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.5; holo.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 3.1, 2.4, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x3be8ff, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }));
    beam.position.y = 1.2; holo.add(beam);
    W.updaters.push((dt, t) => { holo.rotation.y += dt * 0.15; ring.position.y = 0.4 + Math.sin(t * 1.5) * 0.3; });
    desk(cx - 8, za + 2.6, 0, ['photo', 'desktop']);
    desk(cx + 6, za + 2.6, 0, ['desktop', 'code']);
    W.zone('link:map', tx, tz, 5.2, 'Open the City Map — map.alacrityresearch.xyz');
    W.mapRect(cx - 11, cx + 9, za + 0.5, cz + 6, '#1d2b45', 'Alacrity');
  }

  // ======================================== corner 2 (NE): MINGALAR NEWS
  {
    const cx = X + 19, cz = Z - 13;
    W.slab(cx - 10, cx + 12, za + 0.5, cz + 7, 0.03, m('carpet', 0x2a0d14), 0.1);
    // video wall
    const news = drawTexture(1024, 512, () => {});
    const ctx = news.image.getContext('2d');
    const drawNews = (t) => {
      const g = ctx, w = 1024, hh = 512;
      const gr = g.createLinearGradient(0, 0, w, hh); gr.addColorStop(0, '#b3122e'); gr.addColorStop(1, '#3a0610');
      g.fillStyle = gr; g.fillRect(0, 0, w, hh);
      g.fillStyle = 'rgba(255,255,255,0.08)';
      for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(800 + Math.sin(t * 0.5 + i) * 40, 220, 40 + i * 22, 0, 7); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.08)'; g.stroke(); }
      g.fillStyle = '#ffffff'; g.font = '700 92px Fredoka, Arial'; g.fillText('MINGALAR', 60, 190); g.fillText('NEWS', 60, 290);
      g.fillStyle = '#ffc83d'; g.font = '600 36px Fredoka, Arial'; g.fillText('LIVE  ●', 64, 360);
      g.fillStyle = '#14182b'; g.fillRect(0, hh - 80, w, 80);
      g.fillStyle = '#e2483d'; g.fillRect(0, hh - 80, 200, 80);
      g.fillStyle = '#fff'; g.font = '700 34px Fredoka, Arial'; g.fillText('BREAKING', 22, hh - 28);
      g.save(); g.beginPath(); g.rect(200, hh - 80, w - 200, 80); g.clip();
      const ticker = 'Mingalar World opens its new raceway  ·  Virtual Mall unveils Tech and Fashion floors  ·  Markets steady  ·  Weather: sunny all week  ·  ';
      g.font = '600 32px Fredoka, Arial';
      const tw = g.measureText(ticker).width;
      const off = (t * 120) % tw;
      g.fillText(ticker + ticker, 220 - off, hh - 28);
      g.restore();
      news.needsUpdate = true;
    };
    drawNews(0);
    const wall = new THREE.Group(); wall.position.set(cx + 1, 0, za + 0.12); S.add(wall);
    box(wall, 13, 6, 0.2, 0, 0.3, -0.05, m(0x111214));
    panel(W.dyn, news, 12.4, 5.4, cx + 1, 3.3, za + 0.2, 0);
    // ON AIR sign
    sign(S, 'ON AIR', 2.4, 0.8, cx + 9.5, 6.4, za + 0.12, 0, { bg: '#e2483d', fg: '#ffffff', glow: true });
    // anchor desk (curved)
    const deskG = new THREE.Group(); deskG.position.set(cx + 1, 0, cz - 1.4); S.add(deskG);
    const arc = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 1.1, 32, 1, true, -1.0, 2.0), m('smooth', 0x14182b));
    arc.material.side = THREE.DoubleSide;
    arc.position.y = 0.55; arc.castShadow = true; deskG.add(arc);
    const topM = new THREE.Mesh(new THREE.RingGeometry(3.4, 4.1, 32, 1, Math.PI / 2 - 1.0 + Math.PI, 2.0), m('marble', 0xffffff));
    topM.rotation.x = -Math.PI / 2; topM.position.y = 1.12; deskG.add(topM);
    const logo = sign(deskG, 'MINGALAR NEWS', 3.2, 0.6, 0, 0.6, -4.02, Math.PI, { bg: '#b3122e', fg: '#ffffff', glow: true });
    logo.position.set(0, 0.6, 4.02); logo.rotation.y = 0;
    W.solid(cx + 1 - 3.4, cx + 1 + 3.4, cz + 1.4, cz + 2.8, 0, 1.15);
    // anchors
    [-1.2, 1.2].forEach((dx, i) => {
      const av = buildAvatar(i ? { body: 'female', hair: 'long', hairColor: 0x14110f, shirt: 'jacket', shirtColor: 0xb3122e, pants: 'skirt', pantsColor: 0x14182b }
        : { body: 'male', hair: 'short', shirt: 'jacket', shirtColor: 0x1d2b6b, pants: 'jeans', pantsColor: 0x23262f, glasses: 'round' });
      av.root.position.set(cx + 1 + dx, 0, cz + 1.6);
      av.legL.rotation.x = av.legR.rotation.x = -1.4;
      av.body.position.y -= 0.75;
      av.armL.rotation.x = av.armR.rotation.x = -1;
      S.add(av.root);
    });
    // studio cameras on pedestals
    for (const [dx, dz] of [[-3, 7], [5, 7]]) {
      const x = cx + 1 + dx, z = cz + dz;
      cyl(S, 0.6, 0.2, x, 0, z, m('metal', 0x23262f), 12);
      cyl(S, 0.12, 1.4, x, 0.2, z, m('metal', 0x5d636e), 8);
      const cam = new THREE.Group(); cam.position.set(x, 1.6, z); cam.rotation.y = Math.atan2(cx + 1 - x, cz + 1 - z); S.add(cam);
      rbox(cam, 0.6, 0.55, 1, 0, 0, 0, m(0x23262f), 0.06);
      const lensM = cyl(cam, 0.2, 0.5, 0, 0.27, 0.7, m(0x111111), 14); lensM.rotation.x = Math.PI / 2; lensM.position.set(0, 0.27, 0.7);
      box(cam, 0.5, 0.35, 0.05, 0, 0.1, -0.53, new THREE.MeshBasicMaterial({ color: 0x3be8ff }));
      box(cam, 0.08, 0.08, 0.08, 0.2, 0.6, 0.3, neon(0xff3b30, 2));
      W.solid(x - 0.6, x + 0.6, z - 0.6, z + 0.6, 0, 2);
    }
    // lighting truss
    box(S, 14, 0.3, 0.3, cx + 1, H - 1, cz + 4, m('metal', 0x2a2d33));
    for (let i = 0; i < 5; i++) {
      const l = cyl(S, 0.22, 0.45, cx - 4 + i * 2.5, H - 1.5, cz + 4, m(0x23262f), 10);
      l.rotation.x = 0.6;
      cyl(S, 0.18, 0.02, cx - 4 + i * 2.5, H - 1.75, cz + 3.8, neon(0xfff4dc, 2), 10).rotation.x = 0.6;
    }
    let acc = 0, tt = 0;
    W.updaters.push((dt, t, p) => {
      tt += dt;
      if (Math.abs(p.x - X) > hw + 5) return; // only while someone is inside
      acc += dt;
      if (acc > 0.05) { acc = 0; drawNews(tt); }
    });
    W.zone('link:news', cx + 1, cz + 5.6, 4.4, 'Watch Mingalar News — mingalar.news');
    W.mapRect(cx - 10, cx + 12, za + 0.5, cz + 7, '#5a1422', 'News');
  }

  // ===================================== corner 3 (SE): GitHub developer
  {
    const cx = X + 19, cz = Z + 13;
    W.slab(cx - 10, cx + 12, cz - 7, zb - 0.5, 0.03, m('carpet', 0x161b22), 0.1);
    // contribution graph wall
    const graph = drawTexture(1024, 384, (g, w, hh) => {
      g.fillStyle = '#0d1117'; g.fillRect(0, 0, w, hh);
      g.fillStyle = '#e6edf3'; g.font = '700 40px Fredoka, Arial'; g.fillText('github.com/Tun-PS-Lin', 40, 64);
      g.font = '500 24px Fredoka, Arial'; g.fillStyle = '#8b949e'; g.fillText('contributions in the last year', 40, 104);
      const cols = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
      let s = 5;
      for (let wk = 0; wk < 52; wk++) for (let d = 0; d < 7; d++) {
        s = (s * 9301 + 49297) % 233280;
        const v = Math.min(4, Math.floor((s / 233280) * 5 + Math.sin(wk / 5) * 0.8));
        g.fillStyle = cols[Math.max(0, v)];
        g.beginPath(); g.roundRect(40 + wk * 18.4, 140 + d * 30, 15, 26, 3); g.fill();
      }
    });
    panel(S, graph, 12, 4.5, cx + 1, 3.6, zb - 0.06, Math.PI);
    sign(S, '</>', 2.2, 1.3, cx - 7.5, 5.8, zb - 0.1, Math.PI, { bg: null, fg: '#39d353', glow: true });
    sign(S, 'Tun-PS-Lin', 5, 0.9, cx + 9, 6.4, zb - 0.1, Math.PI, { bg: '#161b22', fg: '#ffffff', glow: true });
    // L desk with three monitors
    desk(cx + 1, cz + 1.5, Math.PI, ['code', 'desktop', 'code'], 0xe2483d);
    desk(cx + 6.2, cz + 1.5, Math.PI, ['game'], 0x23262f);
    const pc = P.pcTower(0x39d353); pc.position.set(cx - 1.4, 0, cz + 1.6); S.add(pc);
    // bookshelf
    const bx = xb - 0.6;
    box(S, 0.6, 4, 5, bx, 0, cz + 2, m('wood', 0x5a3b22));
    W.solid(bx - 0.4, bx + 0.4, cz - 0.5, cz + 4.5, 0, 4);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 9; j++) {
      const bh = 0.5 + ((i * 7 + j * 3) % 4) * 0.08;
      box(S, 0.45, bh, 0.38, bx - 0.15, 0.25 + i * 0.95, cz - 0.1 + j * 0.48, m([0xe2483d, 0x2e6fdb, 0xffc83d, 0x2fa37a, 0x8e5bd6, 0xf4f1ea][(i + j) % 6]));
    }
    // bean bags + rug
    for (const [dx, c] of [[-4, 0x39d353], [-1.5, 0x2e6fdb]]) { ball(S, 0.8, 0.5, 0.8, cx + dx, 0.45, cz - 3.5, m('fabric', c)); W.solid(cx + dx - 0.7, cx + dx + 0.7, cz - 4.2, cz - 2.8, 0, 0.8); }
    cyl(S, 2.4, 0.03, cx - 2.8, 0.03, cz - 3.5, m('carpet', 0x30363d), 24);
    W.zone('link:github', cx + 1, cz - 1.5, 4.4, 'Visit Tun-PS-Lin on GitHub');
    W.mapRect(cx - 10, cx + 12, cz - 7, zb - 0.5, '#161b22', 'GitHub');
  }

  // ======================================== SW: lounge and coffee bar
  {
    const cx = X - 18, cz = Z + 13;
    W.slab(cx - 11, cx + 9, cz - 6, zb - 0.5, 0.03, m('carpet', 0xd9cbb4), 0.1);
    for (const [dx, dz, r] of [[-4, 0, 0], [0, 4, -Math.PI / 2]]) {
      const g = new THREE.Group(); g.position.set(cx + dx, 0, cz + dz); g.rotation.y = r; S.add(g);
      rbox(g, 4, 0.5, 1.4, 0, 0.1, 0, m('fabric', 0x2e6fdb), 0.15);
      rbox(g, 4, 0.9, 0.35, 0, 0.3, -0.55, m('fabric', 0x2e6fdb), 0.15);
      W.solid(cx + dx - 2, cx + dx + 2, cz + dz - 0.9, cz + dz + 0.9, 0, 0.7);
    }
    cyl(S, 1.1, 0.45, cx, 0, cz, m('wood', 0xa9713f), 20);
    W.solid(cx - 1, cx + 1, cz - 1, cz + 1, 0, 0.45);
    // coffee bar
    W.block(8, 1.1, 1.4, cx - 2, 0, zb - 1.6, m('wood', 0x5a3b22));
    box(S, 8.2, 0.08, 1.6, cx - 2, 1.1, zb - 1.6, m('marble', 0xffffff));
    rbox(S, 0.6, 0.7, 0.5, cx - 4, 1.18, zb - 1.6, m('metal', 0xc0c4ca), 0.05);
    for (let i = 0; i < 4; i++) cyl(S, 0.06, 0.12, cx - 1 + i * 0.3, 1.18, zb - 1.5, m(0xffffff), 10);
    sign(S, 'COFFEE', 3, 0.8, cx - 2, 4.6, zb - 0.1, Math.PI, { bg: '#5a3b22', fg: '#ffe9c4', glow: true });
    palm(W, cx - 9, cz - 3, 0.6);
    W.mapRect(cx - 11, cx + 9, cz - 6, zb - 0.5, '#d9cbb4', 'Lounge');
  }
  // plants along the walkway
  for (const z of [Z - 18, Z + 18]) for (const x of [X - 4, X + 4]) {
    cyl(S, 0.6, 0.8, x, 0, z, m('smooth', 0xf4f1ea), 14);
    W.forest.y = 0.8; W.forest.bush(x, z, 0.8, 0x3f8f3a); W.forest.y = 0;
    W.solid(x - 0.6, x + 0.6, z - 0.6, z + 0.6, 0, 1);
  }
  W.endArea({ shadows: true });
}
