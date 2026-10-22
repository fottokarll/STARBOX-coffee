# Gameplay and café preview

Development branch: `dev/gameplay-visual-overhaul`, package version `2.3.0-preview.0`. This update is **not published**. Lot 696 remains on release 2.2 (`83f8f4430e3ed247`, submission 9459). Recovery tags: `checkpoint-2.2-before-overhaul` and `checkpoint-2.1-before-2.2`.

The supplied café and premium HUD images guided the shapes, palette and composition. They were not copied into game assets. Existing character artwork, animation, recipes, reward cards, score tiers and the street exterior are retained.

## Gameplay

| Measurement | Espresso 2.2 → preview | Latte 2.2 → preview |
|---|---:|---:|
| Main platforms | 32 → 32 | 40 → 40 |
| Total platforms | 41 → 38 | 53 → 46 |
| Finish height, logical metres | 33.88 → 35.38 | 41.34 → 42.40 |
| Largest clear main gap, logical metres | 2.90 → 3.10 | 3.80 → 3.80 |
| Coffee speed | 1.18 m/s, unchanged | 1.28 m/s, unchanged |
| Initial grace | 3.2 s, unchanged | 1.8 s, unchanged |

Clustered ingredient islands are consolidated into turning terraces. Beans toward the outside of two terraces still require deliberate collection. Reversals have clear launch space and higher timber landings. Each course has three permanent timber alternatives taking the opposite arc of the cylinder; they rejoin at a turning terrace. Latte keeps narrower ceramic landings, longer jumps and five direction changes, versus Espresso's three.

`difficulty.json` records every main gap, height, deterministic completion and bypass run against the original tagged 2.2 rules and pilot. These are input-driven estimates, not human completion averages; the pilots differ because solid walls require different launch planning. Both Perfect recipes and permanent paths finish legitimately. Ceramic still coasts about 2.70 logical metres from full speed; timber about 0.57 m. Counter-steering brakes sooner.

`collision.js` sweeps a body against the actual slab thickness in the cylindrical angular/vertical plane. Tops, sides and undersides are solid; contact removes only normal velocity. Both render geometry and rules use the same slab thickness. Feet anchor above the top surface; the upright sprite retains genuine sampled depth occlusion. Corbels lie outside the running lane. Biscuit regeneration waits if a body is inside the reforming slab, preventing engulfment.

## Presentation

The tower stands on a real oak counter/coaster. Batched geometry adds espresso machines, grinders, cups, shelves, tall windows, plants, pendant lights, branding and an oak ceiling. Two miniature upper façades were removed to free the climbing view. Lanterns sit beside landing centers. The distant layers retain 8%, 12% and 16% of camera rotation; the near counter and cup stay fixed. Background blur is zero. The upper camera stays inside the lot and the café ceiling fills the finish view.

Cream serif headings, forest panels, gold line icons and larger figures unify the HUD, selections and result receipt. The timer and controls reserve Project 0's toolbar space; compact landscape puts pause/mute in the bottom row. Failure shows time, highest climb, ingredients and personal best. Records use documented `p0.saved`/`p0.save`; guests keep session records.

## Verification

- `npm-test.txt`: complete recipes and score tiers; all main landings, terraces, permanent detours and stars; biscuit collapse, rescue, pause, regeneration and relanding; ceramic momentum; buffered/coyote jumps and retry. Full input-driven Perfect runs include 120/60/30/15/10 FPS. Solid contact fixtures cover 240 through 10 FPS, high-speed tunnelling, the angular seam, intersecting slabs and occupied regeneration. UI bounds and personal records have regressions.
- `espresso-review.json`: actual DevKit Perfect keyboard run, 26.48 s. `latte-phone.json`: actual phone-size DevKit Perfect run with Mira, 34.63 s. The QA observations use documented `p0.hud` and never write game state; the driver calls the official `devkit.key` API.
- `espresso-safe-desktop.json`: actual permanent-route Perfect run, 28.66 s, including all six timber pads. `latte-safe-phone.json`: actual permanent-route finish, 34.64 s, including all six timber pads; incomplete recipe correctly earns Great Coffee.
- `touch-final-phone.json`: native Chromium multi-touch, off-button and cross-button release, simultaneous movement/jump, and a blank third contact. `ui-phone.json`: native touch selection, Mira, pause/resume, mute/unmute and retry on the final interface. `controls.json`: keyboard pause/restart/failure and raw gamepad jump.
- `recovery.json`: actual side obstruction, biscuit collapse, retreat to timber, timed regeneration and relanding, using ordinary DevKit keys. Underside contact is verified in regression fixtures; it is not presented as a browser playthrough.
- `official-review-review.json`: the official `devkit.review(14)` profile on GPU Chromium completed with no errors or violations. This is a local DevKit check, not a published content review.
- `geometry.json`: real Three r186 geometry fits 12 × 19 × 12m. Approximately 58k/66k triangles, with three additional batched room meshes and no new lighting/shadow passes.
- `performance.json`: sequential 10-second warmed 640×360 GPU samples on the same busy shared desktop: 2.2 26.3 FPS, preview 24.8 FPS (about 6% lower); median 32.6 → 22.5 ms, p95 111 → 97.3 ms. This noisy shared-machine sample is not a device-wide FPS guarantee. Nonfatal duplicate-prefetch aborts occur in both versions; runtime errors are empty.

Desktop GPU Chromium and phone-sized native Chromium touch are verified; a physical phone has not been tested. DevKit rewards/saves use its stand-ins, so no live cards were issued. Project 0's DevKit toolbar can retain its loading status; the game's HUD and buttons sit below it. The SDK still does not forward OS-level pointer cancellation or contact IDs; the existing contact-endpoint tracking is preserved.

A late-game boost is deferred to preserve the tested jump, sliding and coffee balance. A future art pass can add finer café textures, richer lighting and more prop variety without changing the renderer.

## Preview and package

Run `PYTHONHOME= PYTHONPATH= python3 tools/serve.py`, then open:

https://project0.city/devkit?entry=http://localhost:5500/main.js&width=12&depth=19&height=12&size=960x640

Use `size=390x844` for the phone layout. The optional `preview.js` entry enables copy-only status through documented `p0.hud` for the QA tools. `main.js`, the manifest entry, does not enable them.

[Validated ZIP](../../artifacts/starbox-coffee-2.3-preview.zip) · [content manifest](../../artifacts/starbox-coffee-2.3-preview.manifest.json) · [API validation](validation.json).

The owner validation endpoint returned HTTP 200, `ok:true`, no errors, warnings or findings. Candidate content hash: `08289dd2fc68c6ad`. The ZIP SHA-256 is `17296050129b584adede02153b7b2698ca69c6d08174bf41c3e8a9e8aae17f78`. Every packaged file was compared with the current source hash; credential files and blocked worker transport are absent. This is a validation hash, not a published experience version. No publication endpoint was called.
