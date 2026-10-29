"""Inspect the narrowly verified classic Mir2 .map format, without importing art.

Format facts: lzxsz/MIR2@98711dad31567d9a7e272956f6c5a2487000848b,
GameOfMir/Client/{MapUnit,MShare,Share}.pas. This is an independent reader;
no client implementation or game texture is copied into this tool.
"""
import argparse
from collections import Counter, deque
import hashlib
import json
from pathlib import Path
import struct

HEADER_SIZE = 52
CELL_SIZE = 12
MAX_CELLS = 4_000_000
TITLE = b"Legend of mir"
MAX_OBJECT_AREA = 14  # MShare.g_WObjectArr[0..14]; GetObjs falls back to area 0.


def read_classic(data):
    """Return row-major diagnostic masks and untouched, one-based image indices.

    Reject every unverified format, including other variants with the same size.
    The mask follows MapUnit.CanMove's stored state; doors can change at runtime.
    """
    if len(data) < HEADER_SIZE:
        raise ValueError("Truncated classic map header")
    if data[4] != len(TITLE) or data[5:5 + len(TITLE)] != TITLE:
        raise ValueError("Unsupported map signature; expected classic Legend of mir")
    width, height = struct.unpack_from("<HH", data)
    if not width or not height or width * height > MAX_CELLS:
        raise ValueError("Invalid or excessive map dimensions")
    if len(data) != HEADER_SIZE + width * height * CELL_SIZE:
        raise ValueError("Map length does not match the verified 52 + width*height*12 layout")
    walk = bytearray(width * height)
    layers = {"Tiles": Counter(), "SmTiles": Counter()}
    doors = closed = animated = 0
    fallback_areas = Counter()
    # Source records are column-major, unlike our renderer's row-major grid.
    for x in range(width):
        for y in range(height):
            back, middle, front, door, offset, frames, tick, area, light = struct.unpack_from(
                "<HHH6B", data, HEADER_SIZE + (x * height + y) * CELL_SIZE)
            is_closed = bool(door & 0x80 and not offset & 0x80)
            walk[y * width + x] = not (back & 0x8000 or front & 0x8000 or is_closed)
            doors += bool(door & 0x80)
            closed += is_closed
            animated += bool(frames & 0x7f)
            object_area = area if area <= MAX_OBJECT_AREA else 0
            if front & 0x7fff and area > MAX_OBJECT_AREA:
                fallback_areas[area] += 1
            # These are library requirements, NOT existing etorth texture IDs.
            for name, index in [("Tiles", back & 0x7fff), ("SmTiles", middle),
                                ("Objects" if object_area == 0 else f"Objects{object_area + 1}", front & 0x7fff)]:
                if index:
                    layers.setdefault(name, Counter())[index] += 1
    return width, height, walk, layers, {"doorCells": doors, "storedClosedDoorCells": closed,
                                        "animatedFrontCells": animated,
                                        "objectAreaFallbackCells": sum(fallback_areas.values()),
                                        "rawFallbackAreas": dict(sorted(fallback_areas.items()))}


def components(width, height, walk):
    """Four-neighbour static connectivity, not a claim about live navigation."""
    seen = bytearray(len(walk))
    sizes = []
    for start, value in enumerate(walk):
        if not value or seen[start]:
            continue
        queue = deque([start])
        seen[start] = 1
        size = 0
        while queue:
            index = queue.popleft()
            size += 1
            x, y = index % width, index // width
            neighbours = []
            if x: neighbours.append(index - 1)
            if x + 1 < width: neighbours.append(index + 1)
            if y: neighbours.append(index - width)
            if y + 1 < height: neighbours.append(index + width)
            for other in neighbours:
                if walk[other] and not seen[other]:
                    seen[other] = 1
                    queue.append(other)
        sizes.append(size)
    return sorted(sizes, reverse=True)


def audit(data):
    width, height, walk, layers, flags = read_classic(data)
    groups = components(width, height, walk)
    return {
        "schemaVersion": 1, "diagnosticOnly": True, "runtimeReady": False,
        "missing": ["Matching original client texture libraries and their provenance",
                    "Runtime doors, animation, projectile collision and chapter validation"],
        "format": "classic-mir2-52-12", "sha256": hashlib.sha256(data).hexdigest(),
        "readerProfile": "lzxsz/MIR2@98711dad31567d9a7e272956f6c5a2487000848b",
        "width": width, "height": height, "bytes": len(data),
        "staticWalkableCells": sum(walk), "staticComponents": len(groups),
        "largestStaticComponents": groups[:10], **flags,
        "imageIndexConvention": "Raw one-based library indices; never current texture/map IDs",
        "libraries": {name: {"cellReferences": sum(counts.values()),
                              "uniqueImages": len(counts), "indices": sorted(counts)}
                      for name, counts in sorted(layers.items()) if counts},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--expected-sha256", help="Reject a file that differs from the recorded candidate")
    parser.add_argument("--walk-png", type=Path, help="Diagnostic grid only; NOT game artwork")
    args = parser.parse_args()
    # Bound disk reads as well as subsequent allocations.
    if args.file.stat().st_size > HEADER_SIZE + MAX_CELLS * CELL_SIZE:
        parser.error("Map exceeds the audit size limit")
    data = args.file.read_bytes()
    if args.expected_sha256 and hashlib.sha256(data).hexdigest() != args.expected_sha256.lower():
        parser.error("Candidate SHA-256 mismatch")
    try:
        result = audit(data)
    except ValueError as error:
        parser.error(str(error))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    if args.walk_png:
        from PIL import Image
        width, height, walk, _, _ = read_classic(data)
        image = Image.frombytes("L", (width, height), bytes(255 if value else 0 for value in walk))
        args.walk_png.parent.mkdir(parents=True, exist_ok=True)
        image.save(args.walk_png)
    print(json.dumps({key: result[key] for key in ["format", "width", "height", "staticWalkableCells", "runtimeReady"]}))


if __name__ == "__main__":
    main()
