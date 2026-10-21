import assert from 'node:assert/strict';
import { createRun, step, RECIPES, PHYSICS, angleDistance } from '../experience/rules.js';
import {start,climb} from '../tools/route_pilot.mjs';
const dt = 1 / 120;

for (const recipe of Object.keys(RECIPES)) {
  const { run, events, signedMoves, positiveTravel, negativeTravel } = climb(recipe);
  console.log(recipe, run.state, run.elapsed.toFixed(2), run.onPlatform, run.collected, run.result?.quality);
  assert.equal(run.result?.success, true);
  assert.equal(run.result?.quality, 'PERFECT COFFEE');
  assert.equal(run.result?.perfect, true);
  assert.deepEqual(run.result?.collected, run.required);
  assert.ok(run.elapsed > 10, 'full completion satisfies official minimum play time');
  assert.deepEqual([...signedMoves].sort(), [-1, 1]);
  assert.ok(positiveTravel > 4 && negativeTravel > 2, 'the character actually travels substantial arcs in both directions');
  const directions = run.mainPath.slice(1).map((id, i) => Math.sign(run.platforms[id].angle - run.platforms[i].angle));
  assert.ok(directions.slice(1).filter((dir, i) => dir !== directions[i]).length >= 3, 'main route has three genuine switchbacks');
  assert.ok(run.result.score > 3000000);
  assert.equal(run.bonusStars, 2, 'required detour forks can also hold optional score stars');
  assert.ok(events.some(e => e.type === 'crumbleStart'));
  assert.ok(events.some(e => e.type === 'collapse'), 'departed biscuits keep collapsing');
  for (const kind of ['solid', 'rest', 'precision', 'biscuit', 'bonus']) {
    assert.ok(run.platforms.some(p => p.kind === kind));
  }
  assert.equal(run.forks.filter(f => f.required).length, 2);
  assert.ok(run.ingredients.filter(i => i.required && i.detour).length >= 2);
  assert.ok(run.platforms[run.finishPlatform].finish);
  assert.ok(run.platforms.length > run.mainPath.length);
}

for (const frameDt of [1 / 30, 1 / 15, 1 / 10]) {
  const { run } = climb('latte', { frameDt });
  console.log('low fps', 1 / frameDt, run.result?.quality, run.elapsed.toFixed(2));
  assert.equal(run.result?.perfect, true, 'binary controls remain usable at lower frame rates');
}
const bonus = climb('espresso', { allForks: true }).run;
assert.equal(bonus.result?.perfect, true);
assert.equal(bonus.bonusStars, 3, 'extra optional fork is traversable and awards a separate bonus');
assert.equal(bonus.result?.bonusScore, 15000);

const incomplete = climb('latte', { collect: false }).run;
console.log('incomplete', incomplete.result?.quality, incomplete.collected, incomplete.elapsed.toFixed(2));
assert.equal(incomplete.result?.success, true);
assert.equal(incomplete.result?.perfect, false);
assert.notEqual(incomplete.result?.quality, 'PERFECT COFFEE');
assert.ok(incomplete.result.score < 3000000, 'bonus and speed cannot promote an incomplete recipe into the Perfect tier');

const weak = climb('espresso', { collect: false, skip: [2] }).run;
console.log('weak', weak.result?.quality, weak.collected);
assert.equal(weak.result?.success, true);
assert.equal(weak.result?.quality, 'WEAK COFFEE');
assert.ok(weak.result.score < incomplete.result.score);

