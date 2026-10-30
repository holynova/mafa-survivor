import {afterEach,expect,it} from 'vitest';
import {Game} from '../src/game';
import {setWorldLayouts} from '../src/world';
import {testPetHitWindow} from '../src/test-mode';
import woma from './fixtures/woma-layout.json';

afterEach(()=>setWorldLayouts({}));
function arena(){
  const g=new Game();g.start('test',176,'taoist');g.test.spawning=false;g.test.god=false;g.basicCD=Infinity;
  const skill=g.newSkill('beast');g.skills=[skill];skill.cd=0;g.cast(skill);skill.cd=Infinity;
  const pet=g.pets[0];Object.assign(pet,{x:g.player.x+80,y:g.player.y,cd:Infinity});
  return {g,pet};
}
function attackers(count:number){
  const {g,pet}=arena(),hp=pet.hp;
  for(let i=0;i<count;i++)Object.assign(g.spawnEnemy('orc'),{x:pet.x+(i%2?20:-20),y:pet.y,hp:10000,maxHp:10000,speed:0,damage:20,windup:1/120,attackTarget:pet.id,attackCD:999});
  g.step(1/60);return {g,pet,lost:hp-pet.hp};
}

it('coalesces simultaneous real enemy melee hits on one pet instead of multiplying the burst',()=>{
  const single=attackers(1),crowd=attackers(6);
  expect(single.lost).toBeGreaterThan(0);expect(crowd.lost).toBe(single.lost);
  expect(crowd.pet.hp).toBeGreaterThan(0);expect(crowd.g.player.hp).toBe(crowd.g.maxHP);
});

it('still takes the full strongest hit when a Boss follows a weaker hit in the same window',()=>{
  const first=arena(),strong=arena();first.g.hurtPet(first.pet,10,'physical');first.g.hurtPet(first.pet,80,'magic');strong.g.hurtPet(strong.pet,80,'magic');
  expect(first.pet.hp).toBe(strong.pet.hp);
});

it('does not stack a weaker hit after the strongest one',()=>{
  const {g,pet}=arena();g.hurtPet(pet,80,'physical');const hp=pet.hp;g.hurtPet(pet,10,'magic');expect(pet.hp).toBe(hp);
});

it('does not extend the window with repeated hits and accepts another hit at its boundary',()=>{
  const {g,pet}=arena();g.hurtPet(pet,20,'physical');const hp=pet.hp;
  g.clock=.2;g.hurtPet(pet,20,'physical');expect(pet.hp).toBe(hp);
  g.clock=.3;g.hurtPet(pet,20,'physical');expect(pet.hp).toBeLessThan(hp);
});

it('tracks the window independently for each pet',()=>{
  const {g,pet}=arena(),other={...pet,id:pet.id+100};g.pets.push(other);const hp=pet.hp;
  g.hurtPet(pet,20,'physical');g.hurtPet(other,20,'physical');expect(pet.hp).toBeLessThan(hp);expect(other.hp).toBe(pet.hp);
});

it('does not reduce separated Boss hits outside the window',()=>{
  const {g,pet}=arena(),hp=pet.hp;g.hurtPet(pet,40,'physical');const loss=hp-pet.hp;
  g.clock=1.5;g.hurtPet(pet,40,'physical');expect(hp-pet.hp).toBeCloseTo(loss*2,8);
});

it('never damages pets or starts a hit window while combat is paused',()=>{
  const {g,pet}=arena(),hp=pet.hp;g.pause();g.hurtPet(pet,40,'physical');expect(pet.hp).toBe(hp);
});

it('runs the heavy-hit and crowd fixture through real source-floor enemy AI without normal grants',()=>{
  setWorldLayouts({woma});const g=new Game();g.start('test',176);
  expect(testPetHitWindow(g)).toBe(true);expect(g.phase).toBe('paused');expect(g.test.god).toBe(false);
  const sample=g.test.petHitSample!,pet=g.pets.find(p=>p.id===sample.petId)!;
  expect(sample.attacks).toBe(4);expect(sample.separateHits).toBe(104);expect(sample.largestHit).toBe(59);
  expect(sample.beforeHP-pet.hp).toBe(59);expect(g.player.hp).toBe(g.maxHP);
  expect(g.enemies.every(e=>g.canStand(e.x,e.y))).toBe(true);expect(g.canStand(pet.x,pet.y)).toBe(true);
  expect(g.gold).toBe(0);expect(g.kills).toBe(0);expect(g.exp).toBe(0);
  g.start('normal',176,'taoist',false,'biche');const run=g.runId;
  expect(testPetHitWindow(g)).toBe(false);expect(g.runId).toBe(run);expect(g.test.petHitSample).toBe(null);
});
