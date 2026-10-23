#!/usr/bin/env python3
"""Create a private local DevKit experience; never mutate the publishable source."""
from pathlib import Path
import argparse, hashlib, json, shutil, tempfile, http.server, functools, importlib.util

ROOT = Path(__file__).resolve().parents[2]
PRIVATE = Path(__file__).resolve().parent


def once(source, before, after):
    if source.count(before) != 1:
        raise ValueError(f'Developer staging stopped: expected one source anchor: {before[:90]!r}')
    return source.replace(before, after, 1)


def build(destination, character=None, metadata=None):
    destination = Path(destination).resolve()
    if destination.name != 'experience' or destination == ROOT or ROOT in destination.parents:
        raise ValueError('Private staging must use an experience/ directory outside this repository')
    if destination.exists() and any(destination.iterdir()):
        raise ValueError('Use a new or empty private experience directory')
    if not character and not metadata and (PRIVATE/'assets/milo.webp').is_file() and (PRIVATE/'assets/milo.json').is_file():
        character, metadata = PRIVATE/'assets/milo.webp', PRIVATE/'assets/milo.json'
    if bool(character) != bool(metadata):
        raise ValueError('Supply both --character and --metadata')
    character_data = None
    if character:
        character_data = json.loads(Path(metadata).read_text())
        if not character_data.get('characters',{}).get('boy'):
            raise ValueError('Developer atlas metadata must provide a boy character entry')
        if not Path(character).is_file():
            raise ValueError('Developer atlas does not exist')
    # Fail before writing any staged data if a source anchor changes.
    main = (ROOT/'experience/main.js').read_text()
    main = once(main, "import {createRun,step} from './rules.js';", "import {createRun,step} from './developer-rules.js';\nimport {createDeveloper} from './developer.js';\nimport {isolateSDK} from './developer-session.js';")
    main = once(main, 'export default async function start(p0,{observe=null}={}) {',
        'export default async function start(sdk,{observe=null}={}) {\n  const p0=isolateSDK(sdk).sdk;')
    main = once(main, '  const pointers=createPointerControls((x,y)=>ui.hit(x,y),action);',
        '  const developer=createDeveloper(p0,{getModel:()=>model,begin:()=>begin(true),chooseRecipe,clearTouch,markDirty:()=>{uiDirty=true;}});\n'
        '  const pointers=createPointerControls((x,y)=>developer.hit(x,y)||ui.hit(x,y),action);')
    main = once(main, '  function action(id,down=true) {', '  function action(id,down=true) {\n    if(developer.action(id,down))return;')
    main = once(main, '    const code=event.code;if(event.repeat)return;heldActions.add(code);',
        '    const code=event.code;if(event.repeat)return;heldActions.add(code);\n    if(developer.key(code))return;')
    start, end = main.index('  function finishRewards(run) {'), main.index('  function processEvents(run,time) {')
    main = main[:start]+'  function finishRewards(_run) {} // Private session: no rewards.\n'+main[end:]
    main = once(main, '        model.bests=keepRecord(model.bests,run.result);\n        p0.save({...p0.saved,starbox:{version:1,bests:model.bests}}).catch(()=>{});',
        '        // Private session: records and persistence are disabled.')
    main = once(main, '      step(run,{move,jump,jumpPressed:jumpPulse,pause:pausePulse},safe);',
        '      developer.step(run,{move,jump,jumpPressed:jumpPulse,pause:pausePulse},safe,step);')
    main = once(main, '    ui.render(renderer);renderer.autoClear=true;',
        '    ui.render(renderer);developer.render(renderer);renderer.autoClear=true;')
    main = once(main, '  updateWorld(0,0);ui.draw(model);', '  developer.start();updateWorld(0,0);ui.draw(model);')
    main = once(main, '    barista.dispose();contactShadow.dispose();', '    developer.dispose();barista.dispose();contactShadow.dispose();')
    rules = (ROOT/'experience/rules.js').read_text()
    private_rules = "import {developerCoffeeY} from './developer-session.js';\n"+rules
    private_rules = once(private_rules, '  run.coffeeY = -3 + Math.max(0, run.elapsed - recipe.grace) * recipe.rise;',
        '  run.coffeeY = developerCoffeeY(run, recipe.rise);')
    start, end = private_rules.index('function finish(run, success) {'), private_rules.index('function updateBiscuits(run, dt) {')
    private_rules = private_rules[:start]+'function finish(_run, _success) {} // Private exploration never completes a scored run.\n\n'+private_rules[end:]
    shutil.copytree(ROOT/'experience', destination, dirs_exist_ok=True)
    (destination/'main.js').write_text(main)
    (destination/'developer-rules.js').write_text(private_rules)
    for source, name in [('session.mjs','developer-session.js'),('runtime.mjs','developer.js')]:
        shutil.copyfile(PRIVATE/source,destination/name)
    (destination/'developer-entry.js').write_text("export {default} from './main.js';\n")
    if character:
        shutil.copyfile(character,destination/'assets/polish/milo.webp')
        (destination/'assets/polish/milo.json').write_text(json.dumps(character_data))
    manifest={'private':True,'entry':'developer-entry.js','publicRulesSHA256':hashlib.sha256(rules.encode()).hexdigest(),
        'developerCharacter':bool(character),'warning':'LOCAL ONLY. NEVER package or publish this directory.'}
    (destination/'PRIVATE-DEVELOPER-ONLY.json').write_text(json.dumps(manifest,indent=2)+'\n')
    return manifest


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out',type=Path)
    parser.add_argument('--character',type=Path)
    parser.add_argument('--metadata',type=Path)
    parser.add_argument('--serve',action='store_true',help='Serve only the private staged experience on loopback')
    parser.add_argument('--port',type=int,default=5502)
    args=parser.parse_args()
    out=args.out or Path(tempfile.mkdtemp(prefix='starbox-private-developer-'))/'experience'
    build(out,args.character,args.metadata)
    print(out.resolve(),flush=True)
    if args.serve:
        spec=importlib.util.spec_from_file_location('starbox_cors_server',ROOT/'tools/serve.py')
        server_module=importlib.util.module_from_spec(spec);spec.loader.exec_module(server_module)
        handler=functools.partial(server_module.CorsHandler,directory=str(out.resolve()))
        print(f'https://project0.city/devkit?entry=http://localhost:{args.port}/developer-entry.js&width=12&depth=19&height=12&size=960x640',flush=True)
        server=http.server.ThreadingHTTPServer(('127.0.0.1',args.port),handler)
        try: server.serve_forever()
        except KeyboardInterrupt: pass
        finally: server.server_close()
