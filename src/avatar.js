// Roblox-style blocky avatar built from an appearance description.
// Used by the player, the shop mannequins and the customise screen.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { hex } from './builders.js';
import { compact } from './gfx.js';

export const DEFAULT_LOOK = {
  body: 'male', // male | female
  skin: 0xf2c79a,
  face: 'smile',
  hair: 'short',
  hairColor: 0x3b2414,
  shirt: 'tee', // tee | hoodie | jacket | tank | polo | dress
  shirtColor: 0xe2483d,
  pattern: 'plain', // plain | stripes | logo | star | camo | heart
  pants: 'jeans', // jeans | shorts | skirt | joggers
  pantsColor: 0x2b3a67,
  shoes: 0xffffff,
  hat: 'none', // none | cap | beanie | tophat | crown | headphones
  hatColor: 0x14182b,
  glasses: 'none', // none | round | shades
  back: 'none', // none | backpack | cape | wings
  backColor: 0x2e6fdb,
};

export const OPTIONS = {
  body: [['male', 'Male'], ['female', 'Female']],
  face: [['smile', '🙂 Smile'], ['grin', '😁 Grin'], ['cool', '😎 Cool'], ['wink', '😉 Wink'], ['cute', '😊 Cute'], ['wow', '😮 Wow'], ['determined', '😤 Determined']],
  hair: [['short', 'Short'], ['spiky', 'Spiky'], ['long', 'Long'], ['ponytail', 'Ponytail'], ['bun', 'Bun'], ['curly', 'Curly'], ['mohawk', 'Mohawk'], ['pigtails', 'Pigtails'], ['bald', 'Bald']],
  shirt: [['tee', 'T-shirt'], ['hoodie', 'Hoodie'], ['jacket', 'Jacket'], ['polo', 'Polo'], ['tank', 'Tank top'], ['dress', 'Dress']],
  pattern: [['plain', 'Plain'], ['stripes', 'Stripes'], ['logo', 'Logo'], ['star', 'Star'], ['heart', 'Heart'], ['camo', 'Camo']],
  pants: [['jeans', 'Jeans'], ['joggers', 'Joggers'], ['shorts', 'Shorts'], ['skirt', 'Skirt']],
  hat: [['none', 'None'], ['cap', 'Cap'], ['beanie', 'Beanie'], ['tophat', 'Top hat'], ['crown', 'Crown'], ['headphones', 'Headphones']],
  glasses: [['none', 'None'], ['round', 'Round'], ['shades', 'Shades']],
  back: [['none', 'None'], ['backpack', 'Backpack'], ['cape', 'Cape'], ['wings', 'Wings']],
};

export const SKINS = [0xffe0c4, 0xf2c79a, 0xe0a979, 0xc68653, 0x9a6237, 0x6b4226, 0x4a2c17, 0xffcf9e];
export const COLORS = [0xe2483d, 0xff7a3d, 0xffc83d, 0x5be28a, 0x2fa37a, 0x2bb3e6, 0x2e6fdb, 0x5b5bd6, 0x8e5bd6, 0xff5b8a, 0xf4f1ea, 0x8b919c, 0x23262f, 0x7a5234, 0xd9b38c, 0x14182b];
export const HAIR_COLORS = [0x14110f, 0x3b2414, 0x6b3e1f, 0xa8672e, 0xe8c070, 0xf4e3b5, 0xb0b0b0, 0xe2483d, 0xff5b8a, 0x2e6fdb, 0x8e5bd6, 0x5be28a];

const geoCache = new Map();
function rgeo(w, h, d, r = 0.07) {
  const k = `${w}|${h}|${d}|${r}`;
  if (!geoCache.has(k)) geoCache.set(k, new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)));
  return geoCache.get(k);
}
// Plain colours are cached and tagged so baked mannequins merge into a few draw calls.
const plainCache = new Map();
const plastic = (color, extra) => {
  const simple = !extra || (Object.keys(extra).length === 1 && 'roughness' in extra);
  if (!simple) return new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });
  const rough = extra ? extra.roughness : 0.5;
  const key = new THREE.Color(color).getHex() + ':' + rough;
  if (!plainCache.has(key)) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: rough });
    mat.userData.vc = 'av:' + rough;
    mat.userData.cached = true;
    plainCache.set(key, mat);
  }
  return plainCache.get(key);
};

