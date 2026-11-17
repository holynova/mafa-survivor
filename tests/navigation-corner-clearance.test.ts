import {expect,it} from 'vitest';
import {WorldNavigation,type WorldLayout} from '../src/world';
it('routes a full-width actor through the current cell center before cutting a blocked corner',()=>{
 const map:WorldLayout={width:144,height:96,cellWidth:48,cellHeight:32,walk:[0,0,0,0,1,1,0,1,0],tiles:[],objects:[]};
 const nav=new WorldNavigation(map),from={x:60,y:59},target={x:120,y:48};
 expect(nav.connected(from,target)).toBe(true);expect(nav.lineClear(from,target,12)).toBe(false);
 const waypoint=nav.waypoint(from,target)!;
 expect(nav.lineClear(from,waypoint,12)).toBe(true);
 expect(waypoint).not.toEqual(from);
 expect(nav.waypoint(waypoint,target)).toEqual(target);
});
