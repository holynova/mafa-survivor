import { describe, it, expect } from "vitest";
import { canStand, WorldNavigation, type WorldLayout } from "../src/world";
const maze = (): WorldLayout => ({
  width: 336, height: 224, cellWidth: 48, cellHeight: 32,
  walk: [
    0,0,0,0,0,0,0,
    0,1,1,1,0,1,0,
    0,1,0,1,0,1,0,
    0,1,0,1,0,0,0,
    0,1,0,1,1,1,0,
    0,1,1,1,0,1,0,
    0,0,0,0,0,0,0,
  ], tiles: [], objects: [],
});
describe("mine navigation", () => {
  it("takes a corridor around a solid wall rather than walking through it", () => {
    const map = maze(), nav = new WorldNavigation(map);
    let actor = { x: 72, y: 112 }; const target = { x: 264, y: 144 };
    expect(nav.lineClear(actor, target)).toBe(false);
    for (let i = 0; i < 1600 && Math.hypot(actor.x-target.x,actor.y-target.y)>8; i++) {
      const waypoint = nav.waypoint(actor, target)!;
      expect(waypoint).not.toBeNull();
      const dx = waypoint.x-actor.x, dy = waypoint.y-actor.y, distance = Math.max(1,Math.hypot(dx,dy));
      const x=actor.x+dx/distance*2, y=actor.y+dy/distance*2;
      if (canStand(x,actor.y,12,map)) actor.x=x;
      if (canStand(actor.x,y,12,map)) actor.y=y;
      expect(canStand(actor.x,actor.y,12,map)).toBe(true);
    }
    expect(Math.hypot(actor.x-target.x,actor.y-target.y)).toBeLessThan(9);
  });
  it("excludes disconnected pockets and blocked footprints from spawn candidates", () => {
    const nav = new WorldNavigation(maze());
    const points=nav.reachablePoints({x:72,y:112},48);
    expect(points.length).toBeGreaterThan(5);
    expect(points.some((p)=>p.x===264 && p.y===48)).toBe(false);
    expect(points.every((p)=>canStand(p.x,p.y,12,nav.layout))).toBe(true);
    expect(nav.waypoint({x:264,y:48},{x:72,y:112})).toBeNull();
  });
  it("does not let arrows pass a wall while allowing a clear corridor shot", () => {
    const nav = new WorldNavigation(maze());
    expect(nav.lineClear({x:72,y:48},{x:168,y:48},0)).toBe(true);
    expect(nav.lineClear({x:72,y:80},{x:168,y:80},0)).toBe(false);
  });
});