/** A part: rounded box hung from its top (pivot at y=0, extends downward), or centred if `centre`. */
function part(parent, w, h, d, x, y, z, material, { centre = false, r } = {}) {
  const mesh = new THREE.Mesh(rgeo(w, h, d, r), material);
  mesh.position.set(x, centre ? y : y - h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// classic rounded-cylinder head
let headGeo = null;
function headGeometry() {
  if (headGeo) return headGeo;
  const pts = [];
  const R = 0.37, H = 0.66, c = 0.13;
  pts.push(new THREE.Vector2(0, -H / 2));
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(R - c + Math.cos(a) * c, -H / 2 + c + Math.sin(a) * c)); }
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(R - c + Math.cos(a) * c, H / 2 - c + Math.sin(a) * c)); }
  pts.push(new THREE.Vector2(0, H / 2));
  headGeo = new THREE.LatheGeometry(pts, 28);
  return headGeo;
}

// ------------------------------------------------------------- textures
function canvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const faceCache = new Map();
export function faceTexture(face, female) {
  const key = face + female;
  if (faceCache.has(key)) return faceCache.get(key);
  const t = canvas(256, 128, (g) => {
    const ink = '#1b1b24';
    g.fillStyle = ink; g.strokeStyle = ink; g.lineCap = 'round'; g.lineJoin = 'round';
    const eye = (x, y, wink) => {
      if (wink) { g.lineWidth = 7; g.beginPath(); g.arc(x, y + 6, 11, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke(); return; }
      g.beginPath(); g.ellipse(x, y, 8.5, 13, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 2.5, y - 5, 3.2, 0, Math.PI * 2); g.fill(); g.fillStyle = ink;
      if (female) { g.lineWidth = 3.5; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * 6, y - 10); g.lineTo(x + s * 13, y - 17); g.stroke(); } }
    };
    const L = 100, R = 156, Y = 52;
    if (face === 'cool') {
      g.fillStyle = '#111'; g.beginPath(); g.roundRect(L - 26, Y - 16, 52, 28, 10); g.roundRect(R - 26, Y - 16, 52, 28, 10); g.fill();
      g.fillRect(L + 20, Y - 12, R - L - 40, 6);
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(L - 18, Y - 10, 12, 5); g.fillRect(R - 18, Y - 10, 12, 5);
      g.lineWidth = 6; g.beginPath(); g.moveTo(112, 96); g.quadraticCurveTo(136, 104, 152, 90); g.stroke();
    } else {
      if (face === 'determined') {
        g.lineWidth = 6; g.beginPath(); g.moveTo(L - 14, Y - 26); g.lineTo(L + 12, Y - 18); g.moveTo(R + 14, Y - 26); g.lineTo(R - 12, Y - 18); g.stroke();
      }
      eye(L, Y, false); eye(R, Y, face === 'wink');
      g.lineWidth = 6;
      if (face === 'grin') {
        g.beginPath(); g.moveTo(98, 84); g.quadraticCurveTo(128, 122, 158, 84); g.closePath(); g.fill();
        g.fillStyle = '#fff'; g.fillRect(106, 85, 44, 8);
      } else if (face === 'wow') {
        g.beginPath(); g.ellipse(128, 96, 11, 14, 0, 0, Math.PI * 2); g.fill();
      } else if (face === 'determined') {
        g.beginPath(); g.moveTo(108, 96); g.lineTo(148, 92); g.stroke();
      } else {
        g.beginPath(); g.arc(128, 70, 30, 0.22 * Math.PI, 0.78 * Math.PI); g.stroke();
      }
      if (face === 'cute' || female) {
        g.fillStyle = 'rgba(255,110,140,0.45)';
        g.beginPath(); g.ellipse(L - 18, Y + 26, 13, 7, 0, 0, Math.PI * 2); g.ellipse(R + 18, Y + 26, 13, 7, 0, 0, Math.PI * 2); g.fill();
      }
    }
  });
  faceCache.set(key, t);
  return t;
}

