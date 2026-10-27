export type WorldLayout = {
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  walk: number[];
  tiles: { texture: number; x: number; y: number }[];
  objects: {
    texture: number;
    x: number;
    y: number;
    depth: number;
    alpha: boolean;
  }[];
};
export let worldLayout: WorldLayout | null = null;
export function setWorldLayout(layout: WorldLayout | null) {
  worldLayout = layout;
}
export function canStand(x: number, y: number, radius = 12) {
  const m = worldLayout;
  if (!m) return true;
  const columns = m.width / m.cellWidth;
  for (const dx of [-radius, radius])
    for (const dy of [-radius, radius]) {
      const cx = Math.floor((x + dx) / m.cellWidth),
        cy = Math.floor((y + dy) / m.cellHeight);
      if (
        cx < 0 ||
        cy < 0 ||
        cx >= columns ||
        cy >= m.height / m.cellHeight ||
        !m.walk[cy * columns + cx]
      )
        return false;
    }
  return true;
}
