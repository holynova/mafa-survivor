/** Seconds. Elite snake volleys retain their damage but expose a melee punish window. */
export function rangedTiming(kind:string,survivorMode:boolean){
 if(survivorMode&&kind==='evilSnake')return {windup:.9,recovery:1.1,cooldown:3.2};
 return {windup:.7,recovery:.35,cooldown:kind==='zumaArcher'?3.2:kind==='flameWoma'?2.8:2.5};
}
