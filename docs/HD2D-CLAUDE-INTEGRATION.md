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

## Verification and publication status

Published without game-source edits from merge commit
`ae63d92eadc47f8b8d1b8057202989500a4f5cf8`: Project 0 submission **10318**,
experience **5f659407861fce0e**, reviewed/live without warnings.
All 59 automated tests, official technical validation and a GPU DevKit runtime
review passed. Physical-phone verification is not claimed. Publication and
deployed verification evidence: [HD release report](../verification/hd-release-ae63d92/README.md).
The optional mid-background is absent in the merged source; its existing
procedural fallback remains active. The publication step adds no assets.
