# Focused 2.1 polish — 21 October 2026

Live: https://project0.city/lot/696

## Publication and preserved scope

- Official submission **8883**, HTTP 200, `status: live`, `reviewed: true`, warnings empty.
- Experience version **3a19877ce5677aaa**; canonical name **STARBOX COFFEE: Coffee Rising**.
- Final static validation: errors, warnings and findings all empty.
- Public file list reports the same version. All eight returned source/manifest files match this release; loading colour capitalization is the server's expected normalization.
- Entry and prize remain zero. Original card IDs 718/719 and legitimate Perfect-only award gating are unchanged.
- Exterior version remains **fab90cf1e6f03779-dfdeecc369ddd596**. Exterior files were not redesigned or republished.
- Main routes remain 24/32 platforms, heights 26.45/35.65 logical metres and three switchbacks. Recipes and coffee speeds are unchanged.

See `experience-publish.json`, `experience-validation-final.json`, `deployed-verification.json` and `package-manifest.json`.

## Fairness and complete runs

`rules-test.txt` records execution of the actual deterministic rules with binary steering/jump inputs:

- Perfect Espresso 6/6 beans in 17.27 s; Perfect Latte 8/8 beans + 5/5 milk in 23.25 s.
- Complete Latte recipes at 30, 15 and 10 simulation frames per second.
- Great and Weak incomplete finishes stay distinct from Perfect.
- Full Espresso and Latte permanent timber routes finish and land on both safe pads in every detour, bypassing their biscuit shortcuts.
- Biscuit cracks/collapse, pause freezing regeneration, 1.8-second regeneration, actual relanding after restoration and a fresh crumble timer.
- Coffee failure, restart resets, variable jump height, brief input pulses and no held-key automatic bouncing remain covered.
- The upper timber balcony is above the direct jump's apex, preventing accidental interception of the biscuit route.

`biscuit-recovery.json` is a real official-sandbox keyboard test. It reaches biscuit 6, observes cracks and collapse, retreats onto permanent timber pad 28, waits for biscuit 6 to reform, lands on that restored biscuit and jumps to main platform 7. This targeted test stops on platform 7; it is not a claim of a complete browser victory. A preceding full-browser continuation attempt recovered successfully and later spilled on a precision jump. Complete 2.1 recipe/route finishes are established by the rules tests above.

## Character, rendering and touch

Milo's original 16-pose atlas follows the supplied explorer direction and retains the existing identity. Six run frames, four idle frames, rise/apex/fall, two landing frames and victory are registered with a common foot baseline. Mira remains selectable. Nearest sampling retains actual game-scale pixel clusters.

The native sprite shader samples the world render target's depth. A separate official-sandbox fixture using the same `barista.js` counted 4,210 changed sprite pixels against a clear background, 7,740 against a wall behind it, and **0** against a wall in front. This establishes actual occlusion rather than drawing the sprite over scenery. See `sprite-depth-proof.json`; `depth-fixture-source.js` preserves the fixture. It uses the packaged Milo assets and the unchanged barista module in a separate test directory.

The game adds a soft platform contact shadow, local warm rim/bounce tint, smoothly bevelled ledges, three-level shaded dimensional ingredients/stars, icon highlights/glows/shadows, a tapered glass shell, softened room layers, edge condensation, coffee waves, bubbles, splashes, steam and overhead warmth. These are geometry/texture effects; no physical refraction or expensive post-processing is claimed.

`mobile-touch.json` records native CDP touch into the official sandbox's actual canvas at 390 × 844. Taps select Latte/Mira. Simultaneous RIGHT+JUMP raises y 1.02 → 1.20; releasing only JUMP retains steering, yaw 0.19 → 0.39, while y reaches 1.36. Runtime errors are empty. This tests emulated phone-sized touch/layout, not a physical phone or a full phone climb.

`geometry-bounds.json` measures both actual course meshes: x/z within ±4.032 m, y 0.01–8.398 m (Espresso) or 0.01–10.606 m (Latte), inside the 12 × 19 × 12 m lot. Foreground glints also stay within bounds. Total environment triangles, including all instances before culling, are 44,140/54,638; the materials use baked shading rather than expensive dynamic lights.

## Official review of the deployed source

After publication, the eight API-returned source files were replayed in a separate local directory with the exact submitted assets. The official Project 0 devkit review returned **started true, crash null, errors [], violations []**. Its normal keys entered menus, started Latte, jumped and landed. The 14-second review measured 4.7 fps in SwiftShader, first frame 6.8 ms. See `official-devkit-review.json` and its screenshot. This confirms the returned deployed source in the official runtime; it is separate from the blocked live-city binary-asset path below.

## Verification limits

The managed network policy still blocks CONNECT to **files.project0.city** with HTTP 403 before the origin. `asset-host-check.json` records a fresh request for this deployed bundle. A normal live-city entry and direct deployed binary-asset download remain unavailable here. Official publication is confirmed live/reviewed, source matches and sandbox execution is tested.

The browser uses GPU-less SwiftShader; the recovery, touch and review probes measured about 3–5 fps. Physical-phone/GPU performance has not been measured. World resolution adapts while UI and character remain native resolution. The devkit uses stand-in scores/items; signed-in inventory issuance is not claimed. There were no reward shortcuts, paid entry or token payouts.

Previews: `barista-selection.png`, `gameplay.png`, `biscuit-cracking.png`, `biscuit-missing.png`, `biscuit-restored.png`, `phone-framing.png` and `phone-gameplay.png`.
