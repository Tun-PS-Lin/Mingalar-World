// Small helpers for building the world out of parts: boxes, cylinders, spheres and signs.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { m } from './gfx.js';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const cylCache = new Map();
const sphereGeo = new THREE.SphereGeometry(1, 20, 14);
const rboxCache = new Map();

const asMat = (c) => (c && c.isMaterial ? c : m(c));

function finish(parent, mesh, material) {
  const see = material.transparent;
  mesh.castShadow = !see;
  mesh.receiveShadow = !see;
  parent.add(mesh);
  return mesh;
}

/** Box whose (x, z) is its centre and y is its BASE. `color` may be a hex or a material. */
export function box(parent, w, h, d, x, y, z, color) {
  const material = asMat(color);
  const mesh = new THREE.Mesh(unitBox, material);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y + h / 2, z);
  return finish(parent, mesh, material);
}

/** Box with rounded edges (real geometry, cached by size). Centre at (x, y + h/2, z). */
export function rbox(parent, w, h, d, x, y, z, color, r = 0.08) {
  const key = `${w}|${h}|${d}|${r}`;
  if (!rboxCache.has(key)) rboxCache.set(key, new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2) * 0.999));
  const material = asMat(color);
  const mesh = new THREE.Mesh(rboxCache.get(key), material);
  mesh.position.set(x, y + h / 2, z);
  return finish(parent, mesh, material);
}

function cylGeo(seg, top = 1) {
  const key = seg + ':' + top;
  if (!cylCache.has(key)) cylCache.set(key, new THREE.CylinderGeometry(top, 1, 1, seg));
  return cylCache.get(key);
}

/** Upright cylinder, y is its base. */
export function cyl(parent, r, h, x, y, z, color, seg = 16) {
  const material = asMat(color);
  const mesh = new THREE.Mesh(cylGeo(seg), material);
  mesh.scale.set(r, h, r);
  mesh.position.set(x, y + h / 2, z);
  return finish(parent, mesh, material);
}

/** Cone / tapered cylinder (top radius = r * taper). */
export function cone(parent, r, h, x, y, z, color, seg = 12, taper = 0) {
  const material = asMat(color);
  const mesh = new THREE.Mesh(cylGeo(seg, taper), material);
  mesh.scale.set(r, h, r);
  mesh.position.set(x, y + h / 2, z);
  return finish(parent, mesh, material);
}

/** Ellipsoid centred at (x, y, z). */
export function ball(parent, rx, ry, rz, x, y, z, color) {
  const material = asMat(color);
  const mesh = new THREE.Mesh(sphereGeo, material);
  mesh.scale.set(rx, ry, rz);
  mesh.position.set(x, y, z);
  return finish(parent, mesh, material);
}

/** Canvas texture with centred (multi-line) text. */
export function textTexture(text, { w = 512, h = 128, bg = '#14182b', fg = '#ffffff', radius = 24, border = null, font = 'Fredoka', weight = 700 } = {}) {
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
  const f = (s) => `${weight} ${s}px ${font}, "Trebuchet MS", Arial, sans-serif`;
  g.font = f(size);
  const widest = Math.max(...lines.map((l) => g.measureText(l).width));
  if (widest > w * 0.88) size *= (w * 0.88) / widest;
  g.font = f(size);
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
 * opts.glow makes it self-lit (neon signs).
 */
const signCache = new Map();
export function sign(parent, text, w, h, x, y, z, rotY = 0, opts = {}) {
  // identical signs share a material, so the static batcher can merge them
  const key = JSON.stringify([text, w, h, opts]);
  if (!signCache.has(key)) {
    const px = opts.px || 96;
    const tex = textTexture(text, {
      w: Math.min(2048, Math.round(w * px)),
      h: Math.min(1024, Math.round(h * px)),
      ...opts,
    });
    signCache.set(key, new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: opts.doubleSided ? THREE.DoubleSide : THREE.FrontSide, toneMapped: !opts.glow }));
  }
  const mesh = new THREE.Mesh(planeGeo, signCache.get(key));
  mesh.scale.set(w, h, 1);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  parent.add(mesh);
  return mesh;
}

/** Flat textured panel (posters, screens). `tex` is a texture; y is the centre. */
export function panel(parent, tex, w, h, x, y, z, rotY = 0, { glow = true, side = THREE.FrontSide } = {}) {
  const mesh = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ map: tex, side, toneMapped: !glow }));
  mesh.scale.set(w, h, 1);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  parent.add(mesh);
  return mesh;
}

/** Canvas texture drawn by a callback (screens, posters). */
export function drawTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
export function dampAngle(a, b, rate, dt) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * (1 - Math.exp(-rate * dt));
}
export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** Tiny deterministic random so the scenery is the same on every load. */
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const hex = (n) => '#' + n.toString(16).padStart(6, '0');
