import {expect,it} from 'vitest';
import {Game} from '../src/game';
import {updateRangedEnemy} from '../src/enemy-ai';
import {rangedTiming} from '../src/ranged-timing';
it('locks elite snake aim, retains fan damage and exposes a real stationary recovery',()=>{
 const g=new Game();g.survivorMode=true;g.start('normal');g.clock=10;const e=g.spawnEnemy('evilSnake');e.x=g.player.x-100;e.y=g.player.y;e.rangedCD=0;
 const victim={...g.player,visible:true};expect(updateRangedEnemy(g,e,.05,victim)).toBe(true);expect(e.rangedFireAt).toBeCloseTo(10.9);const aim={...e.rangedTarget!};
 g.player.y+=100;g.clock=10.8;updateRangedEnemy(g,e,.05,{...g.player,visible:true});expect(g.projectiles).toHaveLength(0);expect(e.rangedTarget).toEqual(aim);
 g.clock=10.91;updateRangedEnemy(g,e,.05,{...g.player,visible:true});expect(g.projectiles).toHaveLength(3);expect(g.projectiles[1].vy).toBeCloseTo(0);expect(g.projectiles[1].damage).toBe(Math.round(e.damage*.8));expect(e.staggerUntil).toBeCloseTo(12.01);
 const point={x:e.x,y:e.y};g.clock=11.9;expect(updateRangedEnemy(g,e,.05,{x:e.x+30,y:e.y,visible:true})).toBe(true);expect({x:e.x,y:e.y}).toEqual(point);
});
it('keeps legacy and ordinary ranged cadence unchanged',()=>{
 expect(rangedTiming('evilSnake',false)).toEqual({windup:.7,recovery:.35,cooldown:2.5});
 expect(rangedTiming('spider',true)).toEqual(rangedTiming('spider',false));
 const g=new Game();g.start('normal');g.fireEliteProjectile(g.spawnEnemy('evilSnake'));expect(g.projectiles.every(p=>p.majorSource===undefined)).toBe(true);
});
