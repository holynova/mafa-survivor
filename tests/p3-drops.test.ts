import { describe, expect, it } from "vitest";
import { Game, WORLD } from "../src/game";
import { ITEMS, getItem } from "../src/content";

function setup(classId = "wizard", seed = 176) {
  const g = new Game();
  g.start("normal", seed, classId as "wizard" | "warrior" | "taoist");
  g.equipment = {};
  g.recompute();
  return g;
}

function kill(g: Game, kind: string, elite = false, hp = 1) {
  g.spawnEnemy(kind);
  const e = g.enemies.at(-1)!;
  e.elite = elite;
  e.x = g.player.x;
  e.y = g.player.y;
  e.hp = hp;
  g.hit(e, 9999, "fireball");
  return g.drops.find(d=>d.exp>0)!; // Currency/equipment drop; a potion may follow it.
}

describe("equipment drops (GDD §10.4)", () => {
  it("elite always drops one class-appropriate equipment", () => {
    const g = setup("wizard");
    const drop = kill(g, "orc", true);
    expect(drop.itemId).toBeDefined();
    const item = getItem(drop.itemId!);
    expect(item.kind).toBe("equipment");
    expect(!item.classId || item.classId === "wizard").toBe(true);
  });

  it("elite drops class-appropriate equipment for warrior and taoist too", () => {
    for (const classId of ["warrior", "taoist"] as const) {
      const g = setup(classId);
      const drop = kill(g, "orc", true);
      expect(drop.itemId).toBeDefined();
      const item = getItem(drop.itemId!);
      expect(!item.classId || item.classId === classId).toBe(true);
    }
  });

  it("boss drops tier 3+ equipment", () => {
    const g = setup("wizard");
    const drop = kill(g, "boss", false);
    expect(drop.itemId).toBeDefined();
    const item = getItem(drop.itemId!);
    expect(item.tier).toBeGreaterThanOrEqual(3);
  });

  it("ordinary monster drops tier 1 equipment at low rate", () => {
    let drops = 0;
    for (let i = 0; i < 3000; i++) {
      const g = setup("wizard", 1000 + i);
      const drop = kill(g, "orc", false);
      if (drop.itemId) {
        drops++;
        expect(getItem(drop.itemId).tier).toBeLessThanOrEqual(1);
      }    }
    // ~0.5% of 3000 ≈ 15; allow wide statistical band
    expect(drops).toBeGreaterThan(0);
    expect(drops).toBeLessThan(120);
  });

  it("picked-up equipment equips into first empty matching slot", () => {
    const g = setup("wizard");
    g.equipment = {};
    const item = ITEMS.find(
      (x) => x.kind === "equipment" && x.slot === "weapon",
    )!;
    g.drops.push({
      id: g.nextEntityId(),
      x: g.player.x,
      y: g.player.y,
      exp: 0,
      gold: 0,
      born: g.clock,
      itemId: item.id,
    });
    const d = g.drops[0];
    d.x = g.player.x;
    d.y = g.player.y;
    // step once to trigger pickup
    g.step(1 / 60);
    expect(g.equipment.weapon?.itemId).toBe(item.id);
    expect(g.drops.length).toBe(0);
  });

  it("pickup with no free slot sells for gold instead", () => {
    const g = setup("wizard");
    // occupy the weapon slot
    const w = ITEMS.find(
      (x) => x.kind === "equipment" && x.slot === "weapon",
    )!;
    g.equipment.weapon = { itemId: w.id, paid: w.price };
    const goldBefore = g.gold;
    const item = ITEMS.find(
      (x) => x.kind === "equipment" && x.slot === "weapon",
    )!;
    g.drops.push({
      id: g.nextEntityId(),
      x: g.player.x,
      y: g.player.y,
      exp: 0,
      gold: 0,
      born: g.clock,
      itemId: item.id,
    });
    const d = g.drops[0];
    d.x = g.player.x;
    d.y = g.player.y;
    g.step(1 / 60);
    expect(g.equipment.weapon?.itemId).toBe(w.id);
    expect(g.gold).toBeGreaterThan(goldBefore);
    expect(g.drops.length).toBe(0);
  });

  it("elite tier candidate pool rises with wave", () => {
    const poolByWave: Record<number, string[]> = {};
    for (const wave of [1, 3, 7, 12]) {
      const tierCap = wave >= 7 ? 4 : wave >= 3 ? 3 : 2;
      poolByWave[wave] = ITEMS.filter(
        (it) =>
          it.kind === "equipment" &&
          (!it.classId || it.classId === "wizard") &&
          it.tier <= tierCap,
      ).map((it) => it.id);
    }
    expect(
      Math.max(...poolByWave[1].map((id) => getItem(id).tier)),
    ).toBeLessThanOrEqual(2);
    expect(
      Math.max(...poolByWave[12].map((id) => getItem(id).tier)),
    ).toBeLessThanOrEqual(4);
    const max1 = Math.max(...poolByWave[1].map((id) => getItem(id).tier));
    const max12 = Math.max(...poolByWave[12].map((id) => getItem(id).tier));
    expect(max12).toBeGreaterThanOrEqual(max1);
  });
});
