import {BODY, sweepBody, overlapsBody} from './collision.js';
/** Deterministic STARBOX rules. Logical metres; the renderer scales the cup to the lot. */
export const RADIUS = 5;
export const RECIPES = Object.freeze({
  espresso: Object.freeze({ id: 'espresso', name: 'Espresso', platforms: 32, beans: 6, milk: 0, rise: 1.18, grace: 3.2 }),
  latte: Object.freeze({ id: 'latte', name: 'Latte', platforms: 40, beans: 8, milk: 5, rise: 1.28, grace: 1.8 })
});
export const PHYSICS = Object.freeze({
  gravity: 18, releaseGravity: 34, jumpSpeed: 8.2, maxSpeed: 1.55,
  acceleration: 8.5, braking: 10, coyote: 0.11, buffer: 0.15,
  fixedStep: 1 / 120, biscuitSeconds: 1.05, biscuitRespawnSeconds: 1.8,
  ceramicBraking: 2.2, ceramicAcceleration: 4.8
});

// Each route is authored independently: [signed angle, rise, half width, kind, surface].
// Rests at reversals are timber. Long jumps have lower rises or a generous launch pad.
const LAYOUTS = {
  espresso: [
    [.66,1.08,.34,'solid','wood'], [.72,1.10,.31,'solid','ceramic'],
    [.62,1.16,.30,'solid','wood'], [.84,1.02,.38,'rest','wood'],
    [.86,1.12,.34,'solid','wood'], [.72,1.08,.27,'biscuit','biscuit'],
    [.80,1.14,.29,'solid','wood'], [.60,1.06,.32,'rest','wood'],
    [-1.14,1.16,.20,'solid','ceramic'], [-.88,1.06,.26,'biscuit','biscuit'],
    [-1.00,1.02,.22,'precision','ceramic'], [-.72,1.16,.29,'solid','wood'],
    [-.78,1.10,.25,'biscuit','biscuit'], [-.82,1.12,.24,'solid','ceramic'],
    [-.60,1.04,.32,'rest','wood'], [1.14,1.10,.20,'solid','wood'],
    [.82,1.16,.22,'precision','ceramic'], [.90,1.04,.25,'biscuit','biscuit'],
    [1.02,1.06,.24,'solid','wood'], [.76,1.16,.23,'solid','ceramic'],
    [.78,1.10,.25,'biscuit','biscuit'], [.60,1.12,.32,'rest','wood'],
    [-1.14,1.12,.20,'precision','ceramic'], [-1.06,1.00,.28,'solid','wood'],
    [-.84,1.16,.25,'biscuit','biscuit'], [-.94,1.08,.23,'precision','ceramic'],
    [-1.02,1.08,.32,'solid','wood'], [-.84,1.14,.22,'solid','ceramic'],
    [-.96,1.02,.25,'biscuit','biscuit'], [-1.04,1.02,.21,'precision','ceramic'],
    [-.90,1.10,.44,'rest','wood']
  ],
  latte: [
    [.88,1.06,.28,'solid','wood'], [1.00,1.00,.22,'solid','ceramic'],
    [.80,1.06,.23,'biscuit','biscuit'], [1.04,1.04,.25,'solid','wood'],
    [.60,1.14,.30,'rest','wood'], [-1.14,1.02,.18,'precision','ceramic'],
    [-.88,1.06,.24,'solid','wood'], [-.80,1.08,.23,'biscuit','biscuit'],
    [-.90,1.10,.18,'precision','ceramic'], [-1.08,1.00,.23,'biscuit','biscuit'],
    [-.60,1.14,.30,'rest','wood'], [1.14,1.00,.20,'solid','ceramic'],
    [.90,1.06,.18,'precision','ceramic'], [1.10,1.00,.25,'solid','wood'],
    [.82,1.12,.23,'biscuit','biscuit'], [.88,1.10,.18,'precision','ceramic'],
    [.60,1.08,.30,'rest','wood'], [-1.14,1.00,.20,'solid','wood'],
    [-.96,1.14,.18,'precision','ceramic'], [-1.12,1.00,.22,'biscuit','biscuit'],
    [-.88,1.06,.23,'biscuit','biscuit'], [-1.06,1.02,.18,'precision','ceramic'],
    [-.80,1.12,.23,'biscuit','biscuit'], [-.60,1.10,.30,'rest','wood'],
    [1.14,1.00,.18,'precision','ceramic'], [.92,1.06,.24,'solid','wood'],
    [1.12,1.00,.18,'precision','ceramic'], [.84,1.14,.23,'biscuit','biscuit'],
    [1.08,1.02,.20,'solid','ceramic'], [.60,1.12,.30,'rest','wood'],
    [-1.12,1.00,.18,'precision','ceramic'], [-.82,1.14,.23,'biscuit','biscuit'],
    [-.92,1.10,.20,'solid','wood'], [-1.14,1.00,.18,'precision','ceramic'],
    [-1.02,1.10,.26,'solid','wood'], [-1.10,1.00,.18,'precision','ceramic'],
    [-.86,1.12,.23,'biscuit','biscuit'], [-1.14,1.00,.17,'precision','ceramic'],
    [-1.06,1.04,.42,'rest','wood']
  ]
};

