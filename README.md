# STARBOX COFFEE

**CLIMB. COLLECT. BREW.**

An original, free Project 0 arcade climbing experience on [lot 696](https://project0.city/lot/696). Choose a coffee and an expressive pixel barista, then leap around a real cylindrical course as coffee fills the glass mug.

Release **2.2 is live and reviewed**: submission **9459**, experience **83f8f4430e3ed247**, with no warnings. It introduces independently designed courses, stronger coffee pressure, slippery ceramic and corrected multi-touch release. Release 2.1 is recoverable from Git tag `checkpoint-2.1-before-2.2` (submission 8883, experience `3a19877ce5677aaa`).

**Continuing development:** this repository contains the full editable source.
Read [GitHub and Project 0 access](ACCESS.md) for authentication, network,
local setup and official publishing commands. Project 0 credentials stay in
the executing environment or ignored `.env`, never in GitHub.

See [2.2 verification](verification/2.2/README.md) for balancing, tests, browser evidence and publication. Earlier [2.1 polish](verification/polish/README.md) and [V2](verification/v2/README.md) evidence is retained.

## Release 2.2

- Espresso: 32 main platforms, three switchbacks and progressive jumps; 133.5 logical metres around the cup. Latte: 40 main platforms, five switchbacks, longer gaps and narrow ceramic combinations; 191.1 metres. Both retain two required ingredient forks, biscuit regeneration and permanent timber bypasses.
- Coffee rises at 1.18 m/s after 3.2 seconds in Espresso, and 1.28 m/s after 1.8 seconds in Latte. Binary-input Perfect runs take approximately 23.8/30.2 seconds, compared with 17.3/23.3 in 2.1.
- Ceramic coasts approximately 2.70 logical metres from full speed; wood stops in approximately 0.57 m. Counter-steering brakes sooner, and air steering remains responsive. White glaze lines identify ceramic.
- Touch contacts retain their original action through movement and off-button release. The official SDK supplies per-contact dx/dy, not pointer IDs; the handler uses those endpoints and counts multiple fingers on one action.
- Background blur is reduced from 7px to 2px/0.7px across two fixed depth layers. No scrolling or counter-rotation is added. The finish has a larger star, gold landing and flags; failure shows best height and percentage. Native sprites, depth occlusion, contact shadows and the street exterior remain.


## Focused 2.1 polish

- Every biscuit reforms 1.8 seconds after collapse, with a ghost preview before becoming solid again. Cracks appear earlier; amber edges, shaking and crumbs warn before collapse.
- Espresso has three permanent timber bypasses and Latte has four. Each takes two safe pads and an extra jump to reach the same next main platform. The upper detour sits above a direct jump's apex so it cannot intercept the biscuit shortcut.
- Milo follows the supplied tousled-hair, green-cloaked explorer direction with 16 poses, six running frames, an apex pose and two landing frames. Mira remains selectable.
- The native-resolution sprite samples the 3D world's depth: real foreground geometry can hide it. A soft projected contact shadow, warm ambient tint, local lantern rim light and coffee bounce help it sit in the environment.
- Smooth bevelled platform silhouettes retain stylized surface textures. White ceramic has a gentle stopping glide; timber remains firmer. Dimensional beans, milk and stars use three shading levels, highlights, soft glows and platform shadows.
- The glass widens upward. Soft distant café layers, edge condensation, reflections and overhead warmth add depth; coffee ripples, bubbles, splashes and steam remain inexpensive geometry/texture effects.
- The compact HUD uses stronger contrast, larger counts, bold labels and clear ready/grace/rising/danger states. The current official game name is **STARBOX COFFEE**; Coffee Rising remains the danger mechanic.

## What V2 adds

- **Milo and Mira:** two selectable baristas with idle, run, jump, fall, landing and victory poses. Gameplay sprites render at native resolution with nearest sampling, independently of the 3D world's adaptive resolution.
- **A warmer dimensional café:** textured timber, ceramic and biscuit ledges, a glass mug and handle, café alcoves, striped awnings, lanterns, greenery and a warm window backdrop. Coffee pours, ripples, foams and rises.
- **Three switchbacks:** both left and right movement matter. Wide rest pads, small precision ledges and golden ingredient forks interrupt the ascending route.
- **Collapsing biscuits:** landing starts a 1.05-second timer. The biscuit shakes, cracks, drops crumbs and falls away. In 2.1 it reforms after a further 1.8 seconds, and selected sections offer permanent detours.
- **More recipe ingredients:** Espresso needs 6 beans; Latte needs 8 beans and 5 milk drops. Two recipe ingredients require fork routes. Optional café stars add score and never replace required ingredients.
- **Faster coffee:** Espresso rises at 0.68 logical metres/second and Latte at 0.74, after a short grace period. The speed stays independent of pickups.
- **Refined presentation:** illustrated title/loading cover, coffee selection, character selection, a compact HUD, small touch controls, pause and improved results/card presentation.

The street-view café and its three GLB detail levels remain available. V2 upgrades the playable experience entered from that attraction.

## Play

Enter lot 696 in Project 0. Choose Espresso or Latte, then Milo or Mira.

- **A/D or left/right:** run around the cup.
- **Hold Space, W or Up:** jump higher. Release and press for the next jump.
- **R:** fresh brew. **P:** pause/resume. **M:** mute.
- **Touch:** hold left/right and jump together. Releasing jump retains steering.
- **Space:** advance the menus. **1/2:** choose coffee or barista on its screen.
- **Escape:** leave. **Enter:** Project 0 chat.

Reaching the exit completes the round even when the recipe is incomplete. Only collecting every required ingredient earns **Perfect Coffee**. Time, quality, ingredients, stars and score appear separately. Scores and Perfect Coffee cards use the official Project 0 APIs. Entry and prizes are zero; there are no purchases or token payouts.

## Source map

- `experience/main.js`: screen flow, responsive input, camera, rendering, audio and official score/card calls.
- `experience/barista.js`: native pixel animation, sampled world-depth occlusion, ambient/rim/bounce grading and projected contact shadow.
- `experience/rules.js`: deterministic fixed-step movement, cylindrical collisions, switchbacks, ingredient forks, biscuit lifecycle, coffee and scoring.
- `experience/environment.js`: efficient original 3D café geometry, textured surfaces, glass, lanterns, coffee, steam and biscuit effects.
- `experience/collectibles.js`: batched dimensional beans, milk drops, stars and pickup sparks.
- `experience/ui.js`: native-resolution typography, menus, HUD and collectible presentation.
- `experience/assets/v2/`: original V2 characters, frame metadata, cover, cards, lettering and surface atlas.
- `experience/assets/polish/`: registered Milo animation atlas, per-frame data and provenance.
- `tools/art-source/`: preserved generated artwork and provenance.
- `tools/generate_environment_atlas.py` and `tools/generate_fonts.py`: reproducible texture and licensed-lettering pipelines.
- `tools/devkit_v2.mjs`, `tools/browser_play_v2.mjs`, `tools/browser_recovery.mjs`, `tools/mobile_touch_v2.mjs`: tests using the official sandbox and ordinary keyboard/touch events.
- `tools/project0.py`: owner-side publishing helper; obtain its private `P0_KEY` through the environment, never browser code.
- `build/`: the original café's three GLBs, supported shaders/script and Blender source.
- `verification/v2/`: release validation, publishing responses, browser evidence and exact limitations.

All logical movement and geometry are scaled uniformly by 0.24 into the 12 × 19 × 12m lot. Position genuinely travels around the mug; rotation is not a visual substitute for movement. The camera eases through direction changes and widens its portrait framing to show upcoming jumps.

## Local verification

`npm test` runs renderer-independent complete runs with ordinary binary steering/jump inputs. Tests cover both Perfect recipes, incomplete Great/Weak finishes, actual direction reversals, optional stars, biscuit cracking/collapse/regeneration/relanding, complete permanent bypass routes, coffee failure, short input pulses, pause, retry and low frame rates.

Serve the experience with `python3 tools/serve.py`, then open:

https://project0.city/devkit?entry=http://localhost:5500/main.js&width=12&depth=19&height=12

The platform bundles Three.js. Run `node tools/devkit_v2.mjs --view review --mode review` for its software-rendered review; other modes include flow, climb, recovery, idle and touch. `--mode recovery` demonstrates reaching a biscuit, retreating to permanent footing, waiting for regeneration, relanding and jumping above it. `--mode climb --route safe` exercises the permanent route. These tests never teleport players, alter run state or award real cards by shortcut. `P0_HEADLESS=0` enables a visible GPU browser; the default uses SwiftShader. `node tools/measure_difficulty.mjs` compares the tagged 2.1 physics with 2.2; `node tools/measure_geometry.mjs` checks actual Three.js mesh bounds (requires Three r186).

## Artwork and scope

Milo, Mira, the cover and card illustrations were created for STARBOX with OpenAI image generation. The geometry, surface textures and original synthesized effects are authored for the game. Raster lettering uses licensed DejaVu fonts; the licence is included. Source art and exact frame rectangles are preserved. The WebP sprite atlas round-trips pixel-exactly from its PNG source.

This release focuses on single-player arcade runs. Shared racing, ghosts, bosses, extra cup themes and seasonal systems remain future work. Concurrent visitors can play independent rounds in the same Project 0 session.
