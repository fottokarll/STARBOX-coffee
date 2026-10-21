# STARBOX COFFEE 2.2 verification

Published and reviewed on lot **696**: experience **83f8f4430e3ed247**, submission **9459**. Static validation and publication returned no errors, warnings or findings. The 2.1 checkpoint is Git tag `checkpoint-2.1-before-2.2`.

The official lot and experience titles are **STARBOX COFFEE**. Coffee Rising remains the mechanic and danger label. Lot metadata was updated through the documented build publisher (submission 9458), reusing the original GLBs, materials and script. The exterior version remains **fab90cf1e6f03779-dfdeecc369ddd596**.

## Measured difficulty

All distances and coffee speeds below are logical metres; the scene scales uniformly by 0.24. `difficulty.json` compares the tagged 2.1 rules and current rules with the same binary-input pilot. These are deterministic simulations, separate from the browser runs below.

| Metric | Espresso 2.1 → 2.2 | Latte 2.1 → 2.2 |
|---|---:|---:|
| Main platforms | 24 → 32 | 32 → 40 |
| Switchbacks | 3 → 3 | 3 → 5 |
| Route distance around cup | 74.79 → 133.50 m | 99.32 → 191.10 m |
| Maximum centre-to-centre jump | 3.65 → 5.30 m | 3.65 → 5.70 m |
| Maximum clear edge gap | 0.95 → 2.90 m | 0.95 → 3.80 m |
| Summit height | 26.45 → 33.88 m | 35.65 → 41.34 m |
| Coffee rise | 0.68 → 1.18 m/s | 0.74 → 1.28 m/s |
| Grace after countdown | 4.0 → 3.2 s | 4.0 → 1.8 s |
| Perfect pilot completion | 17.27 → 23.84 s | 23.27 → 30.20 s |

Espresso progresses from broad timber and short introductions to longer ceramic/biscuit combinations, retaining three reversals. Latte is separately authored, with five reversals, repeated narrow ceramic combinations and wider selected jumps. Both retain two required ingredient forks, optional score stars, 1.05-second biscuits, 1.8-second regeneration and three/four permanent timber bypasses.

The same pilot also completes Espresso with 0.25 seconds of deliberate hesitation per landing, Latte with 0.12 seconds, and both entire timber routes. Repeated 0.25-second hesitation spills Latte. Complete Perfect Latte runs also pass at 30, 15 and 10 simulation frames per second. Jump gravity, height, speed cap and air steering remain unchanged; every main landing, required fork and both pads of every bypass are physically exercised. Every two-level rise exceeds the jump apex.

## Surfaces, input and presentation

Ceramic neutral braking is **2.2 rad/s²**, versus **10** on wood; active ceramic acceleration/counter-steering is **4.8**, versus **8.5** elsewhere. At full 1.55 rad/s, ceramic coasts approximately **2.70 m in 0.71 seconds**, versus **0.57 m in 0.16 seconds** on wood. Counter-steering stops sooner. Air steering remains responsive. Physics fixtures measure actual stopping distance and retained momentum.

`pointer-controls.js` stores each originating action and reference-counts contacts. The official shell/runtime forwards per-contact x/y/dx/dy, but strips pointerId; the previous endpoint is recovered from the delta. Blank contacts are tracked too. Keyboard and raw standard gamepad A/RT input remain supported.

Backdrop blur is reduced from 7px to 2px/0.7px on two fixed depth layers. There is no scrolling or counter-rotation. Ceramic has pale glaze lines; the finish has a larger star, gold landing and flags. HUD time has an opaque backing; failure reports best height and percentage. Sprites, animation, sampled depth occlusion, contact shadows, mug, cafe identity and exterior remain. Tiny glaze markings use flat geometry to avoid unnecessary side faces. Actual Three r186 mesh bounds are inside the lot: Espresso y 0.01–10.18 m, Latte 0.01–11.97 m (`geometry.json`).

## Automated and browser checks

`tests.txt`: **11 test groups pass**. Coverage includes Perfect recipes, incomplete Great/Weak finishes, all main/fork/bypass landings, biscuit collapse/regeneration/relanding, pause/retry, variable jump height, short press pulses, ceramic friction/momentum, low frame rates, coffee tuning and touch contact regressions.

The following are actual Chromium runs in the official Project 0 DevKit. Controllers use ordinary keys, native touch or the documented gamepad simulation. They observe public logs and predict between observations; they never write game state, teleport, synthesize pickups or force rewards.

- `espresso-steered-desktop.json`: **Perfect Coffee, 6/6 beans, 28.65 s**, both required forks and the finish. Milo selected.
- `latte-desktop.json`: **Perfect Coffee, 8/8 beans and 5/5 milk, 36.27 s**, both required forks and the finish. Mira selected. The coffee is close at this slower browser pace.
- Both result screenshots show the official DevKit card response, score and recipe. DevKit uses stand-in awards; signed-in real inventory issuance is not claimed.
- `native-touch-pass-phone.json`: actual native multi-touch at 390×844. Touch menus select Latte/Mira. Simultaneous movement+jump, off-button jump release, movement released over a different button, and a third blank finger released while both actions remain held all pass. Runtime errors are empty.
- `controls.json`: pause freezes position; resume, raw gamepad A jumping, restart and failure progress pass.
- `official-review-review.json`: final official DevKit review starts, with **crash null, errors [], violations []**, 41.7 fps in the GPU browser. This is separate from the platform's successful publication review.

`performance.json` is a sequential 10-second warmed attract-scene comparison at 640×360 on the same Intel HD 6000 GPU browser: **42.4 fps (2.1), 48.2 fps (2.2)**; median frames **19.2/17.8 ms**. No slowdown was detected in this short comparison. This is a busy shared desktop, so the numbers are not a controlled phone benchmark. Complete 960×640 gameplay runs measured lower, variable frame rates while still completing legitimately.

During development, local SwiftShader cold-start probes encountered startup timeouts on this busy four-core machine (`software-startup-limitation.json`). No successful full software-renderer playthrough is claimed. Final GPU DevKit review and the server's reviewed publication passed. Physical-phone performance and operating-system interruption/cancellation remain future device checks.

## Deployed verification

`deployed-verification.json` confirms the actual published version, all **9** returned source/manifest files matching locally (allowing the server's loading-colour capitalization normalization), and all **30** public files fetched. Every public asset hash matches the package; the generated bundle is fetched separately. `package-manifest.json`, `validation.json`, `publish.json` and `metadata-publish.json` preserve the exact release evidence. Credentials and owner tooling are excluded from the experience ZIP.

`live-browser.json` verifies **actual live-city guest entry** into the published version: title, Espresso/Mira selection, keyboard jump, landing and pause. Browser errors and network failures are empty. This uses the deployed `sandbox/shell.html` session, separate from DevKit's simulated session.

## Follow-up work

- Run the touch suite on physical iOS/Android devices, including application switching and OS gesture cancellation. The current SDK does not forward pointercancel or stable contact IDs; exact coincident contact endpoints cannot be disambiguated from the supplied data alone.
- Test comfort and performance on a wider device sample. Keep future parallax restrained; a larger art sprint can refine background separation and render scaling without altering the existing characters.
- Consider separate per-course score boards in a later release. Existing weekly scores and rewards are preserved.
