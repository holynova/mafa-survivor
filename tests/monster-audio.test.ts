import {afterEach,expect,it} from "vitest";
import {Game} from "../src/game";
import {setWorldLayouts} from "../src/world";
import {testMonsterAudio} from "../src/test-mode";
import woma from "./fixtures/woma-layout.json";

afterEach(()=>setWorldLayouts({}));
function arena(kind="orc",distance=25){
 setWorldLayouts({});const g=new Game();g.start("test",176,"warrior");g.test.spawning=false;g.test.god=false;g.skills=[];g.basicCD=Infinity;
 const e=g.spawnEnemy(kind);Object.assign(e,{x:g.player.x+distance,y:g.player.y,speed:0,attackCD:0,chargeCD:Infinity,bossSummonCD:Infinity});return {g,e};
}
it("emits an original monster attack on windup, not every following frame",()=>{
 const {g}=arena();g.step(1/60);expect(g.audioEvents).toContain("monster:orc:attack");
 g.step(1/60);expect(g.audioEvents.filter(k=>k==="monster:orc:attack")).toHaveLength(1);
});
it("emits real nonlethal hurt and a single death, including unrewarded reinforcements",()=>{
 const {g,e}=arena();e.summoned=true;g.hit(e,1,"test");expect(g.audioEvents).toContain("monster:orc:hurt");
 g.hit(e,10000,"test");expect(g.audioEvents).toContain("monster:orc:death");expect(g.audioEvents).not.toContain("monster:orc:hurt");
 g.hit(e,10000,"test");expect(g.audioEvents.filter(k=>k==="monster:orc:death")).toHaveLength(1);expect(g.drops).toHaveLength(0);
});
it.each(["spider","womaLord","chulong","redMoon","corpseKing","boss"])("emits %s ranged or Boss attack at its real warning",kind=>{
 const {g,e}=arena(kind,100);Object.assign(e,{rangedCD:0,shockCD:0,stompCD:0,bossJumpCD:0,awakenAt:0});
 g.step(1/60);expect(g.audioEvents).toContain(`monster:${kind}:attack`);
});
it("does not play zero damage, distant monster hits, or crowd spam over player feedback",()=>{
 const {g,e}=arena("orc",650);g.hit(e,0,"test");g.hit(e,1,"test");expect(g.audioEvents).toEqual([]);
 e.x=g.player.x+20;for(let i=0;i<50;i++)g.hit(e,.01,"test");
 expect(g.audioEvents.filter(k=>k==="monster:orc:hurt")).toHaveLength(1);
 for(let i=0;i<30;i++)g.sound(`skill-${i}`);g.sound("death");expect(g.audioEvents).toContain("death");expect(g.audioEvents.length).toBeLessThanOrEqual(24);
});
it.each(["attack","hurt","death"] as const)("runs the original-map %s test through real game events without normal-mode rewards",event=>{
 setWorldLayouts({woma});const g=new Game();g.start("test");expect(testMonsterAudio(g,"orc",event)).toBe(true);
 expect(g.audioEvents).toContain(`monster:orc:${event}`);expect(g.phase).toBe("paused");expect(g.test.god).toBe(false);
 expect(g.gold).toBe(0);expect(g.exp).toBe(0);expect(g.drops).toHaveLength(0);
 const normal=new Game();normal.start("normal");const id=normal.runId;expect(testMonsterAudio(normal,"orc",event)).toBe(false);expect(normal.runId).toBe(id);
});
