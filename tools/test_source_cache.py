import tempfile
import time
import unittest
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from source_cache import blob_sha, read_source


class SharedSourceCacheTests(unittest.TestCase):
    def test_shared_frame_is_fetched_once_for_concurrent_consumers(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'shared-book.PNG'
            data = b'source pixels' * 4096
            calls = []
            def request(url):
                calls.append(url)
                time.sleep(0.02)
                return data
            with ThreadPoolExecutor(18) as pool:
                results = list(pool.map(lambda _: read_source(path, 'source', blob_sha(data), request), range(36)))
            self.assertEqual(len(calls), 1)
            self.assertTrue(all(result == data for result in results))
            self.assertEqual(path.read_bytes(), data)
            self.assertFalse(path.with_name(path.name + '.part').exists())

    def test_incomplete_old_cache_is_repaired_from_verified_source(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'frame.PNG'
            path.write_bytes(b'partial')
            data = b'complete source'
            self.assertEqual(read_source(path, 'source', blob_sha(data), lambda _: data), data)
            self.assertEqual(path.read_bytes(), data)

    def test_invalid_download_is_never_committed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'frame.PNG'
            with self.assertRaisesRegex(ValueError, 'Source blob hash mismatch'):
                read_source(path, 'source', blob_sha(b'correct'), lambda _: b'wrong')
            self.assertFalse(path.exists())
