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

const maps=['biche','mine','woma','zuma','mengzhong','centipede','stone','redmoon','bairimen','shimu'];
for(const map of maps)it(`${map}: sampled source-map adjacent routes preserve full actor clearance`,async()=>{
 const {readFile}=await import('node:fs/promises');
 const layout:WorldLayout=JSON.parse(await readFile(new URL(`./fixtures/${map}-layout.json`,import.meta.url),'utf8'));
 const nav=new WorldNavigation(layout);let checked=0;
 const stride=Math.max(1,Math.floor(nav.points.length/40));
 for(let i=0;i<nav.points.length;i+=stride){const center=nav.points[i];
  for(const dx of [-10,10])for(const dy of [-11,11]){
   const from={x:center.x+dx,y:center.y+dy};if(!nav.lineClear(from,center,12))continue;
   for(const target of [{x:center.x+layout.cellWidth,y:center.y},{x:center.x-layout.cellWidth,y:center.y},{x:center.x,y:center.y+layout.cellHeight},{x:center.x,y:center.y-layout.cellHeight}]){
    if(!nav.lineClear(center,target,12))continue;
    const waypoint=nav.waypoint(from,target);expect(waypoint,`${map}: ${JSON.stringify({from,target})}`).not.toBeNull();
    expect(nav.lineClear(from,waypoint!,12)).toBe(true);
    expect(nav.waypoint(waypoint!,target)).toEqual(target);checked++;
   }
  }
 }
 expect(checked).toBeGreaterThan(0);
});
