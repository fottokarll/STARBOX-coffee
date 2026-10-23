# Private local Developer Tester

This reusable tester runs **only in a separate local DevKit staging directory**.
Nothing in `experience/` enables it. The normal public game keeps its two
baristas, ordinary physics, coffee, results, records and rewards.

The current official SDK documents `p0.me` as `{ id, name, color, avatar,
position, yaw }`, with no trusted owner identity or owner permission check.
A score-table row's `owner` field is not a reliable authorization mechanism.
Accordingly there is no public developer flag, password, hidden button,
character selection or client-side owner claim. The owner API key is never
read or used by this tester.

## Open the tester

From the repository root:

```sh
PYTHONHOME= PYTHONPATH= python3 tools/developer/stage.py --serve
```

Open the printed official DevKit link. By default it uses port 5502, leaving the
ordinary public preview on 5500 available. The server binds to `127.0.0.1` and
serves **only the newly staged `experience/`** under `/tmp`. Stop it with Ctrl-C.
The directory is deliberately outside this repository. Repeat the command after
source edits; every run creates a fresh staging directory.

The dedicated brown-haired, glasses-wearing blue-clothed tester with a cup loads
automatically from `tools/developer/assets/milo.webp` and `milo.json`. To override
those private assets, provide an atlas and matching frame metadata:

```sh
PYTHONHOME= PYTHONPATH= python3 tools/developer/stage.py --serve \
  --character tools/developer/assets/milo.webp \
  --metadata tools/developer/assets/milo.json
```

The atlas metadata uses the existing barista schema and supplies a `boy` entry.
If the default private assets are absent, the tester uses Milo as a visual fallback. Assets belong
under `tools/developer/assets/`, never the public `experience/assets/` tree.

For a staging directory without starting a server, omit `--serve`. For an
explicit destination, use `--out /tmp/your-private-preview/experience`; the
builder refuses paths inside this repository and refuses nonempty targets.

## Controls

The permanent purple ribbon marks a private session. These controls also have
clickable/touchable buttons on its panel.

| Control | Action |
| --- | --- |
| F2 | Hide/show the tools panel, retaining the private ribbon |
| C | Cycle coffee frozen → disabled → rising → frozen |
| [ / ] | Previous/next authored section checkpoint |
| T | Return to the current section and restore transient biscuit state |
| G | Enable/disable unrestricted flight |
| A/D or arrows | Ordinary steering; fly around the cup with flight enabled |
| E / Q | Fly up/down while flight is enabled |
| I | Log a complete state inspection in DevKit's log |
| 1 / 2 | Start a fresh Espresso/Latte test with the developer character |
| Space / P / R | Ordinary jump / pause / fresh test |

Coffee freezes at its current level, disables below the starting platform, or
resumes rising from the held level. Every practice run is invulnerable: reaching
the finish never ends a round, and falling below the mug returns to the current
section. Flight skips normal collision and ingredient collection; turn it off
to test real jumps, collections, ceramic and biscuit physics. Normal play in
this local tester still uses the original fixed-step movement/collision logic.

Checkpoints are derived from each recipe's real fork, bypass, bonus-pocket and
finish relationships. No course coordinates are maintained separately. Landing
updates the current section; T preserves collected counts and resets temporary
biscuit state, while R or 1/2 starts completely fresh. Inspection includes recipe,
state, position, velocity, coffee, counts, current pad, checkpoint and every
biscuit's collapse/regeneration timers. Compact status refreshes once per simulated second through the documented HUD
feed and console. I emits biscuit timers and each ingredient/star ID, kind,
platform and collected flag in bounded console groups; this avoids long-line
truncation in the official SDK. Climb percentage appears in the panel and feed.

## Isolation and verification

Every staged entry, including `main.js` itself, installs the SDK membrane.
The staged copy removes result handling and all score/win/item/save calls.
An additional SDK membrane denies those calls, hides existing records/items and
standings, drops reward/table events, clones the player position locally, and
rejects access to other progression/network SDK facilities. The tools neither
read nor write real progression. Cosmetic pickups and their counts exist only
inside the in-memory test run.

`stage.py` copies the current source and applies narrow, checked transformations.
If an expected source anchor changes, staging fails before copying files. The
public `rules.js` remains byte-identical; only the isolated local copy changes
coffee and suppresses success/failure. The public packaging script always reads
the repository's `experience/`, so the private code, marker and art are absent
from a release ZIP. Never manually publish or ZIP the staged directory.

Run the privacy/regression checks with:

```sh
node --test tests/developer.test.mjs
```

These are deterministic tests, including an actual production-package exclusion
check. Real keyboard, touch and visual verification must additionally use the
official DevKit. Neither deterministic teleport/checkpoint tests nor flight are
claims of an ordinary gameplay playthrough.

The latest real DevKit evidence is in
[`verification/2.4.1/developer/`](../../verification/2.4.1/developer/README.md).
To repeat the native keyboard/touch check against a running private server:

```sh
PYTHONHOME= PYTHONPATH= LD_LIBRARY_PATH= P0_HEADLESS=0 \
  P0_ENTRY=http://localhost:5502/developer-entry.js node tools/developer/verify.mjs
```

Optional camera zoom is deferred; the tester uses the corrected ordinary camera.
