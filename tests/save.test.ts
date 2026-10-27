import "fake-indexeddb/auto";
import { beforeEach, describe, it, expect } from "vitest";
import { openDB, deleteDB } from "idb";
import { Game } from "../src/game";
import { saveRun, history, loadProgress, unlockChapter } from "../src/save";
beforeEach(async () => { await deleteDB("mafa-survivor"); });
describe("IndexedDB settlement", () => {
  it("persists a run exactly once, including concurrent delivery", async () => {
    const g = new Game();
    g.start("normal", 88);
    g.finish(true);
    const r = g.result!;
    await Promise.all([saveRun(r), saveRun(r), saveRun(r)]);
    const runs = await history();
    expect(runs.filter((x) => x.runId === r.runId)).toHaveLength(1);
    expect(runs.find((x) => x.runId === r.runId)?.crystals).toBe(3);
    expect((await loadProgress()).crystals).toBe(3);
  });
  it("survives another game instance and preserves trial mode identity", async () => {
    const g = new Game();
    g.start("trial", 90);
    g.finish(true);
    await saveRun(g.result!);
    const found = (await history()).find((r) => r.runId === g.result!.runId);
    expect(found).toMatchObject({
      mode: "trial",
      seed: 90,
      crystals: 0,
      won: true,
    });
  });
  it("atomically unlocks the mine once and survives reopening the database", async () => {
    const g=new Game(); g.start("normal"); g.finish(true);
    await saveRun(g.result!);
    await Promise.all([unlockChapter("mine"),unlockChapter("mine"),saveRun(g.result!)]);
    const progress=await loadProgress();
    expect(progress).toMatchObject({crystals:0,unlockedMaps:["biche","mine"]});
    const next=new Game(); next.applyProgress(progress); next.selectMap("mine"); next.start("normal");
    expect(next.mapId).toBe("mine"); expect(next.phase).toBe("battle");
    expect((await history()).filter((r)=>r.runId===g.result!.runId)).toHaveLength(1);
  });
  it("migrates v1 settlements without losing runs or re-crediting spent crystals", async () => {
    const g=new Game(); g.start("normal"); g.finish(true);
    const legacy=await openDB("mafa-survivor",1,{upgrade(db){db.createObjectStore("runs",{keyPath:"runId"});}});
    await legacy.add("runs",{...g.result!,savedAt:1}); legacy.close();
    expect((await loadProgress()).crystals).toBe(3);
    expect((await loadProgress()).crystals).toBe(3);
    await unlockChapter("mine"); await saveRun(g.result!);
    expect((await loadProgress()).crystals).toBe(0);
    expect(await history()).toHaveLength(1);
  });
  it("persists both temple unlocks and their spent balance across game instances", async () => {
    for(let seed=1;seed<=5;seed++){
      const g=new Game();g.start("normal",seed);g.finish(true);await saveRun(g.result!);
    }
    expect((await loadProgress()).crystals).toBe(15);
    await Promise.all([unlockChapter("woma"),unlockChapter("zuma")]);
    const progress=await loadProgress();expect(progress.crystals).toBe(0);
    expect(progress.unlockedMaps).toEqual(["biche","woma","zuma"]);
    for(const chapter of ["woma","zuma"] as const){
      const g=new Game();g.applyProgress(progress);g.selectMap(chapter);g.start("normal");
      expect(g.mapId).toBe(chapter);expect(g.phase).toBe("battle");
    }
    await unlockChapter("woma");expect((await loadProgress()).crystals).toBe(0);
  });
  it("rejects insufficient balances without spending", async () => {
    await expect(unlockChapter("mine")).rejects.toThrow("需要 3");
    await expect(unlockChapter("woma")).rejects.toThrow("需要 6");
    await expect(unlockChapter("zuma")).rejects.toThrow("需要 9");
    expect(await loadProgress()).toMatchObject({crystals:0,unlockedMaps:["biche"]});
  });
  it("test and trial cannot grant crystals or unlock normal chapters", async () => {
    const g=new Game(); g.start("test"); g.finish(true); g.result!.crystals=999;
    await saveRun(g.result!);
    expect(await history()).toHaveLength(0);
    g.start("trial"); g.finish(true); g.result!.crystals=999;
    await saveRun(g.result!);
    expect((await loadProgress()).crystals).toBe(0);
  });
  it("preserves malformed progress instead of overwriting it with a fresh save", async () => {
    await loadProgress();
    const db=await openDB("mafa-survivor",2);
    const corrupt={schemaVersion:1,crystals:"broken",unlockedMaps:["biche","mine"]};
    await db.put("meta",corrupt,"progress"); db.close();
    await expect(loadProgress()).rejects.toThrow("已保留原数据");
    const check=await openDB("mafa-survivor",2);
    expect(await check.get("meta","progress")).toEqual(corrupt); check.close();
  });
});
