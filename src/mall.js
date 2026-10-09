// Virtual Mall: a big walk-in hall with a Tech section and a Fashion section.
// Every display is a cluster of 3D products; walk up to one and press E to
// browse it, add things to the cart, or try clothes on your avatar.
import * as THREE from 'three';
import { box, rbox, cyl, ball, sign } from './builders.js';
import { m, neon, glass } from './gfx.js';
import { buildAvatar } from './avatar.js';
import { ui, h } from './ui.js';
import { planter, bench, palm } from './kit.js';
import * as P from './products.js';

export const MALL = { x0: -132, x1: -28, z0: -112, z1: -40, h: 16 };
const FLOOR = 0.25;

// ------------------------------------------------------------------ catalog
// `wear` (optional) is applied to the avatar by "Try it on".
const D = (id, section, title, items) => ({ id, section, title, items });
export const DISPLAYS = [
  // ---- tech
  D('laptops', 'tech', 'Laptops', [
    { name: 'Air Slim 13"', price: 999, icon: '💻', desc: 'Featherweight aluminium laptop with an all-day battery.' },
    { name: 'Pro Studio 16"', price: 2399, icon: '💻', desc: 'Workstation power for video and 3D.' },
    { name: 'Gamer X 17"', price: 1899, icon: '🎮', desc: '240 Hz screen and RGB keyboard.' },
    { name: 'Flip 2-in-1', price: 849, icon: '📝', desc: 'Folds into a tablet, pen included.' },
    { name: 'Chromebook Go', price: 329, icon: '🌐', desc: 'Light, simple, perfect for school.' },
    { name: 'Creator 15" OLED', price: 1649, icon: '🎨', desc: 'Colour-accurate OLED for designers.' },
  ]),
  D('phones', 'tech', 'Phones & Tablets', [
    { name: 'Nova 15 Pro', price: 1099, icon: '📱', desc: 'Triple camera flagship.' },
    { name: 'Nova 15', price: 799, icon: '📱', desc: 'Everything you need, nothing you don’t.' },
    { name: 'Fold Z', price: 1799, icon: '📲', desc: 'A phone that unfolds into a tablet.' },
    { name: 'Tab Pro 12.9"', price: 1099, icon: '📟', desc: 'Pro tablet with a laptop-class chip.' },
    { name: 'Tab Mini', price: 499, icon: '📟', desc: 'Pocketable reading and gaming tablet.' },
    { name: 'Phone Case Pack', price: 29, icon: '🧩', desc: 'Three colourful silicone cases.' },
  ]),
  D('cameras', 'tech', 'Cameras', [
    { name: 'Alpha DSLR Kit', price: 1299, icon: '📷', desc: '24 MP DSLR with 18-55 mm lens.' },
    { name: 'Mirrorless M5', price: 1599, icon: '📸', desc: 'Compact full-frame mirrorless.' },
    { name: 'Action Cam 12', price: 399, icon: '🎥', desc: 'Waterproof 5K action camera.' },
    { name: '50 mm f/1.8 Lens', price: 249, icon: '🔭', desc: 'The classic portrait prime.' },
    { name: '70-200 mm Zoom', price: 1899, icon: '🔭', desc: 'Pro telephoto zoom.' },
    { name: 'Instant Camera', price: 89, icon: '🖼️', desc: 'Prints photos in seconds.' },
  ]),
  D('audio', 'tech', 'Headphones & Watches', [
    { name: 'Studio Max Headphones', price: 549, icon: '🎧', desc: 'Noise cancelling over-ears.', wear: { hat: 'headphones', hatColor: 0x23262f } },
    { name: 'Beat Pop Headphones', price: 199, icon: '🎧', desc: 'Punchy bass, bright colours.', wear: { hat: 'headphones', hatColor: 0xe2483d } },
    { name: 'Wireless Buds Pro', price: 249, icon: '🎵', desc: 'Tiny earbuds, big sound.' },
    { name: 'Smartwatch S9', price: 399, icon: '⌚', desc: 'Health tracking and notifications.' },
    { name: 'Sport Band Watch', price: 249, icon: '⌚', desc: 'GPS running watch.' },
  ]),
  D('gaming', 'tech', 'Gaming & VR', [
    { name: 'PlayBox Series', price: 499, icon: '🎮', desc: '4K console with a 1 TB SSD.' },
    { name: 'Switcheroo OLED', price: 349, icon: '🕹️', desc: 'Handheld and TV console.' },
    { name: 'Pro Controller', price: 69, icon: '🎮', desc: 'Wireless pad with paddles.' },
    { name: 'VR Headset Quest', price: 499, icon: '🥽', desc: 'Standalone mixed-reality headset.' },
    { name: 'Gaming Chair', price: 329, icon: '💺', desc: 'Ergonomic racing-style chair.' },
  ]),
  D('desktops', 'tech', 'Desktops & Monitors', [
    { name: 'RGB Tower RTX', price: 2499, icon: '🖥️', desc: 'Liquid cooled gaming tower.' },
    { name: 'Studio Desktop', price: 1999, icon: '🖥️', desc: 'Quiet, compact creative workstation.' },
    { name: '27" 4K Monitor', price: 449, icon: '🖥️', desc: 'Sharp IPS panel, USB-C.' },
    { name: '34" Ultrawide', price: 699, icon: '🖥️', desc: 'Curved 144 Hz ultrawide.' },
    { name: 'Mech Keyboard', price: 149, icon: '⌨️', desc: 'Hot-swap switches, per-key RGB.' },
    { name: 'Pro Mouse', price: 89, icon: '🖱️', desc: 'Lightweight wireless mouse.' },
  ]),
  D('speakers', 'tech', 'Speakers', [
    { name: 'Tower Speakers (pair)', price: 1499, icon: '🔊', desc: 'Floor-standing hi-fi towers.' },
    { name: 'Bookshelf Speakers', price: 399, icon: '🔈', desc: 'Compact powered speakers.' },
    { name: 'Cinema Soundbar', price: 799, icon: '📢', desc: 'Dolby Atmos soundbar.' },
    { name: 'Boom Portable', price: 129, icon: '🔊', desc: 'Waterproof party speaker.' },
    { name: 'Home Smart Speaker', price: 99, icon: '🗣️', desc: 'Voice assistant speaker.' },
  ]),
  D('tvs', 'tech', 'TVs', [
    { name: '65" OLED TV', price: 2199, icon: '📺', desc: 'Perfect blacks, 120 Hz.' },
    { name: '75" QLED TV', price: 1799, icon: '📺', desc: 'Huge, bright, cinematic.' },
    { name: '55" Smart TV', price: 649, icon: '📺', desc: 'All your apps built in.' },
    { name: '4K Projector', price: 1299, icon: '📽️', desc: '120" picture from a small box.' },
  ]),
  D('drones', 'tech', 'Drones', [
    { name: 'SkyPro 4K Drone', price: 1199, icon: '🚁', desc: '40 min flight time, obstacle sensing.' },
    { name: 'Mini Drone', price: 399, icon: '🛸', desc: 'Under 250 g, fly almost anywhere.' },
    { name: 'FPV Racer', price: 649, icon: '🏁', desc: 'Goggles included. Very fast.' },
  ]),
  // ---- fashion
  D('tees', 'fashion', 'T-Shirts & Polos', [
    { name: 'Classic Tee — Red', price: 25, icon: '👕', wear: { shirt: 'tee', shirtColor: 0xe2483d, pattern: 'plain' } },
    { name: 'Breton Stripe Tee', price: 35, icon: '👕', wear: { shirt: 'tee', shirtColor: 0x2e6fdb, pattern: 'stripes' } },
    { name: 'Logo Tee — Black', price: 30, icon: '👕', wear: { shirt: 'tee', shirtColor: 0x23262f, pattern: 'logo' } },
    { name: 'Star Tee — Yellow', price: 28, icon: '⭐', wear: { shirt: 'tee', shirtColor: 0xffc83d, pattern: 'star' } },
    { name: 'Polo — White', price: 45, icon: '👔', wear: { shirt: 'polo', shirtColor: 0xf4f1ea, pattern: 'plain' } },
    { name: 'Polo — Green', price: 45, icon: '👔', wear: { shirt: 'polo', shirtColor: 0x2fa37a, pattern: 'plain' } },
  ]),
  D('hoodies', 'fashion', 'Hoodies & Jackets', [
    { name: 'Cloud Hoodie — Grey', price: 65, icon: '🧥', wear: { shirt: 'hoodie', shirtColor: 0x8b919c, pattern: 'plain' } },
    { name: 'Logo Hoodie — Blue', price: 70, icon: '🧥', wear: { shirt: 'hoodie', shirtColor: 0x2e6fdb, pattern: 'logo' } },
    { name: 'Camo Hoodie', price: 75, icon: '🧥', wear: { shirt: 'hoodie', shirtColor: 0x6b7a4a, pattern: 'camo' } },
    { name: 'Bomber Jacket', price: 120, icon: '🧥', wear: { shirt: 'jacket', shirtColor: 0x2f3a2a, pattern: 'plain' } },
    { name: 'Denim Jacket', price: 95, icon: '🧥', wear: { shirt: 'jacket', shirtColor: 0x4a6fa5, pattern: 'plain' } },
    { name: 'Varsity Jacket', price: 135, icon: '🧥', wear: { shirt: 'jacket', shirtColor: 0xe2483d, pattern: 'plain' } },
  ]),
  D('pants', 'fashion', 'Jeans & Pants', [
    { name: 'Slim Jeans — Indigo', price: 79, icon: '👖', wear: { pants: 'jeans', pantsColor: 0x2b3a67 } },
    { name: 'Light Wash Jeans', price: 79, icon: '👖', wear: { pants: 'jeans', pantsColor: 0x7a9cc6 } },
    { name: 'Black Joggers', price: 55, icon: '👖', wear: { pants: 'joggers', pantsColor: 0x23262f } },
    { name: 'Chino Shorts', price: 45, icon: '🩳', wear: { pants: 'shorts', pantsColor: 0xd9b38c } },
    { name: 'Cargo Pants', price: 69, icon: '👖', wear: { pants: 'joggers', pantsColor: 0x5b6b3a } },
  ]),
  D('dresses', 'fashion', 'Dresses & Skirts', [
    { name: 'Summer Dress — Pink', price: 89, icon: '👗', wear: { shirt: 'dress', shirtColor: 0xff5b8a, pattern: 'plain' } },
    { name: 'Floral Dress', price: 99, icon: '👗', wear: { shirt: 'dress', shirtColor: 0xffc83d, pattern: 'heart' } },
    { name: 'Evening Dress', price: 189, icon: '👗', wear: { shirt: 'dress', shirtColor: 0x14182b, pattern: 'plain' } },
    { name: 'Pleated Skirt — Navy', price: 59, icon: '🩱', wear: { pants: 'skirt', pantsColor: 0x1d2b6b } },
    { name: 'Tennis Skirt — White', price: 49, icon: '🩱', wear: { pants: 'skirt', pantsColor: 0xf4f1ea } },
  ]),
  D('hats', 'fashion', 'Hats & Sunglasses', [
    { name: 'Snapback Cap', price: 29, icon: '🧢', wear: { hat: 'cap', hatColor: 0x14182b } },
    { name: 'Red Cap', price: 29, icon: '🧢', wear: { hat: 'cap', hatColor: 0xe2483d } },
    { name: 'Knit Beanie', price: 25, icon: '🧶', wear: { hat: 'beanie', hatColor: 0xff7a3d } },
    { name: 'Top Hat', price: 79, icon: '🎩', wear: { hat: 'tophat', hatColor: 0x14182b } },
    { name: 'Aviator Shades', price: 149, icon: '🕶️', wear: { glasses: 'shades' } },
    { name: 'Round Glasses', price: 119, icon: '👓', wear: { glasses: 'round' } },
    { name: 'Gold Watch', price: 349, icon: '⌚' },
  ]),
  D('bags', 'fashion', 'Handbags & Purses', [
    { name: 'Classic Tote — Tan', price: 220, icon: '👜', desc: 'Leather tote with gold hardware.' },
    { name: 'Evening Clutch', price: 140, icon: '👛', desc: 'Satin clutch for nights out.' },
    { name: 'Crossbody Bag', price: 165, icon: '👜', desc: 'Hands-free everyday bag.' },
    { name: 'Bucket Bag — Red', price: 185, icon: '👜', desc: 'Drawstring bucket bag.' },
    { name: 'Mini Purse', price: 89, icon: '👛', desc: 'Just your cards and keys.' },
    { name: 'Weekender Duffel', price: 260, icon: '🧳', desc: 'Fits a whole weekend.' },
  ]),
  D('shoes', 'fashion', 'Shoes', [
    { name: 'Block Runner Sneakers', price: 110, icon: '👟', wear: { shoes: 0xffffff } },
    { name: 'High-top Sneakers — Red', price: 120, icon: '👟', wear: { shoes: 0xe2483d } },
    { name: 'Chelsea Boots', price: 160, icon: '🥾', wear: { shoes: 0x5a3b22 } },
    { name: 'Classic Heels', price: 130, icon: '👠', wear: { shoes: 0x14182b } },
    { name: 'Slides', price: 35, icon: '🩴', wear: { shoes: 0x2bb3e6 } },
  ]),
  D('backpacks', 'fashion', 'Backpacks', [
    { name: 'Daypack — Blue', price: 75, icon: '🎒', wear: { back: 'backpack', backColor: 0x2e6fdb } },
    { name: 'Daypack — Yellow', price: 75, icon: '🎒', wear: { back: 'backpack', backColor: 0xffc83d } },
    { name: 'Hiker 40L', price: 140, icon: '🎒', wear: { back: 'backpack', backColor: 0x2fa37a } },
    { name: 'Hero Cape', price: 60, icon: '🦸', wear: { back: 'cape', backColor: 0xe2483d } },
    { name: 'Neon Wings', price: 250, icon: '🪽', wear: { back: 'wings', backColor: 0x8e5bd6 } },
  ]),
];

