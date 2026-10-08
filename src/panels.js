// Lighter interactions: garage showroom, home gallery, office reception.
// All copy is placeholder content.
import { ui, h } from './ui.js';

// ------------------------------------------------------------------ garage
const PAINTS = [0xe2483d, 0x2e6fdb, 0xffc83d, 0x23262f, 0xf4f1ea, 0x2fa37a, 0x8e5bd6, 0xff7a3d];
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export function openGarage(world, zone) {
  const cars = world.refs.cars;
  const g = world.refs.garage;
  const body = h('');
  const render = () => {
    const c = cars[g.selected];
    const cur = c.bodyMat.color.getHex();
    body.innerHTML = `
      <div class="row spread" style="margin-bottom:6px">
        <button class="btn ghost small" data-step="-1">◀ Prev</button>
        <span class="label">${g.selected + 1} of ${cars.length}</span>
        <button class="btn ghost small" data-step="1">Next ▶</button>
      </div>
      <h3 style="font-size:24px;margin:10px 0 0">${c.name}</h3>
      <div class="specs">
        <div class="spec"><b>${c.top}</b><span>Top speed</span></div>
        <div class="spec"><b>${c.zero}</b><span>0–100</span></div>
        <div class="spec"><b>${c.range}</b><span>Range</span></div>
      </div>
      <div class="label">Paint</div>
      <div class="swatches">${PAINTS.map((p) => `<button class="swatch ${p === cur ? 'on' : ''}" data-paint="${p}" style="background:${hex(p)}" aria-label="Paint ${hex(p)}"></button>`).join('')}</div>
      <p>The selected car spins on its turntable. Pick a colour and watch it repaint live in the showroom.</p>
      <div class="note">Placeholder models and figures.</div>`;
  };
  body.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.step) g.selected = (g.selected + +b.dataset.step + cars.length) % cars.length;
    else if (b.dataset.paint) cars[g.selected].bodyMat.color.setHex(+b.dataset.paint);
    else return;
    render();
  });
  render();
  g.panelOpen = true;
  ui.openPanel({ kicker: 'Virtual Garage', title: 'Showroom', body, zone, onClose: () => { g.panelOpen = false; } });
}

// ------------------------------------------------------------ home gallery
const ROOMS = [
  { name: 'Living Room', icon: '🛋️', bg: 'linear-gradient(135deg,#ffb36b,#ff5b8a)', text: 'Double-height glass wall facing the garden, with a sunken lounge and fireplace.', tags: ['72 m²', 'Smart lighting', 'Garden view'] },
  { name: 'Chef’s Kitchen', icon: '🍳', bg: 'linear-gradient(135deg,#5be2c0,#2e6fdb)', text: 'Stone island, integrated appliances and a walk-in pantry behind a hidden door.', tags: ['Island seating', 'Wine wall', 'Pantry'] },
  { name: 'Master Suite', icon: '🛏️', bg: 'linear-gradient(135deg,#b69cff,#5b5bd6)', text: 'Corner suite with a private balcony, dressing room and spa bathroom.', tags: ['Balcony', 'Dressing room', 'Spa bath'] },
  { name: 'Home Cinema', icon: '🎬', bg: 'linear-gradient(135deg,#3b3f73,#14182b)', text: 'Eight reclining seats, acoustic panelling and a starlight ceiling.', tags: ['8 seats', '4K laser', 'Soundproofed'] },
  { name: 'Roof Terrace', icon: '🌇', bg: 'linear-gradient(135deg,#ffc83d,#ff7a3d)', text: 'Open-air lounge with an outdoor kitchen and sunset views over the town.', tags: ['Outdoor kitchen', 'Fire pit', 'Solar roof'] },
];

export function openHome(world, zone) {
  const glass = world.refs.homeGlass;
  let i = 0;
  const body = h('');
  const render = () => {
    const r = ROOMS[i];
    const lit = glass.emissiveIntensity > 0;
    body.innerHTML = `
      <div class="slide" style="background:${r.bg}">${r.icon}<span class="count">${i + 1} / ${ROOMS.length}</span></div>
      <h3 style="font-size:22px;margin:0 0 6px">${r.name}</h3>
      <p>${r.text}</p>
      <div class="chips">${r.tags.map((t) => `<span class="chip">${t}</span>`).join('')}</div>
      <div class="row">
        <button class="btn ghost" data-step="-1">◀</button>
        <button class="btn ghost" data-step="1">▶</button>
        <button class="btn" data-lights style="flex:1">${lit ? 'Turn house lights off' : 'Turn house lights on'}</button>
      </div>
      <div class="note">Placeholder rooms. Swap in real photos or renders later.</div>`;
  };
  body.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.step) i = (i + +b.dataset.step + ROOMS.length) % ROOMS.length;
    else if ('lights' in b.dataset) glass.emissiveIntensity = glass.emissiveIntensity > 0 ? 0 : 1.1;
    render();
  });
  render();
  ui.openPanel({ kicker: 'Luxury Home', title: 'Gallery tour', body, zone });
}

// ------------------------------------------------------------------ office
export function openOffice(zone) {
  const body = h(`
    <p>Welcome to reception. This is where visitors learn who you are and how to reach you.</p>
    <div class="service"><b>Consulting</b><span>Short description of your first service.</span></div>
    <div class="service"><b>Virtual tours</b><span>Short description of your second service.</span></div>
    <div class="service"><b>Partnerships</b><span>Short description of your third service.</span></div>
    <div class="label" style="margin:16px 0 8px">Leave a message</div>
    <input class="field" name="name" placeholder="Your name" autocomplete="off" />
    <textarea class="field" name="msg" rows="3" placeholder="How can we help?"></textarea>
    <button class="btn wide" data-send>Send</button>
    <div class="note">Demo form. Nothing is sent or stored.</div>`);
  body.addEventListener('click', (e) => {
    if (!e.target.closest('[data-send]')) return;
    const name = body.querySelector('[name=name]').value.trim();
    ui.toast(name ? `Thanks, ${name}! (demo, nothing was sent)` : 'Add your name first');
    if (name) { body.querySelector('[name=msg]').value = ''; }
  });
  ui.openPanel({ kicker: 'Virtual Office', title: 'Reception', body, zone });
}
