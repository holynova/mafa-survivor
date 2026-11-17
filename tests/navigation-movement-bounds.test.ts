import {expect,it} from 'vitest';
import {WorldNavigation,type WorldLayout} from '../src/world';
import {MOVEMENT_BOUNDS} from '../src/game';
import {MAP_IDS} from '../src/content';
const bounds={left:35,top:55,right:301,bottom:189};
it('retains usable partial edge cells while every waypoint stays within actual movement bounds',()=>{
 const map:WorldLayout={width:336,height:224,cellWidth:48,cellHeight:32,walk:Array(49).fill(1),tiles:[],objects:[]};
 const nav=new WorldNavigation(map,bounds);expect(nav.points.some(p=>p.x===35)).toBe(true);expect(nav.points.some(p=>p.x===301)).toBe(true);expect(nav.points.some(p=>p.y===55)).toBe(true);
 for(const p of nav.points){expect(p.x).toBeGreaterThanOrEqual(bounds.left);expect(p.x).toBeLessThanOrEqual(bounds.right);expect(p.y).toBeGreaterThanOrEqual(bounds.top);expect(p.y).toBeLessThanOrEqual(bounds.bottom);}
 const from={x:120,y:189},target={x:24,y:208};const next=nav.waypoint(from,target)!;
 expect(next).toEqual({x:35,y:189});expect(nav.lineClear(from,next,12)).toBe(true);
 // Attack visibility still uses source floor, even for a stationary target beyond a movement margin.
 expect(nav.lineClear(from,target,0)).toBe(true);
});
it('does not declare a route connected solely through a floor row the actor cannot enter',()=>{
 const map:WorldLayout={width:336,height:224,cellWidth:48,cellHeight:32,walk:Array.from({length:49},(_,i)=>{const x=i%7,y=Math.floor(i/7);return y>=1&&(x===1||x===5||y===6&&x>1&&x<5)?1:0;}),tiles:[],objects:[]};
 const a={x:72,y:176},b={x:264,y:176};expect(new WorldNavigation(map).connected(a,b)).toBe(true);
 const nav=new WorldNavigation(map,bounds);expect(nav.connected(a,b)).toBe(false);expect(nav.waypoint(a,b)).toBeNull();
});
it.each(MAP_IDS)('%s source floor has legal spawn-connected waypoints under real movement limits',async map=>{
 const {readFile}=await import('node:fs/promises');const layout:WorldLayout=JSON.parse(await readFile(new URL(`./fixtures/${map}-layout.json`,import.meta.url),'utf8'));
 const nav=new WorldNavigation(layout,MOVEMENT_BOUNDS),from=layout.spawn!;const points=nav.reachablePoints(from);
 expect(points.length).toBeGreaterThan(0);
 for(const p of points){expect(p.x).toBeGreaterThanOrEqual(MOVEMENT_BOUNDS.left);expect(p.x).toBeLessThanOrEqual(MOVEMENT_BOUNDS.right);expect(p.y).toBeGreaterThanOrEqual(MOVEMENT_BOUNDS.top);expect(p.y).toBeLessThanOrEqual(MOVEMENT_BOUNDS.bottom);}
 const stride=Math.max(1,Math.floor(points.length/20));
 for(let i=0;i<points.length;i+=stride){const next=nav.waypoint(from,points[i])!;expect(next).not.toBeNull();expect(nav.lineClear(from,next,12)).toBe(true);}
});