const byKey = new Map();
DISPLAYS.forEach((d) => d.items.forEach((it, i) => { it.key = `${d.id}:${i}`; it.section = d.section; byKey.set(it.key, it); }));

// --------------------------------------------------------------------- cart
const cart = new Map(); // key -> qty
const count = () => [...cart.values()].reduce((a, b) => a + b, 0);
const total = () => [...cart].reduce((a, [k, q]) => a + byKey.get(k).price * q, 0);
const money = (n) => '$' + n.toLocaleString('en-US');
let hooks = { tryOn: null, onBuy: null };
export function setMallHooks(h2) { hooks = { ...hooks, ...h2 }; }
const syncChip = () => ui.setCart(count(), () => openCart());

function addToCart(it) {
  cart.set(it.key, (cart.get(it.key) || 0) + 1);
  syncChip();
  ui.toast(`${it.name} added to cart`, 1400);
  hooks.onBuy && hooks.onBuy('add');
}

/** Panel for one display. */
export function openDisplay(displayId, zone) {
  const d = DISPLAYS.find((x) => x.id === displayId);
  const accent = d.section === 'tech' ? '#2bb3e6' : '#ff5b8a';
  const body = h('');
  const render = () => {
    body.innerHTML = `<div class="grid">` + d.items.map((it) => `
      <div class="product">
        <div class="art" style="background:${accent}">${it.icon}</div>
        <div class="name">${it.name}</div>
        ${it.desc ? `<div class="desc">${it.desc}</div>` : ''}
        <div class="row spread">
          <span class="price">${money(it.price)}</span>
          <button class="btn small" data-add="${it.key}">Add${cart.has(it.key) ? ` · ${cart.get(it.key)}` : ''}</button>
        </div>
        ${it.wear ? `<button class="btn ghost small" data-wear="${it.key}">Try it on</button>` : ''}
      </div>`).join('') + `</div>
      <div class="row" style="margin-top:12px"><button class="btn ghost wide" data-cart>View cart (${count()})</button></div>`;
  };
  body.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.add) addToCart(byKey.get(b.dataset.add));
    else if (b.dataset.wear) {
      const it = byKey.get(b.dataset.wear);
      hooks.tryOn && hooks.tryOn(it.wear);
      ui.toast(`Wearing ${it.name}`, 1400);
    } else if ('cart' in b.dataset) { openCart(); return; }
    render();
  });
  render();
  ui.openPanel({ kicker: d.section === 'tech' ? 'Virtual Mall · Tech' : 'Virtual Mall · Fashion', title: d.title, body, zone });
}

