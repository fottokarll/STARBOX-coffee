# Private Developer Tester verification

The reusable local tester is implemented in [`tools/developer/`](../../../tools/developer/README.md).
Its code and dedicated sprite remain outside the public `experience/` tree.
No owner SDK authorization check exists in the current documented API, so no
public developer flag or client password was added. Only the isolated local
DevKit entry enables the tester.

## Deterministic checks

[`tests.tap`](tests.tap): all **59 tests passed**, including four focused private
tester tests. The focused checks verify:

- Score, win, item and save calls never reach the underlying SDK; saved records,
  owned items and leaderboards are hidden, reward/table events are dropped, and
  unrelated progression/network SDK properties fail closed.
- Checkpoints derive from both current recipes' real authored course data,
  including all bypass/bonus pads, switchbacks and finish.
- Coffee freeze/disable/resume uses the authored recipe's speed and preserves
  its held level. The SDK state summary stays separate from persisted state.
- A real public release ZIP excludes every developer module/marker and the
  private atlas bytes; staging never changes public rules. Private physics can
  neither finish nor fail, calculate results, award rewards nor write records.

`git diff --exit-code -- experience/rules.js` passed after implementation.
The public rules file is byte-identical. Staging uses a checked local copy to
alter coffee and suppress finish/fail; normal public gameplay never imports it.

## Actual official DevKit checks

[`developer-report.json`](developer-report.json) records **six passed checks**
using the genuine Project 0 DevKit, documented SDK input, and Chromium's native
trusted touch events:

1. The local tester starts frozen with private state and no attempted reward/save
   calls. The dedicated brown-haired, glasses-wearing blue-clothed cup-holding
   character is visible.
2. Keyboard controls disable coffee, resume rising and freeze at the current
   level.
3. Source-derived checkpoint navigation, unrestricted flight and section restart
   operate through normal DevKit keys.
4. Espresso's finish remains in `play`, with no result, score, win or item.
5. Latte's finish also remains unlimited and unrewarded.
6. A native trusted touch contact operates the private coffee-mode button through
   the official shell and SDK.

The final runtime status was `started`, with zero runtime errors and 40 FPS in
the DevKit summary. All inspection snapshots reported an empty blocked-attempt
array. The browser closed normally; these were **checkpoint/flight tool checks,
not ordinary Perfect Coffee playthroughs**.

The DevKit network telemetry recorded some local discovery requests as
`net::ERR_ABORTED`. The local server successfully served these modules/assets,
the sandbox loaded 29 files (2.7 MB), and all final checks ran. No bypass of TLS
or Project 0 network policy was used. The telemetry is retained in the report;
this evidence does not establish the cause of the aborted discovery requests.

## Screens

- [Private tester and dedicated sprite](developer-phone-private-tester.png)
- [Unlimited Espresso finish](developer-phone-espresso-finish-unlimited.png)
- [Unlimited Latte finish](developer-phone-latte-finish-unlimited.png)
- [Hidden panel with private ribbon retained](developer-phone-panel-hidden-private-ribbon.png)

The private ribbon sits below the SDK toolbar. The overlay includes climb
percentage, ingredients/stars, current platform/section and coffee state.
Detailed I inspections emit biscuit timers and ingredient/star flags in bounded
console groups; compact sequenced state uses the documented HUD feed to avoid
the DevKit console's bounded history.

Optional developer camera zoom is deferred. The corrected ordinary camera is
used. A secure public owner-only tester remains unavailable unless Project 0
adds a documented trusted authorization mechanism.