const shade = (c, k) => {
  const col = new THREE.Color(c);
  col.multiplyScalar(k);
  return '#' + col.getHexString();
};

/** Shirt front/side texture. */
const shirtCache = new Map();
function shirtTexture(look, front) {
  const key = [look.shirt, look.pattern, look.shirtColor, front, look.body].join('|');
  if (shirtCache.has(key)) return shirtCache.get(key);
  const base = hex(look.shirtColor);
  const t = canvas(128, 128, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const p = look.pattern;
    if (p === 'stripes') { g.fillStyle = 'rgba(255,255,255,0.75)'; for (let y = 10; y < h; y += 26) g.fillRect(0, y, w, 10); }
    if (p === 'camo') {
      const cols = [shade(look.shirtColor, 0.6), shade(look.shirtColor, 1.3), '#3c3a2a'];
      let s = 3;
      for (let i = 0; i < 26; i++) { s = (s * 9301 + 49297) % 233280; const r = s / 233280; g.fillStyle = cols[i % 3]; g.beginPath(); g.ellipse(r * w, ((i * 37) % 128), 10 + r * 10, 6 + r * 6, r * 3, 0, Math.PI * 2); g.fill(); }
    }
    if (look.shirt === 'jacket' && front) {
      g.fillStyle = '#f4f1ea'; g.fillRect(50, 0, 28, h);
      g.fillStyle = shade(look.shirtColor, 0.7); g.fillRect(46, 0, 5, h); g.fillRect(77, 0, 5, h);
      g.fillStyle = '#ddd'; for (let y = 20; y < h; y += 26) g.fillRect(84, y, 6, 6);
    }
    if (look.shirt === 'hoodie' && front) {
      g.fillStyle = shade(look.shirtColor, 0.8); g.beginPath(); g.roundRect(30, 76, 68, 34, 8); g.fill();
      g.strokeStyle = '#f4f1ea'; g.lineWidth = 3; g.beginPath(); g.moveTo(54, 0); g.lineTo(52, 40); g.moveTo(74, 0); g.lineTo(76, 40); g.stroke();
    }
    if (look.shirt === 'polo' && front) {
      g.fillStyle = shade(look.shirtColor, 0.75); g.beginPath(); g.moveTo(40, 0); g.lineTo(64, 22); g.lineTo(88, 0); g.fill();
      g.fillStyle = '#f4f1ea'; g.fillRect(62, 22, 4, 26); g.beginPath(); g.arc(64, 32, 2.5, 0, 7); g.arc(64, 42, 2.5, 0, 7); g.fill();
    }
    if (front && (p === 'logo' || p === 'star' || p === 'heart')) {
      g.fillStyle = look.shirtColor === 0xf4f1ea ? '#14182b' : '#ffffff';
      if (p === 'logo') {
        g.font = '700 30px Fredoka, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('MW', 64, 56); g.fillRect(34, 76, 60, 5);
      } else if (p === 'star') {
        g.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 13 : 30; g.lineTo(64 + Math.cos(a) * r, 58 + Math.sin(a) * r); }
        g.fill();
      } else {
        g.fillStyle = '#ff4d6d';
        g.beginPath(); g.moveTo(64, 84); g.bezierCurveTo(20, 54, 40, 22, 64, 44); g.bezierCurveTo(88, 22, 108, 54, 64, 84); g.fill();
      }
    }
    // collar shadow
    if (front && look.shirt !== 'jacket' && look.shirt !== 'polo') { g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(64, 0, 22, 10, 0, 0, Math.PI); g.fill(); }
    // hem
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, h - 6, w, 6);
  });
  shirtCache.set(key, t);
  return t;
}

function pantsTexture(look, front) {
  const key = 'p|' + look.pants + look.pantsColor + front;
  if (shirtCache.has(key)) return shirtCache.get(key);
  const t = canvas(64, 128, (g, w, h) => {
    g.fillStyle = hex(look.pantsColor); g.fillRect(0, 0, w, h);
    if (look.pants === 'jeans') {
      g.strokeStyle = 'rgba(255,220,150,0.6)'; g.lineWidth = 1.5; g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(8, 0); g.lineTo(8, h); g.moveTo(w - 8, 0); g.lineTo(w - 8, h); g.stroke();
      if (front) { g.beginPath(); g.arc(w / 2, 0, 18, 0.1, Math.PI - 0.1); g.stroke(); }
    }
    if (look.pants === 'joggers') { g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(4, 0, 5, h); g.fillRect(w - 9, 0, 5, h); }
  });
  shirtCache.set(key, t);
  return t;
}

