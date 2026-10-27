import { expect, it } from "vitest";
import { Game } from "../src/game";
import { ITEMS, getItem } from "../src/content";
import { resolveAppearance, hasWorldAppearance, weaponBehind } from "../src/appearance";
import { testWear } from "../src/test-mode";

const item = (name: string) => ITEMS.find((i) => i.name === name)!;
it("starts every run with one actual wood sword, and resets it between runs", () => {
  const g = new Game();
  for (const mode of ["normal", "trial", "test"] as const) {
    g.start(mode, 176, "warrior");
    expect(getItem(g.equipment.weapon!.itemId).name).toBe("木剑");
    expect(Object.keys(g.equipment)).toEqual(["weapon"]);
    expect(g.gold).toBe(0);
    expect(resolveAppearance(g.classId, g.equipment)).toEqual({ body: "dress-1", weapon: "weapon-8" });
    g.equipment.weapon = { itemId: item("屠龙").id, paid: 100 };
  }
});
it("switches both real inventory slots and model identifiers when wearing equipment", () => {
  const g = new Game(); g.start("test", 176, "warrior");
  expect(testWear(g, item("屠龙").id)).toBe(true);
  expect(testWear(g, item("战神盔甲").id)).toBe(true);
  expect(resolveAppearance(g.classId, g.equipment)).toEqual({ body: "dress-6", weapon: "weapon-3" });
  expect(g.stats.def_max).toBeGreaterThan(g.classInfo.base.def_max);
  expect(testWear(g, item("魔法长袍").id)).toBe(false);
});
it("uses the same appearance resolver for a regular shop purchase and sale", () => {
  const g = new Game(); g.start("normal", 176, "wizard");
  g.phase = "shop"; g.gold = 2000;
  for (const [id, name] of [[1,"骨玉权杖"],[2,"恶魔长袍"]] as const) {
    g.offers = [{ id, itemId: item(name).id, price: 100, sold: false, locked: false }];
    expect(g.buy(id)).toBe(true);
  }
  expect(resolveAppearance(g.classId, g.equipment)).toEqual({ body: "dress-7", weapon: "weapon-16" });
  g.sell("weapon"); g.sell("armor");
  expect(resolveAppearance(g.classId, g.equipment)).toEqual({ body: "dress-1", weapon: null });
});
it("keeps test wardrobe controls out of normal games", () => {
  const g = new Game(); g.start("normal", 176, "warrior");
  expect(testWear(g, item("屠龙").id)).toBe(false);
  expect(getItem(g.equipment.weapon!.itemId).name).toBe("木剑");
});
it("does not offer unverified advanced models or silently use another item's art", () => {
  const g = new Game(); g.start("test", 176, "warrior");
  expect(hasWorldAppearance(item("天魔神甲"))).toBe(false);
  expect(g.validItem(item("天魔神甲"))).toBe(false);
  expect(testWear(g, item("天魔神甲").id)).toBe(false);
  for (const shape of ["木剑", "屠龙", "重盔甲", "战神盔甲"]) expect(g.validItem(item(shape))).toBe(true);
});
it("uses the original per-frame weapon order, including the mid-swing front/back transition", () => {
  expect(weaponBehind("idle", 0, 0)).toBe(true);
  expect(weaponBehind("idle", 1, 0)).toBe(false);
  expect(weaponBehind("idle", 5, 0)).toBe(true);
  expect(weaponBehind("attack", 0, 3)).toBe(false);
  expect(weaponBehind("attack", 0, 4)).toBe(true);
});

it("keeps unavailable equipment out of late-wave elite drops", () => {
  const g = new Game(); g.start("test", 176, "warrior"); g.wave = 10;
  for (let n = 0; n < 150; n++) {
    g.spawnEnemy("orc"); const enemy = g.enemies.at(-1)!; enemy.elite = true;
    g.hit(enemy, 1000000, "basic");
  }
  for (const drop of g.drops) if (drop.itemId) expect(hasWorldAppearance(getItem(drop.itemId))).toBe(true);
});
