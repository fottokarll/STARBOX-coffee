/** Swept body/slab collision in the cup's unwrapped angular/vertical plane.
 * y is always the feet. Rendering depth never participates in gameplay contact.
 */
export const BODY = Object.freeze({halfAngle: .045, height: 1.52});
export const platformThickness = p => p.kind === 'rest' ? .43 : p.kind === 'biscuit' ? .24 : p.kind === 'safe' ? .14 : .28;
const EPS = 1e-8, TAU = Math.PI * 2;

export function overlapsBody(theta, y, p) {
  const angle = p.angle + Math.round((theta - p.angle) / TAU) * TAU;
  return Math.abs(theta - angle) < p.halfWidth + BODY.halfAngle - EPS &&
    y < p.y - EPS && y + BODY.height > p.y - platformThickness(p) + EPS;
}

export function sweepBody(theta, y, dx, dy, platforms) {
  let x = theta, feet = y, landing = null;
  const contacts = [];
  // A contact removes only its normal velocity; the remaining motion slides along it.
  for (let pass = 0; pass < 4 && (Math.abs(dx) > EPS || Math.abs(dy) > EPS); pass++) {
    let hit = null;
    for (const p of platforms) {
      if (p.collapsed) continue;
      const angle = p.angle + Math.round((x - p.angle) / TAU) * TAU;
      const min = [angle - p.halfWidth - BODY.halfAngle, p.y - platformThickness(p) - BODY.height];
      const max = [angle + p.halfWidth + BODY.halfAngle, p.y];
      const origin = [x, feet], delta = [dx, dy];
      let enter = -Infinity, leave = Infinity, axis = -1;
      let misses = false;
      for (let a = 0; a < 2; a++) {
        if (Math.abs(delta[a]) < EPS) {
          // Tangential motion at a boundary must not snag feet on their own pad.
          if (origin[a] <= min[a] + EPS || origin[a] >= max[a] - EPS) { misses = true; break; }
        } else {
          const t1 = (min[a] - origin[a]) / delta[a], t2 = (max[a] - origin[a]) / delta[a];
          const near = Math.min(t1, t2), far = Math.max(t1, t2);
          if (near > enter) { enter = near; axis = a; }
          leave = Math.min(leave, far);
        }
      }
      if (!misses && enter >= -EPS && enter <= 1 && leave > Math.max(0, enter) + EPS &&
          (!hit || enter < hit.t - EPS || Math.abs(enter-hit.t)<EPS && axis===1)) {
        hit = {p, t: Math.max(0, enter), axis, normal: -Math.sign(delta[axis])};
      }
    }
    if (!hit) { x += dx; feet += dy; break; }
    x += dx * hit.t; feet += dy * hit.t;
    dx *= 1 - hit.t; dy *= 1 - hit.t;
    if (hit.axis === 0) dx = 0;
    else { dy = 0; if (hit.normal === 1) landing = hit.p; }
    contacts.push({platform: hit.p.id, axis: hit.axis, normal: hit.normal});
  }
  return {theta: x, y: feet, landing, contacts};
}
