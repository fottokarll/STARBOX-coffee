# Continue the existing STARBOX project

This repository contains the editable, published STARBOX COFFEE
source. Start here; do not reconstruct the public bundle or rebuild the game.
Current baseline: release 2.2, Project 0 lot 696, experience 83f8f4430e3ed247,
reviewed submission 9459. The recoverable 2.1 tag is checkpoint-2.1-before-2.2. Read README.md and ACCESS.md first.

Keep the current course length, switchbacks, permanent biscuit bypasses and
regeneration, two recipes/baristas, rewards, atmosphere and compact HUD. Work
incrementally. Do not redesign the exterior unless the user asks.

Read the current official documentation before changing platform integration:
https://project0.city/skill.md, https://project0.city/guides/games.md and
https://project0.city/guides/assets.md. Never invent SDK functions.

Owner API credentials come from P0_KEY or the ignored local .env. Never print,
commit, publish, serve or include credentials in the experience ZIP. The local
server must serve experience/ only. Owner authorization is scoped by Project 0;
this project targets lot 696. Changing a game requires ordinary validation,
publishing and deployed verification, not a claim based only on upload.

Run npm test for gameplay changes. Use the official DevKit for actual keyboard
and touch behavior and visual checks. Distinguish deterministic test runs from
browser playthroughs; report browser/network limitations precisely.

Touch release is fixed in experience/pointer-controls.js using the originating
contact's x/y and per-contact dx/dy from the official SDK. It does not assume
pointerId, which the current shell strips. Preserve off-button release,
simultaneous controls and duplicate-contact reference counts. The SDK also does
not forward pointercancel; do not invent that event. See verification/2.2 for
native touch tests, two full DevKit Perfect runs and deployed verification.
