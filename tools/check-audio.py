from pathlib import Path
import json,hashlib,wave,array,sys
root=Path(__file__).resolve().parents[1];folder=root/'public/assets/mir/audio'
m=json.loads((folder/'manifest.json').read_text());errors=[]
for name,f in m['files'].items():
 data=(folder/name).read_bytes()
 if hashlib.sha256(data).hexdigest()!=f['sha256']:errors.append(name+': source hash differs')
 with wave.open(str(folder/name)) as w:
  if w.getsampwidth()!=2:errors.append(name+': unexpected source sample format');continue
  samples=array.array('h',w.readframes(w.getnframes()))
  if sys.byteorder!='little':samples.byteswap()
  if not samples or max(abs(x) for x in samples)==0:errors.append(name+': silent or empty source')
for key,file in m['mapping'].items():
 if file not in m['files']:errors.append(key+': missing WAV')
for key,source in {'hurt':'0103008A.WAV','death':'01030090.WAV'}.items():
 if m['mapping'].get(key)!=source:errors.append(key+': missing verified male player feedback source')
print(json.dumps({'originalWavFiles':len(m['files']),'mappedEvents':len(m['mapping']),'unverifiedMappingsNotSubstituted':m['missing'],'failures':errors},indent=2))
sys.exit(bool(errors))
