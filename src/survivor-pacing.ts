/** Independent from legacy chapter progression; no time gates or level cap. */
export function survivorExpNeeded(level:number){const n=Math.max(0,Math.floor(level)-1);return Math.round(20+14*n+.35*n*n);}
export const EVOLUTION_CHEST_AFTER=480;
/** Alternate short recovery windows and pressure; never scales to the player's level. */
export function survivorSpawnInterval(seconds:number){
 const base=Math.max(.14,1.1-seconds/1200);
 if(seconds<120)return base;
 const cycle=seconds%120;
 const multiplier=seconds>=300&&seconds%300<30?1.4:cycle<30?1.25:cycle>=90?.85:1;
 return Math.max(.14,base*multiplier);
}
