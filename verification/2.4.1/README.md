# STARBOX COFFEE 2.4.1 verification

Follow-up: the owner-authorized name-only **COFFEE PANIC!** release subsequently
passed moderation as submissions 10211/10212 and is live at e9cad449634dc727.
See [rename verification](../rename/README.md). The rejected submission and
pre-rename checks below remain historical evidence.

This release fixes the upper Espresso camera and small-screen modal input,
and imports the supplied higher-resolution Milo. Private Developer Tester
tools and artwork remain outside the public experience.

## Camera regression

Espresso's opaque oak ceiling is at world Y10.2772–10.2964m. The old portrait
camera reaches Y10.4785m around 97%, looking down through that solid surface.
Latte's taller ceiling avoids it because the lot-height camera cap engages
first. The final camera shares dimensions with the rendered roof and stays
at least 0.0768m below the lowest beam. All room and level geometry remains.

`camera-geometry.json` checks 158,760 character/landing sightlines and 42,336
near-plane corners across seven viewports, 36 angles, three look directions
and upper-course/jump heights. Corrected roof intersections: zero. The old
Espresso 97% fixture reproduces 324 blocked rays.

Official DevKit full Perfect runs use ordinary keys and copied observations,
without altering game state. Captures trigger at 85/90/95/97/99%; play continues
while screenshots finish, so JSON records trigger and actual capture progress.

| Build / recipe | Full Perfect run |
| --- | --- |
| 2.4 Espresso, 390×844 | 24.85s; original brown obstruction reproduced |
| 2.4.1 Espresso, 390×844 | 25.07s; upper character and route visible |
| 2.4.1 Latte / Mira, 390×844 | 30.62s; all required beans and milk |
| 2.4.1 Espresso, 320×568 | 26.13s; full run recorded as video |
| 2.4.1 Espresso, 412×915 | 25.28s; upper route visible |

Compare [old upper Espresso](before-camera-espresso-phone-climb-97.png) with
[corrected upper Espresso](camera-espresso-phone-climb-97.png).
Additional narrow-phone proof: [320px upper climb](camera-320-espresso-phone-climb-97.png).
[Full 320×568 browser gameplay video](espresso-320-full-run.webm) is cropped
from the original Playwright DevKit recording under `video/`; it includes
startup, menus, an ordinary-key full Perfect climb and results.

## UI, controls and sprites

`ui-responsive.json`: actual DevKit checks passed at 320×568, 390×844,
412×915, 844×390 and 568×320. Progress/order anchors immediately below the
54px Project 0 toolbar, timer directly below. Results have one BREW AGAIN;
the giant retry target is gone. Pause blocks underlying HUD buttons.
[Small-screen results](ui-320x568-failure-single-retry.png).

`controls-phone.json`: ten native touch/keyboard checks passed, including
expanded targets, steering slides, independent/crossed/off-button release,
duplicate contacts, blank third finger, fresh-input SPACE/BREW AGAIN retries,
pause and actual native focus loss. No synthetic blur fallback was needed.

`sprite-import.json`: sixteen complete foot-registered frames, transparent
padding and pixel-exact lossless WebP. Milo's body resolution rises from 76
to 153px; physical height remains 1.62 logical metres. Mira is unchanged.
The private blue developer character has sixteen poses and a 145px body.
Built-in image generation prepared the owner-supplied references. Transparent
sources and exact prompts: `tools/art-source/2.4.1/`; deterministic technical
importer: `tools/prepare_characters_241.py`.

## Gameplay, security and package

`package-integrity.json` confirms all 46 ZIP entries match tested source,
without private developer files or credential patterns. Core rules, collision,
touch tracking, input latch, records, rewards, sprite renderer, collectibles,
lighting and composite remain byte-identical to published 2.4. Score/reward
and record writes in main also remain unchanged. Coffee speed, jump, movement,
routes, difficulty, ingredients and scoring are preserved.
`presentation-geometry.json` checks the retained room and coffee clearance.

The documented SDK provides no authenticated owner-role gate. Developer mode
therefore uses a separately staged local experience, with no public code,
entry or assets. Transformed practice code plus an SDK allowlist prevent
score, win, item, save, shared-position and progression writes. Controls:
[`tools/developer/README.md`](../../tools/developer/README.md).
Zoom is deferred; flight and checkpoints provide inspection.

`developer/developer-report.json`: six real DevKit checks passed, including
coffee modes, checkpoints/flight/section restart, unlimited Espresso and Latte
finish inspection, and trusted native touch. The dedicated blue character is
visible in the captured local tester. No reward/persistence attempts occurred;
four deterministic privacy tests additionally attempt forbidden writes and
verify zero calls reach the real SDK. The inspector includes climb percentage,
collectible flags/counts and biscuit lifecycle details.

Asset inventory and production workflow:
[`docs/ASSET-INVENTORY.md`](../../docs/ASSET-INVENTORY.md).

## Validation, limitations and rollback

`npm-test.log`: 59 tests passed. `validation.json`: official owner validation
passed without errors, warnings or findings. Package SHA256:
`59bf3c2a9fde76ff2d8397d42731004adce1a7bdc67b9441c3295071e1023e8b`.

These are browser tests at phone viewports, not physical-phone tests.
Reports preserve aborted localhost DevKit startup requests; completed runs
have no runtime errors. Shared-desktop frame timing is not Android performance.
Existing coffee-surface and café-lighting fixes remain without a broad redesign.

`official-review-final-review.json`: the final real DevKit review started,
had no crash/errors/slow frames, and measured 57.9 FPS at 640×360 with a 47ms worst
frame. The earlier completed review report also passed; its driver received
signal 143 during owned-server cleanup. Repeating with a separately owned
experience-only server completed normally with exit 0.

`browser-summary.json` records the comparable 390×844 Espresso runs: old/new
recent FPS both 58, average frame time 18.4/18.5ms and p95 33.8/33.9ms. Latte's longer,
more complex run measured 39 recent FPS, average 30.9ms and p95 100.7ms while
capturing screenshots. These are whole-run browser timings on a shared desktop,
not isolated renderer benchmarks.

Pushed rollback tag `checkpoint-2.4-before-2.4.1` points to
`5da7ece50b7407d8a15e37fc3bc9b99e102a5fce`.

## Publication: BLOCKED

Technical validation passed, but POST publication returned HTTP 422,
`status:rejected`, submission 10192, category `ip`. The platform's reason:

> The submission uses the name 'STARBOX COFFEE' and a visual design (green and white color scheme, star-in-circle logo on cups) that is a clear imitation of the Starbucks brand, violating the intellectual property rule regarding real brands.

`publish.json` and `submission-10192.json` preserve the rejection. The public
files endpoint and owner source endpoint confirm that the current live
experience remains **1bc707880dd2e3c0 (2.4)**. The 2.4.1 package is not deployed.
`live-version-confirmation.json` also compares every returned live source file
with the published 2.4 rollback checkpoint. A real city guest entered that
version, selected Espresso/Mira, jumped, landed and paused successfully with
no browser or network errors (`live-still-2.4/live-browser.json`). The lot's
building status was cleared after verification.
The current official review documentation supplies no appeal endpoint. The
owner's required title, existing Mira/café identity and deferred graphic-review
scope were preserved; no blind repeated submission or broad rebranding was
performed. Publication requires the platform to clear this branding or a
separate authorized branding revision. The verified code/package remain
ready for that resolution.
