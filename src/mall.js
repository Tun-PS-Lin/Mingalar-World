// Virtual Mall: browse four kiosks, add to a cart, demo checkout.
// All products are placeholders. Replace CATALOG with real data (or fetch it) later.
import { ui, h } from './ui.js';

export const CATALOG = {
  fashion: {
    name: 'Fashion', color: '#ff5b8a',
    items: [
      { id: 'f1', name: 'Block Sneakers', price: 89, icon: '👟' },
      { id: 'f2', name: 'Pixel Hoodie', price: 64, icon: '🧥' },
      { id: 'f3', name: 'Cube Cap', price: 24, icon: '🧢' },
      { id: 'f4', name: 'Voxel Shades', price: 45, icon: '🕶️' },
      { id: 'f5', name: 'Weekend Backpack', price: 72, icon: '🎒' },
      { id: 'f6', name: 'Classic Watch', price: 135, icon: '⌚' },
    ],
  },
  tech: {
    name: 'Tech', color: '#2e6fdb',
    items: [
      { id: 't1', name: 'VR Headset', price: 399, icon: '🥽' },
      { id: 't2', name: 'Wireless Buds', price: 129, icon: '🎧' },
      { id: 't3', name: 'Game Pad', price: 59, icon: '🎮' },
      { id: 't4', name: 'Slim Laptop', price: 999, icon: '💻' },
      { id: 't5', name: 'Action Camera', price: 249, icon: '📷' },
      { id: 't6', name: 'Smart Speaker', price: 149, icon: '🔊' },
    ],
  },
  home: {
    name: 'Home', color: '#2fa37a',
    items: [
      { id: 'h1', name: 'Smart Lamp', price: 79, icon: '💡' },
      { id: 'h2', name: 'Lounge Sofa', price: 640, icon: '🛋️' },
      { id: 'h3', name: 'Potted Palm', price: 39, icon: '🪴' },
      { id: 'h4', name: 'Wall Art Set', price: 95, icon: '🖼️' },
      { id: 'h5', name: 'Espresso Maker', price: 219, icon: '☕' },
      { id: 'h6', name: 'Scented Candle', price: 18, icon: '🕯️' },
    ],
  },
  play: {
    name: 'Play', color: '#ff9a2e',
    items: [
      { id: 'p1', name: 'Building Blocks', price: 49, icon: '🧱' },
      { id: 'p2', name: 'RC Racer', price: 69, icon: '🏎️' },
      { id: 'p3', name: 'Plush Buddy', price: 25, icon: '🧸' },
      { id: 'p4', name: 'Puzzle Box', price: 15, icon: '🧩' },
      { id: 'p5', name: 'Skateboard', price: 85, icon: '🛹' },
      { id: 'p6', name: 'Kite', price: 22, icon: '🪁' },
    ],
  },
};

const byId = {};
for (const [key, cat] of Object.entries(CATALOG)) for (const it of cat.items) byId[it.id] = { ...it, color: cat.color, cat: key };

const cart = new Map(); // id -> qty
const count = () => [...cart.values()].reduce((a, b) => a + b, 0);
const total = () => [...cart].reduce((a, [id, q]) => a + byId[id].price * q, 0);
const money = (n) => '$' + n.toLocaleString('en-US');

function syncChip() {
  ui.setCart(count(), () => openMall('cart'));
}

/** Open the mall panel on a category tab (or 'cart'). `zone` ties it to a kiosk. */
export function openMall(tab, zone = null) {
  const body = h('');
  let view = tab;

  const render = () => {
    const tabs = Object.entries(CATALOG)
      .map(([k, c]) => `<button class="tab ${view === k ? 'on' : ''}" data-tab="${k}">${c.name}</button>`)
      .join('') + `<button class="tab ${view === 'cart' ? 'on' : ''}" data-tab="cart">Cart (${count()})</button>`;

    let content;
    if (view === 'cart') {
      content = cart.size === 0
        ? `<div class="empty">Your cart is empty.<br>Walk up to a kiosk and add something.</div>`
        : [...cart].map(([id, q]) => {
            const it = byId[id];
            return `<div class="cart-line">
              <div class="art" style="background:${it.color}">${it.icon}</div>
              <div><div class="name">${it.name}</div><div class="price" style="color:var(--accent)">${money(it.price)}</div></div>
              <div class="qty"><button data-dec="${id}">−</button>${q}<button data-inc="${id}">+</button></div>
            </div>`;
          }).join('') +
          `<div class="row spread total"><span>Total</span><span>${money(total())}</span></div>
           <button class="btn wide" data-checkout>Checkout</button>
           <div class="note">Demo store. No payment is taken and nothing is ordered.</div>`;
    } else {
      const cat = CATALOG[view];
      content = `<div class="grid">` + cat.items.map((it) => `
        <div class="product">
          <div class="art" style="background:${cat.color}">${it.icon}</div>
          <div class="name">${it.name}</div>
          <div class="row spread">
            <span class="price">${money(it.price)}</span>
            <button class="btn small" data-add="${it.id}">Add${cart.has(it.id) ? ` · ${cart.get(it.id)}` : ''}</button>
          </div>
        </div>`).join('') + `</div>`;
    }
    body.innerHTML = `<div class="tabs">${tabs}</div>${content}`;
  };

  body.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (d.tab) view = d.tab;
    else if (d.add) { cart.set(d.add, (cart.get(d.add) || 0) + 1); ui.toast(`${byId[d.add].name} added to cart`, 1400); }
    else if (d.inc) cart.set(d.inc, cart.get(d.inc) + 1);
    else if (d.dec) { const q = cart.get(d.dec) - 1; q > 0 ? cart.set(d.dec, q) : cart.delete(d.dec); }
    else if ('checkout' in d) { cart.clear(); ui.toast('Demo checkout complete. Thanks for shopping!'); }
    else return;
    syncChip();
    render();
  });

  render();
  ui.openPanel({ kicker: 'Virtual Mall', title: view === 'cart' ? 'Your cart' : 'Browse the shelves', body, zone });
}
