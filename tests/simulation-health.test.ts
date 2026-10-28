import {afterEach,expect,it} from "vitest";
import {Game} from "../src/game";
import {simulationInput} from "../src/simulation";
import {setWorldLayouts} from "../src/world";
import {testHealthWalk} from "../src/test-mode";
import woma from "./fixtures/woma-layout.json";
afterEach(()=>setWorldLayouts({}));
function arena(){setWorldLayouts({});const g=new Game();g.start("trial",176);g.skills=[];g.enemies=[];return g;}
it("seeks a collectable blood bottle when injured, while ignoring it at full HP",()=>{
 const g=arena();g.drops=[{id:100,x:g.player.x+120,y:g.player.y,born:0,exp:0,gold:0,heal:20}];
 expect(simulationInput(g)).toEqual({x:0,y:0});g.player.hp=10;
 expect(simulationInput(g).x).toBeGreaterThan(0);expect(Math.abs(simulationInput(g).y)).toBeLessThan(.01);
});
it("prefers a nearby blood bottle over currency when health is low",()=>{
 const g=arena();g.player.hp=10;g.drops=[{id:100,x:g.player.x-100,y:g.player.y,born:0,exp:2,gold:4},
 {id:101,x:g.player.x+120,y:g.player.y,born:0,exp:0,gold:0,heal:20}];
 expect(simulationInput(g).x).toBeGreaterThan(0);
});
it("allows an injured warrior to collect a nearby potion before pursuing the Boss",()=>{
 const g=arena();g.classId="warrior";g.player.hp=10;const boss=g.spawnEnemy("boss");Object.assign(boss,{x:g.player.x+300,y:g.player.y});
 g.drops=[{id:101,x:g.player.x-100,y:g.player.y,born:0,exp:0,gold:0,heal:20}];
 expect(simulationInput(g).x).toBeLessThan(0);
});
it("collects the source-map scenario through real movement and pickup, without ordinary rewards",()=>{
 setWorldLayouts({woma});const g=new Game();g.start("test",176);expect(testHealthWalk(g)).toBe(true);
 expect(g.phase).toBe("paused");expect(g.test.autowalk).toBe(true);g.pause();
 for(let tick=0;tick<600 && g.player.hp<g.maxHP;tick++) {if(tick%10===0)g.input=simulationInput(g,g.input);g.step(1/60);}
 expect(g.player.hp).toBe(g.maxHP);expect(g.tao.healing.bloodPotion).toBe(60);expect(g.drops.some(d=>d.heal)).toBe(false);
 const normal=new Game();normal.start("normal");const run=normal.runId;expect(testHealthWalk(normal)).toBe(false);expect(normal.runId).toBe(run);
});
