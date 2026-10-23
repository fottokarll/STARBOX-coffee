# COFFEE PANIC! — name-only release

Publication **SUCCESS**. STARBOX COFFEE is now **COFFEE PANIC!** on the same
[Project 0 lot 696](https://project0.city/lot/696).

## Scope

- `experience/ui.js`: display title and existing two-line title labels only.
- `experience/environment.js`: procedural café sign lettering only.
- `experience/experience.json`: official experience/loading/menu name and credits.
- `build/manifest.json`: public lot name, description and credit name.
- README/AGENTS and verification helpers: documentation and title assertions.

`name-only-integrity.json` proves the UI changes only string literals and the
environment changes only its sign text. All other 59 checked runtime, artwork,
build and private developer files are byte-identical to the pre-rename source.
No character, physics, camera, route, coffee, score, leaderboard, saved-key,
touch-layout, shader, image, logo or exterior model was changed. Internal
STARBOX identifiers and historical provenance remain. There is no owned HTML
document in the worker experience; platform titles use the manifest/lot name.
Lettering embedded in existing reward-card art and exterior model wordmarks
was preserved under the owner's explicit instruction to retain graphics/logos.

The rename starts from tested 2.4.1 commit
`8a8a8a5778b7a6bad16ddde20b02e683ffe4cf09`; it does not redo gameplay development.
Rollback tag `checkpoint-before-coffee-panic-rename` preserves that source.
`checkpoint-2.4-before-2.4.1` still preserves the preceding public 2.4 build.

## Checks

- `tests.log`: all 59 automated tests passed.
- `smoke.json`: real official DevKit production-entry phone and desktop tests
  passed title, coffee/character selection, jump, landing and pause, without
  game-state mutation or runtime errors.
- [Phone title](rename-smoke-phone-title.png),
  [desktop title](rename-smoke-desktop-title.png).
- `validation.json`: official experience validation/build passed without
  errors, warnings or findings. `listing-validation.json`: all three reused
  exterior LODs passed.
- Package `artifacts/coffee-panic-2.4.1.zip`, 46 files, SHA256
  `00de1c2b2ef391e0935c34563eabdbe35e7749138ea88871365188e31def7c11`.

## Moderation and deployed verification

Experience submission **10211**: HTTP200, reviewed, live, no reasons,
categories or warnings. Confirmed independently in `submission-10211.json`.
Live experience **e9cad449634dc727**, semantic version2.4.1.

Public listing submission **10212**: HTTP200, reviewed, live, name exactly
**COFFEE PANIC!**, no reasons, categories or warnings
(`listing-publish.json`, `submission-10212.json`). Existing exterior version
`fab90cf1e6f03779-dfdeecc369ddd596` remains unchanged.

`deployed-verification.json` confirms all17 returned source/manifest files
match tested source, and all30 public files were fetched with every local
asset matching byte-for-byte. No credentials or private developer tools enter
the public package.

`live/live-browser.json`: actual city guest check passed, public listing title
and sandbox version confirmed, ready log **COFFEE PANIC! 2.4.1**, title and menus
loaded, Espresso/Mira selected, ordinary keyboard jump/landing/pause passed.
No browser or network errors. [Live title](live/live-title.png),
[live gameplay](live/live-gameplay.png). Tests used a desktop browser, not a
physical phone. DevKit smoke reports preserve harmless aborted startup reads.

Moderation identified **no remaining branding concerns** in either approved
rename submission. Existing images/logos remain unchanged as explicitly
requested; approval is the platform's confirmed result for these submissions.
