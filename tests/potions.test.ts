import {afterEach,expect,it} from "vitest";
import {Game} from "../src/game";
import {sanitizeCheckpoint} from "../src/checkpoint";
import {setWorldLayouts} from "../src/world";
import {testPotionReserve} from "../src/test-mode";
import woma from "./fixtures/woma-layout.json";
afterEach(()=>setWorldLayouts({}));
function arena(){const g=new Game();g.start("test",176,"wizard");g.test.spawning=false;g.skills=[];g.basicCD=Infinity;return g;}
it("stores only three full-health blood potions and keeps the excess source stack on the floor",()=>{
 const g=arena();g.drops=[{id:1,x:g.player.x,y:g.player.y,exp:0,gold:0,heal:20,count:5,born:0}];
 g.step(1/60);expect(g.drops[0].count).toBe(2);expect(g.potions.reserve).toEqual([20,20,20]);
 expect(g.player.hp).toBe(g.maxHP);expect(g.tao.healing.bloodPotion??0).toBe(0);
});
it("records actual manual healing, consumes the smallest sufficient bottle, and enforces the real interval",()=>{
 const g=arena();g.potions.reserve=[35,20];g.player.hp=95;
 expect(g.useBloodPotion()).toBe(true);expect(g.player.hp).toBe(100);expect(g.potions.reserve).toEqual([35]);
 expect(g.tao.healing.bloodPotion).toBe(5);expect(g.audioEvents).toContain("heal");
 g.player.hp=90;expect(g.useBloodPotion()).toBe(false);
 for(let i=0;i<121;i++)g.step(1/60);
 expect(g.useBloodPotion()).toBe(true);expect(g.player.hp).toBe(100);expect(g.tao.healing.bloodPotion).toBe(15);
});
it("automatically uses one emergency bottle at half health, then waits for both need and interval",()=>{
 const g=arena();g.potions.reserve=[20,35];g.player.hp=30;g.step(1/60);
 expect(g.player.hp).toBe(65);expect(g.potions.reserve).toEqual([20]);expect(g.potions.cd).toBe(2);
 for(let i=0;i<150;i++)g.step(1/60);expect(g.potions.reserve).toEqual([20]);
 g.player.hp=50;g.step(1/60);expect(g.player.hp).toBe(70);expect(g.potions.reserve).toHaveLength(0);
 expect(g.tao.healing.bloodPotion).toBe(55);
});
it.each(["paused","shop","dead","won"] as const)("cannot drink during %s or resurrect a settled player",phase=>{
 const g=arena();g.potions.reserve=[20];g.player.hp=0;g.phase=phase;
 expect(g.useBloodPotion()).toBe(false);g.step(1);expect(g.player.hp).toBe(0);expect(g.potions.reserve).toEqual([20]);
});
it("does not consume at full health or resurrect zero HP even if battle is inconsistent",()=>{
 const g=arena();g.potions.reserve=[20];expect(g.useBloodPotion()).toBe(false);g.player.hp=0;
 expect(g.useBloodPotion()).toBe(false);expect(g.potions.reserve).toEqual([20]);
});
it("applies the normal healing-received cap and logs only HP really restored",()=>{
 const g=arena();g.upgrades.healing_received=100;g.recompute();g.player.hp=60;g.potions.reserve=[20];
 expect(g.useBloodPotion()).toBe(true);expect(g.player.hp).toBe(90);expect(g.tao.healing.bloodPotion).toBe(30);
});
it("credits a mixed currency/potion drop only once while its excess bottles remain",()=>{
 const g=arena();g.potions.reserve=[20,20,20];g.drops=[{id:1,x:g.player.x,y:g.player.y,exp:2,gold:7,heal:20,count:2,born:0}];
 for(let i=0;i<4;i++)g.step(1/60);
 expect(g.gold).toBe(7);expect(g.exp).toBe(2);expect(g.drops).toHaveLength(1);expect(g.drops[0].count).toBe(2);
});
it("reclaims spare potions at the wave boundary without duplicating bottles or rewards",()=>{
 const g=arena();g.drops=[{id:1,x:500,y:500,exp:0,gold:0,heal:20,count:5,born:0}];g.endWave();
 expect(g.potions.reserve).toEqual([20,20,20]);expect(g.drops).toHaveLength(0);expect(g.tao.healing.bloodPotion??0).toBe(0);
});
it("round-trips the reserve and cooldown without aliasing or a free resumed drink",()=>{
 const g=new Game();g.start("normal");g.potions={reserve:[20,35],cd:1.2};g.player.hp=50;
 const cp=g.snapshotCheckpoint()!,other=new Game();expect(other.resumeCheckpoint(cp)).toBe(true);
 expect(other.potions).toEqual(g.potions);expect(other.useBloodPotion()).toBe(false);
 for(let i=0;i<73;i++)other.step(1/60);
 expect(other.player.hp).toBe(85);expect(other.potions.reserve).toEqual([20]);expect(cp.potions.reserve).toEqual([20,35]);
});
it("keeps old checkpoints empty and rejects impossible reserves or cooldowns",()=>{
 const g=new Game();g.start("normal");const cp=g.snapshotCheckpoint()!;
 const {potions:omitted,...legacy}=cp;expect(sanitizeCheckpoint(legacy)?.potions).toEqual({reserve:[],cd:0});
 for(const potions of [{reserve:[20,20,20,20],cd:0},{reserve:[999],cd:0},{reserve:[20],cd:-1},{reserve:[],cd:3},{reserve:[],cd:NaN}])expect(sanitizeCheckpoint({...cp,potions})).toBeNull();
});
it.each([false,true])("runs the visible actual-pickup reserve sample (automatic=%s)",automatic=>{
 setWorldLayouts({woma});const g=arena();expect(testPotionReserve(g,automatic)).toBe(true);
 expect(g.phase).toBe("paused");expect(g.test.god).toBe(false);expect(g.drops).toHaveLength(1);expect(g.drops[0].count).toBe(1);
 expect(g.potions.reserve).toHaveLength(automatic ? 2 : 3);expect(g.tao.healing.bloodPotion??0).toBe(automatic ? 20 : 0);
 g.start("normal",176,"wizard",false,"biche");expect(g.potions).toEqual({reserve:[],cd:0});const id=g.runId;
 expect(testPotionReserve(g)).toBe(false);expect(g.runId).toBe(id);
});
it("uses only one bottle for a small wound, stores three, and preserves the remaining bottle",()=>{
 const g=arena();g.player.hp-=7;g.drops=[{id:1,x:g.player.x,y:g.player.y,exp:0,gold:0,heal:20,count:5,born:0}];
 g.step(1/60);expect(g.drops[0].count).toBe(1);expect(g.potions.reserve).toEqual([20,20,20]);
 expect(g.player.hp).toBe(g.maxHP);expect(g.tao.healing.bloodPotion).toBe(7);
});
