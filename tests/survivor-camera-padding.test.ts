import {expect,it} from 'vitest';
import {survivorCameraPadding} from '../src/camera-grid';

it.each([[390,844,132,1.15],[320,568,132,1.15],[844,390,80,1.5],[1280,720,132,1.5]])('keeps feet above the transparent HUD and source floor beneath it in a %ix%i view',(width,height,inset,zoom)=>{
 const padding=survivorCameraPadding(inset,zoom,192);
 const worldBottomScreen=height-padding.bottom*zoom;
 const lowestFoot=worldBottomScreen-35*zoom;
 expect(lowestFoot).toBeLessThan(height-inset-20);
 expect(padding.centerOffset*zoom).toBeCloseTo(inset/2);
 expect(padding.bottom).toBeLessThanOrEqual(192);
 // Keeping a full-height viewport is safe because all camera overdraw is real adjacent source floor.
 expect((192-padding.bottom)*zoom).toBeGreaterThanOrEqual(0);
});
it('never pans beyond verified floor when older or clipped assets provide less overdraw',()=>{
 expect(survivorCameraPadding(132,1.15,0)).toEqual({bottom:0,centerOffset:0});
 expect(survivorCameraPadding(132,1.15,64).bottom).toBe(64);
 expect(survivorCameraPadding(0,1.15,192)).toEqual({bottom:0,centerOffset:0});
});
