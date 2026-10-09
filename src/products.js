// 3D product models for the mall. Each returns a Group whose origin is at the
// bottom centre of the item, front facing +z. Everything here ends up baked
// into the static world, so plenty of small parts is fine.
import * as THREE from 'three';
import { box, rbox, cyl, ball, drawTexture } from './builders.js';
import { m, neon } from './gfx.js';

const G = () => new THREE.Group();
const metal = (c) => m('metal', c);
const shade = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();

function mesh(parent, geo, mat, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, mat);
  o.position.set(x, y, z);
  o.castShadow = true; o.receiveShadow = true;
  parent.add(o);
  return o;
}

// ---------------------------------------------------------------- screens
const screenCache = new Map();
/** Shared screen textures: 'desktop', 'code', 'photo', 'game', 'shop', 'music'. */
export function screenTex(kind) {
  if (screenCache.has(kind)) return screenCache.get(kind);
  const t = drawTexture(256, 160, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, h);
    const pal = {
      desktop: ['#2e6fdb', '#8e5bd6'], code: ['#0d1117', '#161b22'], photo: ['#ff9a5b', '#ff5b8a'],
      game: ['#14182b', '#3b3f73'], shop: ['#ffc83d', '#ff7a3d'], music: ['#1db978', '#0f6b47'], news: ['#b3122e', '#14182b'],
    }[kind] || ['#2e6fdb', '#5be2c0'];
    grad.addColorStop(0, pal[0]); grad.addColorStop(1, pal[1]);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    if (kind === 'code') {
      const cols = ['#ff7b72', '#79c0ff', '#d2a8ff', '#7ee787', '#e6edf3'];
      for (let i = 0; i < 14; i++) {
        let x = 10 + (i % 4) * 8;
        for (let j = 0; j < 4; j++) { const len = 10 + ((i * 7 + j * 13) % 40); g.fillStyle = cols[(i + j) % 5]; g.fillRect(x, 8 + i * 10.5, len, 5); x += len + 5; }
      }
    } else if (kind === 'photo') {
      g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(180, 50, 22, 0, 7); g.fill();
      g.fillStyle = '#2f8a46'; g.beginPath(); g.moveTo(0, 160); g.lineTo(80, 70); g.lineTo(150, 160); g.fill();
      g.fillStyle = '#3fa34d'; g.beginPath(); g.moveTo(90, 160); g.lineTo(170, 90); g.lineTo(256, 160); g.fill();
    } else if (kind === 'game') {
      g.fillStyle = '#5be28a'; g.fillRect(0, 130, w, 30);
      g.fillStyle = '#ffc83d'; g.fillRect(60, 100, 24, 30);
      g.fillStyle = '#e2483d'; g.fillRect(150, 80, 40, 18); g.fillRect(190, 112, 40, 18);
      g.fillStyle = '#fff'; g.font = '700 18px Arial'; g.fillText('SCORE 4200', 10, 22);
    } else if (kind === 'music') {
      g.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 24; i++) { const hh = 20 + Math.abs(Math.sin(i * 1.7)) * 80; g.fillRect(14 + i * 10, 140 - hh, 6, hh); }
    } else {
      // app icons
      const c = ['#ffffff', '#ffc83d', '#5be28a', '#ff5b8a', '#2bb3e6'];
      for (let i = 0; i < 12; i++) { g.fillStyle = c[i % 5]; g.globalAlpha = 0.85; g.beginPath(); g.roundRect(18 + (i % 6) * 38, 30 + Math.floor(i / 6) * 46, 26, 26, 6); g.fill(); }
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, h - 18, w, 18);
    }
  });
  screenCache.set(kind, t);
  return t;
}
const screenMat = (kind) => {
  const k = 'mat:' + kind;
  if (!screenCache.has(k)) screenCache.set(k, new THREE.MeshBasicMaterial({ map: screenTex(kind), toneMapped: false }));
  return screenCache.get(k);
};
const planeGeo = new THREE.PlaneGeometry(1, 1);
function screen(parent, kind, w, h, x, y, z, rx = 0) {
  const s = new THREE.Mesh(planeGeo, screenMat(kind));
  s.scale.set(w, h, 1);
  s.position.set(x, y, z);
  s.rotation.x = rx;
  parent.add(s);
  return s;
}

