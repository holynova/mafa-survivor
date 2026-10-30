import {afterEach,expect,it} from "vitest";
import {Game} from "../src/game";
import type {SkillId} from "../src/content";
import {setWorldLayouts} from "../src/world";
import {testChargedBossStrike} from "../src/test-mode";
import woma from "./fixtures/woma-layout.json";

afterEach(()=>setWorldLayouts({}));
function arena(order:SkillId[]=["cleave","thrust","powerstrike","firesword"]){
  setWorldLayouts({});const g=new Game();g.start("test",176,"warrior");
  g.test.spawning=false;g.test.god=false;g.upgrades.accuracy=100;g.recompute();
  g.skills=order.map(id=>{const s=g.newSkill(id,2);s.cd=["cleave","thrust"].includes(id)?0:10;return s;});
  g.charges={powerstrike:true,firesword:true};g.basicCD=0;
  const enemy=(kind:string,x:number,y=0)=>{
    const e=g.spawnEnemy(kind);Object.assign(e,{x:g.player.x+x,y:g.player.y+y,hp:10000,maxHp:10000,
      speed:0,attackCD:999,shockCD:Infinity,bossSummonCD:Infinity});return e;
  };
  const boss=enemy("womaLord",40),guards=[enemy("orc",20,20),enemy("orc",20,-20)];
  return {g,boss,guards};
}

it.each([
  ["cleave","thrust","powerstrike","firesword"],
  ["powerstrike","firesword","thrust","cleave"],
] as SkillId[][])("releases the prepared Boss strike before ready area skills regardless of slot order: %j",(...order)=>{
  const {g,boss,guards}=arena(order);g.step(1/60);
  expect(g.damageDealt.firesword??0).toBeGreaterThan(0);
  expect(g.damageDealt.powerstrike??0).toBeGreaterThan(0);
  expect(g.damageDealt.cleave??0).toBe(0);expect(g.damageDealt.thrust??0).toBe(0);
  expect(boss.hp).toBeLessThan(10000);expect(guards.every(e=>e.hp===10000)).toBe(true);
  expect(g.charges).toEqual({});
});

it("aims an already prepared attack charge at the reachable Boss before a closer guard",()=>{
  const {g,boss,guards}=arena(["powerstrike"]);g.charges={powerstrike:true};g.step(1/60);
  expect(boss.hp).toBeLessThan(10000);expect(guards.every(e=>e.hp===10000)).toBe(true);
  expect(g.damageDealt.powerstrike??0).toBeGreaterThan(0);
});

it.each([
  ["cleave","thrust","powerstrike","firesword"],
  ["powerstrike","firesword","thrust","cleave"],
] as SkillId[][])("prepares newly ready charges before spending a reachable Boss swing on area skills: %j",(...order)=>{
  const {g,boss,guards}=arena(order);g.charges={};
  for(const s of g.skills)if(s.id==="powerstrike" || s.id==="firesword")s.cd=0;
  g.step(1/60);
  expect(g.damageDealt.firesword??0).toBeGreaterThan(0);expect(g.damageDealt.powerstrike??0).toBeGreaterThan(0);
  expect(g.damageDealt.cleave??0).toBe(0);expect(g.damageDealt.thrust??0).toBe(0);
  expect(boss.hp).toBeLessThan(10000);expect(guards.every(e=>e.hp===10000)).toBe(true);
  expect(g.charges).toEqual({});
});

it("does not release a charge or postpone area attacks while the ordinary swing is cooling down",()=>{
  const {g}=arena();g.basicCD=.5;g.step(1/60);
  expect(g.damageDealt.firesword??0).toBe(0);expect(g.damageDealt.cleave??0).toBeGreaterThan(0);
  expect(g.charges).toEqual({powerstrike:true,firesword:true});
  expect(g.basicCD).toBeCloseTo(.5-1/60,8);
});

it("advances a charge cooldown once at the ready boundary and starts the full cast cooldown",()=>{
  const {g}=arena();g.charges={};for(const s of g.skills)if(s.id==="firesword" || s.id==="powerstrike")s.cd=1/120;
  g.step(1/60);expect(g.damageDealt.firesword??0).toBeGreaterThan(0);
  expect(g.skills.find(s=>s.id==="firesword")!.cd).toBeCloseTo(5.2,8);
});

it("does not make an unready fire charge available by ticking its cooldown twice",()=>{
  const {g}=arena();g.charges={};g.skills.find(s=>s.id==="powerstrike")!.cd=0;
  g.skills.find(s=>s.id==="firesword")!.cd=2/60;g.step(1/60);
  expect(g.damageDealt.powerstrike??0).toBeGreaterThan(0);expect(g.damageDealt.firesword??0).toBe(0);
  expect(g.skills.find(s=>s.id==="firesword")!.cd).toBeCloseTo(1/60,8);
});

it("keeps ordinary preparation while the swing or current animation is unavailable",()=>{
  for(const lock of ["cooldown","animation"]){const {g}=arena();g.charges={};
    for(const s of g.skills)if(s.id==="firesword" || s.id==="powerstrike")s.cd=0;
    if(lock==="cooldown")g.basicCD=.5;else g.player.attackUntil=.2;
    g.step(1/60);expect(g.damageDealt.firesword??0).toBe(0);expect(g.charges).toEqual({powerstrike:true,firesword:true});
  }
});