export function angleDistance(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function directionAt(index, recipe) {
  return Math.sign(LAYOUTS[recipe][Math.max(0, index - 1)][0]);
}

function platform(id, angle, y, kind, halfWidth, extra = {}) {
  return {
    id, angle, y, kind, halfWidth, finish: false, optional: false,
    routeIndex: id, direction: 1, nextIds: [], collapsed: false,
    crumbleTimer: null, crumbleDuration: PHYSICS.biscuitSeconds,
    crumbleProgress: 0, crumbleStage: 'idle', cracked: false,
    regenerateTimer: null, regenerateProgress: 0,
    surface: kind === 'biscuit' ? 'biscuit' : ['rest', 'bonus'].includes(kind) || id % 3 === 1 ? 'wood' : 'ceramic', ...extra
  };
}

export function makeCourse(recipe = 'latte') {
  const def = RECIPES[recipe] || RECIPES.latte;
  const turnIndices = [];
  for (let i = 1; i < def.platforms - 1; i++) {
    if (directionAt(i, def.id) !== directionAt(i + 1, def.id)) turnIndices.push(i);
  }
  const platforms = [];
  let angle = 0, y = 0;
  for (let i = 0; i < def.platforms; i++) {
    const [gap, rise, halfWidth, kind, surface] = i ? LAYOUTS[def.id][i - 1] : [0,0,.5,'rest','wood'];
    const direction = directionAt(i || 1, def.id);
    angle += gap; y += rise + (turnIndices.includes(i) ? def.id === 'latte' ? .62 : .5 : def.id === 'latte' && i ? -.06 : 0);
    platforms.push(platform(i, angle, y, kind, halfWidth, {
      surface,
      direction: i < def.platforms - 1 ? directionAt(i + 1, def.id) : direction,
      finish: i === def.platforms - 1,
      nextIds: i < def.platforms - 1 ? [i + 1] : []
    }));
  }
  const mainPath = platforms.map(p => p.id);
  const finishPlatform = def.platforms - 1;
  // Ingredient terraces replace the crowded, nearly stacked fork islands.
  // Each turn now has one readable landing, with a bean toward its outside edge.
  const forks = turnIndices.map((turn, index) => ({from: turn - 1, pad: turn,
    rejoin: turn + 1, replaces: turn, required: index < 2}));
  const ingredients = [];
  function add(kind, p, detour = false, offset = 0) {
    const index = ingredients.filter(item => item.kind === kind).length;
    ingredients.push({ id: kind + '-' + index, kind, platform: p.id,
      angle: p.angle + offset, y: p.y + 0.83, collected: false, detour,
      required: kind !== 'star' });
  }
  const occupied = new Set();
  // Terrace beans require deliberate travel toward the outside edge. One of
  // these Espresso placements moves onto the permanent ingredient route below.
  for (const fork of forks.filter(f => f.required)) {
    add('bean', platforms[fork.pad], true, directionAt(fork.pad, def.id)*.20);
  }
  function distribute(kind, count, phase) {
    for (let i = 0; i < count; i++) {
      let index = Math.round(2 + (i + phase) * (def.platforms - 6) / Math.max(1, count - 1));
      index = Math.min(def.platforms - 3, index);
      while ((occupied.has(index) || turnIndices.includes(index)) && index < def.platforms - 2) index++;
      occupied.add(index);
      add(kind, platforms[index]);
    }
  }
  distribute('bean', def.beans - 2, 0);
  distribute('milk', def.milk, 0.25);
  for (const fork of forks) add('star', platforms[fork.pad], true, .04);
  // Permanent routes use the OTHER side of the cylinder over a whole section.
  // Matching altitude at each step avoids balconies directly above launch pads.
  const biscuitAlternates = [];
  const sections = def.id === 'latte' ? [[7,11,8],[14,17,15],[21,24,23]]
    : [[5,8,6],[12,15,13],[19,22,21]];
  for (const [fromId, rejoin, biscuitId] of sections) {
    const before = platforms[fromId], after = platforms[rejoin];
    const direct = after.angle - before.angle;
    const arc = direct - Math.sign(direct) * Math.PI * 2;
    const jumps = 3, pads = [];
    const firstGap = Math.max(1.35, Math.abs(platforms[fromId].angle-platforms[fromId-1].angle)+.48);
    for (let j = 1; j < jumps; j++) {
      const id = platforms.length; pads.push(id);
      platforms.push(platform(id, before.angle + Math.sign(arc) * (j === 1 ? firstGap : firstGap + (Math.abs(arc)-firstGap)*(j-1)/(jumps-1)), before.y + (j === 1 ? 1.60 : Math.max(2.66, (after.y-before.y)*.68)), 'safe', .40, {
        surface: 'wood', optional: true, safeRouteFor: biscuitId, routeIndex: null,
        direction: Math.sign(arc), nextIds: [j === jumps-1 ? rejoin : id+1]
      }));
    }
    before.nextIds.push(pads[0]);
    biscuitAlternates.push({biscuit:biscuitId, from:fromId, pads, rejoin});
  }
  // One ingredient takes the opposite-side permanent route. The biscuit line
  // remains a genuine direct choice for an incomplete, still successful brew.
  const ingredientRoute = biscuitAlternates[0];
  const detourBean = ingredients.find(i => i.id === (def.id === 'latte' ? 'bean-3' : 'bean-0'));
  const ingredientPad = platforms[ingredientRoute.pads[0]];
  detourBean.platform = ingredientPad.id; detourBean.angle = ingredientPad.angle;
  detourBean.y = ingredientPad.y + .83; detourBean.detour = true;
  ingredientRoute.requiredRewards = [detourBean.id];
  ingredientPad.routeRole = 'ingredient';
  // Optional reward pockets are deliberately isolated from both the main and
  // permanent routes' flight corridors. Their only exit returns to the source.
  const returnBranches = [];
  for (const fromId of def.id === 'latte' ? [30] : [0]) {
    const from = platforms[fromId], direction = def.id === 'latte' ? 1 : -1;
    const id = platforms.length;
    platforms.push(platform(id, from.angle + direction * (def.id === 'latte' ? 1.14 : 1.10),
      from.y + 1.04, 'bonus', def.id === 'espresso' ? .32 : .26, {
        surface: def.id === 'espresso' ? 'wood' : 'ceramic',
        optional: true, routeIndex: null, routeRole: 'bonus',
        direction: -direction, returnTo: fromId, nextIds: [fromId]
      }));
    from.nextIds.push(id);
    const rewards = [ingredients.find(i => i.id === (def.id === 'latte' ? 'star-4' : 'star-2'))];
    for (const reward of rewards) {
      reward.platform = id; reward.angle = platforms[id].angle;
      reward.y = platforms[id].y + .83; reward.detour = true;
    }
    returnBranches.push({from: fromId, pads: [id], returnTo: fromId,
      rejoin: fromId + 1, required: false, rewards: rewards.map(i => i.id)});
  }
  function withReturns(path) {
    return path.flatMap(id => {
      const branch = returnBranches.find(b => b.from === id);
      return branch ? [id, ...branch.pads, branch.returnTo] : [id];
    });
  }
  function withIngredientRoute(path) {
    return path.flatMap(id => id === ingredientRoute.from ? [id, ...ingredientRoute.pads]
      : id > ingredientRoute.from && id < ingredientRoute.rejoin ? [] : [id]);
  }
  const perfectPath = withIngredientRoute(mainPath);
  const rewardPath = withReturns(perfectPath);
  const safePath = [];
  for (let i = 0; i < mainPath.length; i++) {
    safePath.push(i);
    const alternate = biscuitAlternates.find(a => a.from === i);
    if (alternate) { safePath.push(...alternate.pads); i = alternate.rejoin - 1; }
  }
  return { platforms, ingredients, top: platforms[finishPlatform].y,
    mainPath, perfectPath, rewardPath, safePath,
    biscuitAlternates, returnBranches, forks, finishPlatform };
}

export function createRun(recipe = 'latte') {
  const def = RECIPES[recipe] || RECIPES.latte;
  return {
    recipe: def.id, state: 'countdown', countdown: 3, ...makeCourse(def.id),
    theta: 0, y: 0, vTheta: 0, vY: 0, grounded: true, onPlatform: 0,
    elapsed: 0, coffeeY: -3, progress: 0, bestHeight: 0,
    collected: { bean: 0, milk: 0 }, required: { bean: def.beans, milk: def.milk },
    bonusStars: 0, result: null, events: [], accumulator: 0,
    coyote: PHYSICS.coyote, jumpBuffer: 0, previousJump: false,
    previousPause: false, previousRestart: false, warning: false, warningClock: 0
  };
}

function finish(run, success) {
  const total = run.required.bean + run.required.milk;
  const taken = run.collected.bean + run.collected.milk;
  const perfect = success && taken === total;
  const quality = !success ? 'SPILLED COFFEE' : perfect ? 'PERFECT COFFEE' : taken / total >= 0.65 ? 'GREAT COFFEE' : 'WEAK COFFEE';
  const tier = perfect ? 3 : taken / total >= 0.65 ? 2 : 1;
  const timeBonus = Math.max(0, Math.round(100000 - run.elapsed * 1000));
  const bonusScore = run.bonusStars * 5000;
  run.state = 'results';
  run.result = {
    recipe: run.recipe, time: run.elapsed, success, perfect, quality,
    collected: { ...run.collected }, required: { ...run.required },
    bonusStars: run.bonusStars, bonusScore,
    progress: Math.min(1, run.bestHeight / run.top), bestHeight: run.bestHeight, top: run.top,
    score: success ? tier * 1000000 + taken * 10000 + timeBonus + bonusScore : 0
  };
  run.events.push({ type: success ? 'finish' : 'fail', result: run.result });
}

function updateBiscuits(run, dt) {
  for (const p of run.platforms) {
    if (p.kind !== 'biscuit') continue;
    if (p.collapsed) {
      p.regenerateTimer = Math.max(0, p.regenerateTimer - dt);
      p.regenerateProgress = Math.max(0, 1 - p.regenerateTimer / 0.45);
      if (p.regenerateTimer === 0 && !overlapsBody(run.theta, run.y, p)) {
        p.collapsed = false; p.crumbleTimer = null; p.crumbleProgress = 0;
        p.crumbleStage = 'idle'; p.cracked = false;
        p.regenerateTimer = null; p.regenerateProgress = 0;
        run.events.push({ type: 'reform', platform: p.id });
      }
      continue;
    }
    if (p.crumbleTimer === null) continue;
    p.crumbleTimer = Math.max(0, p.crumbleTimer - dt);
    p.crumbleProgress = 1 - p.crumbleTimer / p.crumbleDuration;
    if (!p.cracked && p.crumbleProgress >= 0.20) {
      p.cracked = true;
      run.events.push({ type: 'crumble', platform: p.id, remaining: p.crumbleTimer });
    }
    if (p.crumbleTimer === 0) {
      p.collapsed = true;
      p.crumbleStage = 'collapsed';
      p.regenerateTimer = PHYSICS.biscuitRespawnSeconds;
      run.events.push({ type: 'collapse', platform: p.id });
    }
  }
}

function tick(run, input, dt) {
  run.elapsed += dt;
  const recipe = RECIPES[run.recipe];
  run.coffeeY = -3 + Math.max(0, run.elapsed - recipe.grace) * recipe.rise;
  updateBiscuits(run, dt);
  const move = Math.max(-1, Math.min(1, Number(input.move) || 0));
  const target = move * PHYSICS.maxSpeed;
  const standing = run.grounded ? run.platforms[run.onPlatform] : null;
  const ceramic = standing?.surface === 'ceramic';
  const rate = move ? ceramic ? PHYSICS.ceramicAcceleration : PHYSICS.acceleration
    : ceramic ? PHYSICS.ceramicBraking : PHYSICS.braking;
  run.vTheta += Math.max(-rate * dt, Math.min(rate * dt, target - run.vTheta));
  const previousTheta = run.theta;
  run.coyote = run.grounded ? PHYSICS.coyote : Math.max(0, run.coyote - dt);
  run.jumpBuffer = Math.max(0, run.jumpBuffer - dt);
  if (run.jumpBuffer > 0 && run.coyote > 0) {
    run.vY = PHYSICS.jumpSpeed;
    run.grounded = false;
    run.onPlatform = -1;
    run.coyote = 0;
    run.jumpBuffer = 0;
    run.events.push({ type: 'jump', elapsed: run.elapsed, theta: run.theta, y: run.y, vTheta: run.vTheta, vY: run.vY });
  }
  if (run.grounded) {
    const p = run.platforms[run.onPlatform];
    if (!p || p.collapsed || Math.abs(angleDistance(run.theta + run.vTheta * dt, p.angle)) > p.halfWidth + BODY.halfAngle) {
      run.grounded = false; run.onPlatform = -1;
    }
  }
  if (!run.grounded) run.vY -= (run.vY > 0 && !input.jump ? PHYSICS.releaseGravity : PHYSICS.gravity) * dt;
  const contact = sweepBody(previousTheta, run.y, run.vTheta * dt, run.grounded ? 0 : run.vY * dt, run.platforms);
  run.theta = contact.theta; run.y = contact.y;
  for (const hit of contact.contacts) {
    if (hit.axis === 0) run.vTheta = 0;
    else run.vY = 0;
    run.events.push({type: 'contact', ...hit});
  }
  const landed = contact.landing;
  if (landed) {
    run.y = landed.y; run.vY = 0; run.grounded = true; run.onPlatform = landed.id;
    run.events.push({ type: 'land', platform: landed.id, elapsed: run.elapsed, theta: run.theta, y: run.y, vTheta: run.vTheta, vY: run.vY });
    if (landed.kind === 'biscuit' && landed.crumbleTimer === null) {
      landed.crumbleTimer = landed.crumbleDuration; landed.crumbleStage = 'cracking';
      run.events.push({ type: 'crumbleStart', platform: landed.id, remaining: landed.crumbleTimer });
    }
  }
  for (const ingredient of run.ingredients) {
    if (!ingredient.collected && Math.abs(angleDistance(run.theta, ingredient.angle)) < 0.16 &&
        Math.abs(run.y + 0.48 - ingredient.y) < 0.62) {
      ingredient.collected = true;
      if (ingredient.kind === 'star') run.bonusStars++;
      else run.collected[ingredient.kind]++;
      run.events.push({ type: 'collect', kind: ingredient.kind, id: ingredient.id });
    }
  }
  run.bestHeight = Math.max(run.bestHeight, run.y);
  run.progress = Math.max(0, Math.min(1, run.y / run.top));
  run.warning = run.y - run.coffeeY < 2.7;
  run.warningClock -= dt;
  if (run.warning && run.warningClock <= 0) {
    run.events.push({ type: 'warning' });
    run.warningClock = 1.6;
  }
  if (run.y < run.coffeeY + 0.08) finish(run, false);
  else if (run.grounded && run.platforms[run.onPlatform]?.finish) finish(run, true);
}

/** jump is held; jumpPressed is an optional one-frame key/touch press pulse. */
export function step(run, input = {}, dt = 0) {
  run.events = [];
  const restartPressed = Boolean(input.restart) && !run.previousRestart;
  const pausePressed = Boolean(input.pause) && !run.previousPause;
  const jumpPressed = Boolean(input.jumpPressed) || Boolean(input.jump) && !run.previousJump;
  if (restartPressed) {
    Object.assign(run, createRun(run.recipe));
    run.events.push({ type: 'restart' });
  } else if (pausePressed && (run.state === 'play' || run.state === 'paused')) {
    run.state = run.state === 'paused' ? 'play' : 'paused';
    run.events.push({ type: run.state });
  }
  run.previousJump = Boolean(input.jump);
  run.previousPause = Boolean(input.pause);
  run.previousRestart = Boolean(input.restart);
  const safeDt = Math.max(0, Math.min(0.25, Number(dt) || 0));
  if (run.state === 'countdown') {
    run.countdown -= safeDt;
    if (run.countdown <= 0) {
      run.countdown = 0;
      run.state = 'play';
      run.events.push({ type: 'go' });
    }
    return run;
  }
  if (run.state !== 'play') return run;
  if (jumpPressed) run.jumpBuffer = PHYSICS.buffer;
  run.accumulator += safeDt;
  while (run.accumulator >= PHYSICS.fixedStep && run.state === 'play') {
    tick(run, input, PHYSICS.fixedStep);
    run.accumulator -= PHYSICS.fixedStep;
  }
  return run;
}
