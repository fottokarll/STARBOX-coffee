// Deterministic binary-input route pilot. Never moves, collects or finishes by shortcut.
import assert from 'node:assert/strict';
import * as currentRules from '../experience/rules.js';
const dt = 1 / 120;
export function start(recipe, rules = currentRules) {
  const run = rules.createRun(recipe);
  for (let i = 0; i < 361; i++) rules.step(run, {}, dt);
  assert.equal(run.state, 'play');
  return run;
}

// Real binary keyboard inputs, never teleports or synthetic collection/finish.
export function climb(recipe, { collect = true, frameDt = 1 / 60, allForks = false, safe = false, stopAt, skip = [], hesitation = 0, rules = currentRules } = {}) {
  const run = start(recipe, rules);
  const path = safe ? run.safePath : allForks ? run.rewardPath || run.mainPath.map(id => run.forks.find(f => f.replaces === id)?.pad ?? id)
    : collect ? run.perfectPath : run.mainPath;
  let previousJump = false;
  let routeIndex = 0;
  let signedMoves = new Set();
  let positiveTravel = 0, negativeTravel = 0;
  let groundSeconds = 0;
  let minimumClearance = Infinity;
  const events = [];
  for (let frame = 0; frame < 24000 && run.state === 'play'; frame++) {
    if (run.grounded) {
      // Return pockets revisit their source terrace. Advance to the next
      // occurrence rather than resetting to its first appearance in the path.
      if (run.onPlatform !== path[routeIndex]) {
        const found = path.indexOf(run.onPlatform, routeIndex + 1);
        if (found >= 0) routeIndex = found;
      }
      if (stopAt !== undefined && run.onPlatform === stopAt) return { run, events, signedMoves, positiveTravel, negativeTravel };
    }
    const next = run.platforms[path[Math.min(path.length - 1, routeIndex + 1)]];
    const current = run.platforms[path[routeIndex]];
    const pending = collect && !skip.includes(current.id) && run.ingredients.find(i => i.platform === current.id && !i.collected && (i.required || allForks));
    const aim = pending ? pending.angle : next.angle + (skip.includes(next.id) ? -0.23 : 0);
    const target = run.theta + rules.angleDistance(aim, run.theta);
    let demand = (target - run.theta) * 9 - run.vTheta * 1.25;
    let move = demand > 0.08 ? 1 : demand < -0.08 ? -1 : 0;
    let jump = !run.grounded;
    groundSeconds = run.grounded ? groundSeconds + frameDt : 0;
    if (run.grounded) {
      if (groundSeconds < hesitation) {
        jump = false;
        demand = rules.angleDistance(current.angle, run.theta) * 6 - run.vTheta * 1.25;
        move = demand > .08 ? 1 : demand < -.08 ? -1 : 0;
      } else if (pending) jump = false;
      else if (previousJump || Math.sign(run.vTheta) !== Math.sign(target - run.theta) && Math.abs(run.vTheta) > 0.12) {
        jump = false;
        // At render rates above the fixed tick, a press can still be buffered.
        // Release jump without braking away its intended launch momentum.
        move = run.jumpBuffer > 0 ? Math.sign(target - run.theta) : 0;
       } else {
        const dir = Math.sign(rules.angleDistance(next.angle, current.angle));
        const gap = Math.abs(rules.angleDistance(next.angle, current.angle));
        const offset = skip.includes(current.id) ? -.24 : next.y - current.y > 1.6 && gap < .9 ? -.14 : Math.max(0, gap - .98);
        const launch = current.angle + dir * Math.min(current.halfWidth * .85, offset);
        const error = rules.angleDistance(launch, run.theta);
        if (gap <= 1.25 && !skip.includes(current.id)) {
          move = Math.sign(target-run.theta); jump = Math.abs(target-run.theta)<1.1;
        } else if (gap > 1.25) {
          move = dir;
          const launchSpeed = next.y - current.y > 1.4 ? 1.50 : .85;
          const launchEdge = current.halfWidth * (next.y - current.y > 1.4 ? 1 : .85);
          jump = dir * rules.angleDistance(run.theta, current.angle) > launchEdge && dir * run.vTheta > launchSpeed;
        } else if (Math.abs(error) > .06 || next.y-current.y > 1.6 && gap < .9 && Math.abs(run.vTheta) > .55) {
          const d = error * 8 - run.vTheta * 1.7;
          move = d > .08 ? 1 : d < -.08 ? -1 : 0; jump = false;
        } else jump = true;
      }
    }
    if (move) signedMoves.add(move);
    const beforeAngle = run.theta;
    rules.step(run, { move, jump }, frameDt);
    minimumClearance = Math.min(minimumClearance, run.y - run.coffeeY);
    positiveTravel += Math.max(0, run.theta - beforeAngle);
    negativeTravel += Math.max(0, beforeAngle - run.theta);
    events.push(...run.events);
    previousJump = jump;
    if (run.elapsed > 100) break;
  }
  return { run, events, signedMoves, positiveTravel, negativeTravel, minimumClearance };
}

