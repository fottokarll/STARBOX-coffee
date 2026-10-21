# V2 release verification — 21 October 2026

## Published

The playable update is live on Project 0 lot 696: https://project0.city/lot/696.

- Experience submission **8829**: HTTP 200, `status: live`, `reviewed: true`, no warnings.
- Experience version **c9fd6462a51c560f**.
- Final static validation: HTTP 200, errors/warnings/findings all empty.
- Original street café exterior continues at version `fab90cf1e6f03779-dfdeecc369ddd596`; its three GLBs and source remain in this backup.
- Perfect Latte card 718: new art approved, submission 8785.
- Perfect Espresso card 719: revised original explorer art approved, submission 8827.
- Existing card IDs are preserved. Awards remain gated by an actual successful run with all required recipe ingredients.
- Public game configuration confirms entry 0, prize 0, minimum play 10 seconds and no pause. No payments or token prizes were introduced.

The authenticated official source endpoint returns all seven source/manifest files. All match this release (the server normalizes loading hex colours). The public file list reports the same version and 25 packaged assets plus the bundle. See `deployed-verification.json`, `deployed-files-final.json`, `experience-publish-final.json` and `package-manifest.json`.

## Gameplay tests

`npm test` passes complete runs using the actual deterministic rules and binary steering/jump inputs:

- Perfect Espresso: 6/6 beans, about 17.25 seconds.
- Perfect Latte: 8/8 beans and 5/5 milk, about 23.25 seconds.
- Great and Weak incomplete finishes never receive Perfect status.
- Three actual changes of direction, optional fork routes and separate bonus stars.
- Biscuit arming, cracks, collapse, collision removal, pause freeze and retry reset.
- Predictable rising coffee and immediate submerged failure.
- Variable jump height, brief input pulses and no automatic bounce from a held jump.
- Complete Latte recipes at 30, 15 and 10 simulation frames/second.

An actual official-sandbox browser run completed Espresso using normal keyboard events. It traversed all three switchbacks, jumped from collapsing biscuits, collected 4/6 beans and finished **GREAT COFFEE in 20.158 seconds**. Score was 2,119,842. Runtime errors were empty. `browser-finish.json` preserves the event and position trace; `gameplay.png` and `results-great.png` show the real rendered run. This run demonstrates that reaching the exit without both fork ingredients completes the game without being marked Perfect.

The playable hero is rendered in a native-resolution pass over the adaptive-resolution 3D world; `gameplay.png` confirms crisp pixel sampling. Both Milo and Mira, all menu screens, countdown, platform collision, ingredient collection, coffee failure, results and pause have been exercised in the official sandbox. A read-only final audit found no blocking integration issues. A small 320px-wide short-results button edge found by the audit was corrected before final validation and publication.

## Official deployed-source replay

After publication, the official source API's returned JavaScript/manifest files were copied into a separate local replay directory alongside the exact submitted assets. The official Project 0 devkit reviewed this replay at 640 × 360 with its normal simulated keys: **started true, crash null, errors [], violations []**. It entered the menus, started Latte, jumped, landed and reached a legitimate failure result. The 14-second review measured 6.5 fps in SwiftShader, first frame 21.2ms. See `official-devkit-review.json` and its screenshot. This tests the actual returned deployed source in the official runtime; it is separate from the normal live-city asset-host limitation below.

## Native mobile touch

The official sandbox ran at an explicit **390 × 844** viewport with native CDP touch input. All menu steps used real taps to select Latte and Mira. A simultaneous right+jump hold moved the player from y 1.02 to 1.38. Releasing only jump retained rightward steering (yaw 0.59 → 0.95), with y reaching 1.45. Runtime errors were empty. `mobile-touch.json` contains the positions, screenshots and native pointer audit. `character-mira.png` and `phone-framing.png` show the actual portrait selection and upcoming pads.

This is an input/framing check, not a complete phone run. The probe deliberately releases its inputs off-route afterward and spills, exercising failure/results (`phone-failure.png`). The official devkit's own phone-stick overlay is excluded by using an explicit phone-sized viewport; the published manifest sets `stick: false`.

## Verification limits

The managed environment's proxy rejects CONNECT to `files.project0.city` with HTTP 403 before reaching the asset origin. `asset-host-check.json` records a fresh check of this release's bundle URL. A normal live-city client entry and direct deployed asset download therefore cannot be verified here. Official publication is confirmed live/reviewed, deployed source matches, and the official sandbox runs the actual game. A live-city visit requires the official asset host to be permitted by the environment network policy.

Browser rendering here uses a GPU-less SwiftShader environment. The complete browser run measured about 6 fps. Hardware-GPU and physical-phone frame rates have not been measured; no 60fps claim is made. The game lowers world resolution while retaining native-resolution UI and sprites.

The devkit uses stand-in scores and item rewards. No signed-in inventory issuance is claimed, and no card was issued through a testing shortcut. Advanced multiplayer, ghosts, bosses, additional cups and seasonal systems remain future work.
