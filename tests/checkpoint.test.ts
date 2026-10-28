import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { deleteDB, openDB } from "idb";
import { Game } from "../src/game";
import { ITEMS } from "../src/content";
import { expNeeded } from "../src/rules";
import { sanitizeCheckpoint } from "../src/checkpoint";
import {
  clearCheckpoint, exportSave, loadProgress, prepareRestore, readCheckpoint,
  restoreSave, saveRun, writeCheckpoint,
} from "../src/save";

beforeEach(async () => { await deleteDB("mafa-survivor"); });

const stable = (cp: ReturnType<Game["snapshotCheckpoint"]>) =>
  cp ? { ...cp, savedAt: 0 } : null;

function newGame() {
  const g = new Game();
  g.applyProgress({ crystals: 0, unlockedMaps: ["biche"], talents: {} });
  return g;
}

/** Advance to the inter-wave shop without relying on real combat. */
function toShop(g: Game) {
  g.start("normal", 176, "wizard");
  g.gold = 120;
  g.totalGold = 120;
  g.waveTime = g.duration;
  g.step(1 / 60);
  expect(g.phase).toBe("shop");
}

describe("wave-boundary checkpoints", () => {
  it("captures a fresh wave and refuses to save mid-wave", () => {
    const g = newGame();
    g.start("normal", 176, "wizard");
    const cp = g.snapshotCheckpoint()!;
    expect(cp).toMatchObject({
      version: 1, mode: "normal", classId: "wizard", mapId: "biche",
      phase: "battle", wave: 1, clock: 0, gold: 0, level: 1,
    });
    g.step(1 / 60);
    g.step(1 / 60);
    g.step(1 / 60);
    g.step(1 / 60);
    expect(g.waveTime).toBeGreaterThan(0.05);
    expect(g.snapshotCheckpoint()).toBeNull();
  });

  it("does not checkpoint test mode, lobby, or finished runs", () => {
    const g = newGame();
    expect(g.snapshotCheckpoint()).toBeNull();
    g.start("test", 176, "warrior");
    expect(g.snapshotCheckpoint()).toBeNull();
    g.start("normal", 176, "warrior");
    g.finish(false);
    expect(g.snapshotCheckpoint()).toBeNull();
  });

  it("restores a shop checkpoint exactly, including offers and RNG position", () => {
    const g = newGame();
    toShop(g);
    g.buy(g.offers[0].id);
    const cp = g.snapshotCheckpoint()!;
    expect(cp.phase).toBe("shop");
    expect(cp.offers.length).toBeGreaterThan(0);
    const resumed = newGame();
    expect(resumed.resumeCheckpoint(cp)).toBe(true);
    expect(stable(resumed.snapshotCheckpoint())).toEqual(stable(cp));
  });

  it("replays the same wave from a resumed shop checkpoint", () => {
    const g = newGame();
    toShop(g);
    const cp = g.snapshotCheckpoint()!;
    const resumed = newGame();
    resumed.resumeCheckpoint(cp);
    g.nextWave();
    resumed.nextWave();
    for (let i = 0; i < 120; i++) { g.step(1 / 60); resumed.step(1 / 60); }
    const view = (x: Game) => ({
      phase: x.phase, wave: x.wave, hp: x.player.hp, kills: x.kills,
      enemies: x.enemies.map((e) => [e.id, e.kind, e.hp, e.x, e.y]),
      drops: x.drops.map((d) => [d.id, d.exp, d.gold, d.x, d.y]),
      rng: x.rng.seed,
    });
    expect(view(resumed)).toEqual(view(g));
  });

  it("restores a pending level-up with the same choices", () => {
    const g = newGame();
    g.start("normal", 176, "wizard");
    g.level = 3;
    g.exp = expNeeded(3);
    g.skills[0].rank = 2;
    g.beginUpgrade();
    const cp = g.snapshotCheckpoint()!;
    expect(cp.phase).toBe("upgrade");
    expect(cp.choices.length).toBeGreaterThan(0);
    const resumed = newGame();
    expect(resumed.resumeCheckpoint(cp)).toBe(true);
    expect(resumed.choices.map((c) => c.id)).toEqual(g.choices.map((c) => c.id));
    const pick = g.choices[0].id;
    expect(resumed.choose(pick)).toBeUndefined();
    g.choose(pick);
    expect(resumed.phase).toBe(g.phase);
    expect(resumed.level).toBe(g.level);
    expect(resumed.exp).toBe(g.exp);
    expect(resumed.skills.map((s) => [s.id, s.rank])).toEqual(g.skills.map((s) => [s.id, s.rank]));
  });

  it("keeps a pending skill replacement across a refresh", () => {
    const g = newGame();
    g.start("normal", 176, "wizard");
    g.skills = ["fireball", "lightning", "firewall", "shield", "repulse", "teleport"].map((id) => g.newSkill(id as never));
    g.pendingSkill = "explosion";
    g.phase = "replace";
    const resumed = newGame();
    expect(resumed.resumeCheckpoint(g.snapshotCheckpoint())).toBe(true);
    expect(resumed.phase).toBe("replace");
    expect(resumed.pendingSkill).toBe("explosion");
    expect(resumed.skills).toHaveLength(6);
  });

  it("restores pets, passive stacks, equipment and talent-derived stats", () => {
    const g = newGame();
    g.applyProgress({ crystals: 0, unlockedMaps: ["biche"], talents: { vitality: 5 } });
    g.start("normal", 176, "taoist");
    const armor = ITEMS.find((i) => i.kind === "equipment" && i.slot === "armor")!;
    const passive = ITEMS.find((i) => i.kind === "passive")!;
    g.equipment.armor = { itemId: armor.id, paid: 10 };
    g.passives[passive.id] = 1;
    g.pets.push({
      id: 999, kind: "skeleton", source: "skeleton", x: g.player.x + 10, y: g.player.y,
      hp: 50, maxHp: 60, damage: 4, speed: 100, dir: 2, cd: 0.4, born: 0, attackUntil: 0,
    });
    const resumed = newGame();
    resumed.applyProgress({ crystals: 0, unlockedMaps: ["biche"], talents: { vitality: 5 } });
    const cp = g.snapshotCheckpoint()!;
    expect(resumed.resumeCheckpoint(cp)).toBe(true);
    expect(resumed.pets.every((p) => p.kind === "skeleton")).toBe(true);
    expect(resumed.equipment).toEqual(g.equipment);
    expect(resumed.passives).toEqual(g.passives);
    expect(resumed.maxHP).toBe(g.maxHP);
  });

  it("rejects tampered checkpoints without touching the current run", () => {
    const g = newGame();
    g.start("normal", 176, "wizard");
    const cp = g.snapshotCheckpoint()!;
    expect(sanitizeCheckpoint({ ...cp, version: 99 })).toBeNull();
    expect(sanitizeCheckpoint({ ...cp, wave: 13 })).toBeNull();
    expect(sanitizeCheckpoint({ ...cp, skills: [{ ...cp.skills[0], id: "made-up" }] })).toBeNull();
    expect(sanitizeCheckpoint({ ...cp, phase: "upgrade", choices: [] })).toBeNull();
    const polluted = sanitizeCheckpoint({ ...cp, upgrades: JSON.parse('{"__proto__":5}') });
    expect(polluted && Object.hasOwn(polluted.upgrades, "__proto__")).toBe(false);
    expect(g.resumeCheckpoint({ ...cp, phase: "shop", offers: [{ itemId: "made-up" }] })).toBe(false);
    expect(g.phase).toBe("battle");
  });

  it("refuses a normal-map checkpoint when the chapter is locked", () => {
    const g = newGame();
    g.start("normal", 176, "wizard");
    const cp = g.snapshotCheckpoint()!;
    const other = new Game();
    expect(other.resumeCheckpoint({ ...cp, mapId: "zuma" })).toBe(false);
  });
});

