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
 // A volley remains committed after its caster recovers or dies. Count the
 // source once, not each fan projectile, and release only when its shots expire.
 const sources=new Set(g.projectiles.filter(p=>p.faction==='enemy'&&p.life>0&&p.majorSource!==undefined).map(p=>p.majorSource!));
 if(majorAttackActive(e,g.clock)||sources.has(e.id))return false;
 for(const other of g.enemies)if(other.id!==e.id&&majorAttackActive(other,g.clock))sources.add(other.id);
 if(sources.size>=MAJOR_ATTACK_LIMIT)return false;
 return true;
}
