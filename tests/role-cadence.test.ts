import {afterEach,expect,it} from "vitest";
import {Game} from "../src/game";
import {setWorldLayouts} from "../src/world";
import woma from "./fixtures/woma-layout.json";
import {testRoleCadence} from "../src/test-mode";
afterEach(()=>setWorldLayouts({}));
function arena(classId:"warrior"|"taoist"){
 const g=new Game();g.start("test",176,classId);g.test.spawning=false;g.equipment={};g.recompute();g.skills=[];g.basicCD=Infinity;g.rng.next=()=>.5;
 const enemy=(dx:number)=>{const e=g.spawnEnemy("orc");Object.assign(e,{x:g.player.x+dx,y:g.player.y,hp:10000,maxHp:10000,defense:0,speed:0,attackCD:Infinity});return e;};
 return {g,enemy};
}
it.each([
 ["cleave",40,55,13,1.76,15,2.4],
 ["thrust",40,90,16,1.68,18,2.16],
] as const)("%s trades smaller actual hits for a faster, bounded cadence",(id,x1,x2,hit,cd,oldHit,oldCD)=>{
 const {g,enemy}=arena("warrior"),a=enemy(x1),b=enemy(x2),s=g.newSkill(id);s.cd=0;g.skills=[s];g.cast(s);
 expect(10000-a.hp).toBe(hit);expect(10000-b.hp).toBe(hit);expect(s.cd).toBeCloseTo(cd);
 expect(hit).toBeLessThan(oldHit);expect(hit/cd).toBeGreaterThan(oldHit/oldCD);expect(hit/cd/(oldHit/oldCD)).toBeLessThan(1.25);
 expect(g.damageDealt[id]).toBe(hit*2);
});
it.each(["warrior","taoist"] as const)("runs the %s cadence sample through real casts on legal source floor",classId=>{
 setWorldLayouts({woma});const g=new Game();g.start("test",176,classId);
 expect(testRoleCadence(g)).toBe(true);expect(g.phase).toBe("paused");expect(g.enemies).toHaveLength(3);
 expect(g.enemies.every(e=>g.canStand(e.x,e.y)&&g.attackLineClear(g.player,e))).toBe(true);
 g.pause();for(let tick=0;tick<265;tick++)g.step(1/60);
 expect(g.damageDealt[classId==="warrior" ? "cleave" : "talisman"]).toBeGreaterThan(0);
 if(classId==="taoist")expect(g.enemies.filter(e=>(e.greenPoison?.until??0)>g.clock)).toHaveLength(2);
 const normal=new Game();normal.start("normal",176,classId);const id=normal.runId;
 expect(testRoleCadence(normal)).toBe(false);expect(normal.runId).toBe(id);
});
it("talisman fires a smaller real homing projectile more often, without adding extra targets",()=>{
 const {g,enemy}=arena("taoist"),e=enemy(120),s=g.newSkill("talisman");s.cd=0;g.skills=[s];g.cast(s);
 expect(g.projectiles).toHaveLength(1);expect(g.projectiles[0].damage).toBe(10);expect(s.cd).toBe(.88);
 g.skills=[];for(let i=0;i<45;i++)g.step(1/60);expect(10000-e.hp).toBe(10);
 expect(10/.88).toBeGreaterThan(12/1.12);expect(10/.88/(12/1.12)).toBeLessThan(1.2);
});
