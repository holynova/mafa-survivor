"""Apply the project owner's recorded public distribution confirmation."""
from pathlib import Path
import json
ROOT = Path(__file__).resolve().parents[1]

def authorize(manifest, kinds):
    record = json.loads((ROOT / 'docs/asset-authorization.json').read_text())
    valid = (record.get('basis') == 'project_owner_attestation'
             and bool(record.get('statement')) and bool(record.get('confirmedAt'))
             and record.get('repository') == manifest['repository']
             and record.get('ref') == manifest['ref']
             and set(kinds) <= set(record.get('assetKinds', []))
             and {'public_github_pages', 'stage_releases'} <= set(record.get('scope', [])))
    if not valid:
        raise ValueError('Asset authorization does not cover this resource source and release scope')
    for source in manifest.get('sources', []):
        matching = next((s for s in record.get('additionalSources', [])
                         if s.get('repository') == source.get('repository') and s.get('ref') == source.get('ref')), None)
        if (not matching or not source.get('assetKinds')
                or not set(source['assetKinds']) <= set(matching.get('assetKinds', []))
                or not {'public_github_pages', 'stage_releases'} <= set(matching.get('scope', []))):
            raise ValueError('Additional asset source is outside the recorded owner confirmation')
    manifest.update(rightsStatus='AUTHORIZED_BY_PROJECT_OWNER',
                    distribution='PUBLIC_PROJECT_DISTRIBUTION',
                    releaseStatus='AUTHORIZED_BY_PROJECT_OWNER',
                    authorizationEvidence='docs/asset-authorization.json')
    for entry in manifest.get('files', {}).values():
        entry['permissionStatus'] = 'project_owner_authorized'
    return manifest

if __name__ == '__main__':
    for relative, kinds in [
        ('docs/asset-manifest.json', ['images', 'map']),
        ('public/assets/mir/manifest.json', ['images', 'map']),
        ('docs/audio-manifest.json', ['audio']),
        ('public/assets/mir/audio/manifest.json', ['audio']),
    ]:
        path = ROOT / relative
        path.write_text(json.dumps(authorize(json.loads(path.read_text()), kinds), ensure_ascii=False, indent=2))