// ----------------------------------------------------------------- build
/**
 * Build an avatar. Returns { root, body, head, armL, armR, legL, legR, hand } where
 * root's origin is between the feet and the model faces +z.
 * Limb groups pivot at shoulder / hip for animation.
 */
export function buildAvatar(look = DEFAULT_LOOK, { faceless = false } = {}) {
  const L = { ...DEFAULT_LOOK, ...look };
  const female = L.body === 'female';
  const root = new THREE.Group();
  const CHEST = 1.4;
  const body = new THREE.Group();
  body.position.y = CHEST;
  root.add(body);

  const skin = plastic(L.skin);
  const sideTex = shirtTexture(L, false), frontTex = shirtTexture(L, true);
  const shirtSide = plastic(0xffffff, { map: sideTex });
  const shirtFront = plastic(0xffffff, { map: frontTex });
  const shirtSolid = plastic(L.shirtColor);
  const pantsSide = plastic(0xffffff, { map: pantsTexture(L, false) });
  const shoe = plastic(L.shoes);
  const hairM = plastic(L.hairColor, { roughness: 0.75 });

  // torso: one textured box + a front panel for the design (a per-face material
  // array would cost a draw call per face)
  const tw = female ? 0.92 : 1.0;
  const tank = L.shirt === 'tank';
  const torso = new THREE.Mesh(rgeo(tw, 0.98, 0.52, 0.08), shirtSide);
  torso.position.y = 1.43 - CHEST;
  torso.castShadow = torso.receiveShadow = true;
  body.add(torso);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(tw - 0.14, 0.84), shirtFront);
  front.position.set(0, 1.43 - CHEST, 0.2605);
  body.add(front);
  // belt
  if (L.shirt !== 'dress') part(body, tw + 0.02, 0.1, 0.54, 0, 0.99 - CHEST, 0, plastic(0x23262f), { r: 0.03 });
  // neck
  part(body, 0.34, 0.12, 0.3, 0, 1.98 - CHEST, 0, skin, { r: 0.04 });

  if (L.shirt === 'hoodie') {
    // hood bunched behind the neck + drawstrings
    part(body, 0.86, 0.32, 0.26, 0, 2.05 - CHEST, -0.2, plastic(new THREE.Color(L.shirtColor).multiplyScalar(0.85)), { r: 0.1 });
  }
  if (L.shirt === 'jacket') {
    for (const s of [-1, 1]) {
      const lap = part(body, 0.16, 0.36, 0.06, s * 0.18, 1.92 - CHEST, 0.27, plastic(new THREE.Color(L.shirtColor).multiplyScalar(0.7)), { r: 0.02 });
      lap.rotation.z = s * 0.35;
    }
  }

  // head
  const head = new THREE.Group();
  head.position.y = 2.36 - CHEST;
  body.add(head);
  const headMesh = new THREE.Mesh(headGeometry(), skin);
  headMesh.castShadow = true;
  head.add(headMesh);
  if (!faceless) {
    const faceMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.373, 0.373, 0.42, 16, 1, true, -1.0, 2.0),
      new THREE.MeshBasicMaterial({ map: faceTexture(L.face, female), transparent: true, depthWrite: false })
    );
    faceMesh.position.y = 0.02;
    faceMesh.renderOrder = 2;
    head.add(faceMesh);
  }
  buildHair(head, L, hairM);
  buildHat(head, L);
  buildGlasses(head, L);

  // arms: shoulder pivot
  const arm = (side) => {
    const g = new THREE.Group();
    g.position.set(side * (tw / 2 + 0.22), 1.86 - CHEST, 0);
    body.add(g);
    const sleeveLen = tank ? 0 : L.shirt === 'tee' || L.shirt === 'polo' || L.shirt === 'dress' ? 0.38 : 0.84;
    if (sleeveLen > 0) part(g, 0.42, sleeveLen, 0.46, 0, 0.04, 0, shirtSolid, { r: 0.07 });
    part(g, 0.4, 0.92 - sleeveLen, 0.44, 0, 0.04 - sleeveLen, 0, skin, { r: 0.07 });
    if (sleeveLen >= 0.84) part(g, 0.4, 0.14, 0.44, 0, -0.78, 0, skin, { r: 0.06 });
    if (L.shirt === 'jacket' || L.shirt === 'hoodie') part(g, 0.44, 0.08, 0.48, 0, -0.66, 0, plastic(new THREE.Color(L.shirtColor).multiplyScalar(0.8)), { r: 0.03 });
    const hand = new THREE.Group();
    hand.position.set(0, -0.86, 0);
    g.add(hand);
    return { g, hand };
  };
  const aL = arm(1), aR = arm(-1);

  // legs: hip pivot
  const leg = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * (tw / 4 + 0.005), 0.96 - CHEST, 0);
    body.add(pivot);
    const bare = L.pants === 'skirt' || L.shirt === 'dress';
    const shorts = L.pants === 'shorts';
    const pantLen = bare ? 0 : shorts ? 0.42 : 0.78;
    if (pantLen > 0) {
      const p = new THREE.Mesh(rgeo(tw / 2 - 0.02, pantLen, 0.5, 0.06), pantsSide);
      p.position.y = -pantLen / 2;
      p.castShadow = p.receiveShadow = true;
      pivot.add(p);
    }
    if (pantLen < 0.78) part(pivot, tw / 2 - 0.05, 0.78 - pantLen, 0.46, 0, -pantLen, 0, skin, { r: 0.06 });
    if (L.pants === 'joggers') part(pivot, tw / 2 - 0.01, 0.07, 0.51, 0, -0.72, 0, plastic(new THREE.Color(L.pantsColor).multiplyScalar(0.7)), { r: 0.03 });
    // shoe, a little longer at the toe
    part(pivot, tw / 2 - 0.01, 0.2, 0.6, 0, -0.76, 0.05, shoe, { r: 0.07 });
    part(pivot, tw / 2 - 0.0, 0.05, 0.62, 0, -0.91, 0.05, plastic(0x2a2a2a), { r: 0.02 });
    return pivot;
  };
  const legL = leg(1), legR = leg(-1);

  // skirt / dress flare
  if (L.pants === 'skirt' || L.shirt === 'dress') {
    const col = L.shirt === 'dress' ? L.shirtColor : L.pantsColor;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.72, 0.62, 20, 1, false), plastic(col));
    skirt.scale.z = 0.62;
    skirt.position.y = 0.72 - CHEST;
    skirt.castShadow = true;
    body.add(skirt);
  }

  buildBack(body, L, CHEST);

  // merge each moving part into a few draw calls (plain colours share one material)
  const parts = [head, aL.g, aR.g, legL, legR];
  for (const g of parts) { compact(g); g.userData.keep = true; }
  compact(body);
  for (const g of parts) g.userData.keep = false;

  return { root, body, head, armL: aL.g, armR: aR.g, handR: aR.hand, handL: aL.hand, legL, legR, chest: CHEST, look: L };
}