export function openCart() {
  const body = h('');
  const render = () => {
    body.innerHTML = cart.size === 0
      ? `<div class="empty">Your cart is empty.<br>Walk up to a display and add something.</div>`
      : [...cart].map(([k, q]) => {
          const it = byKey.get(k);
          return `<div class="cart-line">
            <div class="art" style="background:${it.section === 'tech' ? '#2bb3e6' : '#ff5b8a'}">${it.icon}</div>
            <div><div class="name">${it.name}</div><div class="price" style="color:var(--accent)">${money(it.price)}</div></div>
            <div class="qty"><button data-dec="${k}">−</button>${q}<button data-inc="${k}">+</button></div>
          </div>`;
        }).join('') +
        `<div class="row spread total"><span>Total</span><span>${money(total())}</span></div>
         <button class="btn wide" data-checkout>Checkout</button>
         <div class="note">Demo store. No payment is taken and nothing is ordered.</div>`;
  };
  body.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (d.inc) cart.set(d.inc, cart.get(d.inc) + 1);
    else if (d.dec) { const q = cart.get(d.dec) - 1; q > 0 ? cart.set(d.dec, q) : cart.delete(d.dec); }
    else if ('checkout' in d) { cart.clear(); ui.toast('Demo checkout complete. Thanks for shopping!'); hooks.onBuy && hooks.onBuy('checkout'); }
    else return;
    syncChip();
    render();
  });
  render();
  ui.openPanel({ kicker: 'Virtual Mall', title: 'Your cart', body });
}

