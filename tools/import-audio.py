"""Fetch source-backed Mir effects; no synthesized substitute sounds."""
from pathlib import Path
import json,re,urllib.request,hashlib,time
from concurrent.futures import ThreadPoolExecutor
from asset_authorization import authorize
from source_cache import read_source, blob_sha
from monster_audio import monster_mapping
root=Path(__file__).resolve().parents[1];cache=root/'.cache';out=root/'public/assets/mir/audio';out.mkdir(parents=True,exist_ok=True)
ref='9e21ea6631317d06e064fbfa7e1ea43af6a2d3e6'
def request(url):
 for attempt in range(4):
  try:return urllib.request.urlopen(url,timeout=40).read()
  except Exception:
   if attempt==3:raise
   time.sleep(attempt+1)
source_ref='bb6a22287abcd9f248d2aba755074c254c68787a'
srcfile=cache/f'audio-magicrecord-{source_ref}.inc'
if not srcfile.exists():srcfile.write_bytes(request(f'https://raw.githubusercontent.com/etorth/mir2x/{source_ref}/common/src/magicrecord.inc'))
s=srcfile.read_text();blocks={}
for block in re.split(r'\n(?=\{\s+\.name)',s):
 m=re.search(r'\.name\s*=\s*u8"([^"]+)"',block)
 if m:blocks[m[1]]=block
catalog_file=cache/'sound-seff.json'
if not catalog_file.exists():catalog_file.write_bytes(request(f'https://api.github.com/repos/etorth/mir2x_res/contents/sound/seff?ref={ref}'))
catalog={x['name']:x for x in json.loads(catalog_file.read_text())}
names={'fireball':'火球术','lightning':'雷电术','firewall':'火墙','shield':'魔法盾','repulse':'抗拒火环','hellfire':'地狱火','bigfireball':'大火球','teleport':'瞬息移动','explosion':'爆裂火焰','beam':'疾光电影','nova':'地狱雷光','holy':'圣言术','ice':'冰咆哮','charm':'诱惑之光','heal':'治愈术','poison':'施毒术','talisman':'灵魂火符','skeleton':'召唤骷髅','invisible':'隐身术','groupInvisible':'集体隐身术','ghost':'幽灵盾','armor':'神圣战甲术','trap':'困魔咒','groupHeal':'群体治愈术','beast':'召唤神兽','beastflame':'神兽_喷火'}
def sound(name,seen=None):
 seen=set() if seen is None else seen
 if name in seen:return None
 seen.add(name);block=blocks.get(name,'');m=re.search(r'\.seffBase\s*=\s*(\d+)',block)
 if m:
  for stage in range(3):
   filename=f'{0x04000000+int(m[1])*16+stage:08X}.WAV'
   if filename in catalog:return filename
 for n in re.findall(r'\.name\s*=\s*u8"([^"]+)"',block)[1:]:
  found=sound(n,seen)
  if found:return found
 return None
mapping={k:v for k,n in names.items() if (v:=sound(n))}
mapping.update(step='01000001.WAV',attack='01010034.WAV',unarmed='01010039.WAV',hurt='0103008A.WAV',death='01030090.WAV')
reference_hashes={
 'client/src/clientmonster.cpp':'0460baa44df7f2f9f078f01fa6738b1a8cb7f7a3af910da65db90131f95f9765',
 'common/src/sysconst.hpp':'536f549b0448c2cee6d9caf4e0890e81abdcee5fd01f054b240584a904073a4d',
 'common/src/monsterrecord.hpp':'8c104b8e7f0d9caec86812d831a72c832e68f769f952f52ae9caf29b6fb88e51',
 'common/src/monsterrecord.inc':'2664564923c0e3871b2711f828ec20ce209ed01bd9aa7fbf4a2e16335e89a795',
}
references={}
for path,expected in reference_hashes.items():
 local=cache/f'audio-reference-{source_ref}-{Path(path).name}'
 data=local.read_bytes() if local.exists() else b''
 if hashlib.sha256(data).hexdigest()!=expected:
  data=request(f'https://raw.githubusercontent.com/etorth/mir2x/{source_ref}/{path}')
  assert hashlib.sha256(data).hexdigest()==expected,path+' reference hash differs'
  local.write_bytes(data)
 references[path]={'ref':source_ref,'sha256':expected}
records=(cache/f'audio-reference-{source_ref}-monsterrecord.inc').read_text()
assert '.seff' not in records,'Review new per-monster sound redirects before changing the pinned reference'
models_path=root/'tools/monster-models.json';models=json.loads(models_path.read_text())['models']
record_looks={int(v,0) for v in re.findall(r'\.lookID\s*=\s*(0[Xx][0-9A-Fa-f]+|\d+)',records)}
assert set(models.values())<=record_looks,'Monster audio model is missing from pinned client records'
monster_sounds,monster_aliases,monster_missing=monster_mapping(models,catalog)
mapping.update(monster_sounds)
def load(filename):
 entry=catalog[filename];path=out/filename
 b=read_source(path,f'https://raw.githubusercontent.com/etorth/mir2x_res/{ref}/sound/seff/{filename}',entry['sha'],request)
 sha=blob_sha(b)
 assert b[:4]==b'RIFF' and b[8:12]==b'WAVE',filename+' not WAV'
 return filename,{'sourcePath':'sound/seff/'+filename,'sha1':sha,'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'permissionStatus':'permission_pending'}
files=dict(ThreadPoolExecutor(12).map(load,sorted(set(mapping.values()))))
manifest={'ref':ref,'repository':'https://github.com/etorth/mir2x_res','rightsStatus':'UNVERIFIED_THIRD_PARTY_ART','releaseStatus':'BLOCKED_BY_ASSET_RIGHTS','mappingReference':{'ref':source_ref,'sourcePath':'common/src/magicrecord.inc','sha256':hashlib.sha256(srcfile.read_bytes()).hexdigest(),'soundFormula':'0x04000000 + seffBase * 16 + stage; references resolved; first existing stage retained'},'heroSoundReference':{'ref':source_ref,'sourcePath':'client/src/soundeffectdb.cpp','sha256':'c531cfce810fe6f36eb1c59d56a53a35fb65b23646b7a5513e36c31dc721357c','note':'s_man_struck = 138.wav; s_man_die = 144.wav; 0x01030000 + source sound number. Current source actors are male.'},'mapping':mapping,'files':files,'missing':[k for k in names if k not in mapping]}
manifest['monsterSoundReference']={'references':references,'modelsPath':'tools/monster-models.json','modelsSha256':hashlib.sha256(models_path.read_bytes()).hexdigest(),
 'soundFormula':'0x02000000 + raw lookID * 16 + event offset; attack=2, hitted=4, die=5. No sprite lookID-1 adjustment.',
 'aliases':monster_aliases,'missing':monster_missing}
authorize(manifest, ['audio'])
text=json.dumps(manifest,ensure_ascii=False,indent=2);(out/'manifest.json').write_text(text);(root/'docs/audio-manifest.json').write_text(text)
print('Original audio:',len(files),'WAV files;',len(mapping),'mappings; missing:',manifest['missing'])
