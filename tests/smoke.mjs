// Smoke + performance test: builds nothing itself; serves ./dist with `vite preview`,
// drives every area of the game in headless Chromium, takes screenshots, checks for
// errors and reports draw calls / triangles / simulation cost per area.
//
//   npm run build && npm test            (screenshots land in tests/out/)
//   CHROME=/path/to/chrome npm test      (use a specific browser)
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = new URL('./out/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4179;
const vite = new URL('../node_modules/vite/bin/vite.js', import.meta.url).pathname;
const server = spawn(process.execPath, [vite, 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
process.on('exit', () => server.kill());
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('preview server did not start')), 20000);
  server.stdout.on('data', (d) => { if (String(d).includes(String(PORT))) { clearTimeout(t); res(); } });
  server.stderr.on('data', (d) => process.stderr.write(d));
});

const exe = process.env.CHROME || ['/opt/pw-browsers/chromium'].find(Boolean);
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const problems = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));

const results = [];
let failed = false;
const check = (ok, msg) => { if (!ok) { failed = true; console.log('  ✗ ' + msg); } else console.log('  ✓ ' + msg); };

await page.goto(`http://localhost:${PORT}/?debug`);
await page.waitForFunction(() => window.__game && window.__game.player && !document.getElementById('start-btn').disabled, null, { timeout: 60000 });
const boot = await page.evaluate(() => ({ buildMs: __game.buildMs, merged: __game.mergedMeshes }));
console.log(`World built in ${boot.buildMs} ms (${boot.merged} merged static meshes)`);
await page.click('#start-btn');
await page.waitForTimeout(1500);

/** Run `setup` in the page, let it settle, then measure + screenshot. */
async function scene(name, setup, wait = 1500) {
  console.log(`• ${name}`);
  const r = await page.evaluate(setup);
  await page.waitForTimeout(wait);
  const stats = await page.evaluate(() => {
    const g = __game;
    // simulation cost: run the update loop without rendering
    const t0 = performance.now();
    for (let i = 0; i < 120; i++) g.update(1 / 60);
    const sim = (performance.now() - t0) / 120;
    g.renderer.info.autoReset = false;
    g.renderer.info.reset();
    g.renderer.render(g.scene, g.camera);
    const info = { calls: g.renderer.info.render.calls, tris: g.renderer.info.render.triangles };
    g.renderer.info.autoReset = true;
    return { ...info, sim: +sim.toFixed(2), mode: g.mode, geos: g.renderer.info.memory.geometries, tex: g.renderer.info.memory.textures };
  });
  await page.screenshot({ path: `${OUT}${name}.png` });
  results.push({ name, ...stats });
  return r;
}

const P = (x, y, z, yaw) => `(() => { const g = __game; g.player.teleport(${x}, ${y}, ${z}, ${yaw} + Math.PI); g.cam.yaw = ${yaw}; g.cam.pitch = 0.25; g.cam.target.set(${x}, ${y} + 2, ${z}); })()`;

await scene('01-spawn', P(0, 0.2, -112, Math.PI));
await scene('02-city-overview', `(() => { const g = __game; g.player.teleport(0, 0.2, -40, 0); g.cam.yaw = 2.4; g.cam.pitch = 0.9; g.cam.dist = 24; })()`);
await scene('03-mall-entrance', P(-14, 0.25, -76, -Math.PI / 2));
await scene('04-mall-tech', P(-50, 0.25, -78, 0.4));
await scene('05-mall-fashion', P(-50, 0.25, -74, Math.PI - 0.4));
const mall = await scene('06-mall-display-panel', `(() => { const g = __game; g.cam.dist = 11; g.player.teleport(-42, 0.25, -51, 0); g.debug.zone('mall:tees'); return document.getElementById('panel').hidden === false; })()`);
check(mall, 'mall display panel opens');
const tryOn = await page.evaluate(() => { const b = document.querySelector('[data-wear]'); b.click(); return __game.player.av.look.shirt; });
check(tryOn === 'tee', 'try-on changes the avatar');
await page.evaluate(() => document.querySelector('[data-add]').click());
check(await page.evaluate(() => !document.getElementById('cart-chip').hidden), 'cart chip appears after adding to cart');
await page.keyboard.press('Escape');

