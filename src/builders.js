// Small helpers for building the blocky world out of boxes, cylinders and signs.
import * as THREE from 'three';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const cylCache = new Map();
const matCache = new Map();

/** Shared Lambert material per colour; pass opts to get a private one. */
export function mat(color, opts) {
  if (opts) return new THREE.MeshLambertMaterial({ color, ...opts });
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshLambertMaterial({ color }));
  return matCache.get(color);
}

/** Box whose (x, z) is its centre and y is its BASE. */
export function box(parent, w, h, d, x, y, z, color, opts) {
  const material = color && color.isMaterial ? color : mat(color, opts);
  const m = new THREE.Mesh(unitBox, material);
  m.scale.set(w, h, d);
  m.position.set(x, y + h / 2, z);
  const seeThrough = material.transparent;
  m.castShadow = !seeThrough;
  m.receiveShadow = !seeThrough;
  parent.add(m);
  return m;
}

/** Upright cylinder, y is its base. */
export function cyl(parent, r, h, x, y, z, color, seg = 16, opts) {
  const key = seg;
  if (!cylCache.has(key)) cylCache.set(key, new THREE.CylinderGeometry(1, 1, 1, seg));
  const material = color && color.isMaterial ? color : mat(color, opts);
  const m = new THREE.Mesh(cylCache.get(key), material);
  m.scale.set(r, h, r);
  m.position.set(x, y + h / 2, z);
  m.castShadow = !material.transparent;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** Canvas texture with centred (multi-line) text. */
export function textTexture(text, { w = 512, h = 128, bg = '#14182b', fg = '#ffffff', radius = 24, border = null } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (bg) {
    g.fillStyle = bg;
    g.beginPath();
    g.roundRect(0, 0, w, h, radius);
    g.fill();
  }
  if (border) {
    g.strokeStyle = border;
    g.lineWidth = Math.max(6, h * 0.05);
    g.beginPath();
    g.roundRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth, radius);
    g.stroke();
  }
  const lines = String(text).split('\n');
  let size = (h * 0.62) / lines.length;
  const font = (s) => `700 ${s}px Fredoka, "Trebuchet MS", Arial, sans-serif`;
  g.font = font(size);
  const widest = Math.max(...lines.map((l) => g.measureText(l).width));
  if (widest > w * 0.88) size *= (w * 0.88) / widest;
  g.font = font(size);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const lh = size * 1.12;
  lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * lh + size * 0.04));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const planeGeo = new THREE.PlaneGeometry(1, 1);

/**
 * Flat sign. rotY: 0 faces +z (south), Math.PI faces -z (north),
 * Math.PI/2 faces +x (east), -Math.PI/2 faces -x (west). y is the sign's centre.
 */
export function sign(parent, text, w, h, x, y, z, rotY = 0, opts = {}) {
  const px = 96;
  const tex = textTexture(text, {
    w: Math.min(1024, Math.round(w * px)),
    h: Math.min(512, Math.round(h * px)),
    ...opts,
  });
  const m = new THREE.Mesh(
    planeGeo,
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: opts.doubleSided ? THREE.DoubleSide : THREE.FrontSide })
  );
  m.scale.set(w, h, 1);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  parent.add(m);
  return m;
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
export function dampAngle(a, b, rate, dt) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * (1 - Math.exp(-rate * dt));
}

/** Tiny deterministic random so the scenery is the same on every load. */
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
