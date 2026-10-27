import { openDB, type DBSchema, type IDBPTransaction } from "idb";
import { z } from "zod";
import type { RunResult } from "./game";
import { MAPS, PLAYABLE_MAP_IDS, type MapId } from "./content";

const progressSchema = z.object({
  schemaVersion: z.literal(1), crystals: z.number().int().nonnegative(),
  unlockedMaps: z.array(z.enum(["biche", "mine", "zuma"])),
});
export type Progress = z.infer<typeof progressSchema>;
interface GameDB extends DBSchema {
  runs: { key: string; value: RunResult & { savedAt: number } };
  meta: { key: string; value: Progress };
}
const db = () => openDB<GameDB>("mafa-survivor", 2, {
  upgrade(database) {
    if (!database.objectStoreNames.contains("runs")) database.createObjectStore("runs", { keyPath: "runId" });
    if (!database.objectStoreNames.contains("meta")) database.createObjectStore("meta");
  },
});
type ProgressTransaction = IDBPTransaction<GameDB, ("runs" | "meta")[], "readwrite">;
async function withProgressTransaction<T>(work: (tx: ProgressTransaction) => Promise<T>): Promise<T> {
  const database = await db(), tx = database.transaction(["runs", "meta"], "readwrite");
  try {
    const value = await work(tx); await tx.done; return value;
  } catch (error) {
    try { tx.abort(); } catch { /* It may already have aborted or completed. */ }
    await tx.done.catch(() => {});
    throw error;
  } finally { database.close(); }
}
async function readProgress(tx: ProgressTransaction): Promise<Progress> {
  const meta = tx.objectStore("meta"), existing = await meta.get("progress");
  if (existing !== undefined) {
    const parsed = progressSchema.safeParse(existing);
    if (!parsed.success) throw new Error("局外存档格式异常，已保留原数据；仍可试玩和测试。");
    return parsed.data;
  }
  // v1 stored settlements only. Migrate their earned crystals exactly once.
  const runs = await tx.objectStore("runs").getAll();
  const progress: Progress = { schemaVersion: 1, crystals: runs.reduce((total, r) =>
    total + (r.mode === "normal" && r.won && Number.isInteger(r.crystals) && r.crystals > 0 ? r.crystals : 0), 0), unlockedMaps: ["biche"] };
  await meta.put(progress, "progress");
  return progress;
}
export async function loadProgress(): Promise<Progress> {
  return withProgressTransaction(readProgress);
}
export async function saveRun(result: RunResult): Promise<Progress | null> {
  if (result.mode === "test") return null;
  return withProgressTransaction(async (tx) => {
    const progress = await readProgress(tx), runs = tx.objectStore("runs");
    if (!(await runs.get(result.runId))) {
      await runs.add({ ...result, savedAt: Date.now() });
      if (result.mode === "normal" && result.won && Number.isInteger(result.crystals) && result.crystals > 0)
        progress.crystals += result.crystals;
      await tx.objectStore("meta").put(progress, "progress");
    }
    return progress;
  });
}
export async function unlockChapter(id: MapId): Promise<Progress> {
  if (!PLAYABLE_MAP_IDS.includes(id)) throw new Error("这个章节仍在开发中。");
  return withProgressTransaction(async (tx) => {
    const progress = await readProgress(tx);
    if (!progress.unlockedMaps.includes(id)) {
      if (progress.crystals < MAPS[id].unlockCost) {
        throw new Error(`需要 ${MAPS[id].unlockCost} 玛法结晶；也可以直接短局试玩。`);
      }
      progress.crystals -= MAPS[id].unlockCost; progress.unlockedMaps.push(id);
      await tx.objectStore("meta").put(progress, "progress");
    }
    return progress;
  });
}
export async function history(): Promise<RunResult[]> {
  const database = await db();
  try {
    const rows = await database.getAll("runs");
    return rows.sort((a, b) => b.savedAt - a.savedAt).slice(0, 10);
  } finally { database.close(); }
}
