# Continue the existing STARBOX project

This repository contains the editable, published STARBOX COFFEE: Coffee Rising
source. Start here; do not reconstruct the public bundle or rebuild the game.
Current baseline: release 2.1, Project 0 lot 696, experience 3a19877ce5677aaa,
reviewed submission 8883. Read README.md and ACCESS.md first.

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

Known next fix: pointer release in experience/main.js uses the release position
instead of the originating control. Releasing over a different button can leave
movement held; releasing over blank space can clear another held action. Test
off-button release and simultaneous touch controls. Do not assume pointerId is
available: inspect the documented SDK input events first.
