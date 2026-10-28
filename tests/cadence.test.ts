import {expect,it} from "vitest";
import {Game} from "../src/game";
import {getSkill} from "../src/content";
function arena(){const g=new Game();g.start("test",176,"wizard");g.test.spawning=false;g.skills=[];g.basicCD=Infinity;g.rng.next=()=>.5;
 const e=g.spawnEnemy("orc");Object.assign(e,{x:g.player.x+150,y:g.player.y,hp:10000,maxHp:10000,magicDefense:0,speed:0});return {g,e};}
it("casts lightning 25 percent more frequently with proportionally smaller hits",()=>{
 const {g,e}=arena(),s=g.newSkill("lightning");s.cd=0;g.skills=[s];g.cast(s);
 expect(s.cd).toBeCloseTo(1.08);expect(10000-e.hp).toBe(16);
 expect((10000-e.hp)/s.cd).toBeCloseTo(20/1.35,6);
});
it("keeps defensive uptime unchanged and does not speed up holy executions",()=>{
 expect(getSkill("shield").cooldown).toBe(15);expect(getSkill("holy").cooldown).toBe(7.5);
});
it("keeps the cooldown floor proportional under maximal global and local CDR",()=>{
 const {g}=arena(),s=g.newSkill("lightning");s.cd=0;s.localCDR=60;g.skills=[s];g.upgrades.cooldown_reduction=100;g.recompute();g.cast(s);
 expect(s.cd).toBeCloseTo(.32);
});
