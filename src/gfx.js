// Look and feel: Roblox-style material library (smooth plastic, brick, concrete,
// grass, asphalt, wood, metal, neon, glass), procedural textures mapped in world
// space, sky dome, and a static batcher that merges thousands of parts into a
// few dozen draw calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ------------------------------------------------------------------ textures
const texCache = new Map();

function canvasTex(size, draw, { repeat = true } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Deterministic hash noise. */
function rand(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Speckle a canvas with light/dark dots (keeps everything near-white so colour tints it). */
function speckle(g, n, size, count, lo, hi, r = 1.6) {
  const rnd = rand(n);
  for (let i = 0; i < count; i++) {
    const v = Math.round(lo + rnd() * (hi - lo));
    g.fillStyle = `rgb(${v},${v},${v})`;
    const s = 0.6 + rnd() * r;
    g.fillRect(rnd() * size, rnd() * size, s, s);
  }
}

const TEX = {
  plastic: (g, s) => { g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, s, s); speckle(g, 1, s, 900, 228, 255, 1.2); },
  grass: (g, s) => {
    g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, s, s);
    const rnd = rand(4);
    for (let i = 0; i < 2600; i++) {
      const v = Math.round(190 + rnd() * 65);
      g.strokeStyle = `rgb(${v},${v},${v})`;
      g.lineWidth = 1 + rnd();
      const x = rnd() * s, y = rnd() * s;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 3, y - 3 - rnd() * 5); g.stroke();
    }
    // soft patches
    for (let i = 0; i < 18; i++) {
      const x = rnd() * s, y = rnd() * s, r = 20 + rnd() * 40;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  },
  asphalt: (g, s) => { g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, s, s); speckle(g, 2, s, 5000, 150, 255, 1.4); },
  concrete: (g, s) => {
    g.fillStyle = '#efefef'; g.fillRect(0, 0, s, s);
    speckle(g, 3, s, 2200, 205, 255, 1.2);
    g.strokeStyle = 'rgba(120,120,120,0.55)'; g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, s - 3, s - 3);
  },
  tiles: (g, s) => {
    g.fillStyle = '#f7f7f7'; g.fillRect(0, 0, s, s);
    speckle(g, 5, s, 700, 230, 255, 1);
    g.strokeStyle = 'rgba(150,150,150,0.6)'; g.lineWidth = 2;
    for (let i = 0; i <= 2; i++) {
      g.beginPath(); g.moveTo(i * s / 2, 0); g.lineTo(i * s / 2, s); g.stroke();
      g.beginPath(); g.moveTo(0, i * s / 2); g.lineTo(s, i * s / 2); g.stroke();
    }
  },
  marble: (g, s) => {
    g.fillStyle = '#fbfbfb'; g.fillRect(0, 0, s, s);
    const rnd = rand(9);
    g.strokeStyle = 'rgba(160,160,170,0.35)';
    for (let i = 0; i < 9; i++) {
      g.lineWidth = 0.6 + rnd() * 1.6;
      g.beginPath();
      let x = rnd() * s, y = 0;
      g.moveTo(x, y);
      while (y < s) { x += (rnd() - 0.5) * 30; y += 10 + rnd() * 20; g.lineTo(x, y); }
      g.stroke();
    }
    g.strokeStyle = 'rgba(140,140,140,0.5)'; g.lineWidth = 2; g.strokeRect(1, 1, s - 2, s - 2);
  },
  brick: (g, s) => {
    g.fillStyle = '#c9c9c9'; g.fillRect(0, 0, s, s);
    const rows = 8, h = s / rows, w = s / 4, rnd = rand(6);
    for (let r = 0; r < rows; r++) {
      for (let c = -1; c < 5; c++) {
        const x = c * w + (r % 2 ? w / 2 : 0);
        const v = Math.round(215 + rnd() * 40);
        g.fillStyle = `rgb(${v},${v},${v})`;
        g.fillRect(x + 3, r * h + 3, w - 6, h - 6);
      }
    }
    speckle(g, 7, s, 1200, 170, 255, 1.2);
  },
  wood: (g, s) => {
    g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, s, s);
    const rnd = rand(8), planks = 4, pw = s / planks;
    for (let p = 0; p < planks; p++) {
      const v = Math.round(205 + rnd() * 50);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(p * pw, 0, pw, s);
      g.strokeStyle = 'rgba(120,120,120,0.25)';
      for (let i = 0; i < 7; i++) {
        g.lineWidth = 0.5 + rnd();
        const x = p * pw + rnd() * pw;
        g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, s * 0.3, x - 6, s * 0.6, x + 2, s); g.stroke();
      }
      g.fillStyle = 'rgba(90,90,90,0.6)'; g.fillRect(p * pw, 0, 2, s);
      const cut = rnd() * s;
      g.fillRect(p * pw, cut, pw, 2);
    }
  },
  metal: (g, s) => {
    g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, s, s);
    const rnd = rand(10);
    for (let i = 0; i < 400; i++) {
      const v = Math.round(200 + rnd() * 55);
      g.strokeStyle = `rgba(${v},${v},${v},0.7)`;
      const y = rnd() * s;
      g.beginPath(); g.moveTo(0, y); g.lineTo(s, y + (rnd() - 0.5) * 2); g.stroke();
    }
  },
  fabric: (g, s) => {
    g.fillStyle = '#eeeeee'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 4) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(0, y, s, 2); }
    for (let x = 0; x < s; x += 4) { g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x, 0, 2, s); }
    speckle(g, 11, s, 900, 210, 255, 1);
  },
  slate: (g, s) => { // roof shingles
    g.fillStyle = '#dcdcdc'; g.fillRect(0, 0, s, s);
    const rows = 6, h = s / rows, rnd = rand(12);
    for (let r = 0; r < rows; r++) for (let c = -1; c < 7; c++) {
      const v = Math.round(190 + rnd() * 60);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(c * s / 6 + (r % 2 ? s / 12 : 0) + 2, r * h + 2, s / 6 - 4, h - 3);
    }
  },
  window: (g, s) => { // curtain-wall glazing, 2x2 panes per tile
    const gr = g.createLinearGradient(0, 0, s, s);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#c9d4dc'); gr.addColorStop(0.55, '#eef4f8'); gr.addColorStop(1, '#b8c4cc');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    g.fillStyle = '#5c636b';
    g.fillRect(0, 0, s, 8); g.fillRect(0, s / 2 - 3, s, 6);
    g.fillRect(0, 0, 8, s); g.fillRect(s / 2 - 3, 0, 6, s);
  },
  cobble: (g, s) => {
    g.fillStyle = '#a9a9a9'; g.fillRect(0, 0, s, s);
    const rnd = rand(13), n = 8, c = s / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = Math.round(200 + rnd() * 55);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.beginPath(); g.roundRect(x * c + 2 + (y % 2) * c / 2, y * c + 2, c - 4, c - 4, 6); g.fill();
      g.beginPath(); g.roundRect(x * c + 2 + (y % 2) * c / 2 - s, y * c + 2, c - 4, c - 4, 6); g.fill();
    }
  },
  carpet: (g, s) => { g.fillStyle = '#e9e9e9'; g.fillRect(0, 0, s, s); speckle(g, 14, s, 6000, 200, 255, 1); },
};

