/** Deterministic Coffee Rising rules. Logical metres; the renderer scales the cup to the lot. */
export const RADIUS = 5;
export const RECIPES = Object.freeze({
  espresso: Object.freeze({ id: 'espresso', name: 'Espresso', platforms: 24, beans: 6, milk: 0, rise: 0.68 }),
  latte: Object.freeze({ id: 'latte', name: 'Latte', platforms: 32, beans: 8, milk: 5, rise: 0.74 })
});
export const PHYSICS = Object.freeze({
  gravity: 18, releaseGravity: 34, jumpSpeed: 8.2, maxSpeed: 1.55,
  acceleration: 8.5, braking: 10, coyote: 0.11, buffer: 0.15,
  fixedStep: 1 / 120, biscuitSeconds: 1.05, biscuitRespawnSeconds: 1.8,
  ceramicBraking: 7.8
});

export function angleDistance(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function directionAt(index, recipe) {
  if (recipe === 'espresso') return index <= 10 ? 1 : index <= 14 ? -1 : index <= 21 ? 1 : -1;
  return index <= 10 ? 1 : index <= 16 ? -1 : index <= 27 ? 1 : -1;
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
  const rest = new Set([0, 4, ...turnIndices, def.platforms - 1]);
  if (def.id === 'latte') rest.add(22);
  const biscuit = new Set(def.id === 'latte' ? [6, 8, 12, 18, 20, 24, 29] : [6, 8, 12, 17, 19]);
  const precision = new Set(def.id === 'latte' ? [7, 13, 19, 25, 30] : [7, 13, 18, 22]);
  const kinds = Array.from({ length: def.platforms }, (_, i) =>
    rest.has(i) ? 'rest' : biscuit.has(i) ? 'biscuit' : precision.has(i) ? 'precision' : 'solid');
  const platforms = [];
  let angle = 0;
  for (let i = 0; i < def.platforms; i++) {
    const kind = kinds[i];
    const direction = directionAt(i || 1, def.id);
    if (i) {
      const gap = i === 1 ? 0.70 : kind === 'rest' || kinds[i - 1] === 'rest' ? 0.73 : 0.59 + Math.sin(i * 1.7) * 0.035;
      angle += direction * gap;
    }
    const halfWidth = i === 0 ? 0.50 : kind === 'rest' ? 0.41 : kind === 'precision' ? 0.16 : i < 4 ? 0.31 : kind === 'biscuit' ? 0.27 : 0.255;
    platforms.push(platform(i, angle, i * 1.15, kind, halfWidth, {
      direction: i < def.platforms - 1 ? directionAt(i + 1, def.id) : direction,
      finish: i === def.platforms - 1,
      nextIds: i < def.platforms - 1 ? [i + 1] : []
    }));
  }
  const mainPath = platforms.map(p => p.id);
  const finishPlatform = def.platforms - 1;
  const forks = [];
  for (const [index, turn] of turnIndices.entries()) {
    const from = platforms[turn - 1];
    const incoming = directionAt(turn, def.id);
    const id = platforms.length;
    const pad = platform(id, from.angle - incoming * 0.67, platforms[turn].y, 'bonus', 0.24, {
      optional: true, routeIndex: null, direction: incoming, nextIds: [turn + 1]
    });
    platforms.push(pad);
    from.nextIds.push(id);
    forks.push({ from: from.id, pad: id, rejoin: turn + 1, replaces: turn, required: index < 2 });
  }
  const ingredients = [];
  function add(kind, p, detour = false, offset = 0) {
    const index = ingredients.filter(item => item.kind === kind).length;
    ingredients.push({ id: kind + '-' + index, kind, platform: p.id,
      angle: p.angle + offset, y: p.y + 0.83, collected: false, detour,
      required: kind !== 'star' });
  }
  const occupied = new Set();
  // Two required bean ingredients live on genuinely separate, safe fork pads.
  for (const fork of forks.filter(f => f.required)) {
    add('bean', platforms[fork.pad], true);
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
  for (const fork of forks) add('star', platforms[fork.pad], true, 0.04);
  const perfectPath = mainPath.map(id => {
    const fork = forks.find(f => f.replaces === id && f.required);
    return fork ? fork.pad : id;
  });
  // A biscuit is the direct shortcut. Selected sections also have a longer,
  // permanent timber route, with two comfortable hops joining the same next pad.
  // IDs of the existing main route, recipe forks and ingredients remain stable.
  const biscuitAlternates = [];
  const saferSections = def.id === 'latte' ? [6, 12, 20, 29] : [6, 12, 19];
  for (const biscuitId of saferSections) {
    const before = platforms[biscuitId - 1], after = platforms[biscuitId + 1];
    const dir = directionAt(biscuitId, def.id), first = platforms.length;
    platforms.push(platform(first, before.angle - dir * 0.60, before.y + 0.90, 'safe', 0.30, {
      surface: 'wood', optional: true, safeRouteFor: biscuitId, routeIndex: null,
      direction: dir, nextIds: [first + 1]
    }));
    // Above the direct jump's apex: this balcony cannot intercept a player
    // taking the biscuit shortcut, even when they launch from its rear edge.
    platforms.push(platform(first + 1, before.angle + dir * 0.04, before.y + 1.94, 'safe', 0.31, {
      surface: 'wood', optional: true, safeRouteFor: biscuitId, routeIndex: null,
      direction: dir, nextIds: [after.id]
    }));
    before.nextIds.push(first);
    biscuitAlternates.push({ biscuit: biscuitId, from: before.id, pads: [first, first + 1], rejoin: after.id });
  }
  const safePath = mainPath.flatMap(id => biscuitAlternates.find(a => a.biscuit === id)?.pads || [id]);
  return { platforms, ingredients, top: platforms[finishPlatform].y,
    mainPath, perfectPath, safePath, biscuitAlternates, forks, finishPlatform };
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
      if (p.regenerateTimer === 0) {
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
  run.coffeeY = -3 + Math.max(0, run.elapsed - 4) * RECIPES[run.recipe].rise;
  updateBiscuits(run, dt);
  const move = Math.max(-1, Math.min(1, Number(input.move) || 0));
  const target = move * PHYSICS.maxSpeed;
  const standing = run.grounded ? run.platforms[run.onPlatform] : null;
  const rate = move ? PHYSICS.acceleration : standing?.surface === 'ceramic' ? PHYSICS.ceramicBraking : PHYSICS.braking;
  run.vTheta += Math.max(-rate * dt, Math.min(rate * dt, target - run.vTheta));
  run.theta += run.vTheta * dt;
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
  const previousY = run.y;
  if (run.grounded) {
    const p = run.platforms[run.onPlatform];
    if (!p || p.collapsed || Math.abs(angleDistance(run.theta, p.angle)) > p.halfWidth + 0.04) {
      run.grounded = false;
      run.onPlatform = -1;
    }
  }
  if (!run.grounded) {
    run.vY -= (run.vY > 0 && !input.jump ? PHYSICS.releaseGravity : PHYSICS.gravity) * dt;
    run.y += run.vY * dt;
    if (run.vY <= 0) {
      let landed = null;
      for (const p of run.platforms) {
        if (!p.collapsed && previousY + 0.002 >= p.y && run.y <= p.y &&
            Math.abs(angleDistance(run.theta, p.angle)) <= p.halfWidth + 0.04 &&
            (!landed || p.y > landed.y)) landed = p;
      }
      if (landed) {
        run.y = landed.y;
        run.vY = 0;
        run.grounded = true;
        run.onPlatform = landed.id;
        run.events.push({ type: 'land', platform: landed.id, elapsed: run.elapsed, theta: run.theta, y: run.y, vTheta: run.vTheta, vY: run.vY });
        if (landed.kind === 'biscuit' && landed.crumbleTimer === null) {
          landed.crumbleTimer = landed.crumbleDuration;
          landed.crumbleStage = 'cracking';
          run.events.push({ type: 'crumbleStart', platform: landed.id, remaining: landed.crumbleTimer });
        }
      }
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
