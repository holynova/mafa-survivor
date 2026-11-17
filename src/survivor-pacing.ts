/** Independent from legacy chapter progression; no time gates or level cap. */
export function survivorExpNeeded(level:number){const n=Math.max(0,Math.floor(level)-1);const focusPacing=1+Math.min(1.4,Math.max(0,level-3)*.2);return Math.round((20+14*n+.35*n*n)*focusPacing);}
export const EVOLUTION_CHEST_AFTER=480;
/** Alternate short recovery windows and pressure; never scales to the player's level. */
export function survivorSpawnInterval(seconds:number){
 const base=Math.max(.14,1.1-seconds/1200);
 if(seconds<120)return base;
 const cycle=seconds%120;
 const multiplier=seconds>=300&&seconds%300<30?1.4:cycle<30?1.25:cycle>=90?.85:1;
 const pressure=1-Math.min(.14,Math.max(0,seconds-120)/480*.14);
 return Math.max(.14,base*multiplier*pressure);
}

/** Fixed time curve, never reactive to player DPS; retain every dodge window. */
export function survivalThreatScale(seconds:number,tier:'normal'|'elite'|'boss'){
 const progress=Math.min(1,Math.max(0,seconds)/1200);
 return tier==='normal'?{hp:1.2+.25*progress,damage:1.1+.15*progress,speed:1+.12*progress}:
   tier==='elite'?{hp:1.5,damage:1.25,speed:1.12}:{hp:1.6,damage:1.25,speed:1.08};
}
