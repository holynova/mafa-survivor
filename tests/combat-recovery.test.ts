import {afterEach,expect,it} from "vitest";
import {Game} from "../src/game";
import {ITEMS,getItem} from "../src/content";
import {testCombatRecovery} from "../src/test-mode";
import {updateTaoist} from "../src/taoist";
import {setWorldLayouts} from "../src/world";
import biche from "./fixtures/biche-layout.json";
import mine from "./fixtures/mine-layout.json";
import woma from "./fixtures/woma-layout.json";
import zuma from "./fixtures/zuma-layout.json";
import legacy from "./fixtures/passive-ids-alpha12.json";

afterEach(()=>setWorldLayouts({}));

function setup(classId:"warrior"|"wizard"|"taoist"="warrior") {
  const g=new Game();g.start("test",176,classId);g.test.spawning=false;g.skills=[];
  g.player.hp=40;Object.assign(g.upgrades,{lifesteal:3,accuracy:100});g.recompute();return g;
}
function enemy(g:Game,hp=1000,summoned=false) {
  const e=g.spawnEnemy("skeleton",summoned);
  Object.assign(e,{x:g.player.x+35,y:g.player.y,hp,maxHp:hp,speed:0});return e;
}

it("preserves all persisted passive IDs and adds priced, capped recovery items",()=>{
  for(const [id,name] of Object.entries(legacy))expect(getItem(id).name).toBe(name);
  const kill=ITEMS.find(i=>i.name==="击杀回复强化"),steal=ITEMS.find(i=>i.name==="生命偷取强化");
  expect(kill).toMatchObject({id:"passive-25",price:150,tier:2,maxCount:5,stats:{hp_on_kill:0.2}});
  expect(steal).toMatchObject({id:"passive-26",price:225,tier:3,maxCount:3,stats:{lifesteal:1}});
});

it.each(["击杀回复强化","生命偷取强化"])("enforces %s purchase limits through actual shop transactions",name=>{
  const g=setup();g.upgrades={};g.recompute();g.phase="shop";g.gold=5000;
  const item=ITEMS.find(i=>i.name===name)!;expect(item).toBeDefined();
  for(let i=0;i<item.maxCount!;i++) {
    g.offers=[{id:100+i,itemId:item.id,price:item.price,locked:false,sold:false}];
    expect(g.buy(100+i)).toBe(true);
  }
  expect(g.validItem(item)).toBe(false);
  g.offers=[{id:200,itemId:item.id,price:item.price,locked:false,sold:false}];
  const gold=g.gold;expect(g.buy(200)).toBe(false);expect(g.gold).toBe(gold);
});

it("leeches once from the actual combined ordinary, power and fire swing",()=>{
  const g=setup();const e=enemy(g);
  g.skills=[g.newSkill("powerstrike"),g.newSkill("firesword")];
  for(const s of g.skills){s.cd=0;g.cast(s);}
  const before=g.player.hp;expect(g.basicAttack()).toBe(true);
  const actual=1000-e.hp;
  expect(g.player.hp-before).toBeCloseTo(actual*0.03);
  expect(Object.values(g.damageDealt).reduce((a,b)=>a+b,0)).toBeCloseTo(actual);
});

it("reduces actual spell lifesteal to one third through the real lightning cast",()=>{
  const g=setup("wizard"),e=enemy(g),s=g.newSkill("lightning");s.cd=0;g.skills=[s];
  g.cast(s);const actual=1000-e.hp;expect(actual).toBeGreaterThan(0);
  expect(g.player.hp-40).toBeCloseTo(actual*0.03/3);
});

it("uses effective damage rather than overkill and does not recover twice from a dead enemy",()=>{
  const g=setup(),e=enemy(g,2);
  g.basicAttack();expect(g.player.hp-40).toBeCloseTo(2*0.03);
  const hp=g.player.hp;g.hit(e,10000,"basic","direct","weapon");expect(g.player.hp).toBe(hp);
});

it("does not overheal and records only the health actually restored",()=>{
  const g=setup();enemy(g);g.player.hp=g.maxHP-0.01;
  g.basicAttack();expect(g.player.hp).toBe(g.maxHP);
  g.finish(false);expect(g.result?.combatHealing?.lifeSteal).toBeCloseTo(0.01);
});

it("shares kill cooldown and caps a rolling second at five actual health",()=>{
  const g=setup();Object.assign(g.upgrades,{lifesteal:0,hp_on_kill:1});g.recompute();
  const kill=()=>g.hit(enemy(g,1),100,"basic","direct","weapon");
  kill();kill();expect(g.player.hp).toBe(41);
  for(const clock of [0.1,0.2,0.3,0.4]){g.clock=clock;kill();}
  expect(g.player.hp).toBe(45);
  g.clock=0.6;kill();expect(g.player.hp).toBe(45);
  g.pause();g.step(5);expect(g.clock).toBe(0.6);g.pause();
  g.clock=1;kill();expect(g.player.hp).toBe(46);
  g.finish(false);expect(g.result?.combatHealing?.onKill).toBe(6);
});

it("does not convert execution health into lifesteal, but credits its eligible kill",()=>{
  const g=setup("wizard"),e=enemy(g),s=g.newSkill("holy");s.cd=0;g.skills=[s];
  Object.assign(g.upgrades,{hp_on_kill:0.2});g.recompute();g.rng.next=()=>0;
  g.cast(s);expect(e.hp).toBeLessThanOrEqual(0);expect(g.player.hp).toBeCloseTo(40.2);
});

