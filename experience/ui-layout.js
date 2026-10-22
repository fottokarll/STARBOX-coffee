// Project 0 owns the first 54px. Keep the primary climb HUD above its timer.
export function headerLayout(width, height, inGame) {
  const short = height < 450, mobile = width < 720;
  const hud = inGame ? {x: Math.max(10, (width - 760) / 2), y: short ? 56 : 61,
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
