import { afterEach, describe, expect, it } from "vitest";
import { Game } from "../src/game";
import { MAPS, MONSTERS, PLAYABLE_MAP_IDS, isBossKind } from "../src/content";
import { setWorldLayouts, type WorldLayout } from "../src/world";

function mineGrid(): WorldLayout {
  const walk = Array.from({length: 46 * 48}, () => 1);
  for (let y=0;y<48;y++) walk[y*46+23] = y===10 ? 1 : 0;
  return {width:2208,height:1536,cellWidth:48,cellHeight:32,walk,tiles:[],objects:[],spawn:{x:504,y:656}};
}
afterEach(() => setWorldLayouts({}));
describe("playable chapter runtime", () => {
  it("keeps unimplemented temples out of selectable and startable chapters", () => {
    expect(PLAYABLE_MAP_IDS).toEqual(["biche","mine"]);
    const g=new Game(); g.applyProgress({crystals:150,unlockedMaps:["biche","zuma"]});
    g.start("test",176,"wizard",false,"zuma");
    expect(g.phase).toBe("lobby");
  });
  it("normal mine requires an unlock; trial and test are free chapter previews", () => {
    const g=new Game(); g.selectMap("mine"); g.start("normal");
    expect(g.phase).toBe("lobby");
    for (const mode of ["trial","test"] as const) {
      g.start(mode); expect(g.mapId).toBe("mine"); expect(g.phase).toBe("battle");
      g.finish(true); expect(g.result?.crystals).toBe(0); g.lobby();
    }
    g.applyProgress({crystals:0,unlockedMaps:["biche","mine"]}); g.start("normal");
    expect(g.mapId).toBe("mine"); expect(g.phase).toBe("battle");
  });
  it("uses each chapter's own layout and starts on its safe original-map point", () => {
    const mine=mineGrid(); setWorldLayouts({mine});
    const a=new Game(); a.start("test",176,"wizard",false,"mine");
    const b=new Game(); b.start("test");
    expect(a.player.x).toBe(mine.spawn!.x); expect(a.layout).toBe(mine);
    expect(b.layout).toBeNull(); // Another Game cannot silently switch a's map.
    expect(a.canStand(23.5*48,20.5*32)).toBe(false);
    expect(b.canStand(23.5*48,20.5*32)).toBe(true);
  });
  it("spawns all enemies on reachable floor, never inside a wall or separated pocket", () => {
    const mine=mineGrid(); setWorldLayouts({mine});
    const g=new Game(); g.start("test",176,"wizard",false,"mine");
    for(let i=0;i<100;i++) {
      const e=g.spawnEnemy();
      expect(g.canStand(e.x,e.y)).toBe(true);
      expect(g.navigation!.connected(g.player,e)).toBe(true);
      expect(Math.hypot(e.x-g.player.x,e.y-g.player.y)).toBeGreaterThanOrEqual(300);
    }
  });
  it("the mine has five distinct ordinary species and its own undead Boss", () => {
    expect(MAPS.mine.monsterPool).toEqual(["skeleton","caveMaggot","zombie","skeletonWarrior","skeletonArcher"]);
    expect(MAPS.mine.boss).toBe("corpseKing");
    expect(MAPS.mine.unlockCost).toBe(3);
    for (const id of MAPS.mine.monsterPool) expect(MONSTERS.find((m)=>m.id===id)).toBeDefined();
    expect(isBossKind(MAPS.mine.boss)).toBe(true);
  });
  it("spawns the corpse king in the final mine wave and settles its kill once", () => {
    const g=new Game(); g.start("trial",176,"taoist",false,"mine");
    g.wave=g.maxWaves; g.waveTime=16; g.step(1/60);
    const boss=g.boss!; expect(boss.kind).toBe("corpseKing");
    g.hit(boss,1e9,"test"); expect(g.bossKilled).toBe(true);
    const kills=g.kills; g.hit(boss,1e9,"test"); expect(g.kills).toBe(kills);
    g.waveTime=g.duration; g.endWave();
    for(let i=0;i<20 && !g.result;i++) {
      if(g.phase==="upgrade") g.choose(g.choices[0].id);
      else if(g.phase==="replace") g.replaceSkill(null);
      else g.step(1/60);
    }
    expect(g.phase).toBe("won");
    expect(g.result?.mapId).toBe("mine"); expect(g.result?.crystals).toBe(0);
  });
});
