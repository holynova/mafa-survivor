import {stompWindup} from './boss-timing';
import type {Enemy,Game} from './game';
import {isBossKind,MONSTERS} from './content';
export const monsterName=(kind:string)=>MONSTERS.find(m=>m.id===kind)?.name??kind;
export const eliteScale=(e:Pick<Enemy,'elite'|'kind'>)=>e.elite&&!isBossKind(e.kind)?1.45:1;
export function activeBosses(g:Game){return g.enemies.filter(e=>e.hp>0&&isBossKind(e.kind)).sort((a,b)=>Number(b.id===g.survival.finalBossId)-Number(a.id===g.survival.finalBossId)||a.born-b.born);}
export function announceEncounter(g:Game,e:Enemy){
 const boss=isBossKind(e.kind),current=g.encounterAlert;
 if(!boss&&current&&current.boss&&current.until>g.clock)return;
 g.telemetry.event(g,"encounter",{id:e.id,kind:e.kind,boss,final:e.id===g.survival.finalBossId});
 g.encounterAlert={name:monsterName(e.kind),boss,final:e.id===g.survival.finalBossId,until:g.clock+(boss?4:3)};
 g.sound(`encounter:${e.kind}:attack`);g.emit();
}
export type DangerZone={id:string;shape:'circle';x:number;y:number;radius:number;progress:number;until:number}|{id:string;shape:'lane';x:number;y:number;toX:number;toY:number;width:number;progress:number;until:number};
/** Derive warnings from the actual locked attack state, never cosmetic random circles. */
export function enemyDangerZones(e:Enemy,clock:number,survivorMode=false):DangerZone[]{
 if(e.hp<=0||!e.elite&&!isBossKind(e.kind))return [];
 const progress=(until:number,duration:number)=>Math.max(0,Math.min(1,1-(until-clock)/duration));
 if(e.shock)return [{id:`${e.id}:shock:${e.shock.at}`,shape:'lane',x:e.shock.origin.x,y:e.shock.origin.y,toX:e.shock.target.x,toY:e.shock.target.y,width:76,until:e.shock.at,progress:progress(e.shock.at,e.kind==='chulong'?.9:.8)}];
 if(e.stompAt!==undefined&&e.stompOrigin)return [{id:`${e.id}:stomp:${e.stompAt}`,shape:'circle',...e.stompOrigin,radius:130,until:e.stompAt,progress:progress(e.stompAt,stompWindup(e.kind,survivorMode))}];
 if(e.bossJumpTarget&&clock<(e.bossJumpUntil??0))return [{id:`${e.id}:jump:${e.bossJumpUntil}`,shape:'circle',...e.bossJumpTarget,radius:110,until:e.bossJumpUntil!,progress:progress(e.bossJumpUntil!,1.4)}];
 if(e.chargeTarget&&clock<(e.chargeWindupUntil??0))return [{id:`${e.id}:charge:${e.chargeWindupUntil}`,shape:'lane',x:e.x,y:e.y,toX:e.chargeTarget.x,toY:e.chargeTarget.y,width:64,until:e.chargeWindupUntil!,progress:progress(e.chargeWindupUntil!,e.kind==='skeletonWarrior'?.5:.7)}];
 if(e.windup>0&&!e.ranged)return [{id:`${e.id}:melee`,shape:'circle',x:e.x,y:e.y,radius:isBossKind(e.kind)?105:46,until:clock+e.windup,progress:1-e.windup/(isBossKind(e.kind)?.65:.4)}];
 return [];
}

/** A bearing, not a path: never suggests walking straight through source walls. */
export function finalBossBearing(g:Game,e:Enemy){
 if(!g.survivorMode||e.hp<=0||e.id!==g.survival.finalBossId)return null;
 const dx=e.x-g.player.x,dy=e.y-g.player.y,distance=Math.hypot(dx,dy);
 const blocked=!g.attackLineClear(g.player,e);
 if(distance<=80&&!blocked)return null;
 const directions=['东','东南','南','西南','西','西北','北','东北'];
 const arrows=['→','↘','↓','↙','←','↖','↑','↗'];
 const sector=(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8;
 return {direction:directions[sector],arrow:arrows[sector],
   status:blocked?'视线受阻':distance>g.detectionRange?'远处':'',blocked};
}
