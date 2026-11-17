import type {Enemy} from './game';
import {isBossKind} from './content';
import {rangedTiming} from './ranged-timing';
export type EnemyActionCue={text:string;progress:number;state:'windup'|'recovery'};
/** Caster status only: no line, aim marker, or implied damage area. */
export function enemyActionCue(e:Enemy,clock:number,survivorMode:boolean):EnemyActionCue|null{
 if(!survivorMode||e.hp<=0||!e.ranged||!e.elite&&!isBossKind(e.kind))return null;
 const timing=rangedTiming(e.kind,survivorMode);
 if(e.rangedFireAt!==undefined&&e.rangedTarget&&clock<e.rangedFireAt){
  const action=['spider','evilSnake','moonSpider','oneEyeSpider'].includes(e.kind)?'喷毒':['zumaArcher','skeletonArcher'].includes(e.kind)?'齐射':e.kind==='flameWoma'?'喷火':'攻击';
  return {text:`! ${action}蓄力`,progress:Math.max(0,Math.min(1,1-(e.rangedFireAt-clock)/timing.windup)),state:'windup'};
 }
 if(e.kind==='evilSnake'&&(e.staggerUntil??0)>clock){
  return {text:'反击时机',progress:Math.max(0,Math.min(1,(e.staggerUntil!-clock)/timing.recovery)),state:'recovery'};
 }
 return null;
}