export function texture(kind) {
  if (!texCache.has(kind)) texCache.set(kind, canvasTex(256, TEX[kind]));
  return texCache.get(kind);
}

// --------------------------------------------------- world-space UV mapping
// Every textured surface samples its texture by world position, so a 40 m wall
// and a 1 m planter share the same brick size and can be merged freely.
function worldMapped(material, scale) {
  material.userData.worldScale = scale;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWorldScale = { value: 1 / scale };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWorldScale;\nvarying vec2 vWuv;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 wPos = modelMatrix * vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wPos = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
        #endif
        vec3 wN = abs(normalize(mat3(modelMatrix) * objectNormal));
        vWuv = (wN.y > 0.6 ? wPos.xz : (wN.x > wN.z ? wPos.zy : wPos.xy)) * uWorldScale;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vWuv;')
      .replace('#include <map_fragment>', `#ifdef USE_MAP
        diffuseColor *= texture2D(map, vWuv);
      #endif`);
  };
  material.customProgramCacheKey = () => 'wmap';
  return material;
}

// ----------------------------------------------------------------- materials
// kind -> [texture, world size of one tile (m), roughness, metalness]
const KINDS = {
  plastic: [null, 4, 0.55, 0],
  smooth: [null, 4, 0.4, 0],
  grass: ['grass', 6, 0.95, 0],
  asphalt: ['asphalt', 5, 0.9, 0],
  concrete: ['concrete', 2.5, 0.85, 0],
  tiles: ['tiles', 2, 0.35, 0],
  marble: ['marble', 3, 0.25, 0],
  brick: ['brick', 2.4, 0.9, 0],
  wood: ['wood', 3, 0.7, 0],
  metal: ['metal', 2, 0.35, 0.65],
  fabric: ['fabric', 1, 0.95, 0],
  slate: ['slate', 3, 0.8, 0],
  window: ['window', 4, 0.12, 0.45],
  cobble: ['cobble', 3, 0.85, 0],
  carpet: ['carpet', 2, 1, 0],
};
const matCache = new Map();

