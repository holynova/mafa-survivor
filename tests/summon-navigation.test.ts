import {afterEach,expect,it} from "vitest";
import {Game} from "../src/game";
import {setWorldLayouts} from "../src/world";
import {testSummonWall} from "../src/test-mode";
import mine from "./fixtures/mine-layout.json";

afterEach(()=>setWorldLayouts({}));
function arena(door=false){
 const walk=Array.from({length:46*48},(_,i)=>i%46===12 && !(door && Math.floor(i/46)===20) ? 0 : 1);
 setWorldLayouts({mine:{width:2208,height:1536,cellWidth:48,cellHeight:32,walk,tiles:[],objects:[],spawn:{x:500,y:480}}});
 const g=new Game();g.start("test",176,"taoist",false,"mine");g.test.spawning=false;g.basicCD=Infinity;
 const s=g.newSkill("beast");s.cd=0;g.skills=[s];g.cast(s);s.cd=999;
 const pet=g.pets[0];Object.assign(pet,{x:550,y:480,cd:0});
 const enemy=(x:number,y:number)=>{const e=g.spawnEnemy("zombie");Object.assign(e,{x,y,hp:10000,maxHp:10000,speed:0,attackCD:999});return e;};
 return {g,pet,enemy};
}
it("ignores a disconnected enemy and breathes at a visible target instead",()=>{
 const {g,pet,enemy}=arena(),blocked=enemy(650,480),visible=enemy(550,600);
 expect(g.navigation!.connected(pet,blocked)).toBe(false);g.step(1/60);
 expect(blocked.hp).toBe(10000);expect(visible.hp).toBeLessThan(10000);
 expect(g.effects.some(e=>e.kind==="beastflame")).toBe(true);
});
it("checks every enemy in the fire cone, including a secondary target behind a wall",()=>{
 const {g,pet,enemy}=arena();pet.x=530;const visible=enemy(560,480),blocked=enemy(650,480);
 expect(g.attackLineClear(pet,visible)).toBe(true);expect(g.attackLineClear(pet,blocked)).toBe(false);
 g.step(1/60);expect(visible.hp).toBeLessThan(10000);expect(blocked.hp).toBe(10000);
});
it("walks toward the doorway instead of attacking a nearby connected target through the wall",()=>{
 const {g,pet,enemy}=arena(true),blocked=enemy(650,480),before=pet.y;
 expect(g.navigation!.connected(pet,blocked)).toBe(true);expect(g.attackLineClear(pet,blocked)).toBe(false);
 g.step(1/60);expect(blocked.hp).toBe(10000);expect(pet.y).toBeGreaterThan(before);expect(pet.moving).toBe(true);
 expect(g.effects.some(e=>e.kind==="beastflame")).toBe(false);
});
it("recovers a stranded summon onto legal ground connected to its owner",()=>{
 const {g,pet}=arena();pet.x=650;expect(g.navigation!.connected(pet,g.player)).toBe(false);
 g.step(1/60);expect(g.navigation!.connected(pet,g.player)).toBe(true);expect(g.canStand(pet.x,pet.y)).toBe(true);
});
it("runs the actual flame against the source mine wall without changing normal runs",()=>{
 setWorldLayouts({mine});const g=new Game();g.start("test",176,"wizard");
 expect(testSummonWall(g)).toBe(true);expect(g.classId).toBe("taoist");expect(g.mapId).toBe("mine");expect(g.phase).toBe("paused");
 expect(g.enemies[0].hp).toBe(g.enemies[0].maxHp);expect(g.enemies[1].hp).toBeLessThan(g.enemies[1].maxHp);
 expect(g.effects.some(e=>e.kind==="beastflame")).toBe(true);
 const normal=new Game();normal.start("normal");const run=normal.runId;expect(testSummonWall(normal)).toBe(false);expect(normal.runId).toBe(run);
});
