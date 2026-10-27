"""Read the source client's zstd + cereal map layout; preserve tile/strip placement."""
import struct,hashlib,json,zstandard,tempfile
from pathlib import Path

def load_region(cache,request,ref,region='biche'):
 catalog=json.loads((Path(__file__).parent/'map-regions.json').read_text())
 assert catalog['ref']==ref
 config=catalog['regions'][region]
 path=cache/config['file']
 if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest()!=config['sha256']:
  data=request(f'https://raw.githubusercontent.com/etorth/mir2x_res/{ref}/map/'+config['file'])
  assert hashlib.sha256(data).hexdigest()==config['sha256'], 'Source map hash mismatch'
  with tempfile.NamedTemporaryFile(dir=cache,prefix=path.name+'.',delete=False) as handle:
   handle.write(data);temp=Path(handle.name)
  try:temp.replace(path)
  finally:temp.unlink(missing_ok=True)
 raw=zstandard.ZstdDecompressor().decompress(path.read_bytes())
 assert raw[0]==1, 'Only the verified little-endian cereal format is supported'
 w,h,count=struct.unpack_from('<QQQ',raw,1)
 assert count==w*h//4 and len(raw)==25+count*260
 sx,sy,cw,ch=(config[k] for k in ['x','y','width','height'])
 assert sx%2==sy%2==0 and sx+cw<=w and sy+ch<=h
 def block(x,y):return 25+(x//2+(y//2)*(w//2))*260
 def cell(x,y):return block(x,y)+8+((y%2)*2+x%2)*63
 tiles=[];objects=[];walk=[]
 for y in range(sy,sy+ch):
  for x in range(sx,sx+cw):
   walk.append(int(bool(raw[cell(x,y)+2])))
   if x%2==0 and y%2==0:
    valid,texture=struct.unpack_from('<II',raw,block(x,y))
    if valid:tiles.append({'texture':texture,'x':(x-sx)*48,'y':(y-sy)*32})
 # Objects are vertical source strips; retaining their original cell positions
 # assembles complete trees. Include origins below the crop for tall canopies.
 for y in range(sy,min(h,sy+ch+40)):
  for x in range(sx,sx+cw):
   for index in range(2):
    valid,texture,depth,animated,alpha,tick,frames=struct.unpack_from('<7I',raw,cell(x,y)+7+index*28)
    if valid:objects.append({'texture':texture,'x':(x-sx)*48,'y':(y-sy+1)*32,'depth':depth,'alpha':bool(alpha),'animated':bool(animated)})
 # Start in a clear 3x3 patch nearest the centre, not inside a wall or pillar.
 clear=[(x,y) for y in range(1,ch-1) for x in range(1,cw-1)
        if all(walk[(y+dy)*cw+x+dx] for dy in [-1,0,1] for dx in [-1,0,1])]
 assert clear, 'Map has no safe starting patch'
 px,py=min(clear,key=lambda p:(p[0]+.5-cw/2)**2+(p[1]+.5-ch/2)**2)
 spawn={'x':(px+.5)*48,'y':(py+.5)*32} if region!='biche' else {'x':cw*24,'y':ch*16}
 return {'sourcePath':'map/'+config['file'],'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'sourceRegion':{'x':sx,'y':sy,'width':cw,'height':ch},'spawn':spawn,
   'width':cw*48,'height':ch*32,'cellWidth':48,'cellHeight':32,'walk':walk,'tiles':tiles,'objects':objects}

def load_regions(cache,request,ref):
 return {name:load_region(cache,request,ref,name) for name in ['biche','mine']}