await scene('07-garage-front', P(-85, 0.2, 8, Math.PI));
await scene('08-garage-showroom', P(-85, 0.25, 32, Math.PI - 0.3));
const mods = await scene('09-garage-mods', `(() => { const g = __game; g.player.teleport(-85, 0.25, 36, 0); g.cam.yaw = Math.PI; g.debug.zone('car:vortex');
  const c = g.world.refs.garage.cars.find((q) => q.kind === 'vortex');
  document.querySelector('[data-k="spoiler"][data-v="gt"]').click();
  document.querySelector('[data-k="underglow"][data-v="cyan"]').click();
  document.querySelector('[data-k="wheels"][data-v="turbine"]').click();
  return c.mods.spoiler + ',' + c.mods.underglow + ',' + c.mods.wheels; })()`);
check(mods === 'gt,cyan,turbine', 'garage mods apply to the car');

const race = await scene('10-race-grid', `(() => { const g = __game; document.querySelector('[data-race]').click(); return true; })()`, 2500);
check(await page.evaluate(() => __game.mode === 'race'), 'race starts from the garage');
await page.evaluate(() => { __game.race.countdown = 1.21; __game.controls.keys.add('KeyW'); });
await page.waitForTimeout(500);
await page.evaluate(() => { for (let i = 0; i < 300; i++) __game.update(1 / 60); });
const raced = await page.evaluate(() => ({ prog: __game.race.me.prog, speed: __game.race.me.vf, ai: __game.race.cars.filter((c) => c.ai).map((c) => c.prog) }));
check(raced.prog > 20 && raced.speed > 5, `player car drives (progress ${raced.prog}, ${Math.round(raced.speed * 3.6)} km/h)`);
check(raced.ai.every((p) => p > 30), `AI rivals drive (${raced.ai.join(', ')})`);
await scene('11-race-chase', `(() => 1)()`, 600);
await scene('12-race-cockpit', `(() => { __game.race.toggleView(); return 1; })()`, 600);
// full lap sanity: simulate until a lap completes (steer with a simple autopilot)
const lap = await page.evaluate(() => {
  const g = __game, r = g.race, tr = r.track;
  r.view = 'chase';
  for (let i = 0; i < 60 * 120 && r.me.lap < 1; i++) {
    const me = r.me, k = (me.k + 12) % tr.N, p = tr.pts[k];
    const want = Math.atan2(p.x - me.x, p.z - me.z);
    const err = Math.atan2(Math.sin(want - me.h), Math.cos(want - me.h));
    g.controls.keys.delete('KeyA'); g.controls.keys.delete('KeyD');
    if (err > 0.05) g.controls.keys.add('KeyA'); else if (err < -0.05) g.controls.keys.add('KeyD');
    g.update(1 / 60);
  }
  g.controls.keys.clear();
  return { lap: r.me.lap, t: r.me.lapTimes[0] };
});
check(lap.lap >= 1, `a full lap completes (${lap.t ? lap.t.toFixed(1) + ' s' : 'no time'})`);
await page.evaluate(() => { __game.race.exit(); __game.returnFromRace(); });
check(await page.evaluate(() => __game.mode === 'walk'), 'leaving the race returns to walking');

await scene('13-office-exterior', P(5, 0.2, -72, -Math.PI / 2 + 0.3));
await page.evaluate(() => __game.debug.zone('office-enter'));
await page.waitForTimeout(900);
check(await page.evaluate(() => __game.player.pos.x > 2900), 'E at the office door goes inside');
await scene('14-office-inside', `(() => { const g = __game; g.cam.yaw = -Math.PI / 2 + 0.01; g.cam.pitch = 0.35; g.cam.dist = 14; })()`);
await scene('15-office-map-corner', `(() => { const g = __game; g.player.teleport(2982, 0, -6, Math.PI); g.cam.yaw = 0.2; g.cam.pitch = 0.3; g.cam.dist = 11; })()`);
await scene('16-office-news-corner', `(() => { const g = __game; g.player.teleport(3020, 0, -4, Math.PI); g.cam.yaw = -0.1; g.cam.pitch = 0.25; })()`);
await scene('17-office-github-corner', `(() => { const g = __game; g.player.teleport(3020, 0, 4, 0); g.cam.yaw = Math.PI; g.cam.pitch = 0.25; })()`);
const link = await page.evaluate(() => { __game.player.teleport(3020, 0, 11.5, 0); __game.debug.zone('link:github'); return document.querySelector('#panel a.link')?.href; });
check(link === 'https://github.com/Tun-PS-Lin', 'GitHub corner links to the profile');
const links = await page.evaluate(() => { const out = []; for (const id of ['link:map', 'link:news']) { __game.debug.zone(id); out.push(document.querySelector('#panel a.link')?.href); } return out; });
check(links[0] === 'https://map.alacrityresearch.xyz/' && links[1] === 'https://mingalar.news/', 'map and news corners link out');
await page.keyboard.press('Escape');
await page.evaluate(() => __game.debug.zone('office-exit'));
await page.waitForTimeout(900);
check(await page.evaluate(() => __game.player.pos.x < 100), 'exit takes you back to the street');

