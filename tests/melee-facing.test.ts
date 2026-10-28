import {afterEach,expect,it} from "vitest";
import {Game} from "../src/game";
import {testMeleeFacing} from "../src/test-mode";
import mine from "./fixtures/mine-layout.json";
import {heroPose} from "../src/hero-pose";
import {setWorldLayouts} from "../src/world";

afterEach(()=>setWorldLayouts({}));

it.each(["cleave","thrust"] as const)("keeps %s facing the actually hit visible group, not the closer enemy behind a wall",id=>{
  const walk=Array.from({length:46*48},(_,i)=>Math.floor(i/46)===10 && i%46!==25 ? 0 : 1);
  setWorldLayouts({mine:{width:2208,height:1536,cellWidth:48,cellHeight:32,walk,tiles:[],objects:[],spawn:{x:504,y:304}}});
  const g=new Game();g.start("trial",176,"warrior",false,"mine");
  const s=g.newSkill(id);s.cd=0;g.skills=[s];g.upgrades.accuracy=100;g.recompute();
  for(const [x,y] of [[504,368],[504,236],[510,236]]) {
    const e=g.spawnEnemy("skeletonWarrior");Object.assign(e,{x,y,hp:100,maxHp:100,speed:0});
  }
  g.cast(s);
  expect(g.enemies[0].hp).toBe(100);
  expect(g.enemies.slice(1).every(e=>e.hp<100)).toBe(true);
  expect(g.effects.find(e=>e.kind===id)?.dir).toBe(0);
  expect(g.player.dir).toBe(0);
});

it("keeps the recorded swing direction while movement turns, then allows the next swing to face the new target",()=>{
  const g=new Game();g.start("test",176,"warrior");g.test.spawning=false;g.skills=[];
  g.upgrades.accuracy=100;g.recompute();
  const e=g.spawnEnemy("orc");Object.assign(e,{x:g.player.x+35,y:g.player.y,hp:1000,maxHp:1000,speed:0});
  expect(g.basicAttack()).toBe(true);
  const afterHit=e.hp;
  expect(heroPose(g,123)).toMatchObject({motion:"attack",dir:2});
  g.input={x:-1,y:0};g.step(1/60);
  expect(g.player.dir).toBe(6);expect(heroPose(g,123)).toMatchObject({motion:"attack",dir:2});
  expect(e.hp).toBe(afterHit);
  g.input={x:0,y:0};g.clock=1;g.basicCD=0;
  Object.assign(e,{x:g.player.x-35,y:g.player.y});
  expect(g.basicAttack()).toBe(true);
  expect(heroPose(g,123)).toMatchObject({motion:"attack",dir:6});
});


it("uses the same visible-facing pose through pause, expiration, death and manual action preview",()=>{
  const g=new Game();g.start("test",176,"warrior");g.test.spawning=false;g.skills=[];
  const e=g.spawnEnemy("orc");Object.assign(e,{x:g.player.x+35,y:g.player.y,speed:0});
  g.basicAttack();g.pause();g.player.dir=6;
  expect(heroPose(g,123)).toMatchObject({motion:"attack",dir:2});
  g.clock=g.player.attackUntil;
  expect(heroPose(g,123)).toMatchObject({motion:"idle",dir:6});
  g.phase="dead";g.player.hp=0;
  expect(heroPose(g,123)).toMatchObject({motion:"death",dir:6});
  g.test.pose="attack";g.test.direction=7;
  expect(heroPose(g,123)).toEqual({motion:"attack",dir:7,time:123});
});

it("loads a source-map mixed-visibility probe and pauses after the actual cleave without rewards",()=>{
  setWorldLayouts({mine});
  const g=new Game();g.start("test",176,"warrior",false,"mine");
  const before={hp:g.player.hp,gold:g.gold,exp:g.exp,kills:g.kills};
  expect(testMeleeFacing(g)).toBe(true);
  expect(g.phase).toBe("paused");expect(g.test.pose).toBe("live");
  expect(g.enemies).toHaveLength(3);expect(g.enemies[0].hp).toBe(g.enemies[0].maxHp);
  expect(g.enemies.slice(1).every(e=>e.hp<e.maxHp)).toBe(true);
  const visible=g.enemies[1],aim=g.direction(visible.x-g.player.x,visible.y-g.player.y);
  expect(g.player.dir).toBe(aim);expect(heroPose(g,123)).toMatchObject({motion:"attack",dir:aim});
  expect({hp:g.player.hp,gold:g.gold,exp:g.exp,kills:g.kills}).toEqual(before);
  const clock=g.clock;g.step(5);expect(g.clock).toBe(clock);
  g.start("trial",176,"warrior",false,"mine");
  const snapshot=JSON.stringify({player:g.player,skills:g.skills,enemies:g.enemies,phase:g.phase});
  expect(testMeleeFacing(g)).toBe(false);
  expect(JSON.stringify({player:g.player,skills:g.skills,enemies:g.enemies,phase:g.phase})).toBe(snapshot);
});
