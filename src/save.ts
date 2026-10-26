import { openDB } from "idb";
import type { RunResult } from "./game";
const db = () =>
  openDB("mafa-survivor", 1, {
    upgrade(db) {
      db.createObjectStore("runs", { keyPath: "runId" });
    },
  });
export async function saveRun(result: RunResult) {
  const database = await db();
  const tx = database.transaction("runs", "readwrite");
  if (!(await tx.store.get(result.runId)))
    await tx.store.add({ ...result, savedAt: Date.now() });
  await tx.done;
  database.close();
}
export async function history(): Promise<RunResult[]> {
  const database = await db();
  const rows = await database.getAll("runs");
  database.close();
  return rows.sort((a, b) => b.savedAt - a.savedAt).slice(0, 10);
}