/**
 * Shared material. `m('brick', 0xb5573b)`; `m(0xff0000)` is plain plastic.
 * Extra opts (emissive, transparent...) create a private material.
 */
export function m(kind, color, opts) {
  if (typeof kind === 'number') { opts = color; color = kind; kind = 'plastic'; }
  const key = kind + ':' + color;
  if (!opts && matCache.has(key)) return matCache.get(key);
  const [tex, scale, roughness, metalness] = KINDS[kind];
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...(opts || {}) });
  if (tex) { mat.map = texture(tex); worldMapped(mat, scale); }
  if (!opts) { matCache.set(key, mat); mat.userData.vc = kind; }
  return mat;
}

/** Glowing part (Roblox "Neon"). */
export function neon(color, intensity = 1.6) {
  const key = 'neon:' + color + ':' + intensity;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 }));
  return matCache.get(key);
}

/** Reflective glass. */
export function glass(color = 0x9fd8ff, opacity = 0.35) {
  const key = 'glass:' + color + ':' + opacity;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({
      color, roughness: 0.05, metalness: 0.6, transparent: true, opacity, depthWrite: false,
    }));
  }
  return matCache.get(key);
}

// -------------------------------------------------------------------- sky
export function buildSky(scene) {
  const geo = new THREE.SphereGeometry(1400, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(0x2f8fff) },
      mid: { value: new THREE.Color(0x8fd0ff) },
      bottom: { value: new THREE.Color(0xdff2ff) },
      sunDir: { value: new THREE.Vector3(0.5, 0.75, -0.35).normalize() },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform vec3 sunDir; varying vec3 vDir;
      void main(){
        float h = vDir.y;
        vec3 c = h > 0.0 ? mix(mid, top, pow(clamp(h, 0.0, 1.0), 0.6)) : bottom;
        c = mix(bottom, c, smoothstep(-0.02, 0.12, h));
        float s = max(dot(normalize(vDir), sunDir), 0.0);
        c += vec3(1.0, 0.95, 0.8) * (pow(s, 600.0) * 2.0 + pow(s, 12.0) * 0.18);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);
  return sky;
}

/** Puffy cartoon clouds drifting slowly. */
export function buildClouds(scene, rnd) {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xc8d8e8, emissiveIntensity: 0.55, fog: false });
  const n = 26, puffs = 6;
  const inst = new THREE.InstancedMesh(geo, mat, n * puffs);
  const clouds = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const c = { x: (rnd() - 0.5) * 1400, y: 120 + rnd() * 70, z: (rnd() - 0.5) * 1400, parts: [] };
    for (let j = 0; j < puffs; j++) {
      const r = 10 + rnd() * 12;
      c.parts.push({ dx: (j - puffs / 2) * 11 + rnd() * 6, dy: rnd() * 6, dz: (rnd() - 0.5) * 14, r, sy: r * 0.62 });
    }
    clouds.push(c);
  }
  const write = () => {
    let k = 0;
    for (const c of clouds) for (const pt of c.parts) {
      p.set(c.x + pt.dx, c.y + pt.dy, c.z + pt.dz); s.set(pt.r, pt.sy, pt.r);
      inst.setMatrixAt(k++, m4.compose(p, q, s));
    }
    inst.instanceMatrix.needsUpdate = true;
  };
  write();
  inst.frustumCulled = false;
  scene.add(inst);
  let acc = 0;
  return (dt) => {
    acc += dt;
    if (acc < 0.1) return; // clouds barely move; update ten times a second
    for (const c of clouds) { c.x += acc * 2.5; if (c.x > 760) c.x = -760; }
    acc = 0;
    write();
  };
}

// ------------------------------------------------------------ static batching
// Materials tagged with userData.vc ("vertex-colour class") differ only by
// colour, so their meshes can share ONE material with the colour baked into a
// vertex attribute. That collapses hundreds of colours into a few draw calls.
const CHUNK = 320;
const vcCache = new Map();

