import {expect,it} from "vitest";
import {Game,type Drop} from "../src/game";
import {ITEMS} from "../src/content";
import {goldPile,dropVisuals} from "../src/loot-visual";
import {appendLoot} from "../src/loot";
import {heroPose} from "../src/hero-pose";
import {sellPrice} from "../src/rules";
import {testLootVisual,testPotionPickup,testPlayerFeedback} from "../src/test-mode";
const coin=(level=1):Drop=>({id:1,x:0,y:0,born:0,exp:2,gold:0,level});
function arena(){const g=new Game();g.start("test",176);g.test.spawning=false;g.skills=[];g.basicCD=Infinity;return g;}
it("represents experience using five original coin piles as level and value rise",()=>{
 const keys=[goldPile(coin(1)),goldPile(coin(4)),goldPile(coin(7)),goldPile(coin(10)),goldPile({...coin(12),exp:100})];
 expect(new Set(keys).size).toBe(5);expect(keys.every(k=>k.startsWith("item/金币"))).toBe(true);
 expect(dropVisuals(coin())[0].frame).toBe(keys[0]);
});
it("uses the actual equipment and blood-bottle ground icons",()=>{
 const item=ITEMS.find(i=>i.name==="木剑")!;
 expect(dropVisuals({...coin(),itemId:item.id}).some(p=>p.frame===item.icon)).toBe(true);
 expect(dropVisuals({...coin(),exp:0,heal:20})[0].frame).toBe("item/金创药（小）");
});
it("drops a small potion on a successful roll, but summoned enemies give no loot",()=>{
 const g=arena();g.rng.next=()=>0;const e=g.spawnEnemy("orc");g.hit(e,1e9,"test");
 expect(g.drops.some(d=>d.heal===20)).toBe(true);
 const other=arena();other.rng.next=()=>0;other.hit(other.spawnEnemy("orc",true),1e9,"test");expect(other.drops).toHaveLength(0);
});
it("leaves excess full-health potions on the floor, then heals and records only actual HP",()=>{
 const g=arena();g.potions.reserve=[20,20,20];g.drops=[{...coin(),x:g.player.x,y:g.player.y,exp:0,heal:20}];
 g.step(1/60);expect(g.drops).toHaveLength(1);g.player.hp=g.maxHP-7;g.step(1/60);
 expect(g.player.hp).toBe(g.maxHP);expect(g.tao.healing.bloodPotion).toBe(7);expect(g.drops).toHaveLength(0);
});
it("does not consume a potion during pause",()=>{
 const g=arena();g.player.hp=50;g.drops=[{...coin(),x:g.player.x,y:g.player.y,exp:0,heal:20}];g.pause();g.step(1);
 expect(g.player.hp).toBe(50);expect(g.drops).toHaveLength(1);
});
it("reclaims XP and half of ground currency at wave end without losing rare loot or double-crediting it",()=>{
 const g=arena(),item=ITEMS.find(i=>i.name==="木剑")!;
 expect(g.equipment.weapon).toBeDefined();g.player.hp=g.maxHP-25;
 const before={exp:g.exp,gold:g.gold,total:g.totalGold,wave:g.waveGold};
 g.drops=[{...coin(),exp:2,gold:11},{...coin(),id:2,exp:3,gold:9,itemId:item.id},{...coin(),id:3,exp:0,heal:20}];
 g.endWave();const sold=sellPrice(0,item.price);
 expect(g.exp).toBe(before.exp+5);expect(g.gold).toBe(before.gold+10+sold);
 expect(g.totalGold).toBe(before.total+10+sold);expect(g.waveGold).toBe(before.wave+10+sold);
 expect(g.player.hp).toBe(g.maxHP-5);expect(g.tao.healing.bloodPotion).toBe(20);expect(g.drops).toHaveLength(0);
});
it("compacts currency without deleting an equipment drop or any XP at the cap",()=>{
 const drops=Array.from({length:300},(_,i)=>({...coin(),id:i+1}));
 const item=ITEMS.find(i=>i.name==="木剑")!;appendLoot(drops,{...coin(),id:301,itemId:item.id});
 expect(drops).toHaveLength(300);expect(drops.reduce((n,d)=>n+d.exp,0)).toBe(602);expect(drops.some(d=>d.itemId===item.id)).toBe(true);
});
it("plays a hurt action before an ongoing swing and queues death instead of another hurt",()=>{
 const g=arena();g.test.god=false;g.clock=10;g.player.attackUntil=10.3;g.hurt(10,"physical",true);
 expect(heroPose(g,50).motion).toBe("hurt");expect(g.audioEvents).toContain("hurt");
 g.audioEvents=[];g.hurt(1e9,"physical",true);expect(g.phase).toBe("dead");expect(g.audioEvents).toContain("death");
 expect(g.audioEvents).not.toContain("hurt");expect(heroPose(g,50,.5)).toMatchObject({motion:"death",time:.5});
});
it("critical feedback cannot be discarded by a full spell-sound queue",()=>{
 const g=arena();for(let i=0;i<30;i++)g.sound("fireball");g.sound("hurt");g.sound("death");g.sound("hurt");
 expect(g.audioEvents.length).toBeLessThanOrEqual(24);expect(g.audioEvents).toContain("death");
 expect(g.audioEvents).not.toContain("hurt");
});
it("runs visible loot, actual-pickup and injury/death scenarios without ordinary rewards",()=>{
 const g=arena();expect(testLootVisual(g)).toBe(true);expect(g.phase).toBe("paused");expect(g.drops).toHaveLength(9);
 expect(testPotionPickup(g)).toBe(true);expect(g.tao.healing.bloodPotion).toBe(7);expect(g.drops).toHaveLength(0);expect(g.potions.reserve).toEqual([20,20]);
 expect(testPlayerFeedback(g)).toBe(true);expect(g.player.hp).toBeLessThan(g.maxHP);expect(g.phase).toBe("paused");
 expect(testPlayerFeedback(g,true)).toBe(true);expect(g.player.hp).toBe(0);expect(g.result?.mode).toBe("test");expect(g.result?.crystals).toBe(0);
 const normal=new Game();normal.start("normal");const id=normal.runId;expect(testLootVisual(normal)).toBe(false);expect(testPlayerFeedback(normal,true)).toBe(false);expect(normal.runId).toBe(id);
});