// ----------------------------------------------------------------- building
export function buildMall(W) {
  const S = W.static;
  const { x0, x1, z0, z1, h: H } = MALL;
  const ext = m('concrete', 0xeee9e1), band = m(0xff5b8a), dark = m(0x2c2f55);
  const inner = m('smooth', 0xf6f3ee);

  // floor (raised a step above the pavement)
  W.slab(x0, x1, z0, z1, FLOOR, m('marble', 0xf4f1ec), 0.3);
  W.solid(x0, x1, z0, z1, -1, FLOOR);
  W.slab(x0 + 1, x1, -83, -69, FLOOR + 0.01, m('marble', 0xe9e4f2), 0.2); // corridor
  W.slab(x0 + 1, x1 - 1, z0 + 1, -83, FLOOR + 0.01, m('tiles', 0x434a5a), 0.2); // tech floor
  W.slab(x0 + 1, x1 - 1, -69, z1 - 1, FLOOR + 0.01, m('wood', 0xd8b48a), 0.2); // fashion floor
  for (const z of [-83, -69]) box(S, x1 - x0 - 2, 0.03, 0.25, (x0 + x1) / 2, FLOOR + 0.01, z, neon(z < -76 ? 0x2bb3e6 : 0xff5b8a, 1.2)).castShadow = false;

  // outer walls; east facade has the entrance (z -83..-69, 7 m high)
  const T = 0.8;
  W.wallBox(x0, x0 + T, z0, z1, 0, H, ext);
  W.wallBox(x0, x1, z0, z0 + T, 0, H, ext);
  W.wallBox(x0, x1, z1 - T, z1, 0, H, ext);
  W.wallBox(x1 - T, x1, z0, -83, 0, H, ext);
  W.wallBox(x1 - T, x1, -69, z1, 0, H, ext);
  W.wallBox(x1 - T, x1, -83, -69, 7.5, H, ext);
  // interior finish
  for (const [a, b, c, d] of [[x0 + T, x0 + T + 0.05, z0, z1], [x0, x1, z0 + T, z0 + T + 0.05], [x0, x1, z1 - T - 0.05, z1 - T]]) box(S, b - a, H - 0.6, d - c, (a + b) / 2, 0, (c + d) / 2, inner);
  // roof (with skylight strip over the corridor) and parapet
  W.slab(x0 - 0.5, x1 + 0.5, z0 - 0.5, -84, H + 0.6, m('concrete', 0xb9bcc2), 0.6);
  W.slab(x0 - 0.5, x1 + 0.5, -68, z1 + 0.5, H + 0.6, m('concrete', 0xb9bcc2), 0.6);
  for (let x = x0 + 4; x < x1 - 2; x += 6) box(S, 0.3, 0.3, 16, x, H, -76, m('metal', 0x8b919c));
  box(S, x1 - x0, 0.1, 16, (x0 + x1) / 2, H + 0.2, -76, glass(0xcfe9ff, 0.25));
  W.solid(x0 - 0.5, x1 + 0.5, z0 - 0.5, z1 + 0.5, H, H + 1, true);
  for (const [a, b, c, d] of [[x0 - 0.5, x1 + 0.5, z0 - 0.5, z0 + 0.3], [x0 - 0.5, x1 + 0.5, z1 - 0.3, z1 + 0.5], [x0 - 0.5, x0 + 0.3, z0, z1], [x1 - 0.3, x1 + 0.5, z0, z1]]) box(S, b - a, 1.2, d - c, (a + b) / 2, H + 0.6, (c + d) / 2, dark);
  // facade bands + glazing
  box(S, 0.2, 1.2, z1 - z0, x1 + 0.1, H - 3, (z0 + z1) / 2, band);
  box(S, x1 - x0, 1.2, 0.2, (x0 + x1) / 2, H - 3, z1 + 0.1, band);
  box(S, x1 - x0, 1.2, 0.2, (x0 + x1) / 2, H - 3, z0 - 0.1, band);
  for (const [a, b] of [[z0 + 3, -86], [-66, z1 - 3]]) box(S, 0.2, 7, b - a, x1 + 0.1, 2, (a + b) / 2, m('window', 0x9fc8e0));
  for (const x of [x1 - 20, x1 - 50, x1 - 80]) { box(S, 16, 7, 0.2, x, 2, z1 + 0.1, m('window', 0x9fc8e0)); box(S, 16, 7, 0.2, x, 2, z0 - 0.1, m('window', 0x9fc8e0)); }
  // entrance canopy, pillars and big sign
  box(S, 8, 0.5, 20, x1 + 4, 8, -76, dark);
  for (const z of [-85.5, -66.5]) cyl(S, 0.35, 8, x1 + 7.4, 0, z, m('metal', 0xd0d0d0), 12);
  W.solid(x1 + 7, x1 + 7.8, -86, -85, 0, 8); W.solid(x1 + 7, x1 + 7.8, -67, -66, 0, 8);
  sign(S, 'VIRTUAL MALL', 22, 3.2, x1 + 0.25, H - 6.2, -76, Math.PI / 2, { bg: '#14182b', fg: '#ff7ab0', border: '#ff7ab0', glow: true, radius: 40 });
  sign(S, 'TECH  ·  FASHION', 10, 1.2, x1 + 8.27, 7.9, -76, Math.PI / 2, { bg: null, fg: '#ffffff', glow: true });
  // automatic glass doors (slide open as you approach)
  const doorMat = glass(0xcfe9ff, 0.3);
  const doors = [];
  for (const s of [-1, 1]) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.15, 7, 7), doorMat);
    d.position.set(x1 - 0.4, 3.5 + FLOOR, -76 + s * 3.5);
    W.dyn.add(d);
    doors.push({ d, s });
  }
  box(S, 0.3, 0.4, 14.2, x1 - 0.4, 7.2, -76, m('metal', 0x8b919c));
  W.updaters.push((dt, t, p) => {
    const near = Math.abs(p.x - x1) < 9 && Math.abs(p.z + 76) < 9;
    for (const { d, s } of doors) {
      const target = -76 + s * (near ? 10 : 3.5);
      d.position.z += (target - d.position.z) * Math.min(1, dt * 6);
    }
  });
  // plaza in front
  W.slab(x1, -11.5, -92, -60, 0.18, m('tiles', 0xe2d6bf));
  planter(W, -22, -88, 0xff6b9a, 2); planter(W, -22, -64, 0xffc83d, 2);
  bench(W, -16, -82, 3); bench(W, -16, -70, 3);
  W.indoors.push({ x0, x1, z0, z1, h: H });
  W.mapRect(x0, x1, z0, z1, '#e7e1d8', 'Virtual Mall');
  W.mapRect(x0 + 1, x1 - 1, z0 + 1, -83, '#8fa6c9');
  W.mapRect(x0 + 1, x1 - 1, -69, z1 - 1, '#f0c0d0');
  W.mapLabel(-80, -102, 'Tech'); W.mapLabel(-80, -50, 'Fashion');

  // ---- interior (only drawn while the camera is near the mall)
  W.beginArea('mall', MALL, 22);
  // ceiling: light panels and section banners
  for (let x = x0 + 8; x < x1 - 4; x += 12) for (const z of [-104, -90, -62, -48]) box(S, 6, 0.12, 1.6, x, H - 0.75, z, neon(0xffffff, 1.1)).castShadow = false;
  for (let x = x0 + 6; x < x1 - 2; x += 10) box(S, 3, 0.12, 3, x, H - 0.75, -76, neon(0xfff4dc, 1)).castShadow = false;
  const banner = (text, z, col, fg) => {
    for (let x = -46; x > -128; x -= 40) {
      box(S, 0.05, 3.2, 0.05, x - 6, H - 3.2, z, m('metal', 0x8b919c));
      box(S, 0.05, 3.2, 0.05, x + 6, H - 3.2, z, m('metal', 0x8b919c));
      box(S, 13, 2.4, 0.25, x, H - 5.6, z, m(col));
      for (const side of [-1, 1]) sign(S, text, 12, 2, x, H - 4.4, z + side * 0.14, side > 0 ? 0 : Math.PI, { bg: null, fg, glow: true });
    }
  };
  banner('TECH', -84, 0x14182b, '#3be8ff');
  banner('FASHION', -68, 0xff5b8a, '#ffffff');
  // corridor furniture
  for (const x of [-48, -84, -116]) { palm(W, x, -76, 0.7); W.block(3, 0.6, 3, x, FLOOR, -76, m('marble', 0xf4f1ec), false); }
  for (const x of [-60, -100]) { bench(W, x, -73, 2); bench(W, x, -79, 0); }
  // info kiosk
  W.block(2.4, 1.2, 2.4, -66, FLOOR, -76, m('smooth', 0x14182b));
  box(S, 2.6, 0.08, 2.6, -66, FLOOR + 1.2, -76, m('metal', 0xd4af37));
  sign(S, 'i', 0.8, 0.8, -66, FLOOR + 2.2, -76, Math.PI / 2, { bg: '#2e6fdb', fg: '#fff', glow: true, doubleSided: true });

  buildTech(W);
  buildFashion(W);
  W.endArea();
}

