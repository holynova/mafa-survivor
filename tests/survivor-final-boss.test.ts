import {it,expect} from 'vitest';
import {Game} from '../src/game';
import {MAPS} from '../src/content';
import {CHAPTER_PATH} from '../src/survivor-progress';
import {survivalTick} from '../src/survivor';
import {collectLoot} from '../src/loot';
for(const map of CHAPTER_PATH)it(`${map}: guarantees an elite and a unique final boss, then requires its defeat`,()=>{
 const g=new Game();g.survivorMode=true;g.unlockedMaps.add(map);g.start('normal',176,'wizard',false,map);
 g.clock=120;survivalTick(g);expect(g.enemies.some(e=>e.elite)).toBe(true);
 g.clock=1080;survivalTick(g);const id=g.survival.finalBossId,boss=g.enemies.find(e=>e.id===id)!;
 expect(boss.kind).toBe(MAPS[map].boss);expect(g.survival.finalBossDefeated).toBe(false);
 survivalTick(g);expect(g.enemies.filter(e=>e.id===id)).toHaveLength(1);
 g.clock=1201;survivalTick(g);expect(g.phase).toBe('battle');
 g.hit(boss,1e9,'lightning');expect(g.survival.finalBossDefeated).toBe(true);survivalTick(g);expect(g.phase).toBe('won');
});
it('coin and coin-shaped experience pickups enqueue one original sound per batch',()=>{const g=new Game();g.start('normal');g.audioEvents=[];for(let i=0;i<10;i++)collectLoot(g,{id:i,x:0,y:0,exp:1,gold:0,born:0});expect(g.audioEvents).toEqual(['coin']);expect(g.exp).toBe(10);g.audioEvents=[];collectLoot(g,{id:20,x:0,y:0,exp:0,gold:0,born:0});expect(g.audioEvents).toEqual([]);});
it('the final boss still spawns when the field is crowded',()=>{const g=new Game();g.survivorMode=true;g.start('normal');for(let i=0;i<240;i++)g.spawnEnemy('scarecrow');g.clock=1080;survivalTick(g);expect(g.enemies.some(e=>e.id===g.survival.finalBossId)).toBe(true);});
it('overtime final-boss combat survives save/resume and records its actual duration',async()=>{const {recordSurvival,readSurvivorRecords}=await import('../src/survivor-records');const g=new Game();g.survivorMode=true;g.start('normal');g.clock=1300;survivalTick(g);const save=g.snapshotSurvival();expect(save).toBeTruthy();const next=new Game();expect(next.resumeSurvival(save!)).toBe(true);expect(next.survival.finalBossId).toBe(g.survival.finalBossId);g.finish(true);const data=new Map<string,string>();const storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};recordSurvival(g,storage);expect(readSurvivorRecords(storage)[0].seconds).toBe(1300);});
