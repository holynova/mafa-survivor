"""Import verified rectangles from native Mir2 maps and their indexed PNG atlases."""
from collections import defaultdict, deque
from contextlib import contextmanager
import hashlib
import json
from pathlib import Path
import struct
from PIL import Image
from native_map_audit import read_classic, MAX_OBJECT_AREA
from source_cache import read_source

CATALOG = Path(__file__).with_name('native-map-sources.json')
NATIVE_TEXTURE_BASE = 0x10000000  # Disjoint from the existing etorth map IDs.


@contextmanager
def reviewed_atlas(path):
    previous = Image.MAX_IMAGE_PIXELS
    Image.MAX_IMAGE_PIXELS = 225_000_000
    try:
        with Image.open(path) as atlas:
            if atlas.width > 10000 or atlas.height > 23000 or atlas.width*atlas.height > 225_000_000:
                raise ValueError('Native source atlas exceeds reviewed dimensions')
            yield atlas
    finally:
        Image.MAX_IMAGE_PIXELS = previous


def texture_id(library, index):
    unit = 0 if library == 'Tiles.wil' else 1 if library == 'SmTiles.wil' else 2 if library == 'Objects.wil' else int(library[7:]) + 1
    if not 0 <= index < 65536 or not 0 <= unit <= 16:
        raise ValueError('Native texture ID out of range')
    return NATIVE_TEXTURE_BASE + (unit << 16) + index


def safe_spawn(walk, width, height):
    """Use a clear 3x3 patch in the largest cropped walkable component."""
    seen = set()
    largest = set()
    for start, value in enumerate(walk):
        if not value or start in seen:
            continue
        group = {start}; seen.add(start); queue = deque([start])
        while queue:
            index = queue.popleft(); x, y = index % width, index // width
            for nx, ny in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
                other = ny * width + nx
                if 0 <= nx < width and 0 <= ny < height and walk[other] and other not in seen:
                    seen.add(other); group.add(other); queue.append(other)
        if len(group) > len(largest): largest = group
    clear = [(x, y) for y in range(1, height-1) for x in range(1, width-1)
             if all((y+dy)*width+x+dx in largest for dy in [-1,0,1] for dx in [-1,0,1])]
    if not clear: raise ValueError('Native crop has no safe spawn in its largest component')
    x, y = min(clear, key=lambda p: (p[0]+.5-width/2)**2+(p[1]+.5-height/2)**2)
    return {'x': (x+.5)*48, 'y': (y+.5)*32}


def native_region(data, config):
    width, height, full_walk, _, _ = read_classic(data)
    sx, sy, cw, ch = (config[k] for k in ['x','y','width','height'])
    if sx % 2 or sy % 2 or sx < 0 or sy < 0 or sx+cw > width or sy+ch > height:
        raise ValueError('Native crop is not aligned or exceeds its source map')
    tiles, objects, references = [], [], {}
    walk = [full_walk[y*width+x] for y in range(sy,sy+ch) for x in range(sx,sx+cw)]
    def part(library, index, x, y, target, **extra):
        code = texture_id(library, index)
        references[code] = (library, index)
        target.append({'texture': code, 'x': x, 'y': y, **extra})
    for y in range(sy,min(height,sy+ch+40)):
        for x in range(sx,sx+cw):
            back, middle, front, door, offset, frames, tick, area, light = struct.unpack_from(
                '<HHH6B', data, 52+(x*height+y)*12)
            px, py = (x-sx)*48, (y-sy)*32
            if y < sy+ch and x % 2 == y % 2 == 0 and back & 0x7fff:
                part('Tiles.wil',(back&0x7fff)-1,px,py,tiles)
            if y < sy+ch and middle:
                part('SmTiles.wil',middle-1,px,py+32,objects,depth=0,alpha=False,animated=False)
            if front & 0x7fff:
                area = area if area <= MAX_OBJECT_AREA else 0
                library = 'Objects.wil' if not area else 'Objects'+str(area+1)
                part(library,(front&0x7fff)-1,px,py+32,objects,depth=2,alpha=False,
                     animated=bool(frames&0x7f))
    return {'width':cw*48,'height':ch*32,'cellWidth':48,'cellHeight':32,
            'walk':walk,'spawn':safe_spawn(walk,cw,ch),'tiles':tiles,'objects':objects,
            'sourceRegion':{k:config[k] for k in ['x','y','width','height']},
            'sourceFormat':'classic-mir2-52-12'}, references


