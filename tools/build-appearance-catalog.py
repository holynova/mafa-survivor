"""Rebuild reviewed appearance mappings from pinned client records.
Requires .cache/{hero,monster,weapon}.json from the pinned resource trees.
These catalogues can be truncated globally; every chosen model/pose is checked
by check-assets.mjs after import. CI consumes the checked-in subset directly.
"""
from pathlib import Path
import re,json,hashlib
r=Path(__file__).resolve().parents[1]
import urllib.request
ref='bb6a22287abcd9f248d2aba755074c254c68787a'
item=r/'.cache'/f'itemrecord-{ref}.inc'
if not item.exists():item.write_bytes(urllib.request.urlopen(f'https://raw.githubusercontent.com/etorth/mir2x/{ref}/common/src/itemrecord.inc',timeout=40).read())
assert hashlib.sha256(item.read_bytes()).hexdigest()=='53e4934df73397696a481f4743a3fb493726fb9e755c4a3908dae740d75dffaa'
s=item.read_text();records={}
for block in re.split(r'\n(?=\{\s*\.name)',s):
 n=re.search(r'\.name\s*=\s*u8"([^"]+)"',block);shape=re.search(r'\.shape\s*=\s*(0[xX][\da-fA-F]+|\d+)',block)
 if n and shape:records[n[1]]=int(shape[1],0)
motions={'idle':0,'walk':21,'cast':3,'attack':9,'hurt':15,'death':19}
# Current runtime items only. Exact source aliases may legitimately share a model.
weapons=['木剑','匕首','乌木剑','青铜剑','短剑','铁剑','青铜斧','罗刹','八荒','凌风','破魂','斩马刀','修罗','凝霜','炼狱','井中月','裁决之杖','屠龙','怒斩','海魂','偃月','魔杖','骨玉权杖','半月','降魔','银蛇','无极棍','龙纹剑','逍遥扇']
clothes=['布衣','魔法长袍','恶魔长袍','重盔甲','战神盔甲','天魔神甲','圣战宝甲','灵魂战衣','幽灵战衣','天尊道袍','天师长袍']
wm={n:records[n]-1 for n in weapons if n in records};dm={n:records[n+'（男）'] for n in clothes if n+'（男）' in records}
orders=[int(n) for n in re.findall(r'\b[01]\b',(r/'.cache/weaponorder.inc').read_text())];assert len(orders)==2640
catalog={'resourceRepository':'https://github.com/etorth/mir2x_res','resourceRef':'9e21ea6631317d06e064fbfa7e1ea43af6a2d3e6','itemReference':{'repository':'https://github.com/etorth/mir2x','ref':'bb6a22287abcd9f248d2aba755074c254c68787a','path':'common/src/itemrecord.inc','sha256':hashlib.sha256(s.encode()).hexdigest()},'weaponOrderReference':{'repository':'https://github.com/etorth/mir2x','ref':'bb6a22287abcd9f248d2aba755074c254c68787a','path':'client/src/weaponorder.inc','sha256':hashlib.sha256((r/'.cache/weaponorder.inc').read_bytes()).hexdigest()},'weapons':wm,'clothes':dm,'missing':[n for n in weapons if n not in wm]+[n for n in clothes if n not in dm],'motions':motions,'weaponOrder':orders,'weaponShapeBegin':1,'weaponEncoding':'male bit22 | ((item.shape - WEAPON_BEGIN) << 14) | gfxMotion << 8 | direction << 5 | frame; WEAPON_BEGIN=1'}
(r/'tools/equipment-appearance.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
sources={}
monster_looks=set(json.loads((r/'tools/monster-models.json').read_text())['models'].values())
for kind in ['hero','monster','weapon']:
 entries=json.loads((r/f'.cache/{kind}.json').read_text())['tree'];chosen=[]
 for e in entries:
  code=int(e['path'][:8],16)
  if kind in ['hero','weapon']:
   gender=(code>>22)&1;shape=(code>>14)&255;motion=(code>>8)&63
   wanted=gender==1 and motion in motions.values() and (shape in set(wm.values()) and not(code&(1<<23)) if kind=='weapon' else shape in set(dm.values()))
  else:
   wanted=bool(code&(1<<23)) and ((code>>12)&0x7ff) in monster_looks and (((code>>8)&15) in [0,1,2,3,4] or ((code>>12)&0x7ff)==0x53 and ((code>>8)&15)==8)
  if wanted:chosen.append({'path':e['path'],'sha':e['sha']})
 sources[kind]=chosen
(r/'tools/appearance-sources.json').write_text(json.dumps({'repository':catalog['resourceRepository'],'ref':catalog['resourceRef'],'files':sources},indent=2)+'\n')
print('Exact models:',len(set(wm.values())),'weapons,',len(set(dm.values())),'clothes; source frames', {k:len(v) for k,v in sources.items()},'missing',catalog['missing'])
