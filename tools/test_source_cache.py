import tempfile
import time
import unittest
import runpy
import threading
import source_cache
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from source_cache import blob_sha, read_source


class SharedSourceCacheTests(unittest.TestCase):
    def test_independent_importers_never_share_a_temporary_filename(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'same.PNG';data=b'original pixels'
            readers=[runpy.run_path(source_cache.__file__)['read_source'] for _ in range(2)]
            barrier=threading.Barrier(2)
            def request(_):barrier.wait(timeout=3);return data
            with ThreadPoolExecutor(2) as pool:
                results=list(pool.map(lambda read:read(path,'source',blob_sha(data),request),readers))
            self.assertEqual(results,[data,data]);self.assertEqual(path.read_bytes(),data)
            self.assertEqual(list(Path(directory).iterdir()),[path])
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
