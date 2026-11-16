import {describe,it,expect} from 'vitest';
import {cameraWorldView,frameBounds,intersectsView} from '../src/render-visibility';
describe('mobile world visibility',()=>{
 const view={x:500,y:500,width:390,height:844};
 it('keeps a tall sprite whose feet are below the viewport',()=>{expect(intersectsView(frameBounds({width:90,height:200,originX:45,originY:190},700,1400,1),view)).toBe(true);});
 it('keeps partly visible centered ground objects',()=>{expect(intersectsView(frameBounds({width:60,height:40,originX:0,originY:0},490,600,1,false),view)).toBe(true);});
 it('drops fully distant sprites on either side',()=>{for(const x of [100,1100])expect(intersectsView(frameBounds({width:60,height:80,originX:30,originY:70},x,600,1),view)).toBe(false);});
 it('includes a small overscan margin at the camera edge',()=>{expect(intersectsView({x:900,y:600,width:2,height:2},view)).toBe(true);expect(intersectsView({x:910,y:600,width:2,height:2},view)).toBe(false);});
 it('uses the centered zoomed view immediately after moving the camera',()=>{expect(cameraWorldView(100,200,400,800,2,2)).toEqual({x:200,y:400,width:200,height:400});});
});
