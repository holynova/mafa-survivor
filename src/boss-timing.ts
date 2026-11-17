/** Seconds; shared by damage scheduling and warning progress. Legacy timings stay intact. */
export function stompWindup(kind:string,survivorMode:boolean){
 if(kind==='corpseKing')return 1;
 if(survivorMode&&kind==='redMoon')return 1.35;
 if(survivorMode&&kind==='whiteBoar')return 1.1;
 return .9;
}
export function stompRecovery(kind:string,survivorMode:boolean){
 return survivorMode&&kind==='redMoon'?2.2:survivorMode&&kind==='whiteBoar'?1.3:1;
}

/** Radius in world pixels, shared by warnings and the resolved hit. */
export function stompRadius(kind:string,survivorMode:boolean){
 return survivorMode&&kind==='redMoon'?110:130;
}