function buildHair(head, L, hm) {
  const top = 0.33;
  const cap = (h = 0.2, extra = 0) => part(head, 0.8 + extra, h, 0.8 + extra, 0, top + h - 0.06, -0.01, hm, { r: 0.12 });
  switch (L.hair) {
    case 'short':
      cap(0.2); part(head, 0.8, 0.42, 0.2, 0, top + 0.04, -0.31, hm, { r: 0.08 });
      part(head, 0.5, 0.12, 0.16, -0.12, top + 0.04, 0.33, hm, { r: 0.05 }).rotation.z = 0.15;
      break;
    case 'spiky': {
      cap(0.16); part(head, 0.8, 0.4, 0.18, 0, top + 0.02, -0.31, hm, { r: 0.06 });
      for (let i = 0; i < 7; i++) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.36, 5), hm);
        const a = (i / 7) * Math.PI * 2;
        sp.position.set(Math.sin(a) * 0.22, top + 0.22, Math.cos(a) * 0.2 - 0.04);
        sp.rotation.set(Math.cos(a) * -0.5, 0, Math.sin(a) * 0.5);
        sp.castShadow = true; head.add(sp);
      }
      break;
    }
    case 'long':
      cap(0.22, 0.04);
      part(head, 0.86, 1.05, 0.26, 0, top + 0.1, -0.3, hm, { r: 0.1 });
      for (const s of [-1, 1]) part(head, 0.16, 0.8, 0.5, s * 0.41, top + 0.06, -0.05, hm, { r: 0.07 });
      part(head, 0.7, 0.14, 0.16, 0, top + 0.08, 0.33, hm, { r: 0.06 });
      break;
    case 'ponytail':
      cap(0.2, 0.02);
      part(head, 0.8, 0.4, 0.18, 0, top + 0.04, -0.31, hm, { r: 0.08 });
      part(head, 0.24, 0.72, 0.24, 0, top - 0.02, -0.5, hm, { r: 0.11 }).rotation.x = 0.25;
      break;
    case 'bun':
      cap(0.18, 0.02);
      part(head, 0.8, 0.36, 0.18, 0, top + 0.02, -0.31, hm, { r: 0.08 });
      { const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), hm); b.position.set(0, top + 0.28, -0.22); b.castShadow = true; head.add(b); }
      break;
    case 'curly':
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2, r = i % 2 ? 0.3 : 0.18;
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), hm);
        b.position.set(Math.sin(a) * r, top + 0.08 + (i % 3) * 0.04, Math.cos(a) * r - 0.04);
        b.castShadow = true; head.add(b);
      }
      part(head, 0.8, 0.36, 0.2, 0, top + 0.02, -0.3, hm, { r: 0.1 });
      break;
    case 'mohawk':
      part(head, 0.78, 0.06, 0.78, 0, top + 0.02, 0, hm, { r: 0.03 });
      part(head, 0.14, 0.32, 0.8, 0, top + 0.32, -0.02, hm, { r: 0.06 });
      break;
    case 'pigtails':
      cap(0.2, 0.02);
      part(head, 0.8, 0.36, 0.18, 0, top + 0.02, -0.31, hm, { r: 0.08 });
      for (const s of [-1, 1]) {
        const t = part(head, 0.2, 0.62, 0.2, s * 0.48, top - 0.06, -0.12, hm, { r: 0.09 });
        t.rotation.z = s * 0.25;
      }
      break;
    default:
      break;
  }
}