// ================================================================ FASHION
export function hanger(g, y) {
  const wire = metal(0xc9c9c9);
  box(g, 0.56, 0.03, 0.03, 0, y, 0, wire);
  cyl(g, 0.012, 0.12, 0, y, 0, wire, 4);
}

/** Shirt-like garment hanging from y = 0 down (origin at the hook). */
export function tshirt(color, { sleeves = 0.22, length = 0.72, hood = false, open = false, print = null } = {}) {
  const g = G();
  const c = m('fabric', color);
  hanger(g, -0.08);
  box(g, 0.6, length, 0.07, 0, -0.08 - length, 0, c);
  for (const s of [-1, 1]) {
    const sl = box(g, 0.2, sleeves + 0.08, 0.07, s * 0.36, -0.08 - sleeves - 0.12, 0, c);
    sl.rotation.z = s * 0.35;
  }
  box(g, 0.22, 0.05, 0.075, 0, -0.13, 0, m('fabric', shade(color, 0.75)));
  if (hood) rbox(g, 0.36, 0.26, 0.1, 0, -0.32, -0.04, m('fabric', shade(color, 0.85)), 0.06);
  if (open) box(g, 0.08, length - 0.05, 0.075, 0, -0.08 - length + 0.03, 0.002, m('fabric', 0xf4f1ea));
  if (print) box(g, 0.2, 0.16, 0.074, 0, -0.42, 0.001, m(print));
  return g;
}

export function pants(color, { shorts = false } = {}) {
  const g = G();
  const c = m('fabric', color);
  hanger(g, -0.08);
  const len = shorts ? 0.4 : 0.92;
  box(g, 0.48, 0.1, 0.07, 0, -0.2, 0, c);
  for (const s of [-1, 1]) {
    const l = box(g, 0.22, len, 0.07, s * 0.13, -0.2 - len, 0, c);
    l.rotation.z = s * 0.04;
  }
  return g;
}

export function dress(color) {
  const g = G();
  const c = m('fabric', color);
  hanger(g, -0.08);
  box(g, 0.4, 0.42, 0.07, 0, -0.52, 0, c);
  const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.42, 0.66, 14, 1), c);
  sk.scale.z = 0.25; sk.position.y = -0.85; sk.castShadow = true; g.add(sk);
  return g;
}

/** Folded garment stack (for tables). */
export function folded(colors) {
  const g = G();
  colors.forEach((c, i) => {
    rbox(g, 0.5, 0.09, 0.42, 0, i * 0.095, 0, m('fabric', c), 0.03);
  });
  return g;
}

export function handbag(color, style = 'tote') {
  const g = G();
  const c = m('smooth', color), trim = metal(0xd4af37);
  if (style === 'clutch') {
    rbox(g, 0.42, 0.22, 0.08, 0, 0, 0, c, 0.04);
    box(g, 0.42, 0.1, 0.085, 0, 0.12, 0, m('smooth', shade(color, 0.8)));
    box(g, 0.06, 0.04, 0.02, 0, 0.12, 0.045, trim);
  } else if (style === 'crossbody') {
    rbox(g, 0.32, 0.26, 0.12, 0, 0, 0, c, 0.06);
    box(g, 0.32, 0.12, 0.125, 0, 0.14, 0, m('smooth', shade(color, 0.8)));
    const strap = mesh(g, new THREE.TorusGeometry(0.28, 0.012, 4, 24, Math.PI), m(0x2a2420), 0, 0.26, 0);
    strap.scale.y = 1.4;
    box(g, 0.05, 0.05, 0.02, 0, 0.14, 0.065, trim);
  } else if (style === 'bucket') {
    cyl(g, 0.17, 0.32, 0, 0, 0, c, 16);
    mesh(g, new THREE.TorusGeometry(0.15, 0.015, 6, 16, Math.PI), m(0x2a2420), 0, 0.32, 0);
  } else {
    const body = rbox(g, 0.46, 0.34, 0.16, 0, 0, 0, c, 0.05);
    body.scale.x = 1;
    for (const s of [-1, 1]) mesh(g, new THREE.TorusGeometry(0.1, 0.015, 6, 14, Math.PI), m('smooth', shade(color, 0.7)), s * 0.12, 0.34, 0);
    box(g, 0.08, 0.05, 0.02, 0, 0.26, 0.085, trim);
  }
  return g;
}

