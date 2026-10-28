import { describe, expect, it } from "vitest";
import { Game } from "../src/game";
import { ITEMS, SKILLS } from "../src/content";
import {
  damageRows,
  purchaseRows,
  statRows,
} from "../src/run-stats";

describe("post-run damage breakdown", () => {
  it("sorts damage, names skills, and derives DPS plus share", () => {
    const rows = damageRows({ basic: 300, fireball: 600, lightning: 100 }, 100);
    expect(rows.map((r) => r.id)).toEqual(["fireball", "basic", "lightning"]);
    expect(rows[0]).toMatchObject({
      name: SKILLS.find((s) => s.id === "fireball")!.name,
      damage: 600,
      dps: 6,
      share: 60,
    });
    expect(rows[1].name).toBe("普通攻击");
    expect(rows.reduce((sum, r) => sum + r.share, 0)).toBeCloseTo(100);
  });

  it("never divides by zero and drops empty or negative entries", () => {
    expect(damageRows({}, 10)).toEqual([]);
    expect(damageRows({ basic: 0, fireball: -5 }, 10)).toEqual([]);
    expect(damageRows({ basic: 12 }, 0)[0]).toMatchObject({ dps: 0, share: 100 });
  });
});

describe("shop purchase summary", () => {
  it("counts purchases by name, most frequent first", () => {
    const passive = ITEMS.find((i) => i.kind === "passive")!;
    const gear = ITEMS.find((i) => i.kind === "equipment")!;
    const rows = purchaseRows({ [passive.id]: 3, [gear.id]: 1 });
    expect(rows[0]).toMatchObject({ itemId: passive.id, name: passive.name, count: 3 });
    expect(rows[1].count).toBe(1);
  });

  it("hides zero counts and falls back to the raw id for unknown items", () => {
    expect(purchaseRows(undefined)).toEqual([]);
    expect(purchaseRows({ "gone-item": 2, [ITEMS[0].id]: 0 })).toEqual([
      { itemId: "gone-item", name: "gone-item", count: 2 },
    ]);
  });
});

describe("final stat chips", () => {
  it("keeps only positive stats and labels flat, percent and per-second values", () => {
    const rows = statRows({ hp_max: 5, move_speed: 3, hp_regen: 1.2, crit_mult: 0.5, dodge: 0 });
    expect(rows.map((r) => r.key)).toEqual(["hp_max", "hp_regen", "move_speed", "crit_mult"]);
    expect(rows.find((r) => r.key === "hp_max")!.unit).toBe("");
    expect(rows.find((r) => r.key === "move_speed")!.unit).toBe("%");
    expect(rows.find((r) => r.key === "hp_regen")!.unit).toBe("/秒");
    expect(rows.find((r) => r.key === "crit_mult")!.unit).toBe("倍");
  });
});

describe("recording purchases in a run", () => {
  function shopGame() {
    const g = new Game();
    g.applyProgress({ crystals: 0, unlockedMaps: ["biche"], talents: {} });
    g.start("normal", 176, "wizard");
    g.waveTime = g.duration;
    g.step(1 / 60);
    expect(g.phase).toBe("shop");
    g.gold = 500;
    return g;
  }

  it("counts each successful purchase once and ignores rejected ones", () => {
    const g = shopGame();
    const offer = g.offers.find((o) => !o.sold)!;
    expect(g.buy(offer.id)).toBe(true);
    expect(g.purchases[offer.itemId]).toBe(1);
    expect(g.buy(offer.id)).toBe(false);
    expect(g.purchases[offer.itemId]).toBe(1);

    const expensive = g.offers.find((o) => !o.sold && o.price > 0)!;
    g.gold = 0;
    expect(g.buy(expensive.id)).toBe(false);
    expect(g.purchases[expensive.itemId]).toBeUndefined();
  });

  it("carries purchases and rerolls into the result and the checkpoint", () => {
    const g = shopGame();
    const offer = g.offers.find((o) => !o.sold)!;
    g.buy(offer.id);
    g.reroll();
    const cp = g.snapshotCheckpoint()!;
    expect(cp.purchases).toEqual(g.purchases);
    expect(cp.purchases[offer.itemId]).toBe(1);

    g.finish(true);
    expect(g.result!.purchases).toEqual({ [offer.itemId]: 1 });
    expect(g.result!.rerolls).toBe(1);

    const resumed = new Game();
    resumed.applyProgress({ crystals: 0, unlockedMaps: ["biche"], talents: {} });
    expect(resumed.resumeCheckpoint(cp)).toBe(true);
    expect(resumed.purchases).toEqual(g.purchases);
  });
});
