// Thin wrapper around the DOM overlay. The 3D world never touches the DOM directly.
const $ = (id) => document.getElementById(id);

const el = {
  prompt: $('prompt'), hudTop: $('hud-top'), hint: $('hint'), power: $('power'), fill: $('power-fill'),
  toasts: $('toasts'), panel: $('panel'), kicker: $('panel-kicker'), title: $('panel-title'),
  body: $('panel-body'), close: $('panel-close'), cart: $('cart-chip'), help: $('help'), helpBtn: $('help-btn'),
};

let promptText = null;
let promptTap = null;
let current = null; // open panel descriptor

el.prompt.addEventListener('click', () => promptTap && promptTap());
el.close.addEventListener('click', () => ui.closePanel());
el.helpBtn.addEventListener('click', () => { el.help.hidden = !el.help.hidden; });

export const ui = {
  /** Show "[E] label" at the bottom, or hide with null. */
  prompt(label, onTap, touch) {
    if (label === promptText) return;
    promptText = label;
    promptTap = onTap || null;
    el.prompt.hidden = !label;
    if (label) el.prompt.innerHTML = `<kbd>${touch ? 'TAP' : 'E'}</kbd>${label}`;
  },

  toast(text, ms = 2200) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    el.toasts.appendChild(t);
    while (el.toasts.children.length > 3) el.toasts.firstChild.remove();
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 320); }, ms);
  },

  /** Top-centre status pill (used by mini-games). */
  hud(html) {
    el.hudTop.hidden = !html;
    if (html) el.hudTop.innerHTML = html;
    return el.hudTop;
  },
  hint(text) { el.hint.hidden = !text; el.hint.textContent = text || ''; },
  power(v) {
    el.power.hidden = v === null;
    if (v !== null) el.fill.style.width = Math.round(v * 100) + '%';
  },

  setHelp(html) { el.help.innerHTML = html; },
  hideHelp() { el.help.hidden = true; },

  setCart(count, onClick) {
    el.cart.hidden = count === 0;
    el.cart.textContent = `🛒 ${count}`;
    el.cart.onclick = onClick;
  },

  /** Open the side panel. `zone` (optional) lets the game close it when you walk away. */
  openPanel({ kicker = '', title, body, zone = null, onClose = null }) {
    if (current && current.onClose) current.onClose();
    current = { zone, onClose };
    el.kicker.textContent = kicker;
    el.title.textContent = title;
    el.body.replaceChildren(body);
    el.body.scrollTop = 0;
    el.panel.hidden = false;
    document.body.classList.add('panel-open');
  },
  closePanel() {
    if (!current) return false;
    const c = current;
    current = null;
    el.panel.hidden = true;
    document.body.classList.remove('panel-open');
    if (document.activeElement && el.panel.contains(document.activeElement)) document.activeElement.blur();
    if (c.onClose) c.onClose();
    return true;
  },
  /** Fade to black, run `mid` while the screen is dark, then fade back in. */
  fade(mid, ms = 380) {
    const f = document.getElementById('fade');
    if (f.classList.contains('on')) return false;
    f.classList.add('on');
    setTimeout(() => {
      try { mid(); } finally { setTimeout(() => f.classList.remove('on'), 60); }
    }, ms);
    return true;
  },

  get panelZone() { return current ? current.zone : null; },
  get panelOpen() { return !!current; },
};

/** Build an element from an HTML string. */
export function h(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d;
}