// --------------------------------------------------------------- helpers
function place(parent, item, x, y, z, rot = 0) {
  item.position.set(x, y, z);
  item.rotation.y = rot;
  parent.add(item);
  return item;
}
/** Display table with a top at y = FLOOR + h. Returns top height. */
function table(W, x, z, w, d, color = 0xf7f7f7, hgt = 0.95) {
  W.block(w, hgt, d, x, FLOOR, z, m('smooth', color), false);
  box(W.static, w + 0.1, 0.06, d + 0.1, x, FLOOR + hgt, z, m('wood', 0xc49a6c));
  return FLOOR + hgt + 0.06;
}
function glassCounter(W, x, z, w, d) {
  W.block(w, 0.4, d, x, FLOOR, z, m('smooth', 0x14182b), false);
  box(W.static, w, 0.6, d, x, FLOOR + 0.4, z, glass(0xdff4ff, 0.18));
  W.solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, FLOOR, FLOOR + 1.05);
  box(W.static, w, 0.04, d, x, FLOOR + 1.0, z, glass(0xdff4ff, 0.3));
  box(W.static, w - 0.1, 0.03, d - 0.1, x, FLOOR + 0.62, z, m('smooth', 0xffffff));
  return FLOOR + 0.65;
}
function wallShelves(W, x, z, w, levels, rot, color = 0xf7f7f7) {
  // wall unit facing +z (rot 0) or -z (rot PI); returns shelf heights
  const g = new THREE.Group();
  g.position.set(x, 0, z); g.rotation.y = rot;
  W.static.add(g);
  box(g, w, 4, 0.3, 0, FLOOR, -0.15, m('smooth', color));
  const ys = [];
  for (let i = 0; i < levels; i++) {
    const y = FLOOR + 0.5 + i * (3.2 / levels);
    box(g, w - 0.2, 0.06, 0.6, 0, y, 0.15, m('wood', 0xc49a6c));
    ys.push(y + 0.06);
  }
  W.solid(x - w / 2, x + w / 2, z - 0.5, z + 0.5, 0, 4.2);
  return { g, ys };
}
function priceTag(parent, text, x, y, z, rot = 0, col = '#14182b') {
  sign(parent, text, 0.5, 0.22, x, y, z, rot, { bg: '#ffffff', fg: col, radius: 8, px: 160 });
}

// ===================================================================== TECH
/** Round rugs under the islands and plants between them. */
function dressRow(W, zI, rug, flower) {
  for (const x of [-42, -60, -78, -96, -114]) cyl(W.static, 4.6, 0.03, x, FLOOR + 0.01, zI, m('carpet', rug), 40).castShadow = false;
  for (const x of [-51, -69, -87, -105]) {
    cyl(W.static, 0.7, 0.9, x, FLOOR, zI, m('smooth', 0xf4f1ea), 16);
    W.solid(x - 0.7, x + 0.7, zI - 0.7, zI + 0.7, 0, 1);
    W.forest.y = FLOOR + 0.9; W.forest.bush(x - 0.2, zI, 0.9, 0x3f8f3a); W.forest.flower(x + 0.3, zI + 0.3, flower); W.forest.y = 0;
  }
}

