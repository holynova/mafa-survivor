"""Import unchanged, hash-pinned source soundtracks; no substitute music."""
from pathlib import Path
import json,hashlib,urllib.request,re
from concurrent.futures import ThreadPoolExecutor
from source_cache import read_source,blob_sha
from asset_authorization import authorize
ROOT=Path(__file__).resolve().parents[1]
REF='9e21ea6631317d06e064fbfa7e1ea43af6a2d3e6'
TRACKS={
 'desert':('00010006_B300.mp3','c518eb2352ba082b0a6eaa028b8f5293241c150f','盟重县_74',0x10006),
 'woma':('00020003_BD02.mp3','61df2755d9aaaba00f1ddf6a0e9bdf7587e39352','沃玛神殿_D024',0x20003),
 'redmoon':('00020009_BD99.mp3','2b2f856c66037682b10046253d2c32761b3b9bb4','赤月恶魔洞穴_D10162',0x20009),
 'field':('00010001_B000.mp3','88c1472c6e3ece25620a28a82ba04bf9599cacd6','比奇县_0',0x10001),
 'temple':('00020006_BD50.mp3','169d9f94b9c1c7d0b7e2213e895cf7164178e2a7','祖玛神殿大厅_0157',0x20006),
 'cave':('00020008_BD70.mp3','2cf7d08cae15b0893918233a5824ab3008e4eda9','石阁7层_D717',0x20008),
}
def request(url):
 with urllib.request.urlopen(url,timeout=30) as response:return response.read()
def main():
 out=ROOT/'public/assets/mir/music';out.mkdir(parents=True,exist_ok=True)
 source_ref='bb6a22287abcd9f248d2aba755074c254c68787a'
 source_hash='781881a1029da203cbf1aff4cd242ca9496e21ccdb5f3a5a5f198250dee27f67'
 source_file=ROOT/'.cache/maprecord-bb6a222.inc'
 data=source_file.read_bytes() if source_file.exists() else b''
 if hashlib.sha256(data).hexdigest()!=source_hash:
  data=request(f'https://raw.githubusercontent.com/etorth/mir2x/{source_ref}/common/src/maprecord.inc')
 assert hashlib.sha256(data).hexdigest()==source_hash,'Music map reference changed'
 for name,sha,source_map,bgm in TRACKS.values():
  block=next(b for b in re.split(r'\n(?=\{)',data.decode()) if f'.name = u8"{source_map}"' in b)
  assert int(re.search(r'\.bgmID\s*=\s*(0X[0-9A-F]+)',block)[1],16)==bgm,source_map

 def load(item):
  key,(name,sha,source_map,bgm)=item
  data=read_source(out/name,f'https://raw.githubusercontent.com/etorth/mir2x_res/{REF}/sound/bgm/{name}',sha,request)
  assert data[:3]==b'ID3' or data[0]==255,'Expected source MP3'
  return name,dict(sourcePath='sound/bgm/'+name,sha1=blob_sha(data),sha256=hashlib.sha256(data).hexdigest(),bytes=len(data),sourceMap=source_map,bgmID=bgm)
 files=dict(ThreadPoolExecutor(3).map(load,TRACKS.items()))
 manifest=dict(repository='https://github.com/etorth/mir2x_res',ref=REF,files=files,mapping={k:v[0] for k,v in TRACKS.items()},mappingReference=dict(repository='https://github.com/etorth/mir2x',ref='bb6a22287abcd9f248d2aba755074c254c68787a',sourcePath='common/src/maprecord.inc',sha256='781881a1029da203cbf1aff4cd242ca9496e21ccdb5f3a5a5f198250dee27f67'),note='Pinned client map soundtrack assignments identify source tracks. Mengzhong, Woma and Redmoon use their source map-family assignments; other chapters reuse field/cave/temple categories; these are not claims of exact 1.76 chapter music. No synthesized or re-encoded music.')
 authorize(manifest,['audio'])
 text=json.dumps(manifest,ensure_ascii=False,indent=2)+'\n'
 (out/'manifest.json').write_text(text);(ROOT/'docs/music-manifest.json').write_text(text)
 print('Imported original music:',len(files),'tracks;',sum(f['bytes'] for f in files.values()),'bytes')
if __name__=='__main__':main()