/** Tag a material as mergeable with others of the same class. */
export function mergeable(mat, cls) { mat.userData.vc = cls; return mat; }

function vcMaterial(src) {
  const cls = src.userData.vc;
  if (vcCache.has(cls)) return vcCache.get(cls);
  const mat = src.clone();
  mat.vertexColors = true;
  mat.color.set(0xffffff);
  mat.userData = { shared: true };
  if (src.userData.worldScale) worldMapped(mat, src.userData.worldScale);
  vcCache.set(cls, mat);
  return mat;
}

/** Prepare one mesh's geometry for merging (transformed, trimmed, optional colour). */
function prep(o, matrix, vc) {
  let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
  // already-merged meshes carry their colours per vertex: keep them
  const keep = o.material.vertexColors ? ['position', 'normal', 'uv', 'color'] : ['position', 'normal', 'uv'];
  for (const k of Object.keys(geo.attributes)) if (!keep.includes(k)) geo.deleteAttribute(k);
  geo.morphAttributes = {};
  geo.applyMatrix4(matrix);
  geo.clearGroups();
  if (vc) {
    const c = o.material.color, n = geo.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  }
  return geo;
}

function mergeBuckets(buckets, parent, matrixAuto = true) {
  let count = 0;
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geos, false);
    for (const g of b.geos) g.dispose();
    if (!merged) continue;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, b.material);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = true;
    mesh.renderOrder = b.order || 0;
    mesh.userData.merged = true;
    mesh.userData.cls = b.cls;
    if (!matrixAuto) { mesh.matrixAutoUpdate = false; mesh.updateMatrix(); }
    parent.add(mesh);
    count++;
  }
  return count;
}

const mergeableMesh = (o) => o.isMesh && !o.isInstancedMesh && !Array.isArray(o.material) && o.geometry.attributes.uv && o.visible;

/**
 * Merge every mesh under `group` into a few big meshes (one per material class
 * per spatial chunk) so the GPU gets dozens of draw calls instead of thousands.
 * Meshes flagged userData.keep stay as they are. `group` must sit at the origin.
 */
export function bakeStatic(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  const remove = [];
  const visit = (o) => {
    if (o !== group && o.userData.area) return; // areas are baked on their own
    for (const c of o.children) visit(c);
    if (!mergeableMesh(o) || o.userData.keep) return;
    const vc = !!o.material.userData.vc;
    const e = o.matrixWorld.elements;
    const chunk = `${Math.floor(e[12] / CHUNK)},${Math.floor(e[14] / CHUNK)}`;
    const id = vc ? 'vc:' + o.material.userData.vc : o.material.uuid;
    const key = `${id}|${o.castShadow ? 1 : 0}|${chunk}`;
    if (!buckets.has(key)) buckets.set(key, { material: vc ? vcMaterial(o.material) : o.material, cast: o.castShadow, geos: [], order: o.renderOrder });
    buckets.get(key).geos.push(prep(o, o.matrixWorld, vc));
    remove.push(o);
  };
  visit(group);
  for (const o of remove) o.removeFromParent();
  const out = new THREE.Group();
  out.name = 'baked';
  group.add(out);
  return mergeBuckets(buckets, out, false);
}

/**
 * Merge the meshes of a movable group (a car, a display) in the group's own
 * space, so it costs a handful of draw calls. Children flagged userData.keep
 * (and their descendants) are left alone.
 */
export function compact(group, { dispose = false } = {}) {
  group.updateMatrixWorld(true);
  const inv = group.matrixWorld.clone().invert();
  const buckets = new Map();
  const remove = [];
  const visit = (o) => {
    if (o !== group && o.userData.keep) return;
    if (mergeableMesh(o)) {
      const vc = !!o.material.userData.vc;
      const key = (vc ? 'vc:' + o.material.userData.vc : o.material.uuid) + '|' + (o.castShadow ? 1 : 0);
      if (!buckets.has(key)) buckets.set(key, { material: vc ? vcMaterial(o.material) : o.material, cast: o.castShadow, geos: [], cls: o.material.userData.vc });
      buckets.get(key).geos.push(prep(o, new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), vc));
      remove.push(o);
    }
    for (const c of [...o.children]) visit(c);
  };
  visit(group);
  for (const o of remove) { o.removeFromParent(); if (dispose) o.geometry.dispose(); }
  mergeBuckets(buckets, group);
  return group;
}
