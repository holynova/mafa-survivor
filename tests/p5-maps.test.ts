import { describe, expect, it } from "vitest";
import { Game } from "../src/game";
import { MAPS, MAP_IDS, type MapId } from "../src/content";

function setup() {
  const g = new Game();
  g.start("normal", 176, "wizard");
  return g;
}

describe("map chapters & crystal progression (GDD §11 / P5)", () => {
  it("only biche is unlocked by default", () => {
    const g = setup();
    expect(g.unlockedMaps.has("biche")).toBe(true);
    expect(g.unlockedMaps.has("mine")).toBe(false);
    expect(g.unlockedMaps.has("zuma")).toBe(false);
    expect(g.crystals).toBe(0);
  });

  it("unlockMap consumes crystals and persists", () => {
    const g = setup();
    g.crystals = 50;
    expect(g.unlockMap("mine")).toBe(true);
    expect(g.unlockedMaps.has("mine")).toBe(true);
    expect(g.crystals).toBe(0);

    g.crystals = 150;
    expect(g.unlockMap("zuma")).toBe(true);
    expect(g.unlockedMaps.has("zuma")).toBe(true);
    expect(g.crystals).toBe(0);
  });

  it("unlockMap rejects insufficient crystals or already unlocked", () => {
    const g = setup();
    g.crystals = 10;
    expect(g.unlockMap("mine")).toBe(false); // cost 50
    expect(g.unlockedMaps.has("mine")).toBe(false);
    expect(g.crystals).toBe(10);

    expect(g.unlockMap("biche")).toBe(false); // already unlocked
  });

  it("cannot start a run on a locked map", () => {
    const g = new Game();
    const before = { phase: g.phase, classId: g.classId, mapId: g.mapId };
    g.start("normal", 176, "wizard", false, "mine");
    expect(g.phase).toBe(before.phase);
    expect(g.classId).toBe(before.classId);
    expect(g.mapId).toBe(before.mapId);
  });

  it("can start a run on an unlocked map", () => {
    const g = new Game();
    g.crystals = 50;
    g.unlockMap("mine");
    g.start("normal", 176, "wizard", false, "mine");
    expect(g.phase).toBe("battle");
    expect(g.mapId).toBe("mine");
  });

  it("crystals awarded on won normal run", () => {
    const g = setup();
    g.finish(true);
    expect(g.crystals).toBe(3);
  });

  it("no crystals on dead or trial run", () => {
    const g = setup();
    g.finish(false);
    expect(g.crystals).toBe(0);
    const g2 = setup();
    g2.mode = "trial";
    g2.finish(true);
    expect(g2.crystals).toBe(0);
  });

  it("all map chapters have defined data", () => {
    for (const id of MAP_IDS) {
      const m = MAPS[id];
      expect(m.name).toBeTruthy();
      expect(m.theme).toBeTruthy();
      expect(m.monsterPool.length).toBeGreaterThan(0);
      expect(m.boss).toBe("boss");
      expect(m.unlockCost).toBeGreaterThanOrEqual(0);
    }
    expect(MAPS.biche.unlockCost).toBe(0);
    expect(MAPS.mine.unlockCost).toBe(50);
    expect(MAPS.zuma.unlockCost).toBe(150);
  });
});
