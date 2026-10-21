# Release verification — 20 October 2026

This file records V1. The current V2 release is documented in [v2/README.md](v2/README.md).

## Published

- Project 0 lot: 696, 12 × 19 × 12m.
- Exterior submission 8279: HTTP 200, live, reviewed, no validation/review warnings.
- Exterior version: fab90cf1e6f03779-dfdeecc369ddd596.
- Game submission 8286: HTTP 200, live, reviewed, no warnings.
- Experience version: 60d9ece485b8022b.
- Perfect Latte card 718 and Perfect Espresso card 719: live and tied to lot 696.
- Entry 0, prize 0, minimum play 10 seconds. No token transactions or paid entry.
- Building status cleared after publication.

The official source endpoint returns the deployed readable modules. Their text matches this backup exactly; the server normalizes loading hex colours to lower case. `deployed-verification.json` records hashes and comparisons. The public deployed file list returns the same version and asset URLs.

## Tests

`npm test` runs the actual rules with ordinary movement/jump inputs:

- Espresso perfect, 4/4 beans, 17.48 seconds with binary keyboard steering.
- Latte perfect, 6/6 beans and 4/4 milk, 23.72 seconds with binary keyboard steering.
- Latte incomplete finish, 3/6 beans and 2/4 milk: Weak Coffee, never Perfect.
- Coffee rises predictably and causes immediate failure.
- Restart clears the round; pause freezes the simulation; jump holding increases height.
- Full climbing works with 30, 60 and 120 fps simulation stepping.
- The character physically traverses multiple circular turns.

The official Project 0 devkit ran the real sandbox with local source and assets. Its automated review returned started:true, crash:null, errors:[], violations:[]. Tested viewports include 960×640, 640×360 and 390×844. Real browser keys exercised jumps, platform collision, ingredient pickup, rising-coffee failure, results and pause; the final browser bot reached platform 12 of 23, physically completed a full circular turn and collected 3/4 beans before falling at an ingredient detour. That actual failure/result path is recorded in browser-climb.json. No complete browser victory is claimed: complete and incomplete finish/scoring branches are verified by the renderer-independent rules tests.

## Limits of verification

The software renderer ran around 6 fps during the automated review. This is a deliberately slow, GPU-less environment. Hardware-GPU and real-phone frame rates have not been measured. The game lowers world resolution dynamically while retaining a native-resolution HUD.

The environment's HTTP proxy rejects CONNECT to `files.project0.city` with 403 before the asset origin is reached. This blocks a live-city client entry and direct deployed asset download from this environment. It is not an upload or Project 0 review failure: official publishing returned live and reviewed, the deployed version/source are confirmed through the API, and the official sandbox passed. A further live-city visit needs the official asset host permitted in the environment network policy.

Cards are created and official `p0.items.give` calls are connected only to real Perfect finishes. A signed-in player's inventory issuance has not been exercised here; the devkit uses stand-in rewards. No first real card was issued for a test shortcut.

## Final mobile touch check

Native CDP touch taps selected Espresso and started the round. A genuine two-finger right+jump press produced a jump. Releasing jump while keeping right held continued angular movement (yaw 0.20 → 0.74), confirming independent touch-button release. Startup was 7.9 seconds, first frame 5ms, with no runtime errors. Evidence: `mobile-touch.json` and `mobile-touch.png`.
