import {afterEach,expect,it} from 'vitest';
import {Game} from '../src/game';
import {simulationInput} from '../src/simulation';
import {setWorldLayouts} from '../src/world';
afterEach(()=>setWorldLayouts({}));
it('prioritizes the living final objective over an older phase boss without moving either enemy or granting damage',()=>{
 setWorldLayouts({});const g=new Game();g.survivorMode=true;g.start('normal',176,'wizard');
 const old=g.spawnEnemy('redMoon'),final=g.spawnEnemy('redMoon');
 Object.assign(old,{x:g.player.x-350,y:g.player.y});Object.assign(final,{x:g.player.x+350,y:g.player.y});g.survival.finalBossId=final.id;
 const before=g.snapshotSurvival()!;
 expect(simulationInput(g).x).toBeGreaterThan(0);
 expect({...g.snapshotSurvival(),savedAt:before.savedAt}).toEqual(before);
 final.hp=0;expect(simulationInput(g).x).toBeLessThan(0);
 final.hp=final.maxHp;g.survivorMode=false;expect(simulationInput(g).x).toBeLessThan(0);
});
