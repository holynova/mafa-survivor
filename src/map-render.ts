/** Preserve source row ordering and opacity; adjacent strips are one picture. */
export type MapPart = { x: number; y: number; depth: number; alpha: boolean };
export function mapObjectDepth(part: MapPart, cellHeight: number) {
  return part.depth === 3 ? 4000 : part.y - (part.depth === 1 ? cellHeight : 0);
}
export function mapObjectAlpha(
  part: MapPart, _width: number, _height: number, _depth: number,
  _hero: { x: number; y: number } | null,
) {
  // Never fade a rectangular strip in isolation as a character walks past it.
  return part.alpha ? 96 / 255 : 1;
}

export type Occluder = {
  x: number; y: number; width: number; height: number; depth: number; mask: Uint8Array;
};
/** Sample actual source alpha, rather than a rectangular tree-strip bound. */
export function coversActor(part: Occluder, hero: { x: number; y: number }) {
  if (part.depth <= hero.y + 0.5) return false;
  for (const [dx, dy] of [[0, -42], [0, -25], [-8, -25], [8, -25]]) {
    const x = Math.floor(hero.x + dx - part.x);
    const y = Math.floor(hero.y + dy - (part.y - part.height));
    if (x >= 0 && y >= 0 && x < part.width && y < part.height && part.mask[y * part.width + x] > 128) return true;
  }
  return false;
}