function buildHat(head, L) {
  const c = plastic(L.hatColor);
  const top = 0.33;
  switch (L.hat) {
    case 'cap':
      part(head, 0.84, 0.26, 0.84, 0, top + 0.22, -0.01, c, { r: 0.14 });
      part(head, 0.7, 0.05, 0.42, 0, top + 0.0, 0.45, c, { r: 0.02 });
      break;
    case 'beanie':
      part(head, 0.86, 0.38, 0.86, 0, top + 0.3, -0.01, c, { r: 0.16 });
      part(head, 0.9, 0.12, 0.9, 0, top + 0.02, -0.01, plastic(new THREE.Color(L.hatColor).multiplyScalar(0.75)), { r: 0.05 });
      { const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), plastic(0xf4f1ea)); p.position.set(0, top + 0.36, 0); head.add(p); }
      break;
    case 'tophat': {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.05, 24), c); brim.position.y = top + 0.04; brim.castShadow = true; head.add(brim);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.6, 24), c); crown.position.y = top + 0.36; crown.castShadow = true; head.add(crown);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.385, 0.385, 0.1, 24), plastic(0xe2483d)); band.position.y = top + 0.12; head.add(band);
      break;
    }
    case 'crown': {
      const gold = new THREE.MeshStandardMaterial({ color: 0xffc83d, metalness: 0.8, roughness: 0.25 });
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.34, 0.2, 20, 1, true), gold); ring.material.side = THREE.DoubleSide; ring.position.y = top + 0.12; head.add(ring);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 4), gold);
        sp.position.set(Math.sin(a) * 0.33, top + 0.31, Math.cos(a) * 0.33); head.add(sp);
        const gem = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: [0xe2483d, 0x2e6fdb, 0x5be28a][i % 3], roughness: 0.1 }));
        gem.position.set(Math.sin(a) * 0.37, top + 0.12, Math.cos(a) * 0.37); head.add(gem);
      }
      break;
    }
    case 'headphones': {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 8, 24, Math.PI), c);
      band.position.y = 0.08; band.castShadow = true; head.add(band);
      for (const s of [-1, 1]) part(head, 0.14, 0.32, 0.3, s * 0.42, 0.18, 0, c, { r: 0.07 });
      break;
    }
    default: break;
  }
}

