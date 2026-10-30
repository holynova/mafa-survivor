import {afterEach,expect,it} from "vitest";
import {Game} from "../src/game";
import {simulationInput} from "../src/simulation";
import {setWorldLayouts} from "../src/world";
import woma from "./fixtures/woma-layout.json";
import {testMeleeDodge,testCrowdBudget} from "../src/test-mode";

afterEach(()=>setWorldLayouts({}));

it("runs the source-map crowd budget sample with legal real movement, limited actual damage and normal-mode isolation",()=>{
  setWorldLayouts({woma});const g=new Game();g.start("test",176);
  expect(testCrowdBudget(g)).toBe(true);expect(g.test.god).toBe(false);expect(g.test.autowalk).toBe(true);
  expect(g.phase).toBe("paused");expect(g.mapId).toBe("woma");
  const sample=g.test.crowdBudgetSample!,hp=g.player.hp;g.pause();
  for(let tick=0;tick<72;tick++){
    if(tick%10===0)g.input=simulationInput(g,g.input);
    g.step(1/60);expect(g.canStand(g.player.x,g.player.y)).toBe(true);
  }
  expect(Math.hypot(sample.boss.x-g.player.x,sample.boss.y-g.player.y)).toBeLessThan(sample.startDistance-40);
  expect(hp-g.player.hp).toBeLessThanOrEqual(1);expect(g.gold).toBe(0);expect(g.exp).toBe(0);expect(g.kills).toBe(0);
  const normal=new Game();normal.start("normal",176,"warrior",false,"biche");const id=normal.runId;
  expect(normal.mode).toBe("normal");expect(testCrowdBudget(normal)).toBe(false);expect(normal.runId).toBe(id);
});

function crowdArena(hp=185,damage=1,count=1){
  setWorldLayouts({});const g=new Game();g.start("test",176,"warrior");g.test.spawning=false;g.test.god=false;g.skills=[];
  g.player.hp=hp;Object.assign(g.spawnEnemy("womaLord"),{x:g.player.x+180,y:g.player.y,speed:0,shockCD:Infinity,bossSummonCD:Infinity});
  for(let i=0;i<count;i++)Object.assign(g.spawnEnemy("scarecrow"),{x:g.player.x+30,y:g.player.y+(i-count/2)*2,speed:0,damage,windup:.1,attackTarget:0,attackCD:Infinity});
  return g;
}

it("uses a healthy warrior's small damage budget to approach the Boss past a weak windup",()=>{
  const g=crowdArena();g.input=simulationInput(g);expect(g.input.x).toBeGreaterThan(.5);
  const x=g.player.x;g.step(1/60);expect(g.player.x).toBeGreaterThan(x);expect(g.test.god).toBe(false);
});

it("does not sum simultaneous weak crowd hits as if the actual hero had no hit recovery",()=>{
  const g=crowdArena(185,1,6);g.input=simulationInput(g);expect(g.input.x).toBeGreaterThan(.5);
  for(let tick=0;tick<10;tick++)g.step(1/60);
  expect(g.maxHP-g.player.hp).toBeLessThanOrEqual(1);
});

it.each([[4,1],[185,60]])("retreats when the same crowd pressure is large relative to health: hp=%s, damage=%s",(hp,damage)=>{
  const g=crowdArena(hp,damage);expect(simulationInput(g).x).toBeLessThan(0);
});

it("retains strict Boss escape priority even when a weak crowd attack can be tolerated",()=>{
  const g=crowdArena();Object.assign(g.boss!,{x:g.player.x+66,windup:.2,attackTarget:0});
  expect(simulationInput(g).x).toBeLessThan(0);
});

it("scores risk without consuming combat RNG or changing enemies and hero state",()=>{
  const g=crowdArena(),seed=g.rng.seed,actors=JSON.stringify([g.player,g.enemies,g.tao,g.damageTaken]);
  simulationInput(g);simulationInput(g);expect(g.rng.seed).toBe(seed);expect(JSON.stringify([g.player,g.enemies,g.tao,g.damageTaken])).toBe(actors);
});

it("keeps approaching a Boss while its moving basic attack deals with a trailing ordinary foe",()=>{
  setWorldLayouts({});
  const g=new Game();g.start("test",176,"warrior");
  g.test.spawning=false;g.test.god=false;g.skills=[];
  g.upgrades.accuracy=100;g.recompute();g.basicCD=0;
  Object.assign(g.spawnEnemy("womaLord"),{x:g.player.x+180,y:g.player.y,speed:0,shockCD:Infinity,bossSummonCD:Infinity});
  const trailing=g.spawnEnemy("orc");
  Object.assign(trailing,{x:g.player.x-40,y:g.player.y,speed:0,attackCD:Infinity});
  const startX=g.player.x,hp=trailing.hp;
  g.input=simulationInput(g);
  expect(g.input.x).toBeGreaterThan(.9);
  g.step(1/60);
  expect(g.player.x).toBeGreaterThan(startX);
  expect(trailing.hp).toBeLessThan(hp);
});

it("uses an early Boss windup to land a real swing and still leaves before damage",()=>{
  setWorldLayouts({});
  const g=new Game();g.start("test",176,"warrior");
  g.test.spawning=false;g.test.god=false;g.skills=[];
  g.upgrades.accuracy=100;g.recompute();g.basicCD=0;
  const boss=g.spawnEnemy("womaLord");
  Object.assign(boss,{x:g.player.x+66,y:g.player.y,hp:10000,maxHp:10000,speed:0,
    windup:.65,attackTarget:0,shockCD:Infinity,bossSummonCD:Infinity});
  const hp=g.player.hp;
  for(let tick=0;tick<42;tick++){
    if(tick%10===0)g.input=simulationInput(g,g.input);
    g.step(1/60);
  }
  expect(boss.hp).toBeLessThan(10000);
  expect(g.player.hp).toBe(hp);
  expect(g.damageTaken.physical).toBe(0);
});

it("retreats immediately when there is no time for a Boss attack window",()=>{
  setWorldLayouts({});const g=new Game();g.start("test",176,"warrior");g.test.spawning=false;g.test.god=false;
  Object.assign(g.spawnEnemy("womaLord"),{x:g.player.x+66,y:g.player.y,speed:0,
    windup:.2,attackTarget:0,shockCD:Infinity,bossSummonCD:Infinity});
  expect(simulationInput(g).x).toBeLessThan(0);
});

it("runs the source-map attack-window sample with real attacks, no immunity and no normal-mode grants",()=>{
  setWorldLayouts({woma});const g=new Game();g.start("test",176);
  expect(testMeleeDodge(g,true)).toBe(true);
  expect(g.test.meleeWindowSample).toBe(true);expect(g.test.god).toBe(false);
  expect(g.test.autowalk).toBe(true);expect(g.phase).toBe("paused");
  const boss=g.boss!,hp=g.player.hp,bossHP=boss.hp;g.pause();
  for(let tick=0;tick<42;tick++){
    if(tick%10===0)g.input=simulationInput(g,g.input);
    g.step(1/60);expect(g.canStand(g.player.x,g.player.y)).toBe(true);
  }
  expect(boss.hp).toBeLessThan(bossHP);expect(g.player.hp).toBe(hp);
  expect(g.damageTaken.physical).toBe(0);
  const normal=new Game();normal.start("normal");const id=normal.runId;
  expect(testMeleeDodge(normal,true)).toBe(false);expect(normal.runId).toBe(id);
});
