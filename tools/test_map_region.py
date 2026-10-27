"""Source-map integrity and original tile/strip coordinates, without network."""
import hashlib,json,struct,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import zstandard
import map_region

class SourceMapTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
  raw=bytearray(25+16*260);raw[0]=1
  struct.pack_into('<QQQ',raw,1,8,8,16)
  def block(x,y):return 25+(x//2+(y//2)*4)*260
  def cell(x,y):return block(x,y)+8+((y%2)*2+x%2)*63
  for y in range(8):
   for x in range(8):raw[cell(x,y)+2]=1
  struct.pack_into('<II',raw,block(2,2),1,0x123)
  struct.pack_into('<7I',raw,cell(2,3)+7,1,0x456,2,0,1,0,0)
  self.data=zstandard.ZstdCompressor().compress(bytes(raw))
  config={'ref':'test-pin','regions':{'mine':{'file':'mine.bin','sha256':hashlib.sha256(self.data).hexdigest(),'x':2,'y':2,'width':4,'height':4}}}
  (self.root/'map-regions.json').write_text(json.dumps(config))
  self.location=patch.object(map_region,'__file__',str(self.root/'map_region.py'));self.location.start()
 def tearDown(self):self.location.stop();self.temp.cleanup()
 def load(self,request):return map_region.load_region(self.root,request,'test-pin','mine')
 def test_preserves_original_tile_strip_and_walk_coordinates(self):
  m=self.load(lambda _:self.data)
  self.assertEqual(m['tiles'],[{'texture':0x123,'x':0,'y':0}])
  self.assertIn({'texture':0x456,'x':0,'y':64,'depth':2,'alpha':True,'animated':False},m['objects'])
  self.assertEqual(m['walk'],[1]*16)
  self.assertEqual(m['sourceSha256'],hashlib.sha256(self.data).hexdigest())
 def test_refetches_corrupt_cache_before_reading_it(self):
  p=self.root/'mine.bin';p.write_bytes(b'partial download')
  calls=[]
  def request(url):calls.append(url);return self.data
  self.load(request)
  self.assertEqual(len(calls),1);self.assertEqual(p.read_bytes(),self.data)
  self.assertEqual(list(self.root.glob('mine.bin.*')),[])
 def test_rejects_a_download_that_does_not_match_the_recorded_pin(self):
  with self.assertRaisesRegex(AssertionError,'Source map hash mismatch'):self.load(lambda _:b'wrong source')
  self.assertFalse((self.root/'mine.bin').exists())

if __name__=='__main__':unittest.main()
