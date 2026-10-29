/** Catch-up EXP rewards actual completed combat, never time alone or an extra skill currency. */
export const TRAINING_KILL_FRACTION=.1;
export const TRAINING_LEVELS=[2,4,6,8,10,12,14,16,18,20,22] as const;
export const newTraining=()=>({lastWave:0,total:0,waveExp:0});
export const experienceToLevel=(level:number)=>4*(level-1)*(level+3);
export function trainingReward(run:{mode:string;wave:number;waveTime:number;duration:number;waveKills:number;spawnBudget:number;level:number;exp:number},lastWave:number) {
 if(run.mode!=="normal" || run.wave<1 || run.wave>11 || run.wave<=lastWave || run.waveTime<run.duration ||
    run.waveKills<Math.ceil(run.spawnBudget*TRAINING_KILL_FRACTION))return 0;
 return Math.max(0,experienceToLevel(TRAINING_LEVELS[run.wave-1])-experienceToLevel(run.level)-run.exp);
}
