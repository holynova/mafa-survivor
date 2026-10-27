"""Read the source client's zstd + cereal map layout; preserve tile/strip placement."""
import struct,hashlib,json,zstandard
from pathlib import Path

def load_region(cache,request,ref):
 path=cache/'0.bin'
 if not path.exists():path.write_bytes(request(f'https://raw.githubusercontent.com/etorth/mir2x_res/{ref}/map/0.bin'))
 raw=zstandard.ZstdDecompressor().decompress(path.read_bytes())
 assert raw[0]==1, 'Only the verified little-endian cereal format is supported'
 w,h,count=struct.unpack_from('<QQQ',raw,1)
 assert count==w*h//4 and len(raw)==25+count*260
 # A forest patch with a clear center; source map 0, not an invented arrangement.
 sx,sy,cw,ch=552,432,46,48
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
 return {'sourcePath':'map/0.bin','sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'sourceRegion':{'x':sx,'y':sy,'width':cw,'height':ch},
   'width':cw*48,'height':ch*32,'cellWidth':48,'cellHeight':32,'walk':walk,'tiles':tiles,'objects':objects}
