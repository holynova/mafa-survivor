import {expect,it} from "vitest";
import {Game} from "../src/game";
import {sanitizeCheckpoint} from "../src/checkpoint";
import {statRows} from "../src/run-stats";

it("resumes alpha.15 checkpoints that predate purchase tracking without losing progress",()=>{
 const g=new Game();g.applyProgress({crystals:0,unlockedMaps:["biche"],talents:{}});g.start("normal",176,"warrior");
 const cp=g.snapshotCheckpoint()!;Reflect.deleteProperty(cp,"purchases");
 expect(sanitizeCheckpoint(cp)).not.toBeNull();
 const next=new Game();next.applyProgress({crystals:0,unlockedMaps:["biche"],talents:{}});
 expect(next.resumeCheckpoint(cp)).toBe(true);expect(next.purchases).toEqual({});
 expect(next.runId).toBe(g.runId);expect(next.gold).toBe(g.gold);expect(next.player.hp).toBe(g.player.hp);
});
it("reports absolute attack and accuracy in points, and kill recovery in points per kill",()=>{
 const rows=statRows({dc_min:12,accuracy:90,agility:3,luck:1,hp_on_kill:.2,lifesteal:1});
 for(const key of ["dc_min","accuracy","agility","luck"])expect(rows.find(r=>r.key===key)?.unit).toBe("");
 expect(rows.find(r=>r.key==="dc_min")).toMatchObject({value:12,prefix:""});
 expect(rows.find(r=>r.key==="hp_on_kill")).toMatchObject({value:.2,prefix:"+"});
 expect(rows.find(r=>r.key==="hp_on_kill")?.unit).toBe("点/次");
 expect(rows.find(r=>r.key==="lifesteal")?.unit).toBe("%");
});
