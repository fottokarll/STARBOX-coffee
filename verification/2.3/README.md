# STARBOX COFFEE 2.3 release

Published on 22 October 2026 to [Project 0 lot 696](https://project0.city/lot/696):
**experience `08289dd2fc68c6ad`, reviewed submission `9637`**. Both publication
and the subsequent submission query report `live`, with no warnings or reasons.

The owner explicitly authorized publication and added standing authorization for
future completed, verified gameplay and visual updates. `AGENTS.md` preserves
the existing development instructions and adds the permanent model selection
and autonomous publication policy, including task-specific overrides.

## Exact package and recovery

- Published the existing `artifacts/starbox-coffee-2.3-preview.zip` unchanged.
- ZIP SHA-256: `17296050129b584adede02153b7b2698ca69c6d08174bf41c3e8a9e8aae17f78`.
- All 42 packaged files match the tested `experience/` source at commit
  `54dc059405efe8e05c1c4cc9a77d25d183a45c20`, their sizes and manifest hashes.
  Credentials and owner tooling are excluded. See `package-integrity.json`.
- Only the repository package label was promoted to `2.3.0`; no experience
  files, gameplay, artwork or exterior files changed for publication.
- Previous published 2.2 is preserved locally and on GitHub at
  `checkpoint-2.2-before-overhaul`, commit
  `383801d1e5225cfa62559f20542c32e5a815ba98`. Its deployed version before this
  release was independently confirmed as `83f8f4430e3ed247`; see
  `previous-source.json`. The 2.1 checkpoint remains available too.

## Final verification

- Fresh `npm test`: **23 passed, 0 failed**, including complete deterministic
  recipe runs and low frame rate collision/input fixtures. `tests.json` records
  the result; these are distinct from browser playthroughs.
- Fresh official `devkit.review(14)` on the normal `main.js` entry in GPU
  Chromium: started, crash null, errors empty, violations empty. The sample was
  48.6 FPS; it is not a device-wide performance guarantee. Restart/prefetch
  requests include nonfatal `ERR_ABORTED` entries, as in earlier evidence.
  See `official-review-review.json` and its screenshot.
- The unchanged source retains the full Perfect recipe, permanent-route,
  native touch and recovery browser evidence in [overhaul verification](../overhaul/README.md).
- Fresh owner validation: HTTP 200, `ok:true`, no errors, warnings or findings;
  content hash `08289dd2fc68c6ad`. See `validation.json`.
- Publication returned HTTP 200, `reviewed:true`, `status:live`; no asynchronous
  poll was required. A separate submission query confirmed `live`.
  See `publish.json` and `submission.json`.
- Independent deployed checks confirmed the expected version through owner
  source and public file APIs. All **13** source/manifest files match, allowing
  the documented manifest colour-case normalization. All **30** public files
  were fetched: **29** packaged assets match byte-for-byte and the generated
  bundle is recorded separately. See `deployed-verification.json`.
- Actual live-city guest gameplay entered
  `sandbox/shell.html?lot=696&v=08289dd2fc68c6ad`, selected Espresso/Mira, jumped,
  landed and paused. Browser errors and network failures are empty. See
  `live-browser.json`, `live-title.png` and `live-gameplay.png`.
- Building status was cleared after deployed verification; see `done.json`.

No critical issues remain. Existing limitations still apply: phone-size native
Chromium testing is not a physical-phone test, and local software-renderer
review is not claimed. The platform's actual publication review passed.

The verification helpers now accept a separate report directory so future
release checks preserve historical 2.2 evidence.
