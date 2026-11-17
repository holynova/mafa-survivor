import {afterEach,expect,it} from 'vitest';
import {Game} from '../src/game';
import {simulationInput} from '../src/simulation';
import {setWorldLayouts} from '../src/world';
afterEach(()=>setWorldLayouts({}));
function arena(){
 setWorldLayouts({});const g=new Game();g.survivorMode=true;g.start('test',42,'taoist');
 g.test.spawning=false;g.test.god=false;g.skills=[];g.basicCD=Infinity;
 g.drops=[{id:990,x:g.player.x+110,y:g.player.y,exp:3,gold:1,born:0}];return g;
}
it('collects through real movement and pickup without granting experience during planning',()=>{
 const g=arena(),before=JSON.stringify([g.player,g.drops,g.exp,g.rng.seed]);
 const input=simulationInput(g,{x:0,y:0},{seekExperience:true});
 expect(input.x).toBeGreaterThan(0);expect(JSON.stringify([g.player,g.drops,g.exp,g.rng.seed])).toBe(before);
 for(let i=0;i<180&&g.drops.length;i++){g.input=simulationInput(g,g.input,{seekExperience:true});g.step(1/60);expect(g.canStand(g.player.x,g.player.y)).toBe(true);}
 expect(g.drops).toHaveLength(0);expect(g.exp).toBe(3);expect(g.gold).toBe(1);
});
it('keeps an imminent Boss melee escape ahead of a nearby experience pile',()=>{
 const g=arena();Object.assign(g.spawnEnemy('womaLord'),{x:g.player.x+66,y:g.player.y,speed:0,windup:.1,attackTarget:0});
 expect(simulationInput(g,{x:0,y:0},{seekExperience:true}).x).toBeLessThan(0);
});
it('leaves the baseline policy unchanged when collection is not selected',()=>{
 const g=arena();g.spawnEnemy('orc');
 expect(simulationInput(g)).toEqual(simulationInput(g,{x:0,y:0},{seekExperience:false}));
});