function buildTech(W) {
  const S = W.static;
  const zI = -97; // island row
  dressRow(W, zI, 0x2b3a5a, 0x2bb3e6);
  const zone = (id, x, z, r = 5) => W.zone('mall:' + id, x, z, r, `Browse ${DISPLAYS.find((d) => d.id === id).title}`);

  // ---- laptops island
  {
    const x = -42;
    const top = table(W, x, zI, 6, 2.6, 0xf7f7f7);
    const kinds = ['desktop', 'code', 'photo', 'game', 'shop', 'music'];
    for (let i = 0; i < 6; i++) {
      const row = i < 3 ? -1 : 1;
      place(S, P.laptop(kinds[i], [0xb8bec6, 0x5d636e, 0x23262f, 0xd4af37, 0xb8bec6, 0x9aa0a8][i]), x - 2 + (i % 3) * 2, top, zI + row * 0.65, row > 0 ? 0 : Math.PI);
      priceTag(S, ['$999', '$2,399', '$1,899', '$849', '$329', '$1,649'][i], x - 2 + (i % 3) * 2, top - 0.25, zI + row * 1.36, row > 0 ? 0 : Math.PI);
    }
    zone('laptops', x, zI);
  }
  // ---- phones & tablets island
  {
    const x = -60;
    const top = table(W, x, zI, 6, 2.6, 0xf7f7f7);
    for (let i = 0; i < 10; i++) {
      const row = i < 5 ? -1 : 1;
      const item = i % 5 === 4 ? P.tablet(0xb8bec6, 'photo') : P.phone([0x23262f, 0xf4f1ea, 0x2e6fdb, 0xff5b8a, 0][i % 5], ['desktop', 'photo', 'music', 'game', 'shop'][i % 5]);
      place(S, P.onStand(item), x - 2.4 + (i % 5) * 1.2, top, zI + row * 0.7, row > 0 ? 0 : Math.PI);
    }
    zone('phones', x, zI);
  }
  // ---- cameras glass counter
  {
    const x = -78;
    const top = glassCounter(W, x, zI, 6, 2.2);
    const items = [P.dslr(), P.dslr(0x5d636e), P.actionCam(), P.lens(0.22), P.lens(0.32), P.dslr(0x8b919c), P.actionCam(), P.lens(0.16)];
    items.forEach((it, i) => place(S, it, x - 2.4 + (i % 4) * 1.6, top, zI + (i < 4 ? -0.45 : 0.45), i < 4 ? Math.PI : 0));
    // a pro camera on a tripod next to the counter
    const tri = new THREE.Group(); tri.position.set(x + 3.8, FLOOR, zI); S.add(tri);
    for (let i = 0; i < 3; i++) { const l = box(tri, 0.04, 1.5, 0.04, Math.cos(i * 2.1) * 0.25, 0, Math.sin(i * 2.1) * 0.25, m(0x23262f)); l.rotation.set(Math.sin(i * 2.1) * 0.18, 0, -Math.cos(i * 2.1) * 0.18); }
    place(tri, P.dslr(), 0, 1.45, 0, -Math.PI / 2);
    zone('cameras', x, zI);
  }
  // ---- headphones & watches (round table)
  {
    const x = -96;
    cyl(S, 1.9, 0.95, x, FLOOR, zI, m('smooth', 0xf7f7f7), 28);
    cyl(S, 2, 0.06, x, FLOOR + 0.95, zI, m('wood', 0xc49a6c), 28);
    W.solid(x - 1.9, x + 1.9, zI - 1.9, zI + 1.9, 0, FLOOR + 1);
    const cols = [0x23262f, 0xe2483d, 0xf4f1ea, 0x2e6fdb, 0xffc83d, 0x8e5bd6];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      place(S, P.headphoneStand(cols[i]), x + Math.cos(a) * 1.35, FLOOR + 1.01, zI + Math.sin(a) * 1.35, -a + Math.PI / 2);
    }
    for (let i = 0; i < 4; i++) place(S, P.smartwatch([0xff5b8a, 0x23262f, 0x5be28a, 0x2bb3e6][i]), x - 0.45 + i * 0.3, FLOOR + 1.01, zI, 0);
    zone('audio', x, zI);
  }
  // ---- gaming lounge
  {
    const x = -114;
    W.slab(x - 4, x + 4, zI - 3.5, zI + 3.5, FLOOR + 0.04, m('carpet', 0x3b3f73), 0.1);
    const stand = W.block(3, 0.6, 0.8, x, FLOOR, zI - 2.6, m('smooth', 0x14182b), false);
    place(S, P.tv('game', 3), x, FLOOR + 0.6, zI - 2.7, 0);
    place(S, P.consoleBox(0xf4f1ea), x - 1.2, FLOOR + 0.6, zI - 2.5, 0);
    place(S, P.consoleBox(0x23262f), x + 1.2, FLOOR + 0.6, zI - 2.5, 0);
    for (const s of [-1, 1]) {
      ball(S, 0.75, 0.5, 0.75, x + s * 1.4, FLOOR + 0.45, zI + 0.8, m('fabric', s < 0 ? 0xe2483d : 0x2bb3e6));
      W.solid(x + s * 1.4 - 0.6, x + s * 1.4 + 0.6, zI + 0.2, zI + 1.4, 0, FLOOR + 0.8);
    }
    const top = table(W, x, zI + 2.6, 3, 1, 0xf7f7f7, 0.8);
    place(S, P.controller(), x - 0.9, top, zI + 2.6, 0);
    place(S, P.controller(0xf4f1ea), x - 0.3, top, zI + 2.6, 0);
    place(S, P.vrHeadset(), x + 0.6, top, zI + 2.6, 0);
    stand.castShadow = true;
    zone('gaming', x, zI + 0.5, 5.2);
  }
  // ---- north wall: desktops & monitors
  {
    const z = MALL.z0 + 2.2;
    for (const x of [-38, -46, -54]) {
      const top = table(W, x, z, 6, 1.6, 0x14182b, 0.9);
      place(S, P.monitor(['code', 'game', 'photo'][(x / -8) % 3 | 0], 1.0), x - 1.3, top, z - 0.2);
      place(S, P.monitor('desktop', 0.8), x + 0.7, top, z - 0.2);
      place(S, P.pcTower([0x8e5bd6, 0x2bb3e6, 0xff5b8a][(x / -8) % 3 | 0]), x + 2.3, top, z - 0.1);
      place(S, P.keyboard(), x - 0.6, top, z + 0.4);
    }
    sign(S, 'DESKTOPS & MONITORS', 8, 0.9, -46, 5.4, MALL.z0 + 0.9, 0, { bg: '#14182b', fg: '#3be8ff', glow: true });
    zone('desktops', -46, z + 3.4, 6);
  }
  // ---- north wall: speakers
  {
    const z = MALL.z0 + 1.2;
    const { ys } = wallShelves(W, -72, z, 12, 3, 0, 0x2a2d33);
    for (let i = 0; i < 5; i++) place(S, P.bookshelfSpeaker(i % 2 ? 0xf4f1ea : 0x23262f), -77 + i * 2.5, ys[0], z + 0.2);
    for (let i = 0; i < 4; i++) place(S, P.portableSpeaker([0xe2483d, 0x2bb3e6, 0xffc83d, 0x5be28a][i]), -76.5 + i * 3, ys[1], z + 0.2);
    for (let i = 0; i < 2; i++) place(S, P.soundbar(), -75 + i * 6, ys[2], z + 0.2);
    for (let i = 0; i < 4; i++) place(S, P.smartSpeaker([0x8b919c, 0xf4f1ea, 0x23262f, 0xff7a3d][i]), -73.5 + i * 0.5 + (i > 1 ? 1 : 0), ys[2], z + 0.2);
    for (const x of [-80, -64]) { place(S, P.towerSpeaker(0x5a3b22), x, FLOOR, z + 1.6); W.solid(x - 0.2, x + 0.2, z + 1.4, z + 1.8, 0, 1.2); }
    sign(S, 'SPEAKERS', 5, 0.9, -72, 5.4, MALL.z0 + 0.9, 0, { bg: '#14182b', fg: '#3be8ff', glow: true });
    zone('speakers', -72, z + 4, 6);
  }
  // ---- north wall: TVs
  {
    const z = MALL.z0 + 0.95;
    box(S, 22, 4.6, 0.1, -99, FLOOR + 0.6, z, m('smooth', 0x14182b));
    const tvs = [['game', 3.2], ['photo', 2.6], ['music', 2.2], ['shop', 2.6]];
    let x = -108;
    for (const [k, w] of tvs) { place(S, P.tv(k, w), x, FLOOR + 1.8, z + 0.08); x += w + 2.4; }
    W.block(20, 0.8, 1.2, -99, FLOOR, z + 1.2, m('smooth', 0x23262f), false);
    sign(S, 'TVs', 3, 0.9, -99, 6.4, MALL.z0 + 0.9, 0, { bg: '#14182b', fg: '#3be8ff', glow: true });
    zone('tvs', -99, z + 4.2, 6);
  }
  // ---- drones
  {
    const z = MALL.z0 + 3;
    for (let i = 0; i < 3; i++) {
      const x = -120 + i * 3;
      W.solid(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 0, 1.3);
      P.plinth(S, x, z, P.drone(), 1.2, 0.8);
    }
    zone('drones', -117, z + 2.5, 4);
  }
  // checkout
  {
    const x = -128.5, z = -88.5;
    W.block(2, 1.1, 6, x, FLOOR, z, m('smooth', 0x14182b), false);
    box(S, 2.2, 0.06, 6.2, x, FLOOR + 1.1, z, m('wood', 0xc49a6c));
    place(S, P.monitor('shop', 0.5), x, FLOOR + 1.16, z - 1.5, Math.PI / 2);
    sign(S, 'CHECKOUT', 4, 0.8, MALL.x0 + 0.9, 4.2, z, Math.PI / 2, { bg: '#2bb3e6', fg: '#fff', glow: true });
  }
}

