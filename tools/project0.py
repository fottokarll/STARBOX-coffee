"""Owner-side official API helper. Supply P0_KEY privately in the environment.
Never copy a key into the experience package. All HTTP remains on Project 0.
"""
import os, json, uuid, pathlib, urllib.request, urllib.error, argparse
BASE = 'https://project0.city'

def owner_key():
    """Environment wins; otherwise read only P0_KEY from the private local file."""
    token = os.environ.get('P0_KEY', '').strip()
    if token:
        return token
    path = pathlib.Path(__file__).resolve().parents[1] / '.env'
    if path.is_file():
        for line in path.read_text().splitlines():
            name, sep, value = line.strip().partition('=')
            if sep and name == 'P0_KEY':
                return value.strip().strip('\"\'')
    return None

def request(path, method='GET', data=None, fields=None, files=None, key=None):
    if not path.startswith('/api/'):
        raise ValueError('Only documented Project 0 API paths are accepted')
    headers = {'User-Agent': 'curl/8.0'}
    token = key or owner_key()
    if token:
        headers['Authorization'] = 'Bearer ' + token.strip()
    body = None
    if fields is not None or files is not None:
        boundary = 'starbox-' + uuid.uuid4().hex
        pieces = []
        for name, value in (fields or {}).items():
            pieces.append(('--'+boundary+'\r\nContent-Disposition: form-data; name="'+name+'"\r\n\r\n'+str(value)+'\r\n').encode())
        for name, filename in (files or []):
            p = pathlib.Path(filename)
            pieces.append(('--'+boundary+'\r\nContent-Disposition: form-data; name="'+name+'"; filename="'+p.name+'"\r\nContent-Type: application/octet-stream\r\n\r\n').encode())
            pieces += [p.read_bytes(), b'\r\n']
        pieces.append(('--'+boundary+'--\r\n').encode())
        body = b''.join(pieces)
        headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary
    elif data is not None:
        body = json.dumps(data).encode()
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(BASE+path, data=body, headers=headers, method=method)
    try:
        response = urllib.request.urlopen(req, timeout=180)
    except urllib.error.HTTPError as error:
        response = error
    raw = response.read().decode()
    try:
        result = json.loads(raw)
    except ValueError:
        result = {'body': raw[:4000]}
    return {'status': response.status, 'response': result}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('path')
    parser.add_argument('--method', default='GET')
    parser.add_argument('--data')
    parser.add_argument('--field', action='append', default=[])
    parser.add_argument('--file', action='append', default=[])
    parser.add_argument('--out')
    args = parser.parse_args()
    fields = dict(f.split('=',1) for f in args.field) or None
    files = [f.split('=',1) for f in args.file] or None
    result = request(args.path,args.method,json.loads(args.data) if args.data else None,fields,files)
    text = json.dumps(result,indent=2)
    if args.out:
        pathlib.Path(args.out).write_text(text)
    print(text)