it.each(["skeleton","beast"] as const)("does not let %s leech for its owner, while crediting its normal kill",source=>{
  const g=setup("taoist"),e=enemy(g),s=g.newSkill(source);s.cd=0;g.skills=[s];e.x=g.player.x+100;g.cast(s);
  for(const pet of g.pets)Object.assign(pet,{x:e.x-20,y:e.y,cd:0});
  g.step(0.1);expect(e.hp).toBeLessThan(1000);expect(g.player.hp).toBe(40);
  Object.assign(g.upgrades,{hp_on_kill:0.2});g.recompute();e.hp=1;
  for(const pet of g.pets)pet.cd=0;
  g.step(0.1);expect(e.hp).toBeLessThanOrEqual(0);expect(g.player.hp).toBeCloseTo(40.2);
});

it("never recovers health from a Boss reinforcement hit or kill",()=>{
  const g=setup();Object.assign(g.upgrades,{hp_on_kill:1});g.recompute();const e=enemy(g,2,true);
  g.basicAttack();expect(e.hp).toBeLessThanOrEqual(0);expect(g.player.hp).toBe(40);
  expect(g.drops).toHaveLength(0);
});

it("scales real green poison ticks as spell damage without repeating a tick",()=>{
  const g=setup("taoist"),e=enemy(g),s=g.newSkill("poison");s.cd=0;g.skills=[s];g.cast(s);
  g.clock=1;updateTaoist(g);const actual=1000-e.hp;
  expect(actual).toBeGreaterThan(0);expect(g.player.hp-40).toBeCloseTo(actual*0.03/3);
  const hp=g.player.hp;updateTaoist(g);expect(g.player.hp).toBe(hp);
});

it("does not recover while paused, and a new run resets totals and kill cooldown",()=>{
  const g=setup();Object.assign(g.upgrades,{lifesteal:0,hp_on_kill:1});g.recompute();
  g.hit(enemy(g,1),100,"basic","direct","weapon");g.pause();
  const e=enemy(g,1);g.hit(e,100,"basic","direct","weapon");expect(e.hp).toBe(1);expect(g.player.hp).toBe(41);
  g.start("test",176,"warrior");g.player.hp=40;Object.assign(g.upgrades,{hp_on_kill:1});g.recompute();
  g.hit(enemy(g,1),100,"basic","direct","weapon");expect(g.player.hp).toBe(41);
  g.finish(false);expect(g.result?.combatHealing).toEqual({onKill:1,lifeSteal:0});
});


it("leeches from each actual half-moon target using its physical damage",()=>{
  const g=setup(),a=enemy(g),b=enemy(g),s=g.newSkill("cleave");
  b.x+=5;b.y+=5;s.cd=0;g.skills=[s];g.cast(s);
  const actual=2000-a.hp-b.hp;
  expect(actual).toBeGreaterThan(0);expect(g.player.hp-40).toBeCloseTo(actual*0.03);
});

it.each(["wizard","warrior","taoist"] as const)("runs the visible recovery sample for %s through real purchases and fixed combat steps",classId=>{
  const g=setup(classId);expect(testCombatRecovery(g)).toBe(true);
  expect(g.phase).toBe("paused");expect(g.kills).toBe(1);expect(g.gold).toBe(575);
  expect(g.stats.hp_on_kill).toBe(1);expect(g.stats.lifesteal).toBe(3);
  expect(g.player.hp-g.maxHP/2).toBeCloseTo(g.combatRecovery.healing.onKill+g.combatRecovery.healing.lifeSteal);
  expect(g.combatRecovery.healing.onKill).toBe(1);expect(g.combatRecovery.healing.lifeSteal).toBeGreaterThan(0);
  expect(g.result).toBeNull();
  g.start("normal",176,classId);const before=JSON.stringify({player:g.player,phase:g.phase,gold:g.gold});
  expect(testCombatRecovery(g)).toBe(false);expect(JSON.stringify({player:g.player,phase:g.phase,gold:g.gold})).toBe(before);
});

it.each(["wizard","warrior","taoist"] as const)("offers recovery items in legal midgame stock for %s, with no epic item in opening stock",classId=>{
  const g=new Game();g.start("normal",176,classId);const seen=new Set<string>();
  for(let i=0;i<120;i++) {
    g.wave=1;g.generateOffers(false);
    expect(g.offers.every(o=>!["passive-25","passive-26"].includes(o.itemId))).toBe(true);
    g.wave=3;g.generateOffers(false);g.offers.forEach(o=>seen.add(o.itemId));
  }
  expect(seen.has("passive-25")).toBe(true);expect(seen.has("passive-26")).toBe(true);
});


it.each(["biche","mine","woma","zuma"] as const)("runs the recovery sample at legal source-map positions in %s for all classes",mapId=>{
  setWorldLayouts({biche,mine,woma,zuma});
  for(const classId of ["wizard","warrior","taoist"] as const) {
    const g=new Game();g.start("test",176,classId,false,mapId);
    expect(testCombatRecovery(g)).toBe(true);expect(g.phase).toBe("paused");
    expect(g.canStand(g.player.x,g.player.y)).toBe(true);
    expect(g.kills).toBe(1);expect(g.combatRecovery.healing.onKill).toBe(1);
    expect(g.player.hp).toBeLessThanOrEqual(g.maxHP);expect(g.result).toBeNull();
  }
});
