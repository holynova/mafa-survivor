import type {Enemy,Game} from "./game";

export type DamageOrigin="weapon"|"spell"|"summon"|"execution";
export type CombatHealing={onKill:number;lifeSteal:number};
export const newCombatRecovery=()=>({
  healing:{onKill:0,lifeSteal:0} as CombatHealing,
  killReadyAt:0,
  killEvents:[] as {at:number;amount:number}[],
});

/** Uses one real damage event, after mitigation and clamped to enemy health. */
export function recoverHit(g:Game,e:Enemy,dealt:number,origin:DamageOrigin) {
  if(g.phase!=="battle" || g.player.hp<=0 || e.summoned || dealt<=0)return;
  const state=g.combatRecovery;
  const heal=(amount:number,key:keyof CombatHealing)=>{
    const actual=Math.min(Math.max(0,g.maxHP-g.player.hp),Math.max(0,amount));
    g.player.hp+=actual;state.healing[key]+=actual;return actual;
  };
  const factor=origin==="weapon" ? 1 : origin==="spell" ? 1/3 : 0;
  heal(dealt*(g.stats.lifesteal ?? 0)/100*factor,"lifeSteal");
  if(e.hp>0 || (g.stats.hp_on_kill ?? 0)<=0 || g.clock+1e-8<state.killReadyAt)return;
  state.killEvents=state.killEvents.filter(event=>event.at>g.clock-1+1e-8);
  const available=Math.max(0,5-state.killEvents.reduce((sum,event)=>sum+event.amount,0));
  const actual=heal(Math.min(g.stats.hp_on_kill ?? 0,available),"onKill");
  if(actual>0) {
    state.killEvents.push({at:g.clock,amount:actual});
    state.killReadyAt=g.clock+0.1;
  }
}
