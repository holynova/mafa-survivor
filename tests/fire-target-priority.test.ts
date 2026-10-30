import {afterEach,expect,it} from "vitest";
import {Game} from "../src/game";
import {setWorldLayouts} from "../src/world";
import {testFirePriority} from "../src/test-mode";
import woma from "./fixtures/woma-layout.json";

afterEach(()=>setWorldLayouts({}));
function arena(charge:"firesword"|"powerstrike"|null="firesword"){
  setWorldLayouts({});const g=new Game();g.start("test",176,"warrior");
  g.test.spawning=false;g.test.god=false;g.upgrades.accuracy=100;g.recompute();
  g.skills=charge ? [g.newSkill(charge)] : [];g.charges=charge ? {[charge]:true} : {};
  const enemy=(x:number,elite=false,kind="orc")=>{const e=g.spawnEnemy(kind,true);
    Object.assign(e,{x:g.player.x+x,y:g.player.y,hp:10000,maxHp:10000,elite,speed:0,attackCD:Infinity,shockCD:Infinity,bossSummonCD:Infinity});return e;};
  return {g,enemy};
}

it("spends the next fire swing on a reachable elite before a closer ordinary foe",()=>{
  const {g,enemy}=arena(),ordinary=enemy(20),elite=enemy(40,true);
  expect(g.basicAttack()).toBe(true);
  expect(elite.hp).toBeLessThan(10000);expect(ordinary.hp).toBe(10000);
  expect(g.charges).toEqual({});expect(g.damageDealt.firesword).toBeGreaterThan(0);
});

it("keeps a reachable Boss ahead of an even closer elite",()=>{
  const {g,enemy}=arena(),elite=enemy(20,true),boss=enemy(40,false,"womaLord");g.basicAttack();
  expect(boss.hp).toBeLessThan(10000);expect(elite.hp).toBe(10000);
});

it("uses distance only to break ties between reachable elites",()=>{
  const {g,enemy}=arena(),ordinary=enemy(10),far=enemy(42,true),near=enemy(30,true);g.basicAttack();
  expect(near.hp).toBeLessThan(10000);expect(far.hp).toBe(10000);expect(ordinary.hp).toBe(10000);
});

it("does not chase an elite outside the actual fire swing range",()=>{
  const {g,enemy}=arena(),ordinary=enemy(20),elite=enemy(80,true);g.basicAttack();
  expect(ordinary.hp).toBeLessThan(10000);expect(elite.hp).toBe(10000);
});

it("applies the same elite priority through a real automatic preparation and fixed step",()=>{
  const {g,enemy}=arena(),ordinary=enemy(20),elite=enemy(40,true);g.charges={};g.skills[0].cd=0;
  g.step(1/60);expect(elite.hp).toBeLessThan(10000);expect(ordinary.hp).toBe(10000);
  expect(g.charges).toEqual({});expect(g.damageDealt.firesword).toBeGreaterThan(0);
});

it("filters a wall before assigning fire priority, retaining a reachable ordinary swing",()=>{
  // Thin-wall fixture: both feet remain legal inside the real 48px swing range.
  const walk=Array(46*192).fill(1);for(let x=0;x<46;x++)walk[40*46+x]=0;
  setWorldLayouts({mine:{width:2208,height:1536,cellWidth:48,cellHeight:8,walk,tiles:[],objects:[],spawn:{x:504,y:304}}});
  const g=new Game();g.start("test",176,"warrior",false,"mine");g.skills=[g.newSkill("firesword")];g.charges={firesword:true};
  g.upgrades.accuracy=100;g.recompute();Object.assign(g.player,{x:504,y:304});
  const ordinary=g.spawnEnemy("orc",true),elite=g.spawnEnemy("orc",true);
  Object.assign(ordinary,{x:524,y:304,hp:10000,maxHp:10000});Object.assign(elite,{x:504,y:344,hp:10000,maxHp:10000,elite:true});
  expect(g.canStand(elite.x,elite.y)).toBe(true);expect(g.attackLineClear(g.player,elite)).toBe(false);
  g.basicAttack();expect(ordinary.hp).toBeLessThan(10000);expect(elite.hp).toBe(10000);
});

it.each([null,"powerstrike"] as const)("keeps ordinary nearest targeting without a fire charge: %s",charge=>{
  const {g,enemy}=arena(charge),ordinary=enemy(20),elite=enemy(40,true);g.basicAttack();
  expect(ordinary.hp).toBeLessThan(10000);expect(elite.hp).toBe(10000);
});

it("consumes a missed fire swing once without falling back to a second ordinary target",()=>{
  const {g,enemy}=arena(),ordinary=enemy(20),elite=enemy(40,true);
  g.upgrades.accuracy=0;g.recompute();g.rng.next=()=>.99;g.basicAttack();
  expect(g.charges).toEqual({});expect(g.basicCD).toBeGreaterThan(0);
  expect(elite.hp).toBe(10000);expect(ordinary.hp).toBe(10000);expect(g.damageDealt.firesword??0).toBe(0);
});

it("preserves the same single swing damage, attribution and cooldown when the target is an elite",()=>{
  const a=arena(),b=arena();const elite=a.enemy(40,true),ordinary=b.enemy(40);
  a.g.basicAttack();b.g.basicAttack();expect(elite.hp).toBe(ordinary.hp);
  expect(a.g.damageDealt).toEqual(b.g.damageDealt);expect(a.g.basicCD).toBe(b.g.basicCD);
  expect(a.g.projectiles).toHaveLength(0);
});

it("runs the real Woma fire-priority sample without immunity, rewards or normal-mode grants",()=>{
  setWorldLayouts({woma});const g=new Game();g.start("test",176,"warrior");
  expect(testFirePriority(g)).toBe(true);const sample=g.test.firePrioritySample!;
  expect(sample.elite.hp).toBeLessThan(2000);expect(sample.ordinary.hp).toBe(2000);
  expect(g.phase).toBe("paused");expect(g.test.god).toBe(false);expect(g.mapId).toBe("woma");
  expect(g.canStand(sample.elite.x,sample.elite.y)).toBe(true);expect(g.canStand(sample.ordinary.x,sample.ordinary.y)).toBe(true);
  expect(g.gold).toBe(0);expect(g.exp).toBe(0);expect(g.kills).toBe(0);expect(g.drops).toHaveLength(0);
  g.finish(false);expect(testFirePriority(g)).toBe(false);
  const normal=new Game();normal.start("normal",176,"warrior",false,"biche");const id=normal.runId;
  expect(testFirePriority(normal)).toBe(false);expect(normal.runId).toBe(id);
});