const biscuitId = 6;
const biscuitRun = climb('espresso', { stopAt: biscuitId }).run;
const biscuit = biscuitRun.platforms[biscuitId];
assert.equal(biscuit.kind, 'biscuit');
assert.ok(biscuit.crumbleTimer > 0 && biscuit.crumbleTimer <= PHYSICS.biscuitSeconds);
const armed = biscuit.crumbleTimer;
step(biscuitRun, { pause: true }, dt);
for (let i = 0; i < 240; i++) step(biscuitRun, {}, dt);
assert.equal(biscuitRun.state, 'paused');
assert.equal(biscuit.crumbleTimer, armed, 'pause freezes collapse, coffee and clock');
step(biscuitRun, { pause: true }, dt);
let cracks = false, collapsed = false;
for (let i = 0; i < 145 && !collapsed; i++) {
  step(biscuitRun, {}, dt);
  cracks ||= biscuitRun.events.some(e => e.type === 'crumble');
  collapsed ||= biscuitRun.events.some(e => e.type === 'collapse');
}
assert.ok(cracks && collapsed);
assert.equal(biscuit.collapsed, true);
assert.equal(biscuit.crumbleTimer, 0);
assert.equal(biscuit.crumbleProgress, 1);
assert.notEqual(biscuitRun.onPlatform, biscuitId, 'collapsed biscuit no longer supports the player');
const regenerationRemaining=biscuit.regenerateTimer;
step(biscuitRun,{pause:true},dt);
for(let i=0;i<240;i++)step(biscuitRun,{},dt);
assert.equal(biscuit.regenerateTimer,regenerationRemaining,'pause also freezes biscuit regeneration');
step(biscuitRun,{pause:true},dt);
const fallback = biscuitRun.platforms[biscuitId - 1];
for (let i = 0; i < 120 && !biscuitRun.grounded; i++) {
  const demand = (fallback.angle - biscuitRun.theta) * 5 - biscuitRun.vTheta * 1.5;
  step(biscuitRun, { move: demand > 0.08 ? 1 : demand < -0.08 ? -1 : 0 }, dt);
}
assert.equal(biscuitRun.onPlatform, fallback.id, 'after a biscuit breaks, steering can rescue the fall onto a lower solid pad');
for (let i = 0; i < 15; i++) step(biscuitRun, {}, dt);
assert.equal(biscuit.collapsed, true, 'a missing biscuit is not immediately solid again');
let reformed=false;
for(let i=0;i<260&&!reformed;i++) {
  step(biscuitRun,{},dt);
  reformed ||= biscuitRun.events.some(e=>e.type==='reform'&&e.platform===biscuitId);
}
assert.equal(reformed,true,'a collapsed biscuit regenerates after a short predictable delay');
assert.equal(biscuit.collapsed,false);
assert.equal(biscuit.crumbleTimer,null,'regeneration resets the full warning window');
assert.equal(biscuit.cracked,false);
assert.equal(biscuitRun.state,'play','recovery leaves an actual chance to continue before the coffee arrives');
let landedAgain=false;
for(let i=0;i<180&&!landedAgain;i++) {
  const error=biscuit.angle-biscuitRun.theta;
  const demand=error*5-biscuitRun.vTheta*1.5;
  step(biscuitRun,{move:demand>.08?1:demand<-.08?-1:0,jump:true},dt);
  landedAgain=biscuitRun.grounded&&biscuitRun.onPlatform===biscuitId;
}
assert.equal(landedAgain,true,'the regenerated biscuit is a real usable collision surface again');
assert.ok(biscuit.crumbleTimer>0,'returning to a restored biscuit starts a fresh fair warning timer');
step(biscuitRun, { restart: true }, dt);
assert.equal(biscuitRun.state, 'countdown');
assert.equal(biscuitRun.platforms[biscuitId].collapsed, false);
assert.equal(biscuitRun.platforms[biscuitId].crumbleTimer, null);
assert.equal(biscuitRun.bonusStars, 0);

for(const recipe of ['espresso','latte']) {
  const safer=climb(recipe,{safe:true,collect:false});
  assert.equal(safer.run.result?.success,true,'the longer timber route reaches the same finish');
  for(const route of safer.run.biscuitAlternates) {
    assert.ok(safer.run.platforms[route.pads[1]].y-safer.run.platforms[route.from].y>
      PHYSICS.jumpSpeed**2/(2*PHYSICS.gravity),
      'the upper detour cannot intercept a normal direct jump from the shared lower pad');
    assert.ok(route.pads.every(id=>safer.events.some(e=>e.type==='land'&&e.platform===id)),
      'both safe timber pads are physically reachable with ordinary jump inputs');
    assert.ok(!safer.events.some(e=>e.type==='land'&&e.platform===route.biscuit),
      'the permanent detour actually avoids its fragile shortcut');
  }
}

const idle = start('latte');
let warned = false;
for (let i = 0; i < 1800 && idle.state === 'play'; i++) {
  step(idle, {}, dt);
  warned ||= idle.events.some(e => e.type === 'warning');
}
assert.equal(idle.result?.success, false);
assert.ok(warned);
assert.ok(idle.elapsed > 4 && idle.elapsed < 4.3, 'Latte has a short but usable launch window');

function jumpHeight(hold) {
  const run = start('latte');
  let high = 0;
  for (let i = 0; i < 130; i++) {
    step(run, { jump: i < hold }, dt);
    high = Math.max(high, run.y);
  }
  return high;
}
assert.ok(jumpHeight(80) > jumpHeight(3) + 0.5);
const tapped = start('espresso');
step(tapped, { jump: false, jumpPressed: true }, 1 / 30);
assert.ok(tapped.vY > 0 && tapped.y > 0, 'a short press pulse between rendered frames still jumps');
let jumps = 0;
const held = start('espresso');
for (let i = 0; i < 300; i++) {
  step(held, { jump: true }, dt);
  jumps += held.events.filter(e => e.type === 'jump').length;
}
assert.equal(jumps, 1, 'holding jump never creates automatic bouncing');
assert.ok(PHYSICS.jumpSpeed ** 2 / (2 * PHYSICS.gravity) < 2.30, 'two main levels cannot be bypassed by a vertical jump');
assert.ok(Math.abs(angleDistance(0.1, Math.PI * 2 + 0.1)) < 1e-10);
console.log('2.2 rules passed: distinct courses, recipes, recovery, permanent timber routes and input fairness.');
