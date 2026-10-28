import { openDB, type DBSchema, type IDBPTransaction } from "idb";
import type { RunResult } from "./game";
import { MAPS, PLAYABLE_MAP_IDS, type MapId } from "./content";
import { progressSchema, parseBackup, type SaveBackup, type Progress } from "./save-format";
import { TALENTS, talentCost, talentLevel, type TalentId } from "./talents";
export type { Progress } from "./save-format";
type RawSnapshot = { progress: unknown; runs: (RunResult & { savedAt: number })[] };
type RestorePoint = RawSnapshot & { kind: "restore-point"; createdAt: number };
interface GameDB extends DBSchema {
  runs: { key: string; value: RunResult & { savedAt: number } };
  meta: { key: string; value: Progress | RestorePoint };
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
    total + (r.mode === "normal" && r.won && Number.isInteger(r.crystals) && r.crystals > 0 ? r.crystals : 0), 0), unlockedMaps: ["biche"], talents: {} };
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
export async function buyTalent(id: TalentId): Promise<Progress> {
  const def = TALENTS.find((t) => t.id === id);
  if (!def) throw new Error("未知天赋。");
  return withProgressTransaction(async (tx) => {
    const progress = await readProgress(tx);
    const level = talentLevel(progress.talents, id);
    if (level >= def.maxLevel) throw new Error("该天赋已满级。");
    const cost = talentCost(level);
    if (progress.crystals < cost) throw new Error(`需要 ${cost} 玛法结晶。`);
    progress.crystals -= cost;
    progress.talents = { ...progress.talents, [id]: level + 1 };
    await tx.objectStore("meta").put(progress, "progress");
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

async function snapshot(tx: ProgressTransaction): Promise<RawSnapshot> {
  const runs = await tx.objectStore("runs").getAll();
  runs.sort((a, b) => String(a.runId).localeCompare(String(b.runId)));
  return { progress: await tx.objectStore("meta").get("progress"), runs };
}
const envelope = (data: RawSnapshot, exportedAt = Date.now()) => ({ format: "mafa-survivor-save", version: 1, exportedAt, ...data });
export async function exportSave(): Promise<string> {
  return withProgressTransaction(async tx => {
    await readProgress(tx); // Migrate a valid legacy save before exporting.
    const text = JSON.stringify(envelope(await snapshot(tx)), null, 2);
    parseBackup(text);
    return text;
  });
}
// Preserve malformed data as well; a raw rescue file is not necessarily importable.
export async function exportRawSave(previous = false): Promise<string> {
  return withProgressTransaction(async tx => {
    const data = previous ? await tx.objectStore("meta").get("before-restore") : await snapshot(tx);
    if (!data) throw new Error("还没有恢复前备份。");
    return JSON.stringify({ format: "mafa-survivor-raw", version: 1, exportedAt: Date.now(), data }, null, 2);
  });
}
export type RestorePreview = {
  backup: SaveBackup; revision: string;
  before: { progress: Progress | null; runs: number };
};
export async function prepareRestore(text?: string): Promise<RestorePreview> {
  const supplied = text === undefined ? undefined : parseBackup(text);
  return withProgressTransaction(async tx => {
    const current = await snapshot(tx);
    let backup = supplied;
    if (!backup) {
      const previous = await tx.objectStore("meta").get("before-restore");
      if (!previous || !("kind" in previous)) throw new Error("还没有恢复前备份。");
      const progress = previous.progress ?? { schemaVersion: 1, crystals: previous.runs.reduce((total, run) =>
        total + (run.mode === "normal" && run.won && Number.isSafeInteger(run.crystals) && run.crystals > 0 ? run.crystals : 0), 0), unlockedMaps: ["biche"], talents: {} };
      try { backup = parseBackup(JSON.stringify(envelope({ progress, runs: previous.runs }, previous.createdAt))); }
      catch { throw new Error("恢复前的数据含异常，无法直接恢复；可下载原始数据保留排查。当前存档未修改。"); }
    }
    const parsed = progressSchema.safeParse(current.progress);
    return { backup, revision: JSON.stringify(current), before: { progress: parsed.success ? parsed.data : null, runs: current.runs.length } };
  });
}
export async function restoreSave(preview: RestorePreview): Promise<Progress> {
  const backup = parseBackup(JSON.stringify(preview.backup));
  return withProgressTransaction(async tx => {
    const current = await snapshot(tx);
    if (JSON.stringify(current) !== preview.revision) throw new Error("预览后本机存档已变化，请重新选择备份并预览。");
    const meta = tx.objectStore("meta"), runs = tx.objectStore("runs");
    await meta.put({ kind: "restore-point", createdAt: Date.now(), ...current }, "before-restore");
    await runs.clear();
    for (const run of backup.runs) await runs.add(run);
    await meta.put(backup.progress, "progress");
    return backup.progress;
  });
}
export async function hasRestorePoint(): Promise<boolean> {
  return withProgressTransaction(async tx => !!(await tx.objectStore("meta").get("before-restore")));
}
