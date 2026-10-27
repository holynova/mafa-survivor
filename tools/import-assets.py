"""Import a pinned, attributed subset of mir2x_res without altering original pixels.
Run with a Python environment containing Pillow. Assets are local evaluation only.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json, urllib.request, hashlib, time, io, math
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT/'.cache'; CACHE.mkdir(exist_ok=True)
OUT=ROOT/'public/assets/mir'; OUT.mkdir(parents=True,exist_ok=True)
REF='9e21ea6631317d06e064fbfa7e1ea43af6a2d3e6'
REPO='https://github.com/etorth/mir2x_res'
def request(url):
 for attempt in range(4):
  try:return urllib.request.urlopen(url,timeout=40).read()
  except Exception:
   if attempt==3:raise
   time.sleep(attempt+1)
def tree(kind):
 p=CACHE/(kind+'.json')
 if not p.exists():
  root=json.loads(request(f'https://api.github.com/repos/etorth/mir2x_res/contents/texture?ref={REF}'))
  sha=next(x['sha'] for x in root if x['name']==kind)
  p.write_bytes(request('https://api.github.com/repos/etorth/mir2x_res/git/trees/'+sha))
 d=json.loads(p.read_text());assert not d.get('truncated');return d['tree']
selected=[];animations={};origins={}
hero_entries={int(p["path"][:8],16):p for p in tree("hero")}
def select(kind,entry,key):selected.append((kind,entry,key));return key
def actor(kind,name,look,motions):
 entries=tree(kind)
 for motion,motionID in motions.items():
  for direction in range(8):
   seq=[]
   for p in entries:
    code=int(p['path'][:8],16)
    match=(code>>12==look) if kind=='monster' else (code>>14==look)
    if match and (code>>8)&(15 if kind=='monster' else 63)==motionID and (code>>5)&7==direction:
     key=f'{name}/{motion}/{direction}/{code&31}'
     select(kind,p,key);seq.append((code&31,key))
   if seq:animations[f'{name}/{motion}/{direction}']=[k for _,k in sorted(seq)]
actor('hero','wizard',(1<<8)|4,{'idle':0,'walk':21,'cast':3,'attack':9,'hurt':15,'death':19})
# Male heavy armor: itemrecord 重盔甲（男） shape=3; hero motion indices are zero-based.
actor('hero','taoist',(1<<8)|5,{'idle':0,'walk':21,'cast':3,'attack':9,'hurt':15,'death':19})
actor('hero','warrior',(1<<8)|3,{'idle':0,'walk':21,'cast':3,'attack':9,'hurt':15,'death':19})
# IDs are verified against mir2x/common/src/monsterrecord.inc.
for name,look in [('scarecrow',0x28),('cat',0x26),('rakecat',0x27),('orc',0x16),('boss',0x24),('skeleton',0x20),('summonedSkeleton',0x38),('zombie',0x30),('beast',0x5A)]:
 actor('monster',name,look,{'idle':0,'walk':1,'attack':2,'hurt':3,'death':4})
magic={int(p['path'][:8],16):p for p in tree('magic')}
for name,start,count in [('lightning',0x5AA,5),('firewall',0x398,5),('shield',0x352,3)]:
 animations[name]=[select('magic',magic[start+i],f'{name}/{i}') for i in range(count)]
for d in range(16):
 animations[f'fireball/{d}']=[select('magic',magic[0x1A4+d*10+i],f'fireball/{d}/{i}') for i in range(5)]
# Spell ownership and frame ranges verified against mir2x common/src/magicrecord.inc.
for name,start,count in [('repulse',0x5A,8),('charm',0xA,20),('hellfire',0x76C,30),('teleport',0x6E,10),('explosion',0x3B6,10),('nova',0x010003D4,8),('holy',0x8C,20),('ice',0x30C,10)]:
 animations[name]=[select('magic',magic[start+i],f'{name}/{i}') for i in range(count)]
for direction in range(8):
 animations[f'beam/{direction}']=[select('magic',magic[0x0100049C+direction*10+i],f'beam/{direction}/{i}') for i in range(6)]
for direction in range(16):
 animations[f'bigfireball/{direction}']=[select('magic',magic[0x668+direction*10+i],f'bigfireball/{direction}/{i}') for i in range(6)]
# Directional melee effects, exact source ranges from magicrecord.inc.
for name,start in [('powerstrike',0x546),('thrust',0x140),('cleave',0xE6),('firesword',0x5BE)]:
 for direction in range(8):
  animations[f'{name}/{direction}']=[select('magic',magic[start+direction*10+i],f'{name}/{direction}/{i}') for i in range(6)]
# Taoist source ranges; reveal has no verified gfx in this reference and uses a HUD overlay.
for name,start,count in [('heal',0x262,10),('poison',0x46,10),('skeleton',0x2EE,10),('invisible',0x32A,10),('groupInvisible',0x334,10),('ghost',0xC8,10),('armor',0xAA,10),('trap',0x280,10),('groupHeal',0x29E,10),('beast',0xA1E,19),('talismanHit',0x474,10)]:
 animations[name]=[select('magic',magic[start+i],f'{name}/{i}') for i in range(count)]
for direction in range(16):
 animations[f'talisman/{direction}']=[select('magic',magic[0x3D4+direction*10+i],f'talisman/{direction}/{i}') for i in range(3)]
for direction in range(8):
 animations[f'beastflame/{direction}']=[select('magic',magic[0x030003D4+direction*10+i],f'beastflame/{direction}/{i}') for i in range(6)]
from map_region import load_region
world_layout=load_region(CACHE,request,REF)
# The catalogue API truncates this very large directory; only explicitly used
# source IDs are consumed, each with a verified blob hash. No completeness claim.
map_cache=CACHE/'map.json'
if not map_cache.exists():
 texture_root=json.loads(request(f'https://api.github.com/repos/etorth/mir2x_res/contents/texture?ref={REF}'))
 map_sha=next(e['sha'] for e in texture_root if e['name']=='map')
 map_cache.write_bytes(request('https://api.github.com/repos/etorth/mir2x_res/git/trees/'+map_sha))
map_entries={int(e['path'][:8],16):e for e in json.loads(map_cache.read_text())['tree']}
map_ids={p['texture'] for p in world_layout['tiles']+world_layout['objects']}
for code in sorted(map_ids):
 if code not in map_entries:raise ValueError('Map source ID outside downloaded catalogue: '+hex(code))
 select('map',map_entries[code],f'map/{code:08X}')
# Ground PNGs selected from the original map texture catalogue, not recreated.
mp=json.loads((CACHE/'map-list.json').read_text()) if (CACHE/'map-list.json').exists() else json.loads(request(f'https://api.github.com/repos/etorth/mir2x_res/contents/texture/map?ref={REF}'))
for i in sorted(set(list(range(16))+[17,24,31,38,45,52,59,66,100,150,200,250,300,400,500,600,700,800,900])):
 p=mp[i];select('map',{'path':p['name'],'sha':p['sha']},'ground/'+str(i))
# Item IDs verified against the source itemrecord, never guessed from sprite appearance.
itemmap=json.loads((ROOT/'tools/item-icon-map.json').read_text())['mapping']
items={int(p['path'][:8],16):p for p in tree('item')}
names=['海魂','偃月','魔杖','骨玉权杖','乌木剑','布衣（男）','魔法长袍（男）','恶魔长袍（男）','魔法头盔','青铜头盔','玻璃戒指','六角戒指','金项链','白金项链','铁手镯','黑檀手镯','骷髅头盔','蛇眼戒指','魅力戒指','紫碧螺','思贝儿手镯','放大镜','生命项链']
names += ['木剑','匕首','青铜剑','短剑','铁剑','青铜斧','罗刹','八荒','凌风','破魂','斩马刀','修罗','凝霜','炼狱','井中月','裁决之杖','屠龙','怒斩','重盔甲（男）','战神盔甲（男）','天魔神甲（男）','圣战宝甲（男）','基本剑术','攻杀剑术','刺杀剑术','半月弯刀','野蛮冲撞','烈火剑法']
names += ['治愈术','精神力战法','施毒术','灵魂火符','召唤骷髅','隐身术','集体隐身术','幽灵盾','神圣战甲术','心灵启示','困魔咒','群体治愈术','召唤神兽']
for proposal in json.loads((ROOT/'docs/design-data-V0.9.json').read_text())['equipmentProposals']:
 if proposal['class']=='道士':names.append(proposal['name']+('（男）' if proposal['slot']=='衣服' else ''))
for n in names:
 if n in itemmap and itemmap[n] in items:select('item',items[itemmap[n]],'item/'+n)
# Gold is a normal, source-backed item icon.
for n in ['金币（小）','金创药（小）','魔法药（小）']:
 if n in itemmap and itemmap[n] in items:select('item',items[itemmap[n]],'item/'+n)

for key,filename in [('deadwood','000A000A.PNG'),('sign','000A00FA.PNG'),('shrub','000A012C.PNG')]:
 f=CACHE/'objects'/filename
 if not f.exists():
  f.parent.mkdir(exist_ok=True);f.write_bytes(request(f'https://raw.githubusercontent.com/etorth/mir2x_res/{REF}/texture/map/{filename}'))
 data=f.read_bytes();sha=hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest()
 dest=CACHE/'raw/map'/filename;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
 select('map',{'path':filename,'sha':sha},'scenery/'+key)

print('Downloading',len(selected),'original frames',flush=True)
def load(t):
 kind,p,key=t;f=CACHE/'raw'/kind/p['path'];f.parent.mkdir(parents=True,exist_ok=True)
 if not f.exists():f.write_bytes(request(f'https://raw.githubusercontent.com/etorth/mir2x_res/{REF}/texture/{kind}/{p["path"]}'))
 b=f.read_bytes();actual=hashlib.sha1(f'blob {len(b)}\0'.encode()+b).hexdigest()
 if actual!=p['sha']:raise ValueError('Git blob hash mismatch: '+key)
 im=Image.open(io.BytesIO(b)).convert('RGBA');fn=p['path'];dx=dy=0
 if len(fn.split('.')[0])==18:
  dx=int(fn[10:14],16)*(1 if fn[8]!='0' else -1);dy=int(fn[14:18],16)*(1 if fn[9]!='0' else -1)
 info={'sourcePath':f'texture/{kind}/{fn}','sha1':actual,'sha256':hashlib.sha256(b).hexdigest(),'dx':dx,'dy':dy,'width':im.width,'height':im.height}
 if kind=='hero' and not int(fn[:8],16)&(1<<24):
  overlay=hero_entries.get(int(fn[:8],16)|(1<<24))
  if overlay:
   _,layer,layer_info=load(('hero',overlay,key+'/source-overlay'))
   if layer.size!=im.size or (layer_info['dx'],layer_info['dy'])!=(dx,dy):raise ValueError('Hero source layer alignment differs: '+key)
   info['layers']=[dict(info),layer_info]
   im=Image.alpha_composite(im,layer)
   info['assembly']='Original layer0 + layer1, unmodified source pixels, same source offsets'
   info['assembledPixelSha256']=hashlib.sha256(im.tobytes()).hexdigest()
 return key,im,info
with ThreadPoolExecutor(max_workers=16) as ex:loaded=list(ex.map(load,selected))
# Multiple 2048×4096 pages keep each texture within modest GPU limits.
frames={};meta={};pages=[];x=y=rowH=0;page=0;atlas=Image.new('RGBA',(2048,4096))
def flush():
 height=max(1,y+rowH+2)
 image=f'atlas-{page}.png';data=f'atlas-{page}.json';key=f'mir-{page}'
 atlas.crop((0,0,2048,min(4096,height))).save(OUT/image)
 (OUT/data).write_text(json.dumps({'frames':frames,'meta':{'image':image,'size':{'w':2048,'h':min(4096,height)},'scale':'1'}}))
 pages.append({'key':key,'image':image,'data':data,'width':2048,'height':min(4096,height)})
for key,im,info in sorted(loaded,key=lambda x:(-x[1].height,x[0])):
 if im.width+2>2048 or im.height+2>4096:raise ValueError('Frame exceeds atlas page: '+key)
 if x+im.width+2>2048:x=0;y+=rowH+2;rowH=0
 if y+im.height+2>4096:
  flush();page+=1;atlas=Image.new('RGBA',(2048,4096));frames={};x=y=rowH=0
 atlas.paste(im,(x,y));frames[key]={'frame':{'x':x,'y':y,'w':im.width,'h':im.height},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':im.width,'h':im.height},'sourceSize':{'w':im.width,'h':im.height}}
 meta[key]={**info,'texture':f'mir-{page}','originX':24-info['dx'],'originY':16-info['dy']};x+=im.width+2;rowH=max(rowH,im.height)
flush()
manifest={'schemaVersion':2,'repository':REPO,'ref':REF,'referenceVersion':'mir2x 1.45 reference; gameplay 1.76 candidate','rightsStatus':'UNVERIFIED_THIRD_PARTY_ART','distribution':'LOCAL_EVALUATION_ONLY','releaseStatus':'BLOCKED_BY_ASSET_RIGHTS','world':world_layout,'pages':pages,'animations':animations,'frames':meta}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
public_ledger={**manifest,'world':{k:v for k,v in manifest['world'].items() if k in ['sourcePath','sourceSha256','sourceRegion','width','height']}}
(ROOT/'docs/asset-manifest.json').write_text(json.dumps(public_ledger,ensure_ascii=False,indent=2))
for path in OUT.glob('atlas*'):
 if path.suffix in ['.png','.json'] and path.name not in {n for p in pages for n in [p['image'],p['data']]}:path.unlink()
print('Packed',len(meta),'frames on',len(pages),'pages',flush=True)

import runpy
runpy.run_path(str(ROOT/"tools/write-asset-ledger.py"))
(OUT/'SOURCE_LICENSE.txt').write_bytes(request(f'https://raw.githubusercontent.com/etorth/mir2x_res/{REF}/LICENSE'))

runpy.run_path(str(ROOT/"tools/import-audio.py"))
