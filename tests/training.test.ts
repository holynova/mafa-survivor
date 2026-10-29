import {expect,it} from "vitest";
import {Game} from "../src/game";
import {experienceToLevel,trainingReward,TRAINING_LEVELS} from "../src/training";
import {expNeeded} from "../src/rules";
const input={mode:"normal",wave:6,waveTime:75,duration:75,waveKills:40,spawnBudget:158,level:10,exp:10};
it("converts the existing linear per-level EXP requirements into the exact cumulative budget",()=>{
 for(let level=1;level<40;level++)expect(experienceToLevel(level+1)-experienceToLevel(level)).toBe(expNeeded(level));
});
it("only fills the stage deficit and never adds EXP to a character already ahead",()=>{
 expect(trainingReward(input,0)).toBe(experienceToLevel(12)-experienceToLevel(10)-10);
 expect(trainingReward({...input,level:14},0)).toBe(0);
 expect(trainingReward({...input,level:12,exp:30},0)).toBe(0);
});
it("requires completed normal combat and ten percent of the map-adjusted spawn budget",()=>{
 expect(trainingReward({...input,waveTime:74},0)).toBe(0);
 expect(trainingReward({...input,waveKills:15},0)).toBe(0);
 expect(trainingReward({...input,mode:"test"},0)).toBe(0);expect(trainingReward({...input,mode:"trial"},0)).toBe(0);
 expect(trainingReward(input,6)).toBe(0);expect(trainingReward({...input,wave:12},0)).toBe(0);
});
it("settles once through real upgrade chains and retains the ledger over refresh",()=>{
 const g=new Game();g.start("normal",176,"taoist");g.wave=6;g.waveTime=75;
 for(let i=0;i<Math.ceil(g.spawnBudget*.1);i++){const e=g.spawnEnemy("orc");g.hit(e,100000,"talisman","direct");}
 g.drops=[];g.exp=0;g.level=8;g.endWave();const total=g.training.total;expect(total).toBeGreaterThan(0);
 while(g.phase==="upgrade")g.choose(g.choices[0].id);
 expect(g.level).toBeGreaterThanOrEqual(TRAINING_LEVELS[5]);g.endWave();expect(g.training.total).toBe(total);
 const resumed=new Game();expect(resumed.resumeCheckpoint(g.snapshotCheckpoint())).toBe(true);expect(resumed.training.total).toBe(total);
 resumed.nextWave();expect(resumed.training.waveExp).toBe(0);expect(resumed.training.total).toBe(total);
});
it("does not award training when the shop is opened without fighting",()=>{
 const g=new Game();g.start("normal");g.wave=11;g.endWave();expect(g.training.total).toBe(0);expect(g.level).toBe(1);
});
