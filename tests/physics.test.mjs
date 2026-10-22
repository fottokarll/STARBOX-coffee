import assert from 'node:assert/strict';
import test from 'node:test';
import {PHYSICS, RECIPES, step, makeCourse} from '../experience/rules.js';
import {start, climb} from '../tools/route_pilot.mjs';

// Isolated surface fixture: a broad starting pad avoids measuring an accidental fall.
function glide(surface, move = 0) {
  const run = start('espresso');
  run.platforms=run.platforms.slice(0,1);
  run.platforms[0].surface = surface; run.platforms[0].halfWidth = 1.5;
  run.vTheta = PHYSICS.maxSpeed;
  let seconds = 0;
  while (run.vTheta > 0 && seconds < 1) {
    step(run, {move}, PHYSICS.fixedStep); seconds += PHYSICS.fixedStep;
  }
  return {angle: run.theta, seconds, run};
}

test('ceramic retains momentum and has a substantial stopping distance', () => {
  const wood = glide('wood'), ice = glide('ceramic'), brake = glide('ceramic', -1);
  assert.ok(ice.seconds > .69 && ice.seconds < .72);
  assert.ok(ice.angle > .52 && ice.angle < .56, '2.6–2.8 logical metres at radius 5');
  assert.ok(ice.angle / wood.angle > 4.4, 'ceramic coasts over four times farther than timber');
  assert.ok(brake.angle < ice.angle * .50, 'counter-steering brakes sooner than letting go');
  assert.equal(ice.run.grounded, true);
  assert.equal(wood.run.vTheta, 0);
});

test('air control stays responsive after leaving a slippery surface', () => {
  const run = start('espresso');
  run.platforms[0].surface = 'ceramic'; run.vTheta = 1.2;
  step(run, {move: -1, jump: true}, 1 / 60);
  for (let i = 0; i < 15; i++) step(run, {move: -1, jump: true}, 1 / 60);
  assert.ok(run.vTheta < -.8 && !run.grounded);
});

test('courses have distinct geometry, achievable vertical steps and longer routes', () => {
  const espresso = makeCourse('espresso'), latte = makeCourse('latte');
  assert.equal(espresso.mainPath.length, 32); assert.equal(latte.mainPath.length, 40);
  assert.equal(espresso.forks.length, 3); assert.equal(latte.forks.length, 5);
  assert.ok(latte.platforms.filter(p => p.kind === 'precision').length > espresso.platforms.filter(p => p.kind === 'precision').length);
  for (const course of [espresso, latte]) {
    let biggest = 0;
    for (const id of course.mainPath.slice(1)) {
      const a = course.platforms[id - 1], b = course.platforms[id];
      const rise = b.y - a.y;
      assert.ok(rise < PHYSICS.jumpSpeed ** 2 / (2 * PHYSICS.gravity));
      biggest = Math.max(biggest, Math.abs(b.angle - a.angle));
      if (id > 1) assert.ok(b.y - course.platforms[id - 2].y > PHYSICS.jumpSpeed ** 2 / (2 * PHYSICS.gravity), 'cannot skip two levels vertically');
    }
    assert.ok(biggest >= 1.04, 'selected gaps demand substantially more travel than 2.1');
    assert.ok((course.top + 4.0) * .24 + .85 < 12, 'mug, finish and course fit lot height');
  }
});

test('every main landing and every ingredient terrace is traversed with ordinary inputs', () => {
  for (const recipe of Object.keys(RECIPES)) {
    for (const collect of [false, true]) {
      const {run, events} = climb(recipe, {collect});
      assert.equal(run.result.success, true);
      assert.ok(!events.some(e=>e.type==='contact'&&e.axis===1&&e.normal<0), 'authored main jumps have clear overhead space');
      const landed = new Set([0, ...events.filter(e => e.type === 'land').map(e => e.platform)]);
      const route = collect ? run.perfectPath : run.mainPath;
      for (const id of route) assert.ok(landed.has(id), `${recipe} landed ${id}`);
      if (collect) assert.equal(run.result.perfect, true);
    }
  }
  const allStars=climb('latte',{allForks:true}).run;
  assert.equal(allStars.result.perfect,true);
  assert.equal(allStars.bonusStars,5,'all five advanced ingredient/star forks remain reachable');
});

test('independent coffee grace and speeds are exact and failure reports best progress', () => {
  for (const recipe of Object.keys(RECIPES)) {
    const run = start(recipe), def = RECIPES[recipe];
    for (let i = 0; i < Math.floor(def.grace * 120) - 2; i++) step(run, {}, 1 / 120);
    assert.equal(run.coffeeY, -3);
    while (run.state === 'play') step(run, {}, 1 / 120);
    assert.ok(Math.abs(run.elapsed - (def.grace + 2.92 / def.rise)) < .02);
    assert.equal(run.result.progress, 0); assert.equal(run.result.top, run.top);
  }
});

test('coffee allows measured recovery while Latte punishes repeated hesitation', () => {
  assert.equal(climb('espresso',{hesitation:.25}).run.result.perfect,true);
  assert.equal(climb('latte',{hesitation:.12}).run.result.perfect,true);
  assert.equal(climb('latte',{safe:true,collect:false}).run.result.success,true);
  assert.equal(climb('latte',{hesitation:.25}).run.result.success,false);
});
