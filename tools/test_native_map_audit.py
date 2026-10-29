import struct
import unittest
from native_map_audit import audit, components, read_classic


def fixture(width=2, height=3, cells=None):
    header = bytearray(52)
    struct.pack_into("<HH", header, 0, width, height)
    header[4:18] = b"\x0dLegend of mir"
    return bytes(header) + b"".join(struct.pack("<HHH6B", *cell) for cell in
                                  (cells or [(1, 2, 3, 0, 0, 0, 0, 0, 0)] * (width * height)))


class NativeMapAuditTest(unittest.TestCase):
    def test_column_major_orientation_and_closed_door(self):
        cells = [(1, 2, 3, 0, 0, 0, 0, 0, 0)] * 6
        cells[2] = (0x8001, 2, 3, 0, 0, 0, 0, 0, 0)  # x0 y2
        cells[3] = (1, 2, 0x8003, 0, 0, 0, 0, 0, 0)  # x1 y0
        cells[4] = (1, 2, 3, 0x81, 0, 0, 0, 0, 0)  # x1 y1, closed
        cells[5] = (1, 2, 3, 0x81, 0x80, 0, 0, 0, 0)  # x1 y2, open
        w, h, walk, _, flags = read_classic(fixture(cells=cells))
        self.assertEqual((w, h, list(walk)), (2, 3, [1, 0, 1, 0, 0, 1]))
        self.assertEqual(flags["doorCells"], 2)
        self.assertEqual(flags["storedClosedDoorCells"], 1)
        self.assertEqual(components(w, h, walk), [2, 1])

    def test_preserves_library_indices_and_selects_objects_area(self):
        cells = [(0x8001, 0, 0x8003, 0, 0, 0x86, 2, 1, 0)] * 6
        result = audit(fixture(cells=cells))
        self.assertEqual(result["libraries"]["Tiles"]["indices"], [1])
        self.assertEqual(result["libraries"]["Objects2"]["indices"], [3])
        self.assertNotIn("SmTiles", result["libraries"])
        self.assertEqual(result["animatedFrontCells"], 6)
        self.assertTrue(result["diagnosticOnly"])
        self.assertFalse(result["runtimeReady"])

    def test_rejects_truncation_extra_bytes_unverified_signatures_and_dimensions(self):
        valid = fixture()
        bad_title = bytearray(valid); bad_title[4] = 15
        bad_dimensions = bytearray(valid); struct.pack_into("<HH", bad_dimensions, 0, 65535, 65535)
        zero = bytearray(valid); struct.pack_into("<H", zero, 0, 0)
        for data in [b"", valid[:51], valid[:-1], valid + b"!", bad_title, bad_dimensions, zero]:
            with self.subTest(length=len(data)), self.assertRaises(ValueError):
                audit(data)

    def test_components_do_not_wrap_rows_or_join_diagonally(self):
        self.assertEqual(components(3, 2, [0, 0, 1, 1, 0, 0]), [1, 1])
        self.assertEqual(components(2, 2, [1, 0, 0, 1]), [1, 1])
        self.assertEqual(components(2, 2, [0, 0, 0, 0]), [])

    def test_reports_out_of_range_object_areas_using_the_verified_client_fallback(self):
        result = audit(fixture(cells=[(1, 0, 3, 0, 0, 0, 0, 255, 0)] * 6))
        self.assertEqual(result["libraries"]["Objects"]["indices"], [3])
        self.assertNotIn("Objects256", result["libraries"])
        self.assertEqual(result["objectAreaFallbackCells"], 6)
        self.assertEqual(result["rawFallbackAreas"], {255: 6})


if __name__ == "__main__":
    unittest.main()
