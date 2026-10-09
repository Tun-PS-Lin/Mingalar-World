// Townsfolk: a few avatars strolling round the pavements of each block.
// They are purely cosmetic (no collision) and are skipped when far away.
import { buildAvatar, OPTIONS, SKINS, COLORS, HAIR_COLORS } from './avatar.js';
import { seeded, dampAngle } from './builders.js';

// pavement loops, 0.9 m in from each kerb (clear of lamps, bins and bus stops)
const E = 0.9;
const LOOPS = [
  [-146 + E, -7 - E, -126 + E, -7 - E],
  [7 + E, 146 - E, -126 + E, -7 - E],
  [-146 + E, -7 - E, 7 + E, 126 - E],
  [7 + E, 146 - E, 7 + E, 126 - E],
];

export function spawnTownsfolk(scene, count = 8) {
  const rnd = seeded(2024);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const people = [];
  for (let i = 0; i < count; i++) {
    const [x0, x1, z0, z1] = LOOPS[i % LOOPS.length];
    const pts = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
    const female = rnd() < 0.5;
    const av = buildAvatar({
      body: female ? 'female' : 'male', skin: pick(SKINS), face: pick(OPTIONS.face)[0],
      hair: female ? pick(['long', 'ponytail', 'bun', 'pigtails', 'curly']) : pick(['short', 'spiky', 'curly', 'mohawk']),
      hairColor: pick(HAIR_COLORS), shirt: pick(['tee', 'hoodie', 'jacket', 'polo']), shirtColor: pick(COLORS), pattern: pick(OPTIONS.pattern)[0],
      pants: female ? pick(['jeans', 'skirt', 'shorts']) : pick(['jeans', 'joggers', 'shorts']), pantsColor: pick(COLORS), shoes: pick(COLORS),
      hat: rnd() < 0.3 ? pick(['cap', 'beanie']) : 'none', hatColor: pick(COLORS), glasses: rnd() < 0.2 ? 'shades' : 'none',
      back: rnd() < 0.2 ? 'backpack' : 'none', backColor: pick(COLORS),
    });
    scene.add(av.root);
    const perim = 2 * (x1 - x0 + z1 - z0);
    people.push({
      av, pts, perim, s: rnd() * perim, speed: 2.6 + rnd() * 1.2, dir: i % 2 ? 1 : -1,
      phase: rnd() * 6, heading: 0, pause: 0,
    });
  }

  const at = (p, s) => {
    let d = ((s % p.perim) + p.perim) % p.perim;
    for (let k = 0; k < 4; k++) {
      const a = p.pts[k], b = p.pts[(k + 1) % 4];
      const len = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
      if (d <= len) { const t = d / len; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
      d -= len;
    }
    return p.pts[0];
  };

  return (dt, cam, player) => {
    for (const p of people) {
      const [x, z] = at(p, p.s);
      const far = Math.hypot(x - cam.x, z - cam.z) > 110;
      p.av.root.visible = !far;
      // politely wait if the player is right in front
      const blocked = Math.hypot(x - player.x, z - player.z) < 1.6;
      if (!blocked) p.s += p.speed * p.dir * dt;
      if (far) continue;
      const [nx, nz] = at(p, p.s + p.dir * 0.8);
      p.heading = dampAngle(p.heading, Math.atan2(nx - x, nz - z), 6, dt);
      p.av.root.position.set(x, 0.15, z);
      p.av.root.rotation.y = p.heading;
      // walk cycle
      const moving = !blocked;
      if (moving) p.phase += dt * p.speed * 1.25;
      const s = moving ? Math.sin(p.phase) * 0.6 : 0;
      p.av.legL.rotation.x = s; p.av.legR.rotation.x = -s;
      p.av.armL.rotation.x = -s; p.av.armR.rotation.x = s;
      p.av.body.position.y = p.av.chest + (moving ? Math.abs(Math.cos(p.phase)) * 0.05 : 0);
    }
  };
}
