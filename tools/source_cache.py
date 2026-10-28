"""Hash-verified cache reads with a single writer for shared source frames."""
import hashlib
import os
import threading
import tempfile
from pathlib import Path

_locks = {}


def blob_sha(data):
    return hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()


def read_source(path, url, expected_sha, request):
    lock = _locks.setdefault(str(path.resolve()), threading.Lock())
    with lock:
        if path.exists():
            data = path.read_bytes()
            if blob_sha(data) == expected_sha:
                return data
        data = request(url)
        actual = blob_sha(data)
        if actual != expected_sha:
            raise ValueError(f'Source blob hash mismatch: {path.name}: expected {expected_sha}, got {actual}')
        path.parent.mkdir(parents=True, exist_ok=True)
        # Separate importer processes do not share the in-process lock table.
        with tempfile.NamedTemporaryFile(dir=path.parent,prefix=path.name+'.',suffix='.part',delete=False) as handle:
            handle.write(data)
            temporary=Path(handle.name)
        try:os.replace(temporary,path)
        finally:temporary.unlink(missing_ok=True)
        return data
