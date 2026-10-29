import {afterEach,expect,it} from "vitest";
import {Game} from "../src/game";
import {MAPS,MAP_IDS,MONSTERS} from "../src/content";
import {setWorldLayouts} from "../src/world";
import {progressSchema} from "../src/save-format";
import {testChapterVisual} from "../src/test-mode";
import bairimen from "./fixtures/bairimen-layout.json";
import shimu from "./fixtures/shimu-layout.json";
import stone from "./fixtures/stone-layout.json";
const layouts={bairimen,shimu};
afterEach(()=>setWorldLayouts({}));
it.each(["bairimen","shimu"] as const)("%s starts and spawns its actual roster only on reachable native source floor",id=>{
 setWorldLayouts(layouts);const g=new Game();g.start("test",176,"taoist",false,id);g.test.spawning=false;
 expect(g.layout).toBe(layouts[id]);expect(g.canStand(g.player.x,g.player.y)).toBe(true);
 for(let i=0;i<40;i++){
  const e=g.spawnEnemy();expect(MAPS[id].monsterPool).toContain(e.kind);
  expect(g.canStand(e.x,e.y)).toBe(true);expect(g.navigation!.connected(g.player,e)).toBe(true);
 }
 for(const kind of [...MAPS[id].monsterPool,MAPS[id].boss])expect(MONSTERS.some(m=>m.id===kind)).toBe(true);
 expect(testChapterVisual(g)).toBe(true);expect(g.phase).toBe("paused");
 expect(g.enemies.map(e=>e.kind)).toEqual([MAPS[id].boss,...MAPS[id].monsterPool]);
 for(const e of g.enemies){expect(g.canStand(e.x,e.y)).toBe(true);expect(e.y).toBeGreaterThanOrEqual(g.player.y+20);}
});
it("adds distinct maps without relabelling the previous stone source or granting old saves new unlocks",()=>{
 expect(shimu.sourcePath).toBe("Mir200/Map/d711.map");expect(stone.sourcePath).toBe("map/D711.bin");
 expect(shimu.sourceSha256).not.toBe(stone.sourceSha256);
 const legacy=progressSchema.parse({schemaVersion:1,crystals:3,unlockedMaps:["biche","stone"]});
 expect(legacy.unlockedMaps).toEqual(["biche","stone"]);expect(legacy.crystals).toBe(3);
 expect(progressSchema.parse({...legacy,unlockedMaps:MAP_IDS}).unlockedMaps).toHaveLength(10);
 expect(MAPS.stone.name).toBe("石阁地宫");
});
it.each(["bairimen","shimu"] as const)("%s can resume a real chapter checkpoint and has test-only free access",id=>{
 setWorldLayouts(layouts);const g=new Game();g.start("normal",176,"wizard",false,id);
 expect(g.phase).toBe("lobby");g.unlockedMaps.add(id);g.start("normal",176,"wizard",false,id);
 const cp=g.snapshotCheckpoint()!;expect(cp.mapId).toBe(id);
 const resumed=new Game();resumed.unlockedMaps.add(id);expect(resumed.resumeCheckpoint(cp)).toBe(true);
 expect(resumed.mapId).toBe(id);expect(resumed.canStand(resumed.player.x,resumed.player.y)).toBe(true);
});
