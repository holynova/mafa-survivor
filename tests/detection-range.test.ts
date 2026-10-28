import {expect,it} from "vitest";
import {Game} from "../src/game";
import {ITEMS} from "../src/content";
function arena(distance:number){const g=new Game();g.start("test",176,"wizard");g.test.spawning=false;g.skills=[];
 const e=g.spawnEnemy("orc");Object.assign(e,{x:g.player.x+distance,y:g.player.y,hp:1000,maxHp:1000,speed:0});
 const s=g.newSkill("lightning");s.cd=0;g.skills=[s];return {g,e,s};}
it("does not acquire a target 400px away or spend a cooldown, then fires when it enters 300px",()=>{
 const {g,e,s}=arena(400);g.cast(s);expect(e.hp).toBe(1000);expect(s.cd).toBe(0);
 e.x=g.player.x+280;g.cast(s);expect(e.hp).toBeLessThan(1000);expect(s.cd).toBeGreaterThan(0);
});
it("actually buys detection upgrades, extends acquisition and respects the 450px ceiling",()=>{
 const {g,e,s}=arena(330);const item=ITEMS.find(i=>i.stats.detection_range)!;expect(item).toBeDefined();
 g.endWave();g.gold=1000;
 for(let count=0;count<3;count++){
  g.offers=[{id:500+count,itemId:item.id,price:item.price,locked:false,sold:false}];expect(g.buy(500+count)).toBe(true);
 }
 expect(g.detectionRange).toBe(450);expect(g.stats.detection_range).toBe(50);
 g.offers=[{id:600,itemId:item.id,price:item.price,locked:false,sold:false}];expect(g.buy(600)).toBe(false);
 g.nextWave();g.enemies=[e];s.cd=0;g.cast(s);expect(e.hp).toBeLessThan(1000);
});
it("offers detection as a real level-up choice and retains it in a wave checkpoint",()=>{
 const {g}=arena(200);g.mode="normal";let choice;
 for(let seed=1;seed<100;seed++){g.rng.seed=seed;g.choices=g.makeChoices();choice=g.choices.find(c=>c.stat==="detection_range");if(choice)break;}
 expect(choice).toBeDefined();g.phase="upgrade";g.choose(choice!.id);expect(g.detectionRange).toBe(360);
 g.endWave();const cp=g.snapshotCheckpoint()!;const next=new Game();next.applyProgress({crystals:0,unlockedMaps:["biche"],talents:{}});
 expect(next.resumeCheckpoint(cp)).toBe(true);expect(next.detectionRange).toBe(360);
});
