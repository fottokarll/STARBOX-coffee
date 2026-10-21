"""Verify lot 696's deployed editable sources and every public asset. No keys in output."""
import argparse
import hashlib
import json
from pathlib import Path
import urllib.request
import project0

parser = argparse.ArgumentParser()
parser.add_argument('--expected-version', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
out = root / 'verification/2.2'
source = project0.request('/api/agent/lots/696/source')
public = project0.request('/api/lots/696/experience/files')
assert source['status'] == public['status'] == 200
assert source['response']['version'] == public['response']['version'] == args.expected_version
checks = []
for entry in source['response']['files']:
    name = entry['path']
    local = (root / 'experience' / name).read_text()
    actual = entry['text']
    if name == 'experience.json':
        expected, received = json.loads(local), json.loads(actual)
        for value in [expected, received]:
            for color in ['background', 'accent', 'text']:
                value['loading'][color] = value['loading'][color].lower()
        matches = expected == received
    else:
        matches = local == actual
    checks.append({'path': name, 'matches': matches, 'sha256': hashlib.sha256(actual.encode()).hexdigest()})
assets = []
for url in public['response']['files']:
    marker = '/'+args.expected_version+'/'
    name = url.split(marker, 1)[1]
    data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'curl/8.0'}), timeout=60).read()
    path = root / 'experience' / name
    assets.append({'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
                   'matches': data == path.read_bytes() if path.is_file() else None})
assert all(c['matches'] for c in checks)
assert all(a['matches'] is not False for a in assets)
report = {'version': args.expected_version, 'allSourcesMatch': True, 'checks': checks,
          'allPublicAssetsFetched': True, 'assets': assets}
(out/'deployed-source.json').write_text(json.dumps(source, indent=2)+'\n')
(out/'public-files.json').write_text(json.dumps(public, indent=2)+'\n')
(out/'deployed-verification.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps({'version': args.expected_version, 'sourceFiles': len(checks), 'publicFiles': len(assets), 'allMatch': True}))
