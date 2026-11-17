import {afterEach,expect,it} from 'vitest';
import {Game} from '../src/game';
import {setWorldLayouts} from '../src/world';
afterEach(()=>setWorldLayouts({}));
function arena(source:'beast'|'skeleton'='beast'){
 setWorldLayouts({});const g=new Game();g.start('test',176,'taoist');g.test.spawning=false;g.test.god=false;g.basicCD=Infinity;
 const s=g.newSkill(source);s.cd=0;g.skills=[s];g.cast(s);s.cd=Infinity;g.audioEvents=[];
 return {g,pet:g.pets[0]};
}
it('emits the verified original beast attack voice when it actually sprays, without an unmapped magic sound',()=>{
 const {g,pet}=arena();pet.cd=0;const e=g.spawnEnemy('orc');Object.assign(e,{x:pet.x+70,y:pet.y,speed:0,attackCD:999,hp:10000,maxHp:10000});
 g.step(.05);expect(g.effects.some(f=>f.kind==='beastflame')).toBe(true);expect(g.audioEvents).toContain('monster:beast:attack');expect(g.audioEvents).not.toContain('beastflame');
 g.audioEvents=[];g.step(.05);expect(g.audioEvents).not.toContain('monster:beast:attack');
});
it('emits beast hurt only for actual HP loss, and death replaces queued hurt exactly once',()=>{
 const {g,pet}=arena();g.hurtPet(pet,20,'physical');expect(g.audioEvents).toContain('monster:beast:hurt');
 g.audioEvents=[];g.hurtPet(pet,10,'physical');expect(g.audioEvents).toEqual([]);
 g.clock+=.3;g.hurtPet(pet,20,'physical');expect(g.audioEvents).toContain('monster:beast:hurt');
 g.hurtPet(pet,10000,'magic');expect(g.audioEvents).toContain('monster:beast:death');expect(g.audioEvents).not.toContain('monster:beast:hurt');
 g.hurtPet(pet,10000,'magic');expect(g.audioEvents.filter(k=>k==='monster:beast:death')).toHaveLength(1);
});
it('plays verified skeleton death while keeping absent attack and hurt events silent',()=>{
 const {g,pet}=arena('skeleton');pet.cd=0;const e=g.spawnEnemy('orc');Object.assign(e,{x:pet.x+20,y:pet.y,speed:0,attackCD:999,hp:10000,maxHp:10000});
 g.step(.05);g.hurtPet(pet,20,'physical');expect(g.audioEvents.filter(k=>k.startsWith('monster:summonedSkeleton:'))).toEqual([]);
 g.hurtPet(pet,10000,'magic');expect(g.audioEvents).toContain('monster:summonedSkeleton:death');
});
it('retains paused and distant feedback guards for friendly actors',()=>{
 const {g,pet}=arena();g.pause();g.hurtPet(pet,10000,'magic');expect(g.audioEvents).toEqual([]);expect(pet.hp).toBe(pet.maxHp);
 g.pause();pet.x=g.player.x+650;g.hurtPet(pet,20,'physical');expect(g.audioEvents).toEqual([]);expect(pet.hp).toBeLessThan(pet.maxHp);
});