await scene('18-gunrange-front', P(40, 0.2, 8, Math.PI));
await page.evaluate(() => { __game.player.teleport(40, 0.25, 30, 0); __game.debug.zone('range'); document.querySelector('[data-w="rifle"]').click(); });
await page.waitForTimeout(900);
check(await page.evaluate(() => __game.mode === 'range'), 'gun range round starts');
const shots = await page.evaluate(() => {
  const g = __game, r = g.range;
  g.view = 'first'; // straight down lane 3 from the eye
  for (let i = 0; i < 30; i++) g.update(1 / 60);
  g.camera.updateMatrixWorld();
  for (let i = 0; i < 6; i++) { r.cool = 0; r._shoot(); g.cam.pitch = 0.02; for (let j = 0; j < 10; j++) g.update(1 / 60); g.camera.updateMatrixWorld(); }
  return { shots: r.shots, hits: r.hits, score: r.score };
});
check(shots.shots === 6 && shots.hits > 0, `firing hits targets (${shots.hits}/${shots.shots} hits, score ${shots.score})`);
await scene('19-gunrange-first-person', `(() => { __game.view = 'first'; return 1; })()`, 600);
await scene('20-gunrange-third-person', `(() => { __game.view = 'third'; return 1; })()`, 600);
await page.evaluate(() => __game.range.exit());

await scene('21-customize', `(() => { const g = __game; g.player.teleport(0, 0.2, -60, 0); g.debug.customize(); document.querySelector('[data-tab="hair"]').click(); document.querySelector('[data-k="hair"][data-v="long"]').click(); return g.player.av.look.hair; })()`);
check(await page.evaluate(() => __game.player.av.look.hair === 'long'), 'customiser changes the hair');
await page.evaluate(() => { document.querySelector('[data-tab="body"]').click(); document.querySelector('[data-k="body"][data-v="female"]').click(); });
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}22-customize-female.png` });
await page.keyboard.press('Escape');

await scene('23-first-person-walk', `(() => { const g = __game; g.view = 'first'; g.player.teleport(-20, 0.2, -76, -Math.PI / 2); g.cam.yaw = Math.PI / 2; g.cam.pitch = 0; return 1; })()`);
await page.evaluate(() => { __game.view = 'third'; });
await scene('24-home-pool', P(110, 0.2, -76, 0.4));
await scene('25-golf-gym', P(100, 0.2, 60, 2.6));
await scene('26-raceway-from-wall', `(() => { const g = __game; g.player.teleport(160, 0.2, -140, 0); g.cam.yaw = -2.3; g.cam.pitch = 0.5; g.cam.dist = 22; })()`);
await page.click('#minimap-toggle');
check(await page.evaluate(() => document.getElementById('minimap').classList.contains('min')), 'minimap minimises');
await page.click('#minimap-open');

console.log('\nArea                         draws   tris(k)  sim ms/frame');
for (const r of results) console.log(`${r.name.padEnd(28)} ${String(r.calls).padStart(5)}  ${String(Math.round(r.tris / 1000)).padStart(7)}  ${String(r.sim).padStart(6)}`);
const worst = results.reduce((a, b) => (b.calls > a.calls ? b : a));
const worstTris = results.reduce((a, b) => (b.tris > a.tris ? b : a));
const worstSim = results.reduce((a, b) => (b.sim > a.sim ? b : a));
check(worst.calls < 400, `draw calls stay low (max ${worst.calls} at ${worst.name})`);
check(worstTris.tris < 3e6, `triangles stay under 3M (max ${Math.round(worstTris.tris / 1000)}k at ${worstTris.name})`);
check(worstSim.sim < 4, `simulation under 4 ms/frame (max ${worstSim.sim} ms at ${worstSim.name})`);
const errs = problems.filter((p) => !/GPU stall|swiftshader|ReadPixels|WebGL.*(lost|performance)/i.test(p));
check(errs.length === 0, `no console errors or warnings${errs.length ? ':\n    ' + errs.slice(0, 10).join('\n    ') : ''}`);

await browser.close();
server.kill();
console.log(failed ? '\nSMOKE TEST FAILED' : '\nAll checks passed');
process.exit(failed ? 1 : 0);
