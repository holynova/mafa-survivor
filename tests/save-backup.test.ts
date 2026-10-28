import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteDB, openDB } from "idb";
import { Game } from "../src/game";
import { exportSave, exportRawSave, prepareRestore, restoreSave, hasRestorePoint, history, loadProgress, saveRun, unlockChapter } from "../src/save";
import { MAX_BACKUP_BYTES, parseBackup } from "../src/save-format";

beforeEach(async () => { vi.restoreAllMocks(); await deleteDB("mafa-survivor"); });
async function victory(seed = 1) {
  const game = new Game(); game.start("normal", seed); game.finish(true); await saveRun(game.result!); return game.result!;
}
async function fixture() { await victory(); return JSON.parse(await exportSave()); }
describe("portable progress backups", () => {
  it("exports all records beyond the ten-row history, exact spent balance and optional recovery totals", async () => {
    for (let seed = 1; seed <= 12; seed++) await victory(seed);
    await unlockChapter("mine");
    const backup = parseBackup(await exportSave());
    expect(await history()).toHaveLength(10); expect(backup.runs).toHaveLength(12);
    expect(backup.progress).toEqual({ schemaVersion: 1, crystals: 33, unlockedMaps: ["biche", "mine"], talents: {} });
  });
  it("previews without writing, replaces rather than adds crystals, and settlement replay stays idempotent", async () => {
    const result = await victory(); const text = await exportSave(); await unlockChapter("mine");
    const preview = await prepareRestore(text);
    expect(preview.before.progress?.crystals).toBe(0); expect((await loadProgress()).crystals).toBe(0);
    await restoreSave(preview); await saveRun(result); await saveRun(result);
    expect((await loadProgress()).crystals).toBe(3); expect(await history()).toHaveLength(1);
    expect(await hasRestorePoint()).toBe(true);
    await restoreSave(await prepareRestore());
    expect(await loadProgress()).toEqual({ schemaVersion: 1, crystals: 0, unlockedMaps: ["biche", "mine"], talents: {} });
  });
  it("restores a valid backup over malformed progress and preserves the malformed original for rescue", async () => {
    const text = await exportSave(); const database = await openDB("mafa-survivor", 2);
    const corrupt = { schemaVersion: 1, crystals: "broken", unlockedMaps: ["biche", "mine"] };
    await database.put("meta", corrupt, "progress"); database.close();
    const preview = await prepareRestore(text); expect(preview.before.progress).toBeNull();
    await restoreSave(preview); expect((await loadProgress()).crystals).toBe(0);
    expect(JSON.parse(await exportRawSave(true)).data.progress).toEqual(corrupt);
    await expect(prepareRestore()).rejects.toThrow("异常"); expect((await loadProgress()).crystals).toBe(0);
  });
  it("rejects a stale preview after another settlement and keeps existing restore point", async () => {
    const text = await exportSave(); await restoreSave(await prepareRestore(text));
    const beforePoint = JSON.parse(await exportRawSave(true)).data;
    const preview = await prepareRestore(text); await victory();
    await expect(restoreSave(preview)).rejects.toThrow("已变化");
    expect((await loadProgress()).crystals).toBe(3); expect(await history()).toHaveLength(1);
    expect(JSON.parse(await exportRawSave(true)).data).toEqual(beforePoint);
  });
  it("detects a concurrent chapter purchase before replacing spent progress", async () => {
    await victory(); const preview = await prepareRestore(await exportSave()); await unlockChapter("mine");
    await expect(restoreSave(preview)).rejects.toThrow("已变化"); expect((await loadProgress()).crystals).toBe(0);
  });
  it("aborts clear/add/progress/restore-point writes together when insertion fails", async () => {
    const text = await exportSave(); await restoreSave(await prepareRestore(text)); await victory();
    const incoming = await exportSave(); await victory(2);
    const before = JSON.parse(await exportSave()); const beforePoint = JSON.parse(await exportRawSave(true)).data;
    const preview = await prepareRestore(incoming);
    vi.spyOn(IDBObjectStore.prototype, "add").mockImplementationOnce(() => { throw new Error("disk interrupted"); });
    await expect(restoreSave(preview)).rejects.toThrow("disk interrupted");
    expect((JSON.parse(await exportSave())).progress).toEqual(before.progress);
    expect((JSON.parse(await exportSave())).runs).toEqual(before.runs);
    expect(JSON.parse(await exportRawSave(true)).data).toEqual(beforePoint);
  });
  it("round-trips legacy records without class/map/healing fields and migrates their balance once", async () => {
    const game = new Game(); game.start("normal"); game.finish(true);
    const run = { ...game.result!, savedAt: 1 }; delete run.classId; delete run.mapId; delete run.combatHealing;
    delete run.purchases; delete run.rerolls;
    const database = await openDB("mafa-survivor", 1, { upgrade(db) { db.createObjectStore("runs", { keyPath: "runId" }); } });
    await database.add("runs", run); database.close();
    const text = await exportSave(); expect(parseBackup(text).progress.crystals).toBe(3);
    await restoreSave(await prepareRestore(text)); await saveRun(game.result!);
    expect((await loadProgress()).crystals).toBe(3);
  });
  it("can undo a restore into a fresh database", async () => {
    const source = await fixture(); await deleteDB("mafa-survivor");
    await restoreSave(await prepareRestore(JSON.stringify(source)));
    await restoreSave(await prepareRestore());
    expect((await loadProgress()).crystals).toBe(0); expect(await history()).toHaveLength(0);
  });
  it("retains optional taoist and combat healing exactly", async () => {
    const game = new Game(); game.start("trial"); game.finish(false);
    game.result!.healing = { heal: 13.5 }; game.result!.combatHealing = { onKill: .2, lifeSteal: .75 };
    game.result!.damageTaken = {physical:14,magic:3,sources:{"orc:melee":14,"spider:projectile":3}};
    await saveRun(game.result!); const text = await exportSave();
    await restoreSave(await prepareRestore(text)); expect((await history())[0]).toMatchObject(game.result!);
  });
  it("serializes competing restores; the second stale preview cannot overwrite the first", async () => {
    const source = await fixture(); source.progress.crystals = 7;
    const preview = await prepareRestore(JSON.stringify(source));
    const results = await Promise.allSettled([restoreSave(preview), restoreSave(preview)]);
    expect(results.map(result => result.status).sort()).toEqual(["fulfilled", "rejected"]);
    expect((await loadProgress()).crystals).toBe(7);
    await restoreSave(await prepareRestore()); expect((await loadProgress()).crystals).toBe(3);
  });
  it.each([
    ["negative crystals", (b: any) => { b.progress.crystals = -1; }],
    ["fractional crystals", (b: any) => { b.progress.crystals = .2; }],
    ["unknown chapter", (b: any) => { b.progress.unlockedMaps.push("secret"); }],
    ["duplicate chapters", (b: any) => { b.progress.unlockedMaps.push("biche"); }],
    ["no starter chapter", (b: any) => { b.progress.unlockedMaps = ["mine"]; }],
    ["future version", (b: any) => { b.version = 2; }],
    ["duplicate run IDs", (b: any) => { b.runs.push(b.runs[0]); }],
    ["test run", (b: any) => { b.runs[0].mode = "test"; }],
    ["trial crystals", (b: any) => { b.runs[0].mode = "trial"; }],
    ["unknown class", (b: any) => { b.runs[0].classId = "unknown"; }],
    ["missing score", (b: any) => { delete b.runs[0].skillDamage; }],
    ["non-finite damage", (b: any) => { b.runs[0].skillDamage = { fire: Infinity }; }],
    ["negative purchase count", (b: any) => { b.runs[0].purchases = { "equip-0": -1 }; }],
    ["fractional purchase count", (b: any) => { b.runs[0].purchases = { "equip-0": 1.5 }; }],
    ["negative rerolls", (b: any) => { b.runs[0].rerolls = -2; }],
    ["unexpected fields", (b: any) => { b.extra = true; }],
  ])("rejects %s without modifying current progress", async (_, mutate) => {
    const source = await fixture(); mutate(source);
    await expect(prepareRestore(JSON.stringify(source))).rejects.toThrow("格式或版本");
    expect((await loadProgress()).crystals).toBe(3); expect(await history()).toHaveLength(1);
    expect(await hasRestorePoint()).toBe(false);
  });
  it("bounds byte size and malformed JSON before storage mutation", async () => {
    await expect(prepareRestore(" ".repeat(MAX_BACKUP_BYTES + 1))).rejects.toThrow("5MB");
    await expect(prepareRestore("not-json")).rejects.toThrow("JSON");
    expect(await hasRestorePoint()).toBe(false);
  });
  it("revalidates a changed preview before starting its transaction", async () => {
    const preview = await prepareRestore(await exportSave()); preview.backup.progress.crystals = -3;
    await expect(restoreSave(preview)).rejects.toThrow("格式或版本"); expect((await loadProgress()).crystals).toBe(0);
  });
});
