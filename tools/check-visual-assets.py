"""Verify actor, weapon and shadow atlas pixels against their original PNGs."""
from pathlib import Path
import json,sys
from PIL import Image
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'public/assets/mir/manifest.json').read_text())
hero={int(e['path'][:8],16):e for e in json.loads((root/'.cache/hero.json').read_text())['tree']}
atlases={p['key']:json.loads((root/'public/assets/mir'/p['data']).read_text()) for p in m['pages']}
images={}
errors=[];composites=weapons=shadows=monsters=0
for key,f in m['frames'].items():
 kind=f['sourcePath'].split('/')[1]
 if kind not in ['hero','weapon','monster']:continue
 code=int(Path(f['sourcePath']).name[:8],16)
 expected=Image.open(root/'.cache/raw'/kind/Path(f['sourcePath']).name).convert('RGBA')
 if kind=='hero' and not code&(1<<23):
  other=hero.get(code|(1<<24))
  if other:
   expected_path='texture/hero/'+other['path']
   if expected_path not in [p['sourcePath'] for p in f.get('layers',[])]:
    errors.append(key+': missing original clothing layer');continue
   overlay=Image.open(root/'.cache/raw/hero'/other['path']).convert('RGBA')
   expected=Image.alpha_composite(expected,overlay);composites+=1
 if kind=='weapon':weapons+=1
 if kind=='monster' and not code&(1<<23):monsters+=1
 if code&(1<<23):shadows+=1
 if f['texture'] not in images:images[f['texture']]=Image.open(root/'public/assets/mir'/next(p['image'] for p in m['pages'] if p['key']==f['texture'])).convert('RGBA')
 rect=atlases[f['texture']]['frames'][key]['frame']
 actual=images[f['texture']].crop((rect['x'],rect['y'],rect['x']+rect['w'],rect['y']+rect['h']))
 if actual.size!=expected.size or actual.tobytes()!=expected.tobytes():errors.append(key+': atlas pixels differ from source assembly')
print(json.dumps({'verifiedHeroComposites':composites,'verifiedWeaponFrames':weapons,'verifiedMonsterFrames':monsters,'verifiedShadowFrames':shadows,'failures':len(errors),'examples':errors[:5]},indent=2))
sys.exit(bool(errors))