export function backpack(color) {
  const g = G();
  const c = m('fabric', color);
  rbox(g, 0.42, 0.56, 0.22, 0, 0, 0, c, 0.1);
  rbox(g, 0.32, 0.2, 0.08, 0, 0.06, 0.13, m('fabric', shade(color, 0.8)), 0.04);
  mesh(g, new THREE.TorusGeometry(0.07, 0.015, 6, 12, Math.PI), m(0x23262f), 0, 0.56, 0);
  return g;
}

export function shoe(color, style = 'sneaker') {
  const g = G();
  const c = m('smooth', color);
  if (style === 'boot') {
    rbox(g, 0.16, 0.08, 0.34, 0, 0, 0, m(0x2a2420), 0.03);
    rbox(g, 0.15, 0.3, 0.15, 0, 0.06, -0.08, c, 0.04);
    rbox(g, 0.15, 0.12, 0.22, 0, 0.06, 0.05, c, 0.05);
  } else if (style === 'heel') {
    const sole = box(g, 0.12, 0.03, 0.3, 0, 0.1, 0, c); sole.rotation.x = -0.35;
    box(g, 0.03, 0.14, 0.03, 0, 0, -0.12, c);
    box(g, 0.12, 0.06, 0.1, 0, 0.03, 0.1, c);
  } else {
    rbox(g, 0.16, 0.05, 0.34, 0, 0, 0, m(0xffffff), 0.02);
    rbox(g, 0.15, 0.13, 0.3, 0, 0.04, -0.01, c, 0.05);
    box(g, 0.1, 0.02, 0.14, 0, 0.16, 0.04, m(0xffffff));
    box(g, 0.004, 0.04, 0.14, 0.077, 0.08, 0, m(shade(color, 0.6)));
  }
  return g;
}
/** A pair of shoes side by side. */
export function shoePair(color, style) {
  const g = G();
  const a = shoe(color, style); a.position.x = -0.1; g.add(a);
  const b = shoe(color, style); b.position.x = 0.1; g.add(b);
  return g;
}

export function cap(color) {
  const g = G();
  const c = m('fabric', color);
  mesh(g, new THREE.SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), c, 0, 0, 0);
  box(g, 0.22, 0.015, 0.14, 0, 0, 0.17, c);
  return g;
}
export function beanie(color) {
  const g = G();
  mesh(g, new THREE.SphereGeometry(0.15, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.7), m('fabric', color), 0, 0, 0).scale.y = 1.3;
  cyl(g, 0.155, 0.06, 0, 0, 0, m('fabric', shade(color, 0.75)), 16);
  ball(g, 0.05, 0.05, 0.05, 0, 0.21, 0, m('fabric', 0xf4f1ea));
  return g;
}
export function sunhat(color) {
  const g = G();
  cyl(g, 0.3, 0.015, 0, 0, 0, m('fabric', color), 20);
  cyl(g, 0.13, 0.12, 0, 0, 0, m('fabric', color), 16);
  cyl(g, 0.135, 0.03, 0, 0.01, 0, m(0x14182b), 16);
  return g;
}
export function sunglasses(color = 0x111111) {
  const g = G();
  for (const s of [-1, 1]) rbox(g, 0.1, 0.06, 0.012, s * 0.06, 0, 0, m('smooth', color), 0.01);
  box(g, 0.03, 0.01, 0.01, 0, 0.04, 0, m(0x333333));
  return g;
}
export function watch(face = 0x14182b, band = 0x2a2420) {
  const g = G();
  const t = mesh(g, new THREE.TorusGeometry(0.06, 0.018, 6, 16), m('smooth', band), 0, 0.06, 0);
  t.rotation.y = Math.PI / 2;
  cyl(g, 0.035, 0.02, 0.07, 0.04, 0, metal(0xd8dde3), 14).rotation.z = Math.PI / 2;
  return g;
}

export function rack(parent, x, z, rot, len, items) {
  // clothes rail with garments hung along it
  const g = G();
  g.position.set(x, 0, z); g.rotation.y = rot;
  parent.add(g);
  const chrome = metal(0xd8dde3);
  for (const s of [-1, 1]) {
    cyl(g, 0.04, 1.75, s * len / 2, 0, 0, chrome, 6);
    box(g, 0.6, 0.04, 0.04, s * len / 2, 0.02, 0, chrome).rotation.y = Math.PI / 2;
  }
  const rail = cyl(g, 0.025, len, 0, 1.75, 0, chrome, 6);
  rail.rotation.z = Math.PI / 2; rail.position.y = 1.75;
  items.forEach((it, i) => {
    const o = it();
    o.position.set(-len / 2 + 0.35 + (i * (len - 0.7)) / Math.max(1, items.length - 1), 1.78, 0);
    o.rotation.y = Math.PI / 2 - 0.2;
    g.add(o);
  });
  return g;
}

