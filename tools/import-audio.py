"""Fetch source-backed Mir effects; no synthesized substitute sounds."""
from pathlib import Path
import json,re,urllib.request,hashlib
from concurrent.futures import ThreadPoolExecutor
root=Path(__file__).resolve().parents[1];cache=root/'.cache';out=root/'public/assets/mir/audio';out.mkdir(parents=True,exist_ok=True)
ref='9e21ea6631317d06e064fbfa7e1ea43af6a2d3e6'
def request(url):return urllib.request.urlopen(url,timeout=40).read()
source_tree=cache/'mir2x-source-tree.json'
if not source_tree.exists():source_tree.write_bytes(request('https://api.github.com/repos/etorth/mir2x/git/trees/main?recursive=1'))
source_ref=json.loads(source_tree.read_text())['sha']
srcfile=cache/'audio-magicrecord.inc'
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
mapping.update(step='01000001.WAV',attack='01010034.WAV',unarmed='01010039.WAV',hurt='0103008A.WAV')
def load(filename):
 entry=catalog[filename];path=out/filename
 if not path.exists():path.write_bytes(request(f'https://raw.githubusercontent.com/etorth/mir2x_res/{ref}/sound/seff/{filename}'))
 b=path.read_bytes();sha=hashlib.sha1(f'blob {len(b)}\0'.encode()+b).hexdigest()
 assert sha==entry['sha'],filename+' source hash mismatch'
 assert b[:4]==b'RIFF' and b[8:12]==b'WAVE',filename+' not WAV'
 return filename,{'sourcePath':'sound/seff/'+filename,'sha1':sha,'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'permissionStatus':'permission_pending'}
files=dict(ThreadPoolExecutor(12).map(load,sorted(set(mapping.values()))))
manifest={'ref':ref,'repository':'https://github.com/etorth/mir2x_res','rightsStatus':'UNVERIFIED_THIRD_PARTY_ART','releaseStatus':'BLOCKED_BY_ASSET_RIGHTS','mappingReference':{'ref':source_ref,'sourcePath':'common/src/magicrecord.inc','sha256':hashlib.sha256(srcfile.read_bytes()).hexdigest(),'soundFormula':'0x04000000 + seffBase * 16 + stage; references resolved; first existing stage retained'},'mapping':mapping,'files':files,'missing':[k for k in names if k not in mapping]}
text=json.dumps(manifest,ensure_ascii=False,indent=2);(out/'manifest.json').write_text(text);(root/'docs/audio-manifest.json').write_text(text)
print('Original audio:',len(files),'WAV files;',len(mapping),'mappings; missing:',manifest['missing'])
