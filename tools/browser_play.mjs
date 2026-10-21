// Test-only observer/controller. It presses ordinary keys through the official
// devkit and observes the public position snapshot; it never changes game state.
import { makeCourse, angleDistance } from '../experience/rules.js';

export function makeKeyboardObserver(recipe = 'latte', collect = true) {
  const course = makeCourse(recipe);
  let last = 0;
  let target = 1;
  let phase = 'settle';
  let prior = null;
  let airborneHigh = 0;
  let settleFrame = null;
  let releaseUntil = 0;
  const collected = new Set();
  const seen = [];
  return {
    course, collected, seen,
    update(position, wallTime, frameCount = Math.round(wallTime * 60)) {
      const rawAngle = Number(position.yaw ?? Math.atan2(position.x, position.z));
      const theta = prior ? prior.theta + angleDistance(rawAngle, prior.theta) : rawAngle;
      const y = (position.y - 0.85) / 0.24 - 0.7;
      const dy = prior ? y - prior.y : 0;
      if (!prior || theta !== prior.theta || y !== prior.y) prior = { theta, y };
      if (settleFrame === null) { settleFrame = frameCount; releaseUntil = wallTime + 0.6; }
      for (const item of course.ingredients) {
        if (!collected.has(item.id) && Math.abs(angleDistance(theta, item.angle)) < 0.13 &&
            Math.abs(y + 0.48 - item.y) < 0.45) {
          collected.add(item.id);
          if (phase === 'settle') { settleFrame = frameCount; releaseUntil = wallTime + 0.6; }
        }
      }
      if (phase === 'air') {
        airborneHigh = Math.max(airborneHigh, y);
        const next = course.platforms[target];
        if (airborneHigh > next.y + 0.2 && dy <= 0 && Math.abs(y - next.y) < 0.045) {
          last = target;
          phase = 'settle';
          settleFrame = frameCount;
          releaseUntil = wallTime + 0.6;
          seen.push(last);
        }
      }
      let jump = phase === 'air';
      let move = 0;
      if (phase === 'settle') {
        // Zero input brakes to rest. Waiting three rendered game ticks also
        // guarantees that the jump key-up reaches the worker before key-down.
        const settled = frameCount >= settleFrame + 6 && wallTime >= releaseUntil;
        if (settled) {
          const pending = collect && course.ingredients.find(item => item.platform === last && !collected.has(item.id));
          if (pending) {
            const error = pending.angle - theta;
            move = error > 0.12 ? 1 : error < -0.12 ? -1 : 0;
          } else if (last < course.platforms.length - 1) {
            target = last + 1;
            phase = 'air';
            airborneHigh = y;
            jump = true;
          }
        }
      }
      if (phase === 'air') {
        const desired = course.platforms[target].angle + (collect ? 0 : -0.27);
        const error = desired - theta;
        // Brake before the centre to allow one worker frame of input latency.
        // Full-strength reversals near the target were unstable at 3-5 fps.
        move = error > 0.24 ? 1 : error < -0.18 ? -1 : 0;
      }
      return { move, jump, theta, y, last, target, phase, observedIngredients: collected.size };
    }
  };
}

/** Called by a Playwright probe after devkit.wait() resolves to 'started'. */
export async function driveClimb(page, options = {}) {
  const recipe = options.recipe || 'latte';
  const maximumMs = options.maximumMs || 180000;
  const observer = makeKeyboardObserver(recipe, options.collect !== false);
  const logStart = await page.evaluate(() => devkit.console.length);
  await page.evaluate(() => devkit.press('KeyO', 100));
  await page.evaluate(key => devkit.press(key, 100), recipe === 'espresso' ? 'Digit1' : 'Digit2');
  await page.evaluate(() => devkit.press('Space', 100));
  // Read the game's ordinary GO event log, rather than assuming wall time
  // equals capped simulation time on a software renderer.
  await page.waitForFunction(start => devkit.console.slice(start).some(line =>
    String(line).includes('Coffee Rising: GO')), logStart, { timeout: options.countdownMs ?? 90000 });
  const start = Date.now();
  const trace = [];
  let keys = { KeyA: false, KeyD: false, Space: false };
  let result = null;
  let jumpReleaseFrame = -Infinity;
  let reportedAt = 0;
  while (Date.now() - start < maximumMs) {
    const state = await page.evaluate(() => ({
      position: devkit.room.position,
      logs: devkit.console,
      status: devkit.status,
      frames: devkit.frames.count,
    }));
    const resultLine = state.logs.slice(logStart).find(line => String(typeof line === 'string' ? line : JSON.stringify(line)).includes('Coffee Rising: result'));
    if (resultLine) {
      const line = typeof resultLine === 'string' ? resultLine : JSON.stringify(resultLine);
      const objectStart = line.indexOf('{');
      try { result = JSON.parse(line.slice(objectStart)); } catch { result = line; }
      break;
    }
    if (state.status !== 'started') return { status: state.status, trace, result: null };
    const current = observer.update(state.position, (Date.now() - start) / 1000, state.frames);
    let desired = { KeyA: current.move < 0, KeyD: current.move > 0, Space: current.jump };
    if (keys.Space && !desired.Space) jumpReleaseFrame = state.frames;
    // Ensure key-up survives an actual rendered frame before the next jump edge.
    if (desired.Space && state.frames < jumpReleaseFrame + 6) {
      desired = { KeyA: false, KeyD: false, Space: false };
    }
    const changed = Object.entries(desired).filter(([key, value]) => keys[key] !== value);
    if (changed.length) {
      await page.evaluate(changes => {
        for (const [key, value] of changes) devkit.key(key, value);
      }, changed);
      keys = desired;
    }
    const prior = trace[trace.length - 1];
    if (!prior || prior.last !== current.last || Date.now() - start - prior.ms > 1800) {
      const entry = { ms: Date.now() - start, ...current };
      trace.push(entry);
      if (options.onProgress) await options.onProgress(entry);
    }
    if (Date.now() - start - reportedAt > 10000) {
      reportedAt = Date.now() - start;
      console.log('Climb progress', JSON.stringify({ recipe, ms: reportedAt, platform: current.last, y: current.y, theta: current.theta, ingredients: current.observedIngredients }));
    }
    await page.waitForTimeout(50);
  }
  await page.evaluate(() => {
    for (const code of ['KeyA', 'KeyD', 'Space']) devkit.key(code, false);
  });
  return { recipe, result, trace, observedIngredients: observer.collected.size, reachedPlatforms: observer.seen };
}
