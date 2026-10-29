import {expect,it} from "vitest";
import {alignCameraScroll,battleViewport} from "../src/camera-grid";

it.each([[1280,720,133],[390,844,122],[844,390,133]])("keeps the bottommost legal actor above the console in a %ix%i view",(width,height,inset)=>{
 const view=battleViewport(width,height,inset);
 expect(view.height).toBe(height-inset);
 const lowestFoot=view.height-35*(width<700 ? 1.15 : 1.5);
 expect(lowestFoot).toBeLessThan(height-inset-20);
 expect(view.width).toBe(width);
});
it("restores the full lobby view and keeps a tiny resized battle viewport nonzero",()=>{
 expect(battleViewport(1280,720,0)).toEqual({width:1280,height:720});
 expect(battleViewport(390,80,122).height).toBe(1);
});

it.each([1.5,1.15])( "avoids half-screen-pixel map boundaries at zoom %s",zoom=>{
  for(const size of [375,720,1280])for(const scroll of [255,255.4,583.6,80,0,-30.2]) {
    const origin=size/2,offset=Math.floor(origin+0.5)-origin*zoom;
    const aligned=alignCameraScroll(scroll,zoom,origin);
    expect(Math.abs(aligned-scroll)).toBeLessThanOrEqual(0.5/zoom+1e-9);
    const projected=offset-aligned*zoom;
    expect(projected).toBeCloseTo(Math.round(projected),9);
    for(let tile=0;tile<12;tile++) {
      const edge=projected+tile*48*zoom;
      // 48px source strips must share a consistent grid, not half-pixel edges.
      expect(Math.abs(edge-Math.floor(edge)-0.5)).toBeGreaterThan(0.09);
    }
  }
});


it("keeps the aligned view inside camera bounds, including fractional viewport origins",()=>{
  for(const zoom of [1.15,1.5])for(const start of [0,12.5])for(const scroll of [-50,0.25,500,1000.4,1050]) {
    const bounds={min:0.25,max:1000.4},origin=187.5;
    const aligned=alignCameraScroll(scroll,zoom,origin,start,bounds);
    expect(aligned).toBeGreaterThanOrEqual(bounds.min-1e-9);
    expect(aligned).toBeLessThanOrEqual(bounds.max+1e-9);
    const screen=Math.floor(start+origin+0.5)-origin*zoom-aligned*zoom;
    expect(screen).toBeCloseTo(Math.round(screen),9);
  }
});
