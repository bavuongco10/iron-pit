// Automated smoke test: node test.mjs  (needs playwright 1.x installed globally)
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const srv = createServer((req, res) => { res.setHeader('content-type','text/html'); res.end(readFileSync(new URL('./index.html', import.meta.url))); }).listen(0);
const url = `http://localhost:${srv.address().port}/`;
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: {width: 1024, height: 640} });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type()==='error' && errors.push(m.text()));
await page.goto(url);
await page.waitForFunction(() => window.__game, null, { timeout: 20000 });

// menu: difficulty buttons + descriptions
for (const d of ['easy','normal','hard','nightmare']) {
  await page.click(`button[data-d=${d}]`);
  assert.equal(await page.getAttribute(`button[data-d=${d}]`, 'class'), 'sel');
  assert.ok((await page.textContent('#ddesc')).length > 5, `desc for ${d}`);
}
await page.click('button[data-d=hard]');
await page.click('#start');
const st = await page.evaluate(() => ({state: __game.G.state, hp: __game.G.enemy.hp, diff: __game.G.diffName, hud: document.getElementById('hud').className, ov: getComputedStyle(document.getElementById('overlay')).display}));
assert.deepEqual(st, {state:'play', hp:160, diff:'hard', hud:'on', ov:'none'});
assert.equal(await page.textContent('#diff'), 'HARD');

// movement & turning via arrow keys
const p0 = await page.evaluate(() => ({...__game.G.player.pos, yaw: __game.G.player.yaw}));
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(400); await page.keyboard.up('ArrowUp');
await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(300); await page.keyboard.up('ArrowLeft');
const p1 = await page.evaluate(() => ({...__game.G.player.pos, yaw: __game.G.player.yaw}));
assert.ok(p1.z < p0.z - 0.5, `moved forward ${p0.z} -> ${p1.z}`);
assert.ok(p1.yaw > p0.yaw + 0.3, `turned ${p0.yaw} -> ${p1.yaw}`);

// wall collision: run into the north wall and stay inside the arena
await page.evaluate(() => { __game.G.player.yaw = 0; __game.G.player.pos.set(0,1.6,-15); });
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(2500); await page.keyboard.up('ArrowUp');
const z = await page.evaluate(() => __game.G.player.pos.z);
assert.ok(z > -22 && z <= -20.5, `clamped at wall z=${z}`);

// shooting with space: ammo drops, enemy takes damage when aimed
await page.evaluate(() => { __game.G.player.pos.set(0,1.6,10); __game.G.enemy.pos.set(0,0,-2); __game.G.player.ammo = 12; __game.G.player.fireCd = 0; __game.aimAtEnemy(); __game.step(0.016); });
const hit = await page.evaluate(() => __game.playerShoot());
const after = await page.evaluate(() => ({ammo: __game.G.player.ammo, hp: __game.G.enemy.hp}));
assert.equal(hit, true, 'raycast hit enemy'); assert.equal(after.ammo, 11); assert.ok(after.hp <= 140, `enemy damaged ${after.hp}`);
await page.keyboard.down('Space'); await page.waitForTimeout(600); await page.keyboard.up('Space');
assert.ok((await page.evaluate(() => __game.G.player.ammo)) < 11, 'space bar fires');

// reload: empty the mag, wait, mag refilled
await page.evaluate(() => { __game.G.player.ammo = 1; __game.G.player.fireCd = 0; __game.playerShoot(); });
assert.ok((await page.evaluate(() => __game.G.player.reload)) > 0, 'auto reload started');
await page.waitForTimeout(1500);
assert.equal(await page.evaluate(() => __game.G.player.ammo), 12, 'reloaded');

// enemy shoots and hurts the player over time
await page.evaluate(() => { __game.G.player.pos.set(0,1.6,6); __game.G.enemy.pos.set(0,0,-2); __game.G.player.hp = 10000; });
await page.waitForTimeout(4000);
const ph = await page.evaluate(() => __game.G.player.hp);
assert.equal(await page.evaluate(() => __game.G.state), 'play', 'still alive during enemy-fire window');
assert.ok(ph < 10000, `enemy dealt damage, hp=${ph}`);
assert.ok((await page.evaluate(() => __game.G.enemy.pos.distanceTo(new __game.THREE.Vector3(0,0,-2)))) > 0.3, 'enemy moves');

await page.evaluate(() => { __game.G.player.hp = 100; });
// kill -> round advances, kills++, enemy respawns with scaled hp
await page.evaluate(() => __game.damageEnemy(9999));
assert.equal(await page.evaluate(() => __game.G.kills), 1);
await page.waitForTimeout(2200);
const r2 = await page.evaluate(() => ({round: __game.G.round, hp: __game.G.enemy.hp, alive: __game.G.enemy.alive}));
assert.deepEqual(r2, {round: 2, hp: 184, alive: true});
assert.equal(await page.textContent('#round'), '2');

// pause
await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => __game.G.state), 'pause');
await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => __game.G.state), 'play');

// death -> game over overlay, restart on easy works
await page.evaluate(() => __game.damagePlayer(9999));
assert.equal(await page.evaluate(() => __game.G.state), 'over');
assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('overlay')).display), 'flex');
assert.match(await page.textContent('#final'), /Kills: 1/);
await page.click('button[data-d=easy]'); await page.click('#start');
assert.deepEqual(await page.evaluate(() => ({s: __game.G.state, hp: __game.G.enemy.hp, k: __game.G.kills, r: __game.G.round})), {s:'play', hp:60, k:0, r:1});

await page.screenshot({ path: 'shot.png' });
assert.deepEqual(errors, [], 'no console/page errors');
console.log('ALL TESTS PASSED');
await browser.close(); srv.close();
