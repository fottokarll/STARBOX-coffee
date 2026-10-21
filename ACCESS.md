# GitHub and Project 0 access

## Source of truth

Repository: https://github.com/fottokarll/STARBOX-coffee

This is the complete authoring source, assets, exterior GLBs/Blender source,
tools and verification evidence for the published 2.1 release. It is not a
runtime-only recovery. The original local baseline commit is
8a62725092679755643872efab2e913b3a270c9c; the GitHub import retains the
repository's existing initial commit as its parent. Earlier local Git history
remains in the original workspace.

```sh
git clone https://github.com/fottokarll/STARBOX-coffee.git
cd STARBOX-coffee
npm test
```

For write access from another Codex environment, connect the GitHub account
`fottokarll`, allow this repository in the GitHub app, or authenticate that
machine with `gh auth login`. Verify with `gh auth status`; an invalid token
must be fixed in that environment. A connection in another chat/machine does
not automatically configure the local Git CLI.

## Private owner API access

GitHub access and Project 0 authorization are separate. Set the already-issued
Project 0 owner key as the environment secret `P0_KEY` in the environment that
runs Codex. Alternatively, enter it in an ignored local `.env`:

```sh
python3 - <<'PY'
import getpass, os, pathlib
p = pathlib.Path('.env')
key = getpass.getpass('Project 0 owner key (hidden): ').strip()
if not key.startswith('p0_') or any(c.isspace() for c in key):
    raise SystemExit('Invalid key format')
fd = os.open(p, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, 'w') as f:
    f.write('P0_KEY=' + key + '\n')
os.chmod(p, 0o600)
PY
```

`tools/project0.py` reads `P0_KEY` from the environment first, then the ignored
`.env` beside this file. The key is never needed in browser code. Do not paste
it into a prompt, repository file, command argument or test report.

Read-only authorization and editable source checks:

```sh
python3 tools/project0.py /api/agent/me
python3 tools/project0.py /api/agent/lots/696/source
```

The official owner key authorizes the player's lots/avatar and documented
owner operations, including source recovery, validation and publishing. It
does not confer Project 0 platform-administrator access. Keep this work scoped
to lot 696 unless the user requests another lot.

## Network and browser setup

Allow HTTPS to `project0.city` and `files.project0.city` in the executing
environment. The second host serves deployed assets; allowing only the main
domain can leave the DevKit stuck loading. Follow the managed environment's
network settings; do not bypass its proxy or TLS checks.

The gameplay unit tests need Node.js, with no npm dependencies. API and ZIP
helpers use Python 3's standard library. Browser tooling needs Playwright and
Chromium. `python3 tools/serve.py` serves only experience/ on port 5500.

## Validate and publish when a game update is requested

Read the current official guides, run appropriate gameplay/browser tests,
then package and validate the actual change:

```sh
python3 tools/package_release.py --out /tmp/starbox-experience.zip
python3 tools/project0.py /api/agent/lots/696/experience/validate --method POST --file package=/tmp/starbox-experience.zip
```

After validation and within the user's requested publishing scope:

```sh
python3 tools/project0.py /api/agent/lots/696/experience --method POST --file package=/tmp/starbox-experience.zip
```

Inspect the official response; poll a returned submission when pending.
Verify the deployed version and play it. Access setup by itself does not
require republishing the current game or changing its exterior.
