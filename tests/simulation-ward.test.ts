import {afterEach,expect,it} from 'vitest';
import {Game} from '../src/game';
import {acceptChapterWard} from '../src/chapter-challenge';
import {simulationInput} from '../src/simulation';
import {setWorldLayouts} from '../src/world';
import biche from './fixtures/biche-layout.json';

afterEach(()=>setWorldLayouts({}));
function arena(){
 setWorldLayouts({biche});
 const g=new Game();g.survivorMode=true;g.start('normal',176,'wizard');
 g.clock=130;g.survival.spawnAt=g.survival.eliteAt=g.survival.bossAt=1e9;
 g.pause();expect(acceptChapterWard(g,true)).toBe(true);
 return g;
}
it('walks to an accepted ward and completes it through normal time and pickup rules',()=>{
 const g=arena();const origin={x:g.player.x,y:g.player.y};
 expect(simulationInput(g)).toEqual({x:0,y:0});
 const before=g.rng.seed;
 for(let i=0;i<600&&g.survival.challenge.status==='active';i++){
  g.input=simulationInput(g,g.input,{pursueWard:true});g.step(.05);
 }
 expect(g.survival.challenge.status).toBe('won');
 expect(Math.hypot(g.player.x-origin.x,g.player.y-origin.y)).toBeGreaterThan(100);
 expect(g.potions.reserve.length+g.drops.filter(d=>d.heal===35).reduce((sum,d)=>sum+(d.count??1),0)).toBe(2);
 expect(g.enemies).toHaveLength(0);expect(g.rng.seed).toBe(before);
});
it('keeps emergency healing ahead of returning to a ward',()=>{
 const g=arena();g.player.hp=10;
 g.drops=[{id:g.nextEntityId(),x:g.player.x-100,y:g.player.y,born:g.clock,exp:0,gold:0,heal:20}];
 expect(simulationInput(g,{x:0,y:0},{pursueWard:true}).x).toBeLessThan(0);
});
