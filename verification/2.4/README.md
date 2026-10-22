# STARBOX COFFEE 2.4 release

**Published and reviewed:** 22 October 2026, Project 0 lot **696**, experience **`1bc707880dd2e3c0`**, submission **`9902`**. Publication and the separate submission query report `live`, with no warnings or reasons.
**Automated tests:** 51 passed, 0 failed; see `npm-test.txt`.
**Deployed verification:** all 16 source/manifest files match (manifest colour-case normalization only). All 30 public files were fetched: 29 packaged assets match byte-for-byte; the generated bundle is recorded separately. Actual live-city guest entry, Espresso/Mira selection, jump, landing and pause passed with no browser errors or network failures. See `deployed-verification.json` and `live-browser.json`.
**Source:** `dev/gameplay-visual-overhaul`, release tag `v2.4.0`. Previous published 2.3 is preserved locally and on GitHub at `checkpoint-2.3-before-2.4`, commit `2da93ed12a751e179c562dbf43fd9ed196d1b41d`. The prior 2.2/2.1 checkpoints remain available.

This evidence covers published 2.4 against the 2.3 checkpoint. The final `before-*` and `after-*` screenshots compare the published 2.3 package with the final 2.4 candidate, including the corrected coffee surface.

## Gameplay and course

The course retains 32 Espresso and 40 Latte main platforms, with three and five switchbacks respectively. Coffee speeds and grace periods remain 1.18/1.28 m/s and 3.2/1.8 seconds. No late-game boost was added. The checked-in deterministic pilot measurements use ordinary binary steering and jumps, without teleportation or synthetic collection; runs cover multiple simulated frame rates. The optional all-star Latte route at 10 FPS has a narrow finish margin, while the required Perfect route remains separate.

One bean now sits on the first permanent opposite-side route, making that route meaningful to the recipe; the direct main line finishes with an incomplete order. Optional stars sit on return pockets. Existing biscuit regeneration and permanent bypasses remain. These route changes and measurements are recorded in [gameplay-measurements.json](gameplay-measurements.json).

## Presentation and controls

Touch controls use raised chocolate keys. Progress sits above the timer; quick retry has its own input latch, so a held retry does not become a jump. The intro countdown is 3 seconds; retry countdown is 0.35 seconds. The geometry report identifies the teal coffee's shallow ripple crossing the forest-green coaster as the prior intersection cause; corrected shallow ripple amplitude has zero sampled intersections for both recipes. The café now has warm coherent material lighting. The actual 3D room had previously been hidden behind an opaque painted cylinder; the revised room is visible. Coffee rendering is sampler-free and world compositing respects depth, with no actor or UI blur. See [presentation-geometry.json](presentation-geometry.json) for measured geometry and scene stats.

The DevKit phone viewport was 390×844. Native Chromium contacts and ordinary DevKit keys passed 10 recorded control checks, including expanded hit areas, sliding contacts, off-button release, duplicate-contact counts, simultaneous controls, focus loss/pause behavior, and failure retry input latching. Touch uses the SDK's per-contact x/y and dx/dy; it does not invent `pointerId` or `pointercancel`. A physical phone was not tested. An earlier software-rendered attempt failed; the corrected GPU-backed DevKit run passed. Details are in [controls-phone.json](controls-phone.json) and [controls-phone-pause-cleared-controls.png](controls-phone-pause-cleared-controls.png).

## Visual evidence and remaining verification

[before-visuals.json](before-visuals.json) and [after-visuals.json](after-visuals.json) record comparable review and phone captures; the after set shows the final corrected coffee and responsive HUD. Screenshot files are named `before-*` and `after-*` in this directory.

Automated gameplay measurements are deterministic simulations, not browser playthroughs. Six actual DevKit runs passed: Perfect Espresso/Latte (25.79/31.27 seconds), both permanent routes (27.63/32.97 seconds), and both all-star routes (28.33/34.36 seconds). Latte's permanent route correctly finishes with an incomplete Great order; all-star runs collect all three/five stars. See `browser-routes.json`. Native menu, pause, mute, failure receipt and Quick Retry flow passed on the production `main.js` entry (`ui-phone.json`); actual biscuit collapse, retreat, regeneration and relanding passed (`recovery.json`). Owner validation returned HTTP 200, `ok:true`, no errors, warnings or findings. Publication returned HTTP 200, `reviewed:true`, `status:live`, submission 9902; no asynchronous poll was required. A separate submission query and deployed file APIs confirmed the actual live version. The first city guest check encountered delayed Project 0 onboarding before entering the game; its report is preserved, the helper now completes that onboarding through ordinary clicks, and the final live check passed. Building status was cleared after verification.

The sequential warmed GPU sample at 640×360 measured 2.3 at 53.49 FPS and 2.4 at 48.30 FPS (9.7% lower). Median frame time was 17.1→16.8 ms and p95 32.3→23.3 ms. This busy shared-desktop sample is not a physical-phone result or universal performance guarantee. See `performance.json`.

Both official local `devkit.review(14)` profiles started with crash null, errors empty and violations empty. GPU review measured 42 FPS. SwiftShader remained slow: 2.3 1.9 FPS, 2.4 1.5 FPS; see `software-comparison.json`. The earlier failed software touch attempt predates the interruption-guard refinement and is kept separately; final native controls and the final software review passed. The actual platform publication review passed without warnings.

Package: [`starbox-coffee-2.4.zip`](../../artifacts/starbox-coffee-2.4.zip), 45 files. SHA-256: `c2fc13f9cb70ba93227b1a4cf96c882228e2e1ac4ed45f2e23182d7148ea4b8c`. `package-integrity.json` confirms every file matches current source and excludes credentials/owner tools. Existing character/cover/card assets and street exterior files are unchanged. The mood board remains a reference outside the runtime export.

Remaining limitations: no physical-phone test; local software rendering remains slow; the SDK does not forward OS pointer cancellation. An OS cancellation without any shell reset, resize or frame interruption has no immediate supported signal. Native focus-loss input clearing was verified through a trusted browser blur, with no synthetic fallback. No boost was added because required and optional routes already complete under the preserved coffee pressure, and an extra impulse would change the tested jump balance.
