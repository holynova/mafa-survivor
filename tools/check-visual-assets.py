"""Verify actor, weapon and shadow atlas pixels against their original PNGs."""
from pathlib import Path
import json,sys
from PIL import Image
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'public/assets/mir/manifest.json').read_text())
hero={int(e['path'][:8],16):e for e in json.loads((root/'.cache/hero.json').read_text())['tree']}
atlases={p['key']:json.loads((root/'public/assets/mir'/p['data']).read_text()) for p in m['pages']}
images={}
errors=[];composites=weapons=shadows=monsters=ui=terrain=magic=items=0
for key,f in m['frames'].items():
 kind=f['sourcePath'].split('/')[1]
 if kind not in ['hero','weapon','monster','proguse','map','magic','item']:continue
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
 if kind=='proguse':ui+=1
 if kind=='map':terrain+=1
 if kind=='magic':magic+=1
 if kind=='item':items+=1
 if code&(1<<23):shadows+=1
 if f['texture'] not in images:images[f['texture']]=Image.open(root/'public/assets/mir'/next(p['image'] for p in m['pages'] if p['key']==f['texture'])).convert('RGBA')
 rect=atlases[f['texture']]['frames'][key]['frame']
 actual=images[f['texture']].crop((rect['x'],rect['y'],rect['x']+rect['w'],rect['y']+rect['h']))
 if actual.size!=expected.size or actual.tobytes()!=expected.tobytes():errors.append(key+': atlas pixels differ from source assembly')
for name,part in m.get('uiFiles',{}).items():
 source=m['frames'][part['frame']]['sourcePath']
 expected=Image.open(root/'.cache/raw/proguse'/Path(source).name).convert('RGBA')
 if 'crop' in part:
  x,y,w,h=part['crop'];expected=expected.crop((x,y,x+w,y+h))
 actual=Image.open(root/'public/assets/mir'/part['file']).convert('RGBA')
 if actual.size!=expected.size or actual.tobytes()!=expected.tobytes():errors.append(name+': UI pixels differ from source rectangle')
print(json.dumps({'verifiedHeroComposites':composites,'verifiedWeaponFrames':weapons,'verifiedMonsterFrames':monsters,'verifiedShadowFrames':shadows,'verifiedUIFrames':ui,'verifiedTerrainFrames':terrain,'verifiedMagicFrames':magic,'verifiedItemFrames':items,'failures':len(errors),'examples':errors[:5]},indent=2))
sys.exit(bool(errors))
