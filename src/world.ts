import type { MapId } from "./content";
export type Point = { x: number; y: number };
export type WorldLayout = {
  spawn?: Point;
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
let worlds: Partial<Record<MapId, WorldLayout>> = {};
export function setWorldLayout(layout: WorldLayout | null) {
  worldLayout = layout;
  worlds = layout ? { biche: layout } : {};
}
export function setWorldLayouts(layouts: Partial<Record<MapId, WorldLayout>>) {
  worlds = layouts;
  worldLayout = layouts.biche ?? null;
}
export const getWorldLayout = (id: MapId) => worlds[id] ?? null;
export function canStand(x: number, y: number, radius = 12, m = worldLayout) {
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

/** One immutable map; short-lived shared distance fields for the player and pets. */
export class WorldNavigation {
  private fields = new Map<number, Int32Array>();
  private readonly columns: number;
  readonly points: Point[];
  constructor(readonly layout: WorldLayout) {
    this.columns = layout.width / layout.cellWidth;
    this.points = layout.walk.flatMap((walk, i) => {
      const point = this.center(i);
      return walk && canStand(point.x, point.y, 12, layout) ? [point] : [];
    });
  }
  private cell(p: Point) {
    const x = Math.floor(p.x / this.layout.cellWidth), y = Math.floor(p.y / this.layout.cellHeight);
    return x < 0 || y < 0 || x >= this.columns || y >= this.layout.height / this.layout.cellHeight ? -1 : y * this.columns + x;
  }
  private center(i: number): Point {
    return { x: (i % this.columns + 0.5) * this.layout.cellWidth,
      y: (Math.floor(i / this.columns) + 0.5) * this.layout.cellHeight };
  }
  private neighbors(i: number) {
    const result = [];
    if (i % this.columns > 0) result.push(i - 1);
    if (i % this.columns < this.columns - 1) result.push(i + 1);
    if (i >= this.columns) result.push(i - this.columns);
    if (i + this.columns < this.layout.walk.length) result.push(i + this.columns);
    return result.filter((n) => this.layout.walk[n]);
  }
  private field(target: Point) {
    const cell = this.cell(target);
    const existing = this.fields.get(cell);
    if (existing) return existing;
    const distances = new Int32Array(this.layout.walk.length).fill(-1);
    if (cell >= 0 && this.layout.walk[cell]) {
      const queue = new Int32Array(distances.length); let start = 0, end = 1;
      queue[0] = cell; distances[cell] = 0;
      while (start < end) {
        const current = queue[start++];
        for (const n of this.neighbors(current)) if (distances[n] < 0) {
          distances[n] = distances[current] + 1; queue[end++] = n;
        }
      }
    }
    this.fields.set(cell, distances);
    if (this.fields.size > 8) this.fields.delete(this.fields.keys().next().value!);
    return distances;
  }
  lineClear(from: Point, to: Point, radius = 10) {
    const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 8);
    for (let i = 0; i <= steps; i++) {
      const t = i / Math.max(1, steps);
      if (!canStand(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, radius, this.layout)) return false;
    }
    return true;
  }
  waypoint(from: Point, target: Point): Point | null {
    const distances = this.field(target), cell = this.cell(from);
    if (cell < 0 || distances[cell] < 0) return null;
    if (distances[cell] <= 2 && this.lineClear(from, target, 12)) return target;
    const next = this.neighbors(cell).filter((n) => distances[n] >= 0 && distances[n] < distances[cell])
      .sort((a, b) => distances[a] - distances[b] ||
        Math.hypot(this.center(a).x - from.x, this.center(a).y - from.y) - Math.hypot(this.center(b).x - from.x, this.center(b).y - from.y))[0];
    return next === undefined ? this.center(cell) : this.center(next);
  }
  reachablePoints(from: Point, minDistance = 0, maxDistance = Infinity) {
    const field = this.field(from);
    return this.points.filter((p) => {
      const distance = Math.hypot(p.x - from.x, p.y - from.y);
      return field[this.cell(p)] >= 0 && distance >= minDistance && distance <= maxDistance;
    });
  }
  connected(from: Point, to: Point) {
    const cell = this.cell(to);
    return cell >= 0 && this.field(from)[cell] >= 0;
  }
}
