# Continue the existing COFFEE PANIC! project

This repository contains the editable, published COFFEE PANIC! (formerly STARBOX COFFEE)
source. Start here; do not reconstruct the public bundle or rebuild the game.
Current baseline: release 2.4.1 HD-2.5D, Project 0 lot 696, experience 5f659407861fce0e,
reviewed submission 10318, published from ae63d92eadc47f8b8d1b8057202989500a4f5cf8.
The previous COFFEE PANIC! experience e9cad449634dc727 (submission 10211) is
recoverable at checkpoint-before-hd-ae63d92 and artifacts/coffee-panic-2.4.1.zip.
Public listing rename was reviewed as 10212. Previous
published 2.4 (experience 1bc707880dd2e3c0, submission 9902) is recoverable at
checkpoint-2.4-before-2.4.1. Previous published 2.3 (experience 08289dd2fc68c6ad,
submission 9637) is recoverable at checkpoint-2.3-before-2.4. Published 2.2 (experience 83f8f4430e3ed247,
submission 9459) is recoverable at checkpoint-2.2-before-overhaul. The recoverable
2.1 tag is checkpoint-2.1-before-2.2. Read README.md and ACCESS.md first.

The initial STARBOX-named 2.4.1 submission 10192 was rejected for IP/branding.
The owner authorized a name-only change to COFFEE PANIC!, which is now published
and reviewed. See verification/rename and the original verification/2.4.1.
checkpoint-before-coffee-panic-rename preserves the candidate before renaming.
Keep technical identifiers, storage keys, reward IDs, characters and existing
artwork intact unless separately requested; the rename changes display text only.

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
In 2.4, only steering-origin contacts may slide between LEFT and RIGHT; jump
and blank origins keep their identities. Preserve the retry input latch, expanded
hit targets and reference counts. The SDK consumes focus loss by clearing its
input state; observe that reset without treating one finger's release as a global
release. See verification/2.4 for native touch, retry, focus-loss and maze checks.

Camera overhead limits share the actual café roof dimensions in
experience/camera-layout.js. Preserve clearance beneath solid beams; Espresso's
shorter room previously let the portrait camera cross its ceiling near 97%.
Developer Tester code/art belongs only under tools/developer and in a separate
local staging directory. Never add its privileged controls to the public
experience without a documented, trusted platform authorization mechanism.
Developer sessions must never send scores, wins, rewards, saves or progression.

## Permanent AI model selection policy

Choose the most efficient model capable of completing the task reliably:

- **GPT-6.1 Sol xhigh:** complex gameplay physics, collision systems, rendering
  architecture, difficult debugging, major refactoring and high-risk technical
  changes.
- **GPT-6.1 Sol high:** default for everyday gameplay development, visual
  improvements, UI implementation, new features and testing.
- **GPT-6 Luna:** simple file operations, straightforward code changes,
  documentation, formatting and lightweight inspections.

Where supported, use lower-cost subagents for suitable independent work.
Do not claim to have changed models unless the Codex runtime confirms it.
Instructions alone do not switch the active model.

## Permanent autonomous development and publication policy

The owner gives standing authorization to publish completed, verified COFFEE
PANIC! gameplay and visual updates to Project 0 lot **696**, and to synchronize
the matching source with **fottokarll/STARBOX-coffee** on GitHub. Do not stop at
a preview build unless validation fails or publication is technically impossible.

1. Complete assigned development tasks independently from implementation through
   testing, publication and deployed verification.
2. Do not ask the owner for routine approvals or additional publication
   confirmation.
3. Make reasonable technical decisions autonomously.
4. Prioritize working code over excessive research and reports.
5. Create Git checkpoints before major changes.
6. Run appropriate automated tests and real gameplay verification.
7. Fix failures and regressions before publishing.
8. Once a game update is complete and verified, publish it automatically to
   Project 0 lot **696**.
9. Commit and push the matching source code to GitHub.
10. Verify the live published version rather than merely trusting the API
    submission.
11. Never expose, print or commit API credentials.
12. Never modify other Project 0 lots or unrelated repositories.
13. Documentation-only tasks do not require an unnecessary re-upload of
    unchanged gameplay.
14. Explicit user instructions for a particular task override this default
    release workflow.
