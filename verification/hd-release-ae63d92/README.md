# COFFEE PANIC! HD-2.5D publication

**SUCCESS — reviewed and live on Project 0 lot 696.**

- Submission: **10318**, independently confirmed live in `submission-10318.json`.
- Experience: **5f659407861fce0e**.
- GitHub release source: **ae63d92eadc47f8b8d1b8057202989500a4f5cf8**, fetched
  from `dev/gameplay-visual-overhaul` and packaged without source edits.
- Live URL: https://project0.city/lot/696

## Exact release and rollback

`artifacts/coffee-panic-hd-ae63d92.zip` contains 47 files from `experience/`.
SHA256: `ae379b3faaaf01f717f64ed7b0590ebf28d8ba56e3044ec3d92c338f428f9e3f`.
`package-integrity.json` verifies every ZIP entry against the specified Git
commit, with no untracked files, developer tooling or credential patterns.
No gameplay code or visual asset was changed during publication. The manifest
continues to identify COFFEE PANIC!, semantic version 2.4.1.

Previous live experience **e9cad449634dc727** is preserved by pushed tag
`checkpoint-before-hd-ae63d92`, pointing to
`5f3297449a81a577d61e3de82e693b082cc92e67`, and the existing archived package
`artifacts/coffee-panic-2.4.1.zip`. Its returned live source was compared with
that archive before publication. `previous-source.json` and
`previous-public-files.json` retain the previous deployment identity.

## Release checks

- `tests.log`: all **59** automated tests passed locally.
- `validation.json`: official owner validation/build returned HTTP200,
  `ok:true`, no errors, warnings or findings.
- `hd-review-review.json`: real official DevKit GPU review completed without
  crash or runtime errors, approximately **57.5 FPS** at 640×360, worst frame
  **30.9ms**. This shared-desktop measurement is not physical-phone performance.
- `publish.json`: publication returned HTTP200, reviewed/live, submission10318,
  with no warnings. No asynchronous pending status remained.
- `deployed-verification.json`: all **17** returned editable sources match
  locally and all **31** public files were fetched; every local asset matches.
  The generated public bundle was fetched as well.
- `live/live-browser.json`: an unauthenticated city guest verified the lot name,
  actual sandbox version, ready log, title/selection, Espresso/Mira, keyboard
  jump/landing and pause. It passed with no browser or transport failures.
  [Live title](live/live-title.png), [live gameplay](live/live-gameplay.png).

This publication pass repeats regression tests and a runtime/live smoke check;
it does not claim a new full-course playthrough or physical-phone test. The
inherited live-helper note about separate Perfect runs refers to earlier
release verification, not a full-climb test performed during this step.

The merged source deliberately handles absent optional
`assets/v3/backdrop-mid.png` through its procedural fallback. That diagnostic
appears in runtime logs; it caused no runtime failure and no new asset was
added. DevKit reports retain aborted startup reads. Gameplay and visual changes
belong entirely to the authorized merged commit.

The public name/listing and exterior were already correct and were not
republished. Owner credentials were used only by the local official API helper;
none enter browser verification or the package. Building status was cleared
after verification. Release evidence/docs are committed separately from the
specified source commit.
