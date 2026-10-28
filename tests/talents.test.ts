import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { deleteDB, openDB } from "idb";
import { Game } from "../src/game";
import { buyTalent, exportSave, loadProgress, prepareRestore, restoreSave, saveRun } from "../src/save";
import { parseBackup, progressSchema } from "../src/save-format";
import {
  MAX_TALENT_BONUS,
  TALENTS,
  TALENT_IDS,
  emptyTalents,
  sanitizeTalents,
  talentBonuses,
  talentCost,
  talentLevel,
} from "../src/talents";

beforeEach(async () => { await deleteDB("mafa-survivor"); });

/** Write a legal progress row directly so purchases need no replay of full runs. */
async function seedCrystals(crystals: number, talents: Record<string, number> = {}) {
  await loadProgress();
  const database = await openDB("mafa-survivor", 2);
  await database.put("meta", progressSchema.parse({
    schemaVersion: 1, crystals, unlockedMaps: ["biche"], talents,
  }), "progress");
  database.close();
}

describe("玛法天赋 definitions", () => {
  it("keeps every permanent bonus at or below the GDD +5% ceiling", () => {
    expect(MAX_TALENT_BONUS).toBe(5);
    for (const def of TALENTS) {
      expect(def.maxLevel).toBe(5);
      expect(def.perLevel * def.maxLevel).toBeLessThanOrEqual(MAX_TALENT_BONUS);
    }
    expect(new Set(TALENTS.map((t) => t.id)).size).toBe(TALENTS.length);
    expect(TALENTS.map((t) => t.id)).toEqual([...TALENT_IDS]);
  });

  it("prices each level in cheap crystals and clamps past the last level", () => {
    expect([0, 1, 2, 3, 4].map(talentCost)).toEqual([1, 2, 3, 4, 5]);
    expect(talentCost(5)).toBe(5);
    expect(talentCost(-3)).toBe(1);
    expect(talentCost(99)).toBe(5);
  });

  it("maps levels to flat stat bonuses and ignores empty or over-level entries", () => {
    expect(talentBonuses({})).toEqual({});
    const bonuses = talentBonuses({ vitality: 3, might: 2, haste: 99 } as never);
    expect(bonuses).toEqual({ hp_max: 3, all_damage_pct: 2, cooldown_reduction: 5 });
    expect(talentLevel({ vitality: 99 } as never, "vitality")).toBe(5);
    expect(talentLevel({ vitality: -4 } as never, "vitality")).toBe(0);
  });

  it("drops unknown ids and non-integers before persisting", () => {
    const dirty = { vitality: 2.9, might: -1, haste: 7, bogus: 4, fortune: Number.NaN };
    expect(sanitizeTalents(dirty)).toEqual({
      ...emptyTalents(),
      vitality: 2, haste: 5, fortune: 0,
    });
    expect(sanitizeTalents(undefined)).toEqual(emptyTalents());
  });

  it("keeps old saves valid and rejects unknown talent keys in the schema", () => {
    const legacy = progressSchema.parse({
      schemaVersion: 1, crystals: 4, unlockedMaps: ["biche"],
    });
    expect(legacy.talents).toEqual({});
    expect(progressSchema.safeParse({
      schemaVersion: 1, crystals: 4, unlockedMaps: ["biche"], talents: { bogus: 1 },
    }).success).toBe(false);
    expect(progressSchema.safeParse({
      schemaVersion: 1, crystals: 4, unlockedMaps: ["biche"], talents: { vitality: 6 },
    }).success).toBe(false);
  });
});

describe("玛法天赋 in a run", () => {
  it("applies hp, damage, movement and pickup bonuses through the shared caps", () => {
    const g = new Game();
    g.selectClass("wizard");
    g.applyProgress({
      crystals: 0, unlockedMaps: ["biche"],
      talents: { vitality: 5, might: 5, swiftness: 5, magnet: 5, precision: 5 },
    });
    expect(g.maxHP).toBe(105);
    expect(g.stats.all_damage_pct).toBe(5);
    expect(g.moveSpeed).toBeCloseTo(220 * 1.05);
    expect(g.pickupRadius).toBeCloseTo(70 * 1.05);
    expect(g.stats.crit_chance).toBe(5);
  });

  it("starts a real run at the talent-boosted maximum HP", () => {
    const g = new Game();
    g.selectClass("warrior");
    g.applyProgress({ crystals: 0, unlockedMaps: ["biche"], talents: { vitality: 4 } });
    g.start("normal", 176, "warrior");
    expect(g.maxHP).toBe(189);
    expect(g.player.hp).toBe(189);
  });

  it("recomputes back to baseline when progress is cleared", () => {
    const g = new Game();
    g.applyProgress({ crystals: 0, unlockedMaps: ["biche"], talents: { vitality: 5, haste: 5 } });
    expect(g.maxHP).toBe(105);
    g.applyProgress({ crystals: 0, unlockedMaps: ["biche"] });
    expect(g.maxHP).toBe(100);
    expect(g.stats.cooldown_reduction ?? 0).toBe(0);
    expect(g.talents).toEqual(emptyTalents());
  });
});

describe("buying talents", () => {
  it("spends crystals, raises the level, and persists across reloads", async () => {
    // Five normal wins on Biche fund every level of one talent.
    for (let seed = 1; seed <= 5; seed++) {
      const g = new Game(); g.start("normal", seed); g.finish(true);
      await saveRun(g.result!);
    }
    expect((await loadProgress()).crystals).toBe(15);
    for (let level = 0; level < 5; level++) {
      expect((await buyTalent("vitality")).talents.vitality).toBe(level + 1);
    }
    const progress = await loadProgress();
    expect(progress.crystals).toBe(0);
    expect(progress.talents.vitality).toBe(5);

    const next = new Game();
    next.applyProgress(progress);
    expect(next.maxHP).toBe(105);
  });

  it("rejects an unaffordable or maxed purchase without spending", async () => {
    await seedCrystals(0);
    await expect(buyTalent("might")).rejects.toThrow("需要 1");
    expect((await loadProgress()).crystals).toBe(0);

    await seedCrystals(15);
    for (let i = 0; i < 5; i++) await buyTalent("might");
    await expect(buyTalent("might")).rejects.toThrow("已满级");
    expect((await loadProgress()).crystals).toBe(0);
    expect((await loadProgress()).talents.might).toBe(5);
  });

  it("keeps talents and crystals together through backup restore", async () => {
    await seedCrystals(6);
    await buyTalent("haste");
    await buyTalent("haste");
    const text = await exportSave();
    const backup = parseBackup(text);
    expect(backup.progress.talents).toEqual({ haste: 2 });
    await buyTalent("haste");
    await restoreSave(await prepareRestore(text));
    const restored = await loadProgress();
    expect(restored.talents.haste).toBe(2);
    expect(restored.crystals).toBe(3);
  });
});
