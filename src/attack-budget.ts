import type {Enemy,Game} from './game';
import {isBossKind} from './content';
export const MAJOR_ATTACK_LIMIT=2;
/** Includes committed travel/damage, not just the visible windup. */
export function majorAttackActive(e:Enemy,clock:number){
 if(e.hp<=0)return false;
 return !!e.shock||e.stompAt!==undefined||!!e.bossJumpTarget||!!e.chargeTarget&&(e.chargeUntil??0)>clock||
  (e.elite||isBossKind(e.kind))&&(e.windup>0||e.rangedFireAt!==undefined);
}
export function canStartMajorAttack(g:Game,e:Enemy){
 if(!g.survivorMode)return true;
 if(majorAttackActive(e,g.clock))return false;
 let active=0;for(const other of g.enemies)if(other.id!==e.id&&majorAttackActive(other,g.clock)&&++active>=MAJOR_ATTACK_LIMIT)return false;
 return true;
}