def load_native_regions(cache, request):
    catalog = json.loads(CATALOG.read_text())
    def source(group, name):
        entry = group['files'][name]
        folder = cache / ('native-map-images' if group is catalog['images'] else 'native-map-data')
        folder.mkdir(exist_ok=True)
        url = group['repository'].replace('https://github.com/','https://raw.githubusercontent.com/')+'/'+group['ref']+'/'+entry['path']
        data = read_source(folder/name,url,entry['sha1'],request)
        if hashlib.sha256(data).hexdigest() != entry['sha256']:
            raise ValueError('Native source SHA-256 mismatch: '+entry['path'])
        return data
    worlds, references = {}, {}
    for name, config in catalog['regions'].items():
        group = catalog['maps']; data = source(group,config['file'])
        world, refs = native_region(data,config)
        world.update(sourcePath=group['files'][config['file']]['path'],
                     sourceSha256=hashlib.sha256(data).hexdigest(),sourceRepository=group['repository'],
                     sourceRef=group['ref'],sourceId=group['id'])
        worlds[name] = world; references.update(refs)
    by_library = defaultdict(list)
    for code, (library,index) in references.items():by_library[library].append((code,index))
    loaded = []
    group = catalog['images']
    for library, refs in sorted(by_library.items()):
        metadata_name = library+'.json'
        if metadata_name not in group['files']:raise ValueError('Unverified native library: '+library)
        metadata = json.loads(source(group,metadata_name))
        rectangles = {int(k):v for entry in metadata['frames'] for k,v in entry.items() if k.isdecimal()}
        png_name = library+'.png'; source(group,png_name)
        path = cache/'native-map-images'/png_name
        # Known, hash-verified source atlases are up to 222.6MP. Bound their
        # dimensions explicitly and decode one library at a time, in palette mode.
        with reviewed_atlas(path) as atlas:
            for code, index in sorted(refs):
                if index not in rectangles:raise ValueError(f'Native frame absent: {library}/{index}')
                rect=rectangles[index];x,y,w,h=(rect[k] for k in ['x','y','w','h'])
                if min(x,y) < 0 or min(w,h) <= 0 or x+w > atlas.width or y+h > atlas.height:
                    raise ValueError('Invalid native source rectangle')
                image=atlas.crop((x,y,x+w,y+h)).convert('RGBA')
                key=f'map/{code:08X}'
                entry=group['files'][png_name]
                info={'sourceId':group['id'],'sourceRepository':group['repository'],'sourceRef':group['ref'],
                      'sourcePath':entry['path'],'sha1':entry['sha1'],'sha256':entry['sha256'],
                      'sourceCrop':[x,y,w,h],'sourceIndex':index,'sourceLibrary':library,
                      'sourceMetadata':group['files'][metadata_name],
                      'dx':0,'dy':0,'width':w,'height':h}
                loaded.append((key,image,info))
    # Small source floor objects are painted beneath actors. Keep tall strips at
    # their native row depth, with complete source pixels and bottom anchoring.
    sizes={int(key.split('/')[1],16):im.size for key,im,_ in loaded}
    for world in worlds.values():
        for obj in world['objects']:
            if sizes[obj['texture']] in [(48,32),(96,64)]:obj['depth']=0
    sources=[{k:g[k] for k in ['id','repository','ref','assetKinds']} for g in [catalog['maps'],catalog['images']]]
    return worlds, loaded, sources
