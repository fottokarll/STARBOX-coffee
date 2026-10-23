# COFFEE PANIC! — experimental Claude HD-2.5D visual integration

**Base**: dev/gameplay-visual-overhaul (COFFEE PANIC! 2.4.1, commit 5f3297449a81a577d61e3de82e693b082cc92e67).

**Integration**: Claude visual upgrade, adapted to the current Project 0 SDK renderer and preserved cameraFrame/CAFE_ROOF fix.

## Updated paths
- experience/main.js — optional bitmap backgrounds, higher capped pixel ratio, adaptive scene resolution and diagnostic telemetry.
- experience/diorama.js — optional eight-sample wide highlight bloom, edge-aware softness, subtle warmth and vignette; keeps the hero and next landing protected.
- experience/environment.js — painted repeatable far panorama, optional mid panorama fallback, warmer lantern halos and floating motes.
- experience/barista.js — stronger contact shadow; the existing depth-tested pixel sprite shader is unchanged.
- experience/assets/v2/cafe-atlas.png — original Claude atlas (512x512, 4x4 grid).
- experience/assets/v3/backdrop-far.png — original Claude panorama (2048x512).

## Safeguards
- Current camera-layout.js, rules.js, ui.js, ui-layout.js, animation atlases, scoring and physics are unchanged.
- No EffectComposer, runtime PBR migration or shadow-map flood.
- Missing optional mid-background falls back to the procedural layer.
- Original 2.4.1 branch remains an immediate rollback checkpoint.

## Verification status
Static source review and original Claude package syntax test are available. **This branch has not yet undergone current-project node test suite, Project 0 GPU/browser validation or physical-phone testing. It is NOT published to lot #696.**

Before merge/release, run:
```
node --check experience/main.js
node --check experience/environment.js
node --check experience/diorama.js
node --check experience/barista.js
npm test
```
Then run official Project 0 DevKit visual, camera and touch checks at multiple mobile resolutions, assess FPS, inspect Espresso upper 85–100% and Latte, and publish only a tested build.