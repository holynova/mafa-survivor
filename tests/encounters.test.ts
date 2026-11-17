import {it,expect} from 'vitest';
import {Game} from '../src/game';
import {enemyDangerZones,eliteScale,activeBosses} from '../src/encounters';
import {survivalTick} from '../src/survivor';
import {survivalThreatScale,survivorSpawnInterval} from '../src/survivor-pacing';
const run=()=>{const g=new Game();g.survivorMode=true;g.start('normal');return g;};
it('enlarges elites and keeps a final-first boss roster even when bosses are off camera',()=>{
 const g=run(),elite=g.spawnEnemy('orc');elite.elite=true;expect(eliteScale(elite)).toBe(1.45);const a=g.spawnEnemy('boss'),b=g.spawnEnemy('corpseKing');g.survival.finalBossId=b.id;expect(activeBosses(g).map(e=>e.id)).toEqual([b.id,a.id]);b.hp=0;expect(activeBosses(g).map(e=>e.id)).toEqual([a.id]);
});
it('announces scheduled elites and bosses once and preserves final-boss priority',()=>{
 const g=run();g.clock=120;survivalTick(g);expect(g.encounterAlert?.boss).toBe(false);const until=g.encounterAlert!.until;g.clock=121;survivalTick(g);expect(g.encounterAlert!.until).toBe(until);g.clock=300;survivalTick(g);expect(g.encounterAlert?.boss).toBe(true);g.clock=1080;survivalTick(g);expect(g.encounterAlert?.final).toBe(true);expect(g.encounterAlert!.until).toBe(1084);
});
it('uses the locked damage center, radius, width and cast time for warnings',()=>{
 const g=run(),e=g.spawnEnemy('corpseKing');e.stompAt=10;e.stompOrigin={x:500,y:700};let z=enemyDangerZones(e,9.5)[0];expect(z).toMatchObject({shape:'circle',x:500,y:700,radius:130,progress:.5});
 e.stompAt=undefined;e.stompOrigin=undefined;e.shock={origin:{x:100,y:100},target:{x:500,y:100},at:10,remaining:1};z=enemyDangerZones(e,9.6)[0];expect(z).toMatchObject({shape:'lane',width:76,toX:500,toY:100});expect(z.progress).toBeCloseTo(.5);e.hp=0;expect(enemyDangerZones(e,9.6)).toEqual([]);
});
it('retains dodge windows while growing fixed-time pressure and shortening late elite cadence',()=>{
 expect(survivalThreatScale(0,'normal').hp).toBeGreaterThan(1);expect(survivalThreatScale(1200,'normal').hp).toBeGreaterThan(survivalThreatScale(0,'normal').hp);expect(survivalThreatScale(0,'boss').damage).toBe(1.25);
 expect(survivorSpawnInterval(600)).toBeGreaterThanOrEqual(.14);const g=run();g.clock=600;survivalTick(g);expect(g.survival.eliteAt).toBe(690);
});
