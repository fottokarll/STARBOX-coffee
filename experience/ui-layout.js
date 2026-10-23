// Project 0 owns the first 54px. Anchor the order/progress panel to the
// playable viewport, independently of the camera, course and thumb controls.
export const PLAYABLE_TOP = 54;
export function headerLayout(width, height, inGame) {
  const short = height < 450, mobile = width < 720;
  const hud = inGame ? {x: Math.max(10, (width - 760) / 2), y: PLAYABLE_TOP + (short ? 2 : 7),
    w: Math.min(width - 20, 760), h: height < 330 ? 54 : short ? 64 : mobile ? 82 : 74} : null;
  const y = inGame ? hud.y + hud.h + 8 : short ? height - 62 : 61;
  const timerW = short ? 142 : mobile ? 150 : 176;
  return {short, mobile, brand: !short && !inGame, stacked: false, hud,
    timer: inGame ? {x: width / 2 - timerW / 2, y, w: timerW, h: short ? 32 : 36} : null,
    mute: short && !inGame ? null : {x: inGame ? width / 2 - timerW / 2 - 51 : width - 57, y, w: 42, h: 38},
    pause: inGame ? {x: width / 2 + timerW / 2 + 9, y, w: 42, h: 38} : null};
}

// The visible key sits inside its hit target. Targets never overlap, even on
// 320px phones; generous bottom clearance also leaves room for a home gesture.
export function touchLayout(width, height) {
  const compact = height < 450, margin = width < 360 ? 12 : 18;
  const gap = width < 360 ? 10 : 12;
  const key = Math.min(compact ? 76 : 88, Math.floor(width * .205));
  const jump = Math.min(height < 330 ? 80 : compact ? 96 : 116, Math.floor(width * .30));
  const bottom = compact ? 16 : 28, h = compact ? 66 : 78;
  const target = (x, y, w, height) => ({x, y, w, h: height,
    hit: {x: x - 4, y: y - 7, w: w + 8, h: height + 12}});
  return {
    left: target(margin, height - bottom - h, key, h),
    right: target(margin + key + gap, height - bottom - h, key, h),
    jump: target(width - margin - jump, height - bottom - jump, jump, jump),
    bottom, compact
  };
}

// Results use their own receipt buttons. No space or hit target is reserved for
// gameplay controls beneath the modal. Dense mode also fits short landscape.
export function resultsLayout(width, height) {
  const short = height < 500 || width < 360 || (width < 500 && height < 740);
  const dense = height < 330;
  const w = Math.min(width - 32, short ? 720 : 530);
  const h = short ? Math.min(height - (height < 450 ? 80 : 128), 400) : Math.min(510, height - 128);
  const x = (width - w) / 2;
  const y = short && height < 450 ? 60 : Math.max(112, (height - h) / 2);
  const restart = short
    ? {x: x + 24, y: y + h - (dense ? 44 : 55), w: (w - 60) * .60, h: dense ? 32 : 38}
    : {x: x + 24, y: y + h - 133, w: w - 48, h: 46};
  const order = short
    ? {x: restart.x + restart.w + 12, y: restart.y, w: w - restart.w - 60, h: restart.h}
    : {x: x + 24, y: restart.y + 57, w: (w - 60) * .63, h: 35};
  const exit = short ? null
    : {x: order.x + order.w + 12, y: order.y, w: (w - 60) * .37, h: 35};
  return {x, y, w, h, short, dense, restart, order, exit};
}