function buildGlasses(head, L) {
  if (L.glasses === 'none') return;
  const frame = plastic(L.glasses === 'shades' ? 0x111111 : 0x3a2a1a);
  const lens = new THREE.MeshStandardMaterial(L.glasses === 'shades'
    ? { color: 0x111111, roughness: 0.05, metalness: 0.6 }
    : { color: 0xcfe9ff, roughness: 0.05, transparent: true, opacity: 0.35 });
  for (const s of [-1, 1]) {
    const r = new THREE.Mesh(L.glasses === 'round' ? new THREE.TorusGeometry(0.09, 0.018, 6, 16) : rgeo(0.22, 0.13, 0.03, 0.03), frame);
    r.position.set(s * 0.13, 0.08, 0.385); head.add(r);
    const l = new THREE.Mesh(L.glasses === 'round' ? new THREE.CircleGeometry(0.09, 16) : rgeo(0.2, 0.11, 0.02, 0.03), lens);
    l.position.set(s * 0.13, 0.08, 0.39); head.add(l);
    const arm = new THREE.Mesh(rgeo(0.02, 0.02, 0.4, 0.005), frame);
    arm.position.set(s * 0.36, 0.08, 0.2); head.add(arm);
  }
  const bridge = new THREE.Mesh(rgeo(0.1, 0.025, 0.02, 0.005), frame);
  bridge.position.set(0, 0.1, 0.39); head.add(bridge);
}

function buildBack(body, L, CHEST) {
  const c = plastic(L.backColor);
  if (L.back === 'backpack') {
    part(body, 0.74, 0.8, 0.32, 0, 1.86 - CHEST, -0.4, c, { r: 0.12 });
    part(body, 0.56, 0.3, 0.12, 0, 1.36 - CHEST, -0.6, plastic(new THREE.Color(L.backColor).multiplyScalar(0.7)), { r: 0.05 });
    for (const s of [-1, 1]) part(body, 0.1, 0.8, 0.06, s * 0.28, 1.9 - CHEST, 0.27, plastic(0x23262f), { r: 0.02 });
  } else if (L.back === 'cape') {
    const cape = new THREE.Mesh(rgeo(0.98, 1.5, 0.05, 0.02), c);
    cape.position.set(0, 1.92 - CHEST - 0.75, -0.32);
    cape.rotation.x = 0.12;
    cape.castShadow = true;
    body.add(cape);
  } else if (L.back === 'wings') {
    const w = new THREE.MeshStandardMaterial({ color: L.backColor, roughness: 0.4, emissive: L.backColor, emissiveIntensity: 0.25 });
    for (const s of [-1, 1]) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.quadraticCurveTo(0.6, 0.9, 1.3, 0.9); shape.quadraticCurveTo(1.0, 0.3, 1.2, -0.1); shape.quadraticCurveTo(0.7, -0.3, 0, 0);
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
      const mesh = new THREE.Mesh(g, w);
      mesh.scale.x = s;
      mesh.position.set(s * 0.1, 1.6 - CHEST, -0.32);
      mesh.rotation.y = s * -0.35;
      mesh.castShadow = true;
      body.add(mesh);
    }
  }
}

/** Free GPU resources of an avatar built by buildAvatar (shared geometries are kept). */
export function disposeAvatar(av) {
  av.root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const mm of mats) if (!mm.userData.cached) mm.dispose();
    const shared = [...geoCache.values()].includes(o.geometry) || o.geometry === headGeo;
    if (!shared) o.geometry.dispose();
  });
}
