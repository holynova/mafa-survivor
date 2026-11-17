from pathlib import Path
import json,hashlib,wave,array,sys
from monster_audio import monster_mapping, PET_MODELS
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
models_path=root/'tools/monster-models.json';models=json.loads(models_path.read_text())['models']
expected,aliases,missing=monster_mapping(models,m['files'])
actual={k:v for k,v in m['mapping'].items() if k.startswith('monster:')}
if expected!=actual:errors.append('monster mapping differs from raw source lookID/event offsets')
missing_enemies=[key for key in missing if key.split(':')[1] not in PET_MODELS]
if missing_enemies:errors.append('missing enemy audio: '+', '.join(missing_enemies))
reference=m.get('monsterSoundReference',{})
if sorted(reference.get('missing',[]))!=sorted(missing):errors.append('missing actor voices must be explicitly documented')
if reference.get('petKinds')!=sorted(PET_MODELS):errors.append('friendly source voice coverage must be documented')
for key in ['monster:beast:attack','monster:beast:hurt','monster:beast:death','monster:summonedSkeleton:death']:
 if key not in actual:errors.append(key+': missing verified pet feedback')
if reference.get('aliases')!=aliases:errors.append('same-family audio reuse must be explicitly documented')
if reference.get('modelsSha256')!=hashlib.sha256(models_path.read_bytes()).hexdigest():errors.append('monster model reference hash differs')
print(json.dumps({'originalWavFiles':len(m['files']),'mappedEvents':len(m['mapping']),'monsterKinds':len({k.split(':')[1] for k in actual}),
 'hostileMonsterKinds':len({k.split(':')[1] for k in actual}-PET_MODELS),'documentedMissingPetEvents':[key for key in missing if key.split(':')[1] in PET_MODELS],
 'documentedMonsterAliases':aliases,'unverifiedMappingsNotSubstituted':m['missing'],'failures':errors},indent=2))
sys.exit(bool(errors))
