import {afterEach,expect,it} from "vitest";
import {Game} from "../src/game";
import {simulationInput} from "../src/simulation";
import {setWorldLayouts} from "../src/world";
import woma from "./fixtures/woma-layout.json";
import {testMeleeDodge} from "../src/test-mode";

afterEach(()=>setWorldLayouts({}));

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
