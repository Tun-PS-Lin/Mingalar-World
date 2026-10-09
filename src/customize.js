// Avatar editor: body, skin, face, hair, clothes and accessories. Changes apply
// live to the player; the look is saved in localStorage.
import { DEFAULT_LOOK, OPTIONS, SKINS, COLORS, HAIR_COLORS } from './avatar.js';
import { ui, h } from './ui.js';
import { hex } from './builders.js';

const KEY = 'mw-avatar-v1';

export function loadLook() {
  try { return { ...DEFAULT_LOOK, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch { return { ...DEFAULT_LOOK }; }
}
export function saveLook(look) {
  try { localStorage.setItem(KEY, JSON.stringify(look)); } catch { /* private mode */ }
}

const PRESETS = [
  { name: 'Classic', look: { ...DEFAULT_LOOK } },
  { name: 'Street', look: { ...DEFAULT_LOOK, hair: 'spiky', hairColor: 0x14110f, shirt: 'hoodie', shirtColor: 0x23262f, pattern: 'logo', pants: 'joggers', pantsColor: 0x23262f, shoes: 0xe2483d, hat: 'none', glasses: 'shades' } },
  { name: 'Sunny', look: { ...DEFAULT_LOOK, body: 'female', hair: 'ponytail', hairColor: 0xe8c070, face: 'cute', shirt: 'tee', shirtColor: 0xffc83d, pattern: 'star', pants: 'skirt', pantsColor: 0x2bb3e6, shoes: 0xffffff } },
  { name: 'Formal', look: { ...DEFAULT_LOOK, hair: 'short', shirt: 'jacket', shirtColor: 0x14182b, pants: 'jeans', pantsColor: 0x23262f, shoes: 0x14110f, hat: 'tophat', hatColor: 0x14182b } },
  { name: 'Hero', look: { ...DEFAULT_LOOK, body: 'female', hair: 'long', hairColor: 0xe2483d, face: 'determined', shirt: 'tee', shirtColor: 0x2e6fdb, pattern: 'star', pants: 'joggers', pantsColor: 0x2e6fdb, back: 'cape', backColor: 0xe2483d } },
];

const TABS = [
  ['body', '🧍 Body'], ['hair', '💇 Hair'], ['top', '👕 Top'], ['bottom', '👖 Bottom'], ['extras', '🎩 Extras'],
];

/**
 * Open the editor. `apply(look)` rebuilds the player; `onClose` restores the camera.
 */
export function openCustomizer(getLook, apply, onClose) {
  let tab = 'body';
  let look = { ...getLook() };
  const body = h('');
  const set = (patch) => { look = { ...look, ...patch }; apply(look); saveLook(look); render(); };

  const choice = (key) => `<div class="opts">${OPTIONS[key].map(([v, l]) => `<button class="opt ${look[key] === v ? 'on' : ''}" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const swatches = (key, list) => `<div class="swatches">${list.map((c) => `<button class="swatch ${look[key] === c ? 'on' : ''}" data-k="${key}" data-c="${c}" style="background:${hex(c)}" aria-label="${hex(c)}"></button>`).join('')}</div>`;
  const label = (t) => `<div class="label">${t}</div>`;

  const render = () => {
    let content = '';
    if (tab === 'body') {
      content = label('Body') + choice('body') + label('Skin tone') + swatches('skin', SKINS) + label('Face') + choice('face') +
        label('Presets') + `<div class="opts">${PRESETS.map((p, i) => `<button class="opt" data-preset="${i}">${p.name}</button>`).join('')}</div>`;
    } else if (tab === 'hair') {
      content = label('Hair style') + choice('hair') + label('Hair colour') + swatches('hairColor', HAIR_COLORS);
    } else if (tab === 'top') {
      content = label('Top') + choice('shirt') + label('Colour') + swatches('shirtColor', COLORS) + label('Design') + choice('pattern');
    } else if (tab === 'bottom') {
      content = label('Bottoms') + choice('pants') + label('Colour') + swatches('pantsColor', COLORS) + label('Shoes') + swatches('shoes', COLORS);
    } else {
      content = label('Hat') + choice('hat') + (look.hat !== 'none' ? label('Hat colour') + swatches('hatColor', COLORS) : '') +
        label('Glasses') + choice('glasses') + label('Back') + choice('back') + (look.back !== 'none' ? label('Back colour') + swatches('backColor', COLORS) : '');
    }
    body.innerHTML = `<div class="tabs">${TABS.map(([k, l]) => `<button class="tab ${tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>${content}
      <div class="row" style="margin-top:16px"><button class="btn ghost" data-random style="flex:1">🎲 Randomise</button><button class="btn" data-done style="flex:1">Done</button></div>
      <div class="note">Drag on the scene to spin the camera around your avatar.</div>`;
  };

  body.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (d.tab) { tab = d.tab; render(); return; }
    if (d.preset) { set(PRESETS[+d.preset].look); return; }
    if ('done' in d) { ui.closePanel(); return; }
    if ('random' in d) {
      const pick = (a) => a[Math.floor(Math.random() * a.length)];
      const opt = (k) => pick(OPTIONS[k])[0];
      set({
        body: opt('body'), skin: pick(SKINS), face: opt('face'), hair: opt('hair'), hairColor: pick(HAIR_COLORS),
        shirt: opt('shirt'), shirtColor: pick(COLORS), pattern: opt('pattern'), pants: opt('pants'), pantsColor: pick(COLORS),
        shoes: pick(COLORS), hat: Math.random() < 0.4 ? opt('hat') : 'none', hatColor: pick(COLORS),
        glasses: Math.random() < 0.3 ? opt('glasses') : 'none', back: Math.random() < 0.3 ? opt('back') : 'none', backColor: pick(COLORS),
      });
      return;
    }
    if (d.c) set({ [d.k]: +d.c });
    else if (d.k) set({ [d.k]: d.v });
  });
  render();
  ui.openPanel({ kicker: 'Avatar', title: 'Customise your character', body, zone: 'customize', onClose });
}
