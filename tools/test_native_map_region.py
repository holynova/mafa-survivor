import struct
import unittest
from native_map_region import native_region, safe_spawn, texture_id


def fixture(width=8, height=8, overrides=None):
    header = bytearray(52); struct.pack_into('<HH',header,0,width,height)
    header[4:18] = b'\x0dLegend of mir'
    return bytes(header)+b''.join(struct.pack('<HHH6B',*(overrides or {}).get((x,y),(1,0,0,0,0,0,0,0,0)))
                                  for x in range(width) for y in range(height))


class NativeRegionTest(unittest.TestCase):
    def test_uses_even_ground_cells_and_bottom_anchors_complete_object_strips(self):
        config={'x':0,'y':0,'width':6,'height':6}
        world,refs=native_region(fixture(overrides={(3,7):(1,0,4,0,0,0,0,4,0)}),config)
        self.assertEqual(len(world['tiles']),9)
        self.assertEqual(world['objects'],[{'texture':texture_id('Objects5',3),'x':144,'y':256,
                                           'depth':2,'alpha':False,'animated':False}])
        self.assertEqual(refs[texture_id('Objects5',3)],('Objects5',3))
        self.assertEqual(sum(world['walk']),36)

    def test_keeps_native_ids_disjoint_from_old_maps_and_distinguishes_libraries(self):
        ids=[texture_id(name,8) for name in ['Tiles.wil','SmTiles.wil','Objects.wil','Objects2','Objects15']]
        self.assertEqual(len(set(ids)),5)
        self.assertTrue(all(0x10000000<=code<0x11000000 for code in ids))
        for index in [-1,65536]:
            with self.assertRaises(ValueError):texture_id('Tiles.wil',index)

    def test_rejects_odd_or_out_of_bounds_crops(self):
        for x,y,width in [(1,0,6),(0,1,6),(-2,0,6),(4,0,6)]:
            with self.assertRaises(ValueError):native_region(fixture(),{'x':x,'y':y,'width':width,'height':6})

    def test_spawns_in_the_largest_component_with_clear_body_space(self):
        width,height=10,6;walk=[0]*(width*height)
        for x in range(1,4):
            for y in range(1,4):walk[y*width+x]=1
        for x in range(6,10):
            for y in range(1,5):walk[y*width+x]=1
        spawn=safe_spawn(walk,width,height)
        self.assertGreater(spawn['x'],6*48)
        x,y=int(spawn['x']//48),int(spawn['y']//32)
        self.assertTrue(all(walk[(y+dy)*width+x+dx] for dx in [-1,0,1] for dy in [-1,0,1]))
        with self.assertRaises(ValueError):safe_spawn([1,0,0,1],2,2)


if __name__=='__main__':unittest.main()
