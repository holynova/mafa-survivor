"""Compare rendered hero atlas pixels to the source client's two-layer assembly."""
from pathlib import Path
import json,sys
from PIL import Image
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'public/assets/mir/manifest.json').read_text())
hero={int(e['path'][:8],16):e for e in json.loads((root/'.cache/hero.json').read_text())['tree']}
atlases={p['key']:json.loads((root/'public/assets/mir'/p['data']).read_text()) for p in m['pages']}
images={p['key']:Image.open(root/'public/assets/mir'/p['image']).convert('RGBA') for p in m['pages']}
errors=[];checked=0
for key,f in m['frames'].items():
 if key.split('/')[0] not in ['wizard','warrior','taoist']:continue
 code=int(Path(f['sourcePath']).name[:8],16); other=hero.get(code|(1<<24))
 if not other:continue
 expected_path='texture/hero/'+other['path']
 if expected_path not in [p['sourcePath'] for p in f.get('layers',[])]:
  errors.append(key+': missing original clothing layer');continue
 base=Image.open(root/'.cache/raw/hero'/Path(f['sourcePath']).name).convert('RGBA')
 overlay=Image.open(root/'.cache/raw/hero'/other['path']).convert('RGBA')
 expected=Image.alpha_composite(base,overlay)
 r=atlases[f['texture']]['frames'][key]['frame']
 actual=images[f['texture']].crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']))
 if actual.tobytes()!=expected.tobytes():errors.append(key+': composite pixels differ from original layers')
 checked+=1
print(json.dumps({'verifiedHeroComposites':checked,'failures':len(errors),'examples':errors[:5]},indent=2))
sys.exit(bool(errors))
