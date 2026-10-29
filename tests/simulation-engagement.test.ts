import {afterEach,expect,it} from "vitest";
import {Game} from "../src/game";
import {simulationInput} from "../src/simulation";
import {setWorldLayouts} from "../src/world";
import redmoon from "./fixtures/redmoon-layout.json";
import woma from "./fixtures/woma-layout.json";
import {testBossEngagement,testMeleeDodge,testFootOcclusion} from "../src/test-mode";

afterEach(()=>setWorldLayouts({}));
function arena(classId:"wizard"|"warrior"|"taoist"){
 setWorldLayouts({});const g=new Game();g.start("test",176,classId);g.test.spawning=false;g.basicCD=Infinity;
 const boss=g.spawnEnemy("redMoon");Object.assign(boss,{x:g.player.x+450,y:g.player.y,hp:100000,maxHp:100000,speed:0,stompCD:Infinity});
 return {g,boss};
}
it.each(["wizard","taoist"] as const)("%s approaches a stationary Boss and deals real spell damage within 8 seconds",classId=>{
 const {g,boss}=arena(classId);
 for(let tick=0;tick<480;tick++){if(tick%10===0)g.input=simulationInput(g,g.input);g.step(1/60);}
 expect(boss.hp).toBeLessThan(boss.maxHp);expect(g.damageDealt[classId==="wizard" ? "fireball" : "talisman"]??0).toBeGreaterThan(0);
});
it("a warrior leaves a committed nearby melee swing instead of waiting for another attack",()=>{
 const {g,boss}=arena("warrior");boss.kind="boss";boss.x=g.player.x+40;boss.windup=.5;boss.speed=0;g.basicCD=0;
 const input=simulationInput(g);expect(Math.hypot(input.x,input.y)).toBeGreaterThan(.9);
 expect(input.x).toBeLessThan(0);
 g.test.god=false;g.rng.next=()=>.99;const hp=g.player.hp;
 for(let tick=0;tick<36;tick++){if(tick%10===0)g.input=simulationInput(g,g.input);g.step(1/60);}
 expect(g.player.hp).toBe(hp);
});
it("a warrior approaches an ordinary moving target before its windup",()=>{
 const {g}=arena("warrior");g.enemies=[];const e=g.spawnEnemy("orc");Object.assign(e,{x:g.player.x+80,y:g.player.y,speed:100,windup:0});g.basicCD=0;
 expect(simulationInput(g).x).toBeGreaterThan(0);
});
it.each(["wizard","warrior","taoist"] as const)("%s navigates the actual redmoon floor to attack a stationary Boss",classId=>{
 setWorldLayouts({redmoon});const g=new Game();g.start("test",176,classId,false,"redmoon");g.test.spawning=false;
 const point=g.navigation!.reachablePoints(g.player,380,500).find(p=>!g.attackLineClear(g.player,p));expect(point).toBeDefined();
 const boss=g.spawnEnemy("redMoon");Object.assign(boss,point,{hp:100000,maxHp:100000,stompCD:Infinity});
 for(let tick=0;tick<1800;tick++) {if(tick%10===0)g.input=simulationInput(g,g.input);g.step(1/60);expect(g.canStand(g.player.x,g.player.y)).toBe(true);}
 expect(boss.hp).toBeLessThan(boss.maxHp);
});
it("runs the visible Boss engagement sample through legal movement and actual attacks",()=>{
 setWorldLayouts({redmoon});const g=new Game();g.start("test",176);expect(testBossEngagement(g)).toBe(true);
 expect(g.test.god).toBe(false);expect(g.test.autowalk).toBe(true);expect(g.phase).toBe("paused");g.pause();
 const hp=g.boss!.hp;for(let tick=0;tick<720;tick++){if(tick%10===0)g.input=simulationInput(g,g.input);g.step(1/60);}
 expect(g.boss!.hp).toBeLessThan(hp);
});
it("evades the real source-map close swing with invulnerability disabled",()=>{
 setWorldLayouts({woma});const g=new Game();g.start("test",176);expect(testMeleeDodge(g)).toBe(true);
 expect(g.classId).toBe("warrior");expect(g.test.god).toBe(false);g.pause();const hp=g.player.hp;
 for(let tick=0;tick<42;tick++){if(tick%10===0)g.input=simulationInput(g,g.input);g.step(1/60);}
 expect(g.player.hp).toBe(hp);expect(g.damageTaken.physical).toBe(0);
 const normal=new Game();normal.start("normal");const id=normal.runId;expect(testMeleeDodge(normal)).toBe(false);expect(testBossEngagement(normal)).toBe(false);expect(normal.runId).toBe(id);
});
it("keeps the original ledge visual probe on legal source floor and out of normal runs",()=>{
 setWorldLayouts({redmoon});const g=new Game();g.start("test");expect(testFootOcclusion(g)).toBe(true);
 expect(g.canStand(g.player.x,g.player.y)).toBe(true);expect(g.player).toMatchObject({x:696,y:880});expect(g.phase).toBe("paused");
 const normal=new Game();normal.start("normal");const id=normal.runId;expect(testFootOcclusion(normal)).toBe(false);expect(normal.runId).toBe(id);
});
it("moves out of a locked ground warning even when no one-step move can clear its entire radius",()=>{
 const {g,boss}=arena("wizard");boss.x=g.player.x+225;boss.stompOrigin={x:g.player.x,y:g.player.y};boss.stompAt=g.clock+.9;
 const input=simulationInput(g);expect(Math.hypot(input.x,input.y)).toBeGreaterThan(.9);
});
it("steps sideways off the middle of a poison lane instead of standing inside it",()=>{
 const {g,boss}=arena("wizard");boss.x=g.player.x+225;
 boss.shock={origin:{x:boss.x,y:boss.y},target:{x:g.player.x-175,y:g.player.y},at:g.clock+.9,remaining:1};
 const input=simulationInput(g);expect(Math.abs(input.y)).toBeGreaterThan(.9);
});
