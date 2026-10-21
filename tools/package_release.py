"""Package only the sandbox experience and record a reproducible content manifest."""
from pathlib import Path
import argparse, hashlib, json, zipfile

parser=argparse.ArgumentParser()
parser.add_argument('--out',required=True)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]/'experience'
out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True)
files=[]
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
    for path in sorted(root.rglob('*')):
        if not path.is_file():continue
        data=path.read_bytes();name=path.relative_to(root).as_posix()
        archive.write(path,name)
        files.append({'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
manifest={'package':out.name,'bytes':out.stat().st_size,
          'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'files':files}
out.with_suffix('.manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({key:manifest[key] for key in ['package','bytes','sha256']}))