// ================================================================== TECH
export function laptop(kind = 'desktop', color = 0xb8bec6) {
  const g = G();
  const shell = metal(color);
  rbox(g, 0.62, 0.03, 0.42, 0, 0, 0, shell, 0.012);
  box(g, 0.54, 0.005, 0.2, 0, 0.03, -0.04, m(0x23262f));
  box(g, 0.18, 0.003, 0.11, 0, 0.03, 0.12, m(0x9aa0a8));
  const lid = G();
  lid.position.set(0, 0.03, -0.21);
  lid.rotation.x = -0.32;
  g.add(lid);
  rbox(lid, 0.62, 0.4, 0.02, 0, 0, 0, shell, 0.01);
  screen(lid, kind, 0.56, 0.34, 0, 0.2, 0.012);
  return g;
}
export function phone(color = 0x23262f, kind = 'desktop') {
  const g = G();
  rbox(g, 0.09, 0.18, 0.012, 0, 0, 0, m('smooth', color), 0.012);
  screen(g, kind, 0.08, 0.165, 0, 0.09, 0.007);
  return g;
}
export function tablet(color = 0xb8bec6, kind = 'photo') {
  const g = G();
  rbox(g, 0.28, 0.2, 0.012, 0, 0, 0, metal(color), 0.012);
  screen(g, kind, 0.26, 0.18, 0, 0.1, 0.007);
  return g;
}
/** Phone/tablet on a little acrylic stand. */
export function onStand(item) {
  const g = G();
  box(g, 0.14, 0.02, 0.12, 0, 0, 0, m('smooth', 0xf4f4f4));
  item.position.y = 0.02; item.rotation.x = -0.25; g.add(item);
  return g;
}
export function monitor(kind = 'desktop', w = 0.8) {
  const g = G();
  box(g, 0.28, 0.02, 0.2, 0, 0, 0, m(0x23262f));
  box(g, 0.05, 0.3, 0.04, 0, 0.02, -0.04, m(0x23262f));
  rbox(g, w, w * 0.56, 0.03, 0, 0.22, 0, m(0x16181d), 0.01);
  screen(g, kind, w - 0.04, w * 0.56 - 0.04, 0, 0.22 + w * 0.28, 0.017);
  return g;
}
export function pcTower(glow = 0x8e5bd6) {
  const g = G();
  rbox(g, 0.24, 0.5, 0.48, 0, 0, 0, m(0x16181d), 0.02);
  box(g, 0.005, 0.42, 0.4, 0.122, 0.04, 0, new THREE.MeshStandardMaterial({ color: 0x223, transparent: true, opacity: 0.5, roughness: 0.05 }));
  for (let i = 0; i < 3; i++) {
    const f = mesh(g, new THREE.TorusGeometry(0.055, 0.008, 6, 16), neon(glow, 2), 0.09, 0.12 + i * 0.13, 0.18);
    f.rotation.y = Math.PI / 2;
  }
  box(g, 0.004, 0.3, 0.02, 0.121, 0.1, -0.15, neon(glow, 2));
  return g;
}
export function keyboard() {
  const g = G();
  rbox(g, 0.44, 0.025, 0.14, 0, 0, 0, m(0x23262f), 0.01);
  for (let r = 0; r < 4; r++) box(g, 0.4, 0.008, 0.024, 0, 0.025, -0.045 + r * 0.03, neon([0xff5b8a, 0x8e5bd6, 0x2bb3e6, 0x5be28a][r], 0.6));
  ball(g, 0.03, 0.018, 0.05, 0.3, 0.018, 0, m(0x23262f));
  return g;
}
export function dslr(color = 0x1d1f24) {
  const g = G();
  const c = m('smooth', color);
  rbox(g, 0.26, 0.17, 0.09, 0, 0, 0, c, 0.02);
  rbox(g, 0.07, 0.18, 0.1, -0.11, 0, 0.01, m(0x2a2a2a), 0.03);
  box(g, 0.09, 0.05, 0.07, 0.01, 0.17, 0, c);
  const lens = cyl(g, 0.055, 0.14, 0.03, 0.085, 0.045, m(0x1a1a1a), 16); lens.rotation.x = Math.PI / 2; lens.position.set(0.03, 0.085, 0.11);
  const ring = cyl(g, 0.058, 0.02, 0.03, 0.085, 0.13, m(0xe2483d), 16); ring.rotation.x = Math.PI / 2; ring.position.set(0.03, 0.085, 0.13);
  const glassL = cyl(g, 0.045, 0.005, 0, 0, 0, new THREE.MeshStandardMaterial({ color: 0x1a2a44, roughness: 0, metalness: 1 }), 16); glassL.rotation.x = Math.PI / 2; glassL.position.set(0.03, 0.085, 0.182);
  return g;
}
export function actionCam() {
  const g = G();
  rbox(g, 0.1, 0.08, 0.06, 0, 0, 0, m(0x23262f), 0.012);
  const l = cyl(g, 0.022, 0.02, 0, 0, 0, m(0x111111), 12); l.rotation.x = Math.PI / 2; l.position.set(0.02, 0.045, 0.035);
  box(g, 0.03, 0.012, 0.02, -0.025, 0.08, 0, m(0xe2483d));
  return g;
}
export function lens(len = 0.22) {
  const g = G();
  const b = cyl(g, 0.05, len, 0, 0, 0, m(0x1a1a1a), 16);
  cyl(g, 0.052, 0.015, 0, len * 0.65, 0, m(0xe2483d), 16);
  cyl(g, 0.054, 0.04, 0, len * 0.3, 0, m(0x333333), 16);
  b.castShadow = true;
  return g;
}
function woofer(g, r, x, y, z) {
  const cone = cyl(g, r, 0.02, x, y, z, m(0x2a2a2a), 18); cone.rotation.x = Math.PI / 2; cone.position.set(x, y, z);
  const rim = mesh(g, new THREE.TorusGeometry(r, r * 0.08, 6, 20), metal(0x9aa0a8), x, y, z + 0.005);
  const dust = ball(g, r * 0.3, r * 0.3, r * 0.15, x, y, z + 0.01, m(0x1a1a1a));
  return [cone, rim, dust];
}
export function towerSpeaker(color = 0x2a2420) {
  const g = G();
  rbox(g, 0.32, 1.1, 0.36, 0, 0.05, 0, m('wood', color), 0.02);
  box(g, 0.36, 0.05, 0.4, 0, 0, 0, m(0x16181d));
  woofer(g, 0.06, 0, 1.0, 0.185);
  woofer(g, 0.11, 0, 0.75, 0.185);
  woofer(g, 0.11, 0, 0.45, 0.185);
  return g;
}
export function bookshelfSpeaker(color = 0xf4f1ea) {
  const g = G();
  rbox(g, 0.22, 0.34, 0.24, 0, 0, 0, m('smooth', color), 0.02);
  woofer(g, 0.035, 0, 0.27, 0.125);
  woofer(g, 0.08, 0, 0.12, 0.125);
  return g;
}
export function portableSpeaker(color = 0xe2483d) {
  const g = G();
  const b = cyl(g, 0.09, 0.26, 0, 0.09, 0, m('fabric', color), 18); b.rotation.z = Math.PI / 2; b.position.y = 0.09;
  for (const s of [-1, 1]) { const e = cyl(g, 0.092, 0.02, 0, 0, 0, m(0x23262f), 18); e.rotation.z = Math.PI / 2; e.position.set(s * 0.13, 0.09, 0); }
  box(g, 0.08, 0.01, 0.03, 0, 0.18, 0, m(0x23262f));
  return g;
}
export function smartSpeaker(color = 0x8b919c) {
  const g = G();
  cyl(g, 0.08, 0.16, 0, 0, 0, m('fabric', color), 20);
  cyl(g, 0.072, 0.012, 0, 0.16, 0, neon(0x2bb3e6, 1.8), 20);
  return g;
}
export function soundbar() {
  const g = G();
  rbox(g, 0.95, 0.08, 0.1, 0, 0, 0, m('fabric', 0x23262f), 0.03);
  box(g, 0.04, 0.006, 0.02, 0.4, 0.08, 0.03, neon(0xffffff, 1.4));
  return g;
}
export function headphones(color = 0x23262f) {
  const g = G();
  const c = m('smooth', color);
  const band = mesh(g, new THREE.TorusGeometry(0.11, 0.012, 6, 20, Math.PI), c, 0, 0.12, 0);
  for (const s of [-1, 1]) { const cup = rbox(g, 0.04, 0.11, 0.09, s * 0.11, 0.06, 0, c, 0.02); cup.castShadow = true; }
  band.castShadow = true;
  return g;
}
export function headphoneStand(color) {
  const g = G();
  cyl(g, 0.08, 0.02, 0, 0, 0, metal(0x9aa0a8), 14);
  cyl(g, 0.012, 0.32, 0, 0.02, 0, metal(0x9aa0a8), 6);
  const h = headphones(color); h.position.y = 0.22; g.add(h);
  return g;
}
export function tv(kind = 'game', w = 2.2) {
  const g = G();
  rbox(g, w, w * 0.57, 0.05, 0, 0, 0, m(0x111214), 0.015);
  screen(g, kind, w - 0.06, w * 0.57 - 0.06, 0, w * 0.285, 0.027);
  return g;
}
export function consoleBox(color = 0xf4f1ea) {
  const g = G();
  rbox(g, 0.1, 0.38, 0.3, 0, 0, 0, m('smooth', color), 0.03);
  rbox(g, 0.12, 0.02, 0.26, 0, 0, 0, m(0x23262f), 0.01);
  box(g, 0.002, 0.3, 0.004, 0.051, 0.04, 0.1, neon(0x2bb3e6, 1.5));
  return g;
}
export function controller(color = 0x23262f) {
  const g = G();
  const c = m('smooth', color);
  rbox(g, 0.16, 0.04, 0.09, 0, 0, 0, c, 0.018);
  for (const s of [-1, 1]) ball(g, 0.035, 0.022, 0.05, s * 0.07, 0.015, -0.03, c);
  for (const s of [-1, 1]) cyl(g, 0.012, 0.02, s * 0.035, 0.04, 0.01, m(0x111111), 8);
  return g;
}
export function drone() {
  const g = G();
  rbox(g, 0.18, 0.06, 0.24, 0, 0.04, 0, m('smooth', 0xd8dde3), 0.025);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const arm = box(g, 0.2, 0.02, 0.02, sx * 0.12, 0.07, sz * 0.12, m(0x5d636e));
    arm.rotation.y = sx * sz * -0.78;
    cyl(g, 0.012, 0.03, sx * 0.19, 0.07, sz * 0.19, m(0x23262f), 8);
    cyl(g, 0.08, 0.004, sx * 0.19, 0.1, sz * 0.19, new THREE.MeshStandardMaterial({ color: 0x222222, transparent: true, opacity: 0.4 }), 16);
  }
  for (const s of [-1, 1]) box(g, 0.012, 0.04, 0.2, s * 0.06, 0, 0, m(0x5d636e));
  const camG = ball(g, 0.03, 0.03, 0.03, 0, 0.02, 0.12, m(0x111111));
  camG.castShadow = false;
  return g;
}
export function smartwatch(band = 0xff5b8a) {
  const g = G();
  const t = mesh(g, new THREE.TorusGeometry(0.06, 0.016, 6, 16), m('smooth', band), 0, 0.06, 0);
  t.rotation.y = Math.PI / 2;
  const face = rbox(g, 0.02, 0.07, 0.06, 0.07, 0.025, 0, m(0x111111), 0.008);
  screen(g, 'music', 0.05, 0.055, 0.081, 0.06, 0).rotation.y = Math.PI / 2;
  face.castShadow = true;
  return g;
}
export function vrHeadset() {
  const g = G();
  rbox(g, 0.24, 0.13, 0.12, 0, 0, 0, m('smooth', 0xf4f1ea), 0.04);
  box(g, 0.22, 0.1, 0.01, 0, 0.015, 0.062, m(0x16181d));
  const strap = mesh(g, new THREE.TorusGeometry(0.12, 0.012, 4, 16, Math.PI), m(0x5d636e), 0, 0.065, -0.06);
  strap.rotation.x = Math.PI / 2;
  return g;
}

/** Glass display cube on a white plinth with an item inside. */
export function plinth(parent, x, z, item, h = 1, w = 0.7) {
  const g = G();
  g.position.set(x, 0, z);
  parent.add(g);
  rbox(g, w, h, w, 0, 0, 0, m('smooth', 0xf7f7f7), 0.03);
  box(g, w + 0.04, 0.03, w + 0.04, 0, h, 0, metal(0xd4af37));
  item.position.y = h + 0.03;
  g.add(item);
  return g;
}
