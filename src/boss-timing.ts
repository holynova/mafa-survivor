/** Seconds; shared by damage scheduling and warning progress. Legacy timings stay intact. */
export function stompWindup(kind:string,survivorMode:boolean){
 if(kind==='corpseKing')return 1;
 if(survivorMode&&kind==='redMoon')return 1.2;
 if(survivorMode&&kind==='whiteBoar')return 1.1;
 return .9;
}
export function stompRecovery(kind:string,survivorMode:boolean){
 return survivorMode&&kind==='redMoon'?1.6:survivorMode&&kind==='whiteBoar'?1.3:1;
}
