import "fake-indexeddb/auto";
import {it,expect} from "vitest";
import {openDB,deleteDB} from "idb";
import {Game} from "../src/game";
import {loadProgress,readCheckpoint} from "../src/save";

it("keeps a persisted alpha.15 checkpoint instead of deleting it for missing new purchase counts",async()=>{
 await deleteDB("mafa-survivor");const progress=await loadProgress();
 const g=new Game();g.applyProgress(progress);g.start("normal",176,"warrior");
 const legacy=g.snapshotCheckpoint()!;Reflect.deleteProperty(legacy,"purchases");
 const database=await openDB("mafa-survivor",2);
 await database.put("meta",legacy,"run-checkpoint");database.close();
 const checkpoint=await readCheckpoint();expect(checkpoint).not.toBeNull();expect(checkpoint?.purchases).toEqual({});
 const reopened=await openDB("mafa-survivor",2);expect(await reopened.get("meta","run-checkpoint")).toBeDefined();reopened.close();
 const resumed=new Game();resumed.applyProgress(progress);expect(resumed.resumeCheckpoint(checkpoint!)).toBe(true);
 expect(resumed.runId).toBe(g.runId);await deleteDB("mafa-survivor");
});
