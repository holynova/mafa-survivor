import { expect, it } from "vitest";
import { mapObjectAlpha, mapObjectDepth, coversActor } from "../src/map-render";

it("keeps adjacent original tree strips equally opaque as the hero passes behind them", () => {
  const strips = [52, 100, 148, 196].map((x) => ({ x, y: 300, depth: 2, alpha: false }));
  for (const x of [120, 150, 180, 210]) {
    expect(strips.map((part) => mapObjectAlpha(part, 48, 220, 300, { x, y: 270 }))).toEqual([1, 1, 1, 1]);
  }
});
it("keeps original lower objects below actors in the same source grid row", () => {
  const part = { x: 0, y: 320, depth: 1, alpha: false };
  expect(mapObjectDepth(part, 32)).toBeLessThan(304);
  expect(mapObjectDepth({ ...part, depth: 2 }, 32)).toBeGreaterThan(304);
});

it("shows the cover silhouette only for opaque source pixels in front of the actor", () => {
  const part = { x: 100, y: 200, width: 48, height: 120, depth: 200, mask: new Uint8Array(48 * 120) };
  const hero = { x: 124, y: 180 };
  expect(coversActor(part, hero)).toBe(false);
  part.mask[(180 - 42 - 80) * 48 + 24] = 255;
  expect(coversActor(part, hero)).toBe(true);
  expect(coversActor({ ...part, depth: 170 }, hero)).toBe(false);
  expect(coversActor(part, { x: 180, y: 180 })).toBe(false);
});
it("retains a complete cover silhouette when only the feet are behind a foreground ledge",()=>{
  const part={x:100,y:200,width:48,height:120,depth:4000,mask:new Uint8Array(48*120)};
  const hero={x:124,y:180};
  part.mask[(180-6-80)*48+24]=255;
  expect(coversActor(part,hero)).toBe(true);
  expect(coversActor({...part,depth:170},hero)).toBe(false);
});