// ================================================================== FASHION
function buildFashion(W) {
  const S = W.static;
  const zI = -55;
  dressRow(W, zI, 0xf3d6dd, 0xff5b8a);
  const zone = (id, x, z, r = 5) => W.zone('mall:' + id, x, z, r, `Browse ${DISPLAYS.find((d) => d.id === id).title}`);
  const rail = (x, z, rot, items) => { P.rack(S, x, z, rot, 3.2, items); W.solid(x - 1.7, x + 1.7, z - 0.35, z + 0.35, 0, 1.9); };

  // ---- tees island: two racks + folded table
  {
    const x = -42;
    rail(x - 1.8, zI - 1.6, 0, [0xe2483d, 0xffc83d, 0x2e6fdb, 0x23262f, 0xf4f1ea].map((c, i) => () => P.tshirt(c, { print: i === 3 ? 0xffffff : null })));
    rail(x + 1.8, zI - 1.6, 0, [0x2fa37a, 0xf4f1ea, 0xff5b8a, 0x8e5bd6, 0xff7a3d].map((c) => () => P.tshirt(c)));
    const top = table(W, x, zI + 1.6, 5, 1.6, 0xf7f7f7, 0.85);
    for (let i = 0; i < 4; i++) place(S, P.folded([0xe2483d, 0xffc83d, 0x2e6fdb, 0x23262f].map((c, j) => (i + j) % 2 ? c : 0xf4f1ea)), x - 1.7 + i * 1.15, top, zI + 1.6);
    zone('tees', x, zI);
  }
  // ---- hoodies & jackets
  {
    const x = -60;
    rail(x - 1.8, zI - 1.2, 0, [0x8b919c, 0x2e6fdb, 0x6b7a4a, 0x23262f, 0xff5b8a].map((c) => () => P.tshirt(c, { sleeves: 0.5, length: 0.78, hood: true })));
    rail(x + 1.8, zI - 1.2, 0, [0x2f3a2a, 0x4a6fa5, 0xe2483d, 0x5a3b22].map((c) => () => P.tshirt(c, { sleeves: 0.55, length: 0.8, open: true })));
    rail(x, zI + 1.6, 0, [0x14182b, 0xff7a3d, 0x2fa37a, 0xf4f1ea, 0x8e5bd6].map((c) => () => P.tshirt(c, { sleeves: 0.5, length: 0.78, hood: true })));
    zone('hoodies', x, zI);
  }
  // ---- jeans & pants
  {
    const x = -78;
    const top = table(W, x, zI + 1.4, 5, 1.8, 0xf7f7f7, 0.85);
    for (let i = 0; i < 4; i++) place(S, P.folded([0x2b3a67, 0x7a9cc6, 0x23262f, 0xd9b38c, 0x5b6b3a].slice(i % 2, i % 2 + 4)), x - 1.7 + i * 1.15, top, zI + 1.4);
    rail(x, zI - 1.6, 0, [0x2b3a67, 0x7a9cc6, 0x23262f, 0x5b6b3a, 0xd9b38c].map((c, i) => () => P.pants(c, { shorts: i === 4 })));
    zone('pants', x, zI);
  }
  // ---- dresses & skirts
  {
    const x = -96;
    rail(x, zI - 1.6, 0, [0xff5b8a, 0xffc83d, 0x14182b, 0x2bb3e6, 0xe2483d].map((c) => () => P.dress(c)));
    rail(x, zI + 1.6, 0, [0x1d2b6b, 0xf4f1ea, 0xff7a3d, 0x8e5bd6, 0x2fa37a].map((c) => () => P.pants(c, { shorts: true })));
    zone('dresses', x, zI);
  }
  // ---- hats, sunglasses & watches
  {
    const x = -114;
    const top = table(W, x, zI - 1.2, 5, 1.6, 0xf7f7f7, 0.9);
    const hats = [P.cap(0x14182b), P.cap(0xe2483d), P.beanie(0xff7a3d), P.sunhat(0xe8d5a8), P.beanie(0x2e6fdb), P.cap(0x5be28a)];
    hats.forEach((it, i) => {
      cyl(S, 0.04, 0.3, x - 2 + i * 0.8, top, zI - 1.2, m('metal', 0xd8dde3), 6);
      place(S, it, x - 2 + i * 0.8, top + 0.3, zI - 1.2, 0);
    });
    const ctop = glassCounter(W, x, zI + 1.6, 5, 1.4);
    for (let i = 0; i < 5; i++) place(S, P.sunglasses([0x111111, 0x5a3b22, 0xd4af37, 0xe2483d, 0x2e6fdb][i]), x - 2 + i, ctop + 0.05, zI + 1.6);
    for (let i = 0; i < 4; i++) place(S, P.watch(0x14182b, [0x2a2420, 0xd4af37, 0x8b919c, 0x1d2b6b][i]), x - 1.5 + i, ctop, zI + 1.25);
    zone('hats', x, zI);
  }
  // ---- south wall: handbags (glass cubes)
  {
    const z = MALL.z1 - 1.3;
    const { ys } = wallShelves(W, -46, z, 14, 3, Math.PI, 0xfff0f5);
    const styles = ['tote', 'clutch', 'crossbody', 'bucket', 'tote', 'clutch'];
    const cols = [0xc49a6c, 0x14182b, 0xe2483d, 0xff5b8a, 0x2fa37a, 0xd4af37];
    ys.forEach((y, row) => {
      for (let i = 0; i < 5; i++) place(S, P.handbag(cols[(i + row * 2) % 6], styles[(i + row) % 6]), -51.5 + i * 2.75, y, z - 0.2, Math.PI);
    });
    for (let i = 0; i < 3; i++) { const x = -50 + i * 4; W.solid(x - 0.35, x + 0.35, z - 3.35, z - 2.65, 0, 1.4); P.plinth(S, x, z - 3, P.handbag(cols[i + 2], styles[i]), 1.1); }
    sign(S, 'HANDBAGS & PURSES', 7, 0.9, -46, 5.4, MALL.z1 - 0.9, Math.PI, { bg: '#fff0f5', fg: '#ff3d7f', glow: true });
    zone('bags', -46, z - 4.5, 6);
  }
  // ---- south wall: shoes
  {
    const z = MALL.z1 - 1.3;
    const { ys } = wallShelves(W, -70, z, 12, 4, Math.PI, 0xfff0f5);
    const cols = [0xffffff, 0xe2483d, 0x14182b, 0x2e6fdb, 0x5a3b22, 0xffc83d, 0xff5b8a];
    const styles = ['sneaker', 'sneaker', 'heel', 'sneaker', 'boot', 'sneaker', 'heel'];
    ys.forEach((y, row) => {
      for (let i = 0; i < 6; i++) place(S, P.shoePair(cols[(i + row) % 7], styles[(i + row * 3) % 7]), -74.6 + i * 1.85, y, z - 0.25, Math.PI);
    });
    for (const s of [-1, 1]) {
      W.block(2.4, 0.45, 1, -70 + s * 2.2, FLOOR, z - 3.6, m('fabric', 0xd9b38c), false);
    }
    sign(S, 'SHOES', 4, 0.9, -70, 5.4, MALL.z1 - 0.9, Math.PI, { bg: '#fff0f5', fg: '#ff3d7f', glow: true });
    zone('shoes', -70, z - 4.5, 6);
  }
  // ---- south wall: backpacks & capes
  {
    const z = MALL.z1 - 1.3;
    const { ys } = wallShelves(W, -92, z, 10, 2, Math.PI, 0xfff0f5);
    const cols = [0x2e6fdb, 0xffc83d, 0x2fa37a, 0xe2483d, 0x23262f, 0x8e5bd6];
    ys.forEach((y, row) => { for (let i = 0; i < 4; i++) place(S, P.backpack(cols[(i + row * 2) % 6]), -95.4 + i * 2.25, y, z - 0.25, Math.PI); });
    sign(S, 'BACKPACKS', 5, 0.9, -92, 5.4, MALL.z1 - 0.9, Math.PI, { bg: '#fff0f5', fg: '#ff3d7f', glow: true });
    zone('backpacks', -92, z - 4, 5.5);
  }
  // ---- fitting rooms
  {
    const z = MALL.z1 - 3;
    for (let i = 0; i < 4; i++) {
      const x = -126 + i * 4;
      W.wallBox(x - 2, x - 1.85, z - 2.8, MALL.z1 - 0.8, FLOOR, 3.2, m('smooth', 0xfff0f5));
      box(S, 3.4, 2.6, 0.06, x, FLOOR + 0.4, z - 2.8, m('fabric', [0xff5b8a, 0x8e5bd6, 0x2bb3e6, 0xffc83d][i]));
      box(S, 3.6, 0.06, 0.06, x, FLOOR + 3, z - 2.8, m('metal', 0xd8dde3));
    }
    W.wallBox(-110.15, -110, z - 2.8, MALL.z1 - 0.8, FLOOR, 3.2, m('smooth', 0xfff0f5));
    sign(S, 'FITTING ROOMS', 6, 0.8, -119, 3.9, z - 2.85, Math.PI, { bg: '#ff5b8a', fg: '#fff', glow: true });
    // full-length mirror
    box(S, 1.4, 2.6, 0.1, -108, FLOOR + 0.2, MALL.z1 - 1, new THREE.MeshStandardMaterial({ color: 0xdfe8ef, metalness: 1, roughness: 0.02 }));
  }
  // ---- mannequins along the corridor
  const looks = [
    { body: 'male', shirt: 'jacket', shirtColor: 0x2f3a2a, pants: 'jeans', pantsColor: 0x2b3a67, hat: 'cap', hatColor: 0x14182b, hair: 'bald', glasses: 'shades' },
    { body: 'female', shirt: 'dress', shirtColor: 0xff5b8a, hair: 'bald', hat: 'tophat', hatColor: 0xf4f1ea, pants: 'skirt' },
    { body: 'male', shirt: 'hoodie', shirtColor: 0xffc83d, pattern: 'logo', pants: 'joggers', pantsColor: 0x23262f, hair: 'bald', back: 'backpack', backColor: 0x2e6fdb },
    { body: 'female', shirt: 'tee', shirtColor: 0xf4f1ea, pattern: 'stripes', pants: 'skirt', pantsColor: 0x1d2b6b, hair: 'bald', hat: 'beanie', hatColor: 0xe2483d },
    { body: 'male', shirt: 'polo', shirtColor: 0x2fa37a, pants: 'shorts', pantsColor: 0xd9b38c, hair: 'bald', glasses: 'round' },
  ];
  looks.forEach((lk, i) => {
    const x = -44 - i * 18, z = -66.5;
    cyl(S, 1, 0.35, x, FLOOR, z, m('marble', 0xffffff), 24);
    W.solid(x - 0.9, x + 0.9, z - 0.9, z + 0.9, 0, FLOOR + 0.35);
    const av = buildAvatar({ ...lk, skin: 0xf2f2f2, shoes: 0x14182b }, { faceless: true });
    av.root.position.set(x, FLOOR + 0.35, z);
    av.root.rotation.y = Math.PI;
    av.armR.rotation.z = -0.25; av.armL.rotation.x = -0.3;
    S.add(av.root);
  });
  // checkout
  {
    const x = -128.5, z = -62;
    W.block(2, 1.1, 6, x, FLOOR, z, m('smooth', 0xfff0f5), false);
    box(S, 2.2, 0.06, 6.2, x, FLOOR + 1.1, z, m('wood', 0xc49a6c));
    place(S, P.monitor('shop', 0.5), x, FLOOR + 1.16, z + 1.5, Math.PI / 2);
    sign(S, 'CHECKOUT', 4, 0.8, MALL.x0 + 0.9, 4.2, z, Math.PI / 2, { bg: '#ff5b8a', fg: '#fff', glow: true });
  }
}
