import {it,expect,vi} from 'vitest';
import {Game} from '../src/game';
import {stompWindup,stompRecovery,stompRadius} from '../src/boss-timing';
import {updateExpansionEnemy} from '../src/expansion-enemies';
import {enemyDangerZones} from '../src/encounters';
it('keeps old-mode timings and shares the exact new windup with warning progress',()=>{expect(stompWindup('redMoon',false)).toBe(.9);expect(stompWindup('whiteBoar',false)).toBe(.9);const g=new Game();g.survivorMode=true;g.start('normal');const e=g.spawnEnemy('redMoon');e.stompOrigin={...g.player};e.stompAt=stompWindup(e.kind,true);expect(enemyDangerZones(e,0,true)[0].progress).toBe(0);expect(enemyDangerZones(e,.675,true)[0].progress).toBeCloseTo(.5);});
it.each(['wizard','warrior','taoist'] as const)('%s can leave a locked red-moon circle after a 250ms reaction delay on clear floor',role=>{
 const g=new Game();g.survivorMode=true;g.start('normal',176,role);const e=g.spawnEnemy('redMoon');e.x=g.player.x+160;e.y=g.player.y;e.stompCD=0;
 vi.spyOn(g,'attackLineClear').mockReturnValue(true);const hit=vi.spyOn(g,'hurt');updateExpansionEnemy(g,e,.01,{...g.player,visible:true});const locked={...e.stompOrigin!};expect(e.stompAt).toBe(1.35);
 for(let i=1;i<=27;i++){g.clock=i*.05;if(g.clock>.25)g.player.y+=g.moveSpeed*.05;updateExpansionEnemy(g,e,.05,{...g.player,visible:true});}
 expect(Math.hypot(g.player.x-locked.x,g.player.y-locked.y)).toBeGreaterThan(130);expect(hit).not.toHaveBeenCalled();expect(e.stompAt).toBeUndefined();expect(e.staggerUntil).toBeCloseTo(3.55);
});
it('still hits a stationary target at the original radius and prevents action during recovery',()=>{const g=new Game();g.survivorMode=true;g.start('normal');const e=g.spawnEnemy('whiteBoar');e.x=g.player.x+30;e.y=g.player.y;e.stompCD=0;vi.spyOn(g,'attackLineClear').mockReturnValue(true);const hit=vi.spyOn(g,'hurt');updateExpansionEnemy(g,e,.01,{...g.player,visible:true});g.clock=1;updateExpansionEnemy(g,e,.01,{...g.player,visible:true});expect(hit).not.toHaveBeenCalled();g.clock=1.1;updateExpansionEnemy(g,e,.1,{...g.player,visible:true});expect(hit).toHaveBeenCalledTimes(1);e.stompCD=0;g.clock=2;expect(updateExpansionEnemy(g,e,.1,{...g.player,visible:true})).toBe(true);expect(e.stompAt).toBeUndefined();expect(e.staggerUntil).toBeCloseTo(3.3);g.clock=3.29;expect(updateExpansionEnemy(g,e,.01,{...g.player,visible:true})).toBe(true);expect(e.stompAt).toBeUndefined();g.clock=3.31;updateExpansionEnemy(g,e,.01,{...g.player,visible:true});expect(e.stompAt).toBeCloseTo(4.41);expect(stompRecovery(e.kind,false)).toBe(1);});

it.each([[109,true],[111,false]] as const)('red moon resolves at the same radius as its warning at %spx', (distance, hitExpected)=>{
 const g=new Game();g.survivorMode=true;g.start('normal');
 const boss=g.spawnEnemy('redMoon');boss.x=g.player.x-180;boss.y=g.player.y;boss.stompCD=0;
 vi.spyOn(g,'attackLineClear').mockReturnValue(true);
 const hit=vi.spyOn(g,'hurt');
 updateExpansionEnemy(g,boss,.01,{...g.player,visible:true});
 const zone=enemyDangerZones(boss,g.clock,true)[0];
 expect(zone.shape).toBe('circle');
 if(zone.shape!=='circle')throw Error('Expected circle');
 expect(zone.radius).toBe(110);
 const origin={...boss.stompOrigin!};
 g.player.x=origin.x+distance;g.clock=boss.stompAt!;
 updateExpansionEnemy(g,boss,.01,{...g.player,visible:true});
 expect(hit.mock.calls.length>0).toBe(hitExpected);
 expect(stompRadius('redMoon',false)).toBe(130);
 expect(stompRadius('whiteBoar',true)).toBe(130);
});
