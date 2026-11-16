"""Copy pinned original skill-button PNGs unchanged; no image synthesis or effect crops."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json,urllib.request,hashlib,struct
from source_cache import read_source
ROOT=Path(__file__).resolve().parents[1]
catalog=json.loads((ROOT/'tools/skill-icon-sources.json').read_text())
out=ROOT/'public/assets/mir'
def load(pair):
 skill,entry=pair
 url=f"https://raw.githubusercontent.com/etorth/mir2x_res/{catalog['ref']}/texture/proguse/{entry['path']}"
 data=read_source(ROOT/'.cache/raw/proguse'/entry['path'],url,entry['sha'],lambda url:urllib.request.urlopen(url,timeout=30).read())
 assert data[:8]==b'\x89PNG\r\n\x1a\n'
 width,height=struct.unpack('>II',data[16:24])
 target=out/'ui/skills'/f'{skill}.png';target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 return skill,{'file':f'ui/skills/{skill}.png','sourcePath':'texture/proguse/'+entry['path'],'sourceName':entry['sourceName'],'sha1':entry['sha'],'sha256':hashlib.sha256(data).hexdigest(),'width':width,'height':height}
with ThreadPoolExecutor(max_workers=8) as pool:icons=dict(pool.map(load,catalog['frames'].items()))
for path in [out/'manifest.json',ROOT/'docs/asset-manifest.json']:
 manifest=json.loads(path.read_text());manifest['skillIcons']={'repository':catalog['repository'],'ref':catalog['ref'],'mappingSource':catalog['mappingSource'],'frames':icons,'missing':catalog['missing']};path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(f'Imported {len(icons)} original skill icons unchanged; missing: {list(catalog["missing"])}')