it("does not use the future fire range before its charge is ready",()=>{
  const {g,boss}=arena();boss.x=g.player.x+52;g.charges={};g.skills.find(s=>s.id==="powerstrike")!.cd=0;
  g.step(1/60);expect(g.damageDealt.firesword??0).toBe(0);expect(g.damageDealt.powerstrike??0).toBe(0);
  expect(g.damageDealt.cleave??0).toBeGreaterThan(0);expect(g.skills.find(s=>s.id==="firesword")!.cd).toBeCloseTo(10-1/60,8);
});

it("honors the same retry deadline as ordinary automatic preparation",()=>{
  const {g}=arena();g.charges={};for(const s of g.skills)if(s.id==="firesword" || s.id==="powerstrike"){s.cd=0;s.retryAt=1;}
  g.step(1/60);expect(g.damageDealt.firesword??0).toBe(0);expect(g.damageDealt.powerstrike??0).toBe(0);
  expect(g.charges).toEqual({});expect(g.damageDealt.cleave??0).toBeGreaterThan(0);
});

it("uses exactly the direct prepared swing damage for newly ready charges",()=>{
  const direct=arena(),automatic=arena();
  for(const {g} of [direct,automatic]){g.charges={};for(const s of g.skills)if(s.id==="powerstrike" || s.id==="firesword")s.cd=0;}
  for(const id of ["powerstrike","firesword"])direct.g.cast(direct.g.skills.find(s=>s.id===id)!);
  direct.g.basicAttack(true);automatic.g.step(1/60);
  expect(automatic.boss.hp).toBe(direct.boss.hp);expect(automatic.g.damageDealt).toEqual(direct.g.damageDealt);
});

it("honors an existing animation lock and never creates a second swing on the next frame",()=>{
  const blocked=arena();blocked.g.player.attackUntil=.2;blocked.g.step(1/60);
  expect(blocked.boss.hp).toBe(10000);expect(blocked.g.charges.firesword).toBe(true);
  const {g,boss}=arena();g.step(1/60);const hp=boss.hp,fire=g.damageDealt.firesword,cd=g.basicCD;
  g.step(1/60);expect(boss.hp).toBe(hp);expect(g.damageDealt.firesword).toBe(fire);
  expect(g.basicCD).toBeCloseTo(cd-1/60,8);
});

it("consumes each prepared charge once on a miss and still uses the swing cooldown",()=>{
  const {g,boss,guards}=arena();g.upgrades.accuracy=0;g.recompute();g.rng.next=()=>.99;g.step(1/60);
  expect(boss.hp).toBe(10000);expect(guards.every(e=>e.hp===10000)).toBe(true);
  expect(g.charges).toEqual({});expect(g.basicCD).toBeGreaterThan(0);
  expect(g.damageDealt.firesword??0).toBe(0);
});

it("keeps attacking the nearby guard when the Boss is outside the actual charged range",()=>{
  const {g,boss,guards}=arena(["powerstrike","firesword"]);boss.x=g.player.x+150;
  g.step(1/60);expect(boss.hp).toBe(10000);expect(guards.some(e=>e.hp<10000)).toBe(true);
  expect(g.charges).toEqual({});
});

it("filters the wall before Boss priority without losing an ordinary reachable charged swing",()=>{
  const walk=Array(46*48).fill(1);for(let x=0;x<46;x++)walk[10*46+x]=0;
  setWorldLayouts({mine:{width:2208,height:1536,cellWidth:48,cellHeight:32,walk,tiles:[],objects:[],spawn:{x:504,y:304}}});
  const g=new Game();g.start("test",176,"warrior",false,"mine");g.test.spawning=false;g.test.god=false;
  g.upgrades.accuracy=100;g.recompute();g.skills=[g.newSkill("firesword",6)];g.skills[0].cd=10;g.charges={firesword:true};
  const boss=g.spawnEnemy("womaLord"),guard=g.spawnEnemy("orc");
  for(const [e,dy] of [[boss,64],[guard,-30]] as const)Object.assign(e,{x:g.player.x,y:g.player.y+dy,hp:10000,maxHp:10000,speed:0,attackCD:999,shockCD:Infinity,bossSummonCD:Infinity});
  expect(g.attackLineClear(g.player,boss)).toBe(false);g.step(1/60);
  expect(boss.hp).toBe(10000);expect(guard.hp).toBeLessThan(10000);expect(g.charges).toEqual({});
});

it("uses the same single-hit damage and attribution as releasing the original prepared swing directly",()=>{
  const direct=arena(),automatic=arena();direct.g.basicAttack();automatic.g.step(1/60);
  expect(automatic.boss.hp).toBe(direct.boss.hp);expect(automatic.g.damageDealt).toEqual(direct.g.damageDealt);
});

it("runs the real source-map prepared-charge sample and refuses normal or finished games",()=>{
  setWorldLayouts({woma});const g=new Game();g.start("test");
  expect(testChargedBossStrike(g)).toBe(true);expect(g.phase).toBe("paused");expect(g.test.god).toBe(false);
  expect(g.boss!.hp).toBeLessThan(2000);expect(g.enemies.filter(e=>e!==g.boss).every(e=>e.hp===2000)).toBe(true);
  expect(g.damageDealt.firesword??0).toBeGreaterThan(0);expect(g.damageDealt.cleave??0).toBe(0);
  expect(g.canStand(g.player.x,g.player.y)).toBe(true);expect(g.gold).toBe(0);expect(g.exp).toBe(0);
  g.finish(false);expect(testChargedBossStrike(g)).toBe(false);
  const normal=new Game();normal.start("normal");const id=normal.runId;
  expect(testChargedBossStrike(normal)).toBe(false);expect(normal.runId).toBe(id);
});
