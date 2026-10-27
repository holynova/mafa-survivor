import {afterEach,expect,it,vi} from "vitest";
import {Game} from "../src/game";
import {simulationInput} from "../src/simulation";
import {setWorldLayouts} from "../src/world";
import {testMeleeWall,testSpawn} from "../src/test-mode";
import mine from "./fixtures/mine-layout.json";

afterEach(()=>{setWorldLayouts({});vi.restoreAllMocks();});

it("lets the warrior test controller close to a lone ranged target inside weapon reach",()=>{
  const g=new Game();g.start("trial",176,"warrior");
  const e=g.spawnEnemy("skeletonArcher");
  Object.assign(e,{x:g.player.x+90,y:g.player.y,speed:0});
  // Isolate this one skirmish; the complete matrix keeps real wave spawning.
  vi.spyOn(g,"spawnEnemy").mockReturnValue(e);
  let nearest=Infinity;
  for(let tick=0;tick<900 && e.hp>0;tick++) {
    if(tick%10===0)g.input=simulationInput(g,g.input);
    g.step(1/60);
    nearest=Math.min(nearest,Math.hypot(e.x-g.player.x,e.y-g.player.y));
  }
  expect(nearest).toBeLessThanOrEqual(48);
  expect(g.damageDealt.basic ?? 0).toBeGreaterThan(0);
});

it.each(["cleave","thrust"] as const)("does not cast %s through a solid source-map wall",id=>{
  const walk=Array.from({length:46*48},(_,i)=>Math.floor(i/46)===10 && i%46!==25 ? 0 : 1);
  setWorldLayouts({mine:{width:2208,height:1536,cellWidth:48,cellHeight:32,walk,tiles:[],objects:[],spawn:{x:504,y:304}}});
  const g=new Game();g.start("trial",176,"warrior",false,"mine");
  const s=g.newSkill(id);s.cd=0;g.skills=[s];g.upgrades.accuracy=100;g.recompute();
  for(const x of [504,510]) {
    const e=g.spawnEnemy("skeletonWarrior");Object.assign(e,{x,y:368,hp:100,maxHp:100,speed:0});
    expect(g.canStand(e.x,e.y)).toBe(true);
    expect(g.navigation!.lineClear(g.player,e,0)).toBe(false);
  }
  const health=g.enemies.map(e=>e.hp);
  g.cast(s);
  expect(g.enemies.map(e=>e.hp)).toEqual(health);
  expect(s.cd).toBe(0);
  expect(g.effects).toHaveLength(0);
  // The same attack and spacing work through the source-map doorway.
  g.player.x=1224;
  g.enemies.forEach((e,i)=>e.x=1224+i*6);
  g.cast(s);
  expect(g.enemies.every(e=>e.hp<100)).toBe(true);
  expect(s.cd).toBeGreaterThan(0);
});

it.each(["cleave","thrust"] as const)("lets %s aim at visible enemies instead of a wall-hidden neighbour",id=>{
  const walk=Array.from({length:46*48},(_,i)=>Math.floor(i/46)===10 && i%46!==25 ? 0 : 1);
  setWorldLayouts({mine:{width:2208,height:1536,cellWidth:48,cellHeight:32,walk,tiles:[],objects:[],spawn:{x:504,y:304}}});
  const g=new Game();g.start("trial",176,"warrior",false,"mine");
  const s=g.newSkill(id);s.cd=0;g.skills=[s];g.upgrades.accuracy=100;g.recompute();
  for(const [x,y] of [[504,368],[504,240],[510,240]]) {
    const e=g.spawnEnemy("skeletonWarrior");Object.assign(e,{x,y,hp:100,maxHp:100,speed:0});
  }
  g.cast(s);
  expect(g.enemies[0].hp).toBe(100);
  expect(g.enemies.slice(1).every(e=>e.hp<100)).toBe(true);
});

it("keeps an extended fiery swing charge until the target is reachable",()=>{
  const walk=Array.from({length:46*48},(_,i)=>Math.floor(i/46)===10 && i%46!==25 ? 0 : 1);
  setWorldLayouts({mine:{width:2208,height:1536,cellWidth:48,cellHeight:32,walk,tiles:[],objects:[],spawn:{x:504,y:304}}});
  const g=new Game();g.start("trial",176,"warrior",false,"mine");
  const s=g.newSkill("firesword");s.cd=0;s.range=48;g.skills=[s];
  const e=g.spawnEnemy("skeletonWarrior");Object.assign(e,{x:504,y:368,hp:100,maxHp:100,speed:0});
  g.cast(s);expect(g.charges.firesword).toBeUndefined();expect(s.cd).toBe(0);
  // A charge acquired earlier must also survive a blocked ordinary swing.
  g.charges.firesword=true;
  expect(g.basicAttack()).toBe(false);expect(g.charges.firesword).toBe(true);expect(e.hp).toBe(100);
  g.player.x=e.x=1224;
  expect(g.basicAttack()).toBe(true);expect(g.charges.firesword).toBeUndefined();
});

it("loads a genuine mine-wall probe and leaves both fixed enemies unharmed during real steps",()=>{
  setWorldLayouts({mine});
  const g=new Game();g.start("test",176,"warrior",false,"mine");
  const before={gold:g.gold,exp:g.exp,hp:g.player.hp};
  expect(testMeleeWall(g)).toBe(true);
  expect(g.enemies).toHaveLength(2);
  expect(g.test.spawning).toBe(false);expect(g.test.autowalk).toBe(false);
  expect(g.skills.map(s=>s.id)).toEqual(["cleave","thrust"]);
  const health=g.enemies.map(e=>e.hp);
  for(const e of g.enemies) {
    expect(Math.hypot(e.x-g.player.x,e.y-g.player.y)).toBeLessThan(70);
    expect(g.canStand(e.x,e.y)).toBe(true);
    expect(g.navigation!.connected(g.player,e)).toBe(true);
    expect(g.navigation!.lineClear(g.player,e,0)).toBe(false);
  }
  for(let tick=0;tick<180;tick++)g.step(1/60);
  expect(g.enemies.map(e=>e.hp)).toEqual(health);
  expect(g.skills.every(s=>s.cd===0)).toBe(true);
  expect({gold:g.gold,exp:g.exp,hp:g.player.hp}).toEqual(before);
});

it("pauses only test wave spawning while preserving manual spawns and normal gameplay",()=>{
  const g=new Game();g.start("test",176,"warrior");g.test.spawning=false;
  g.step(1);expect(g.enemies).toHaveLength(0);
  testSpawn(g,"skeletonArcher",1);expect(g.enemies).toHaveLength(1);
  g.test.spawning=true;g.step(0.3);expect(g.enemies).toHaveLength(2);
  for(const mode of ["normal","trial"] as const) {
    g.start(mode,176,"warrior");g.test.spawning=false;g.step(0.3);
    expect(g.enemies).toHaveLength(1);
    const origin={x:g.player.x,y:g.player.y};
    expect(testMeleeWall(g)).toBe(false);expect(g.player).toMatchObject(origin);
  }
});
