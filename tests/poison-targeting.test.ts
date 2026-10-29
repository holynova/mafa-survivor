import {expect,it} from "vitest";
import {Game} from "../src/game";
function arena(){const g=new Game();g.start("test",176,"taoist");g.test.spawning=false;g.basicCD=Infinity;g.rng.next=()=>.5;
 const s=g.newSkill("poison");s.cd=0;g.skills=[s];
 const enemy=(dx:number)=>{const e=g.spawnEnemy("orc");Object.assign(e,{x:g.player.x+dx,y:g.player.y,hp:10000,maxHp:10000,speed:0,attackCD:Infinity});return e;};return {g,s,enemy};}
it("spreads the next actual automatic cast instead of refreshing a healthy elite poison",()=>{
 const {g,s,enemy}=arena(),a=enemy(80),b=enemy(130);a.elite=true;g.cast(s);const until=a.greenPoison!.until;
 for(let i=0;i<250;i++)g.step(1/60);
 expect(b.greenPoison).toBeDefined();expect(a.greenPoison!.until).toBe(until);
});
it("does not spend cooldown or roll a new poison when all visible targets are covered",()=>{
 const {g,s,enemy}=arena(),e=enemy(100);g.cast(s);const poison={...e.greenPoison!},seed=g.rng.seed;
 s.cd=0;g.cast(s);expect(s.cd).toBe(0);expect(s.retryAt).toBeGreaterThan(g.clock);expect(e.greenPoison).toEqual(poison);expect(g.rng.seed).toBe(seed);
});
it("refreshes an expiring Boss before an unpoisoned ordinary enemy without restarting ticks",()=>{
 const {g,s,enemy}=arena(),boss=enemy(130);boss.kind="boss";enemy(80);boss.greenPoison={until:.5,tickAt:.25,damage:6};
 g.cast(s);expect(boss.greenPoison!.until).toBe(6);expect(boss.greenPoison!.tickAt).toBe(.25);
 g.skills=[];for(let i=0;i<16;i++)g.step(1/60);expect(g.damageDealt.poison).toBe(6);expect(boss.greenPoison!.tickAt).toBe(1.25);
});
it("tracks the chosen red or green poison independently and retains the per-cast target cap",()=>{
 const {g,s,enemy}=arena(),a=enemy(80),b=enemy(120),c=enemy(160),d=enemy(190);s.count=99;
 g.cast(s);expect([a,b,c,d].filter(e=>e.greenPoison)).toHaveLength(3);
 g.setPoisonMode("red");s.cd=0;g.cast(s);expect([a,b,c,d].filter(e=>e.redPoison)).toHaveLength(3);
 expect([a,b,c,d].every(e=>(e.redPoison?.reduction??0)<=.35)).toBe(true);
});
