from pathlib import Path
import json,csv
ROOT=Path(__file__).resolve().parents[1]
m=json.loads((ROOT/'docs/asset-manifest.json').read_text())
fields=['asset_id', 'category', 'mir_entity_id', 'display_name', 'source_repo', 'source_url', 'source_path', 'source_revision', 'source_mir_version', 'original_format', 'original_sha256', 'rights_owner', 'license_evidence', 'allowed_use', 'permission_status', 'animation_set', 'direction_count', 'frame_count', 'asset_build_path', 'verification_notes']
rows=[]
for key,f in m['frames'].items():
 row=dict.fromkeys(fields,'unknown');group=key.split('/')[0]
 row.update(asset_id=key,category=f['sourcePath'].split('/')[1],mir_entity_id=group,display_name=group,source_repo='etorth/mir2x_res',source_url=m['repository']+'/blob/'+m['ref']+'/'+f['sourcePath'],source_path=f['sourcePath'],source_revision=m['ref'],source_mir_version='unknown',original_format='PNG',original_sha256=f['sha256'],rights_owner='unknown',license_evidence='repository LICENSE exists; underlying third-party image rights unverified',allowed_use='unknown',permission_status='permission_pending',animation_set='/'.join(key.split('/')[:-1]),direction_count='unknown',frame_count=1,asset_build_path='public/assets/mir/'+next(p['image'] for p in m['pages'] if p['key']==f['texture'])+'#'+key,verification_notes='Source frame and hash verified; reference project says 1.45. Original-client provenance and 1.76 applicability are not independently confirmed.')
 rows.append(row)
with (ROOT/'docs/asset_manifest.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fields);w.writeheader();w.writerows(rows)
(ROOT/'data').mkdir(exist_ok=True)
(ROOT/'data/assets.json').write_text(json.dumps({'schemaVersion':1,'releaseStatus':'BLOCKED_BY_ASSET_RIGHTS','assets':rows},ensure_ascii=False,indent=2))
