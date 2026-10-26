import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { Game } from "../src/game";
import { saveRun, history } from "../src/save";
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
});
