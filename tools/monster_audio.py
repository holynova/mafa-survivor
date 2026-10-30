"""Pinned client sound IDs use raw lookID, unlike the sprite index's lookID-1."""
OFFSETS = {'attack': 2, 'hurt': 4, 'death': 5}
ALIASES = {'evilSnake': 'scorpionSnake'}

def monster_mapping(models, catalog):
    mapping, aliases, missing = {}, {}, []
    for kind, look in models.items():
        if kind in {'beast', 'summonedSkeleton'}:
            continue
        for event, offset in OFFSETS.items():
            key = f'monster:{kind}:{event}'
            requested = f'{0x02000000 + look * 16 + offset:08X}.WAV'
            filename = requested
            if filename not in catalog and kind in ALIASES:
                source = ALIASES[kind]
                filename = f'{0x02000000 + models[source] * 16 + offset:08X}.WAV'
                if filename in catalog:
                    aliases[key] = {'requested': requested, 'sourceKind': source,
                                    'sourceFile': filename,
                                    'reason': 'Pinned pack lacks this variant; explicitly reuse the same-family original voice.'}
            if filename in catalog:
                mapping[key] = filename
            else:
                missing.append(key)
    return mapping, aliases, missing
