import {afterEach,expect,it} from "vitest";
import {Game} from "../src/game";
import {TEST_BUILDS,testBossBuild} from "../src/test-builds";
import {setWorldLayouts} from "../src/world";
import {getItem,MAPS,PLAYABLE_MAP_IDS} from "../src/content";
import {hasWorldAppearance} from "../src/appearance";
import {simulationInput} from "../src/simulation";
import biche from "./fixtures/biche-layout.json";
import mine from "./fixtures/mine-layout.json";
import woma from "./fixtures/woma-layout.json";
import zuma from "./fixtures/zuma-layout.json";
import mengzhong from "./fixtures/mengzhong-layout.json";
import centipede from "./fixtures/centipede-layout.json";
import stone from "./fixtures/stone-layout.json";
import redmoon from "./fixtures/redmoon-layout.json";
const layouts={biche,mine,woma,zuma,mengzhong,centipede,stone,redmoon};
afterEach(()=>setWorldLayouts({}));
it.each(TEST_BUILDS.flatMap(build=>PLAYABLE_MAP_IDS.map(mapId=>({build,mapId}))))("$build.name fights the actual $mapId Boss on legal floor",({build,mapId})=>{
 setWorldLayouts(layouts);const g=new Game();g.start("test",17,"wizard",false,mapId);
 expect(testBossBuild(g,build.id)).toBe(true);expect(g.classId).toBe(build.classId);expect(g.phase).toBe("paused");
 expect(g.wave).toBe(12);expect(g.level).toBe(18);expect(g.bossSpawned).toBe(true);
 expect(g.test.god).toBe(false);expect(g.test.spawning).toBe(false);expect(g.test.autowalk).toBe(true);
 expect(g.skills).toHaveLength(6);expect(g.skills.every(s=>s.rank===3)).toBe(true);
 expect(g.player.hp).toBe(g.maxHP);expect(Object.values(g.equipment).every(e=>hasWorldAppearance(getItem(e!.itemId)))).toBe(true);
 const boss=g.test.bossBuild!.boss;expect(boss.kind).toBe(MAPS[mapId].boss);expect(g.canStand(boss.x,boss.y)).toBe(true);expect(g.attackLineClear(g.player,boss)).toBe(true);
 g.pause();for(let tick=0;tick<4501 && g.phase==="battle";tick++){
  if(tick%10===0)g.input=simulationInput(g,g.input);g.step(1/60);
  expect(g.canStand(g.player.x,g.player.y)).toBe(true);
  if(tick%60===0)expect(g.enemies.every(e=>e===boss || e.summoned)).toBe(true);
 }
 expect(["won","dead"]).toContain(g.phase);expect(boss.hp).toBeLessThan(boss.maxHp);
 expect(g.test.bossBuild!.boss).toBe(boss);
 expect(g.pets.length).toBeLessThanOrEqual(3);expect(g.result!.crystals).toBe(0);
});
it("refuses ordinary runs, unknown presets and settled runs before resetting anything",()=>{
 setWorldLayouts({biche});const g=new Game();g.start("normal");const id=g.runId;
 expect(testBossBuild(g,TEST_BUILDS[0].id)).toBe(false);expect(g.runId).toBe(id);
 g.start("test");const testId=g.runId;expect(testBossBuild(g,"unknown")).toBe(false);expect(g.runId).toBe(testId);
 g.finish(false);expect(testBossBuild(g,TEST_BUILDS[0].id)).toBe(false);expect(g.runId).toBe(testId);
});
it("clears preset grants when a new ordinary run starts",()=>{
 setWorldLayouts({biche});const g=new Game();g.start("test");testBossBuild(g,"taoist-summon");g.start("normal",176,"taoist");
 expect(g.level).toBe(1);expect(g.skills).toHaveLength(1);expect(g.skills[0].rank).toBe(1);
 expect(Object.values(g.equipment).map(e=>e!.itemId)).toEqual(["equip-extra-木剑"]);
 expect(g.test.bossBuild).toBeNull();expect(g.upgrades).toEqual({});
});