describe("checkpoint persistence", () => {
  it("writes, reads and clears a checkpoint", async () => {
    const g = newGame();
    g.start("normal", 176, "wizard");
    await expect(readCheckpoint()).resolves.toBeNull();
    expect(await writeCheckpoint(g.snapshotCheckpoint())).toBe(true);
    expect((await readCheckpoint())?.runId).toBe(g.runId);
    await clearCheckpoint();
    expect(await readCheckpoint()).toBeNull();
  });

  it("drops a corrupted checkpoint instead of surfacing it", async () => {
    await loadProgress();
    const database = await openDB("mafa-survivor", 2);
    await database.put("meta", { version: 99, runId: "x" }, "run-checkpoint");
    database.close();
    expect(await readCheckpoint()).toBeNull();
    expect(await readCheckpoint()).toBeNull();
  });

  it("clears the checkpoint when a run settles and when a backup is restored", async () => {
    const g = newGame();
    g.start("normal", 176, "wizard");
    await writeCheckpoint(g.snapshotCheckpoint());
    g.finish(true);
    await saveRun(g.result!);
    expect(await readCheckpoint()).toBeNull();

    const next = newGame();
    next.start("normal", 17, "warrior");
    await writeCheckpoint(next.snapshotCheckpoint());
    const text = await exportSave();
    await restoreSave(await prepareRestore(text));
    expect(await readCheckpoint()).toBeNull();
  });
});
