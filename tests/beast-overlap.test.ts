import {afterEach,expect,it} from 'vitest';
import {Game} from '../src/game';
import {setWorldLayouts} from '../src/world';
afterEach(()=>setWorldLayouts({}));
function arena(){
 setWorldLayouts({});const g=new Game();g.survivorMode=true;g.start('test',176,'taoist');g.test.spawning=false;g.skills=[];g.basicCD=Infinity;
 g.survival.spawnAt=g.survival.eliteAt=g.survival.bossAt=1e9;
 const s=g.newSkill('beast');s.cd=0;g.skills=[s];g.cast(s);s.cd=Infinity;g.audioEvents=[];
 const pet=g.pets[0];Object.assign(pet,{cd:0,dir:4});
 const boss=g.spawnEnemy('boss');Object.assign(boss,{x:pet.x,y:pet.y,hp:10000,maxHp:10000,speed:0,attackCD:999,bossJumpCD:999,bossSummonCD:999});g.survival.finalBossId=boss.id;
 return {g,pet,boss};
}
it('damages a final boss overlapping the beast instead of emitting an empty flame',()=>{
 const {g,boss}=arena();g.step(.05);expect(g.effects.some(f=>f.kind==='beastflame')).toBe(true);expect(boss.hp).toBeLessThan(10000);expect(g.damageDealt.beast).toBeGreaterThan(0);
});
it('uses the retained pet facing when its target overlaps, while keeping the cone directional',()=>{
 const {g,pet,boss}=arena();
 for(const dy of [70,-70]){const e=g.spawnEnemy('orc');Object.assign(e,{x:pet.x,y:pet.y+dy,hp:1000,maxHp:1000,speed:0,attackCD:999});}
 g.step(.05);const [ahead,behind]=g.enemies.filter(e=>e.id!==boss.id);expect(ahead.hp).toBeLessThan(1000);expect(behind.hp).toBe(1000);
 const flame=g.effects.find(f=>f.kind==='beastflame')!;expect(flame.aimAngle).toBeCloseTo(Math.PI/2);
});
it('does not turn a normal non-overlapping target into an omnidirectional attack',()=>{
 const {g,pet,boss}=arena();boss.x+=70;
 const behind=g.spawnEnemy('orc');Object.assign(behind,{x:pet.x-70,y:pet.y,hp:1000,maxHp:1000,speed:0,attackCD:999});
 g.step(.05);expect(boss.hp).toBeLessThan(10000);expect(behind.hp).toBe(1000);expect(g.effects.find(f=>f.kind==='beastflame')!.aimAngle).toBeCloseTo(0);
});
