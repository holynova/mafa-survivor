import type {Game,Enemy} from "./game";
import {isBossKind} from "./content";
/** Only observable timers are shown; missing AI timers never become predictions. */
export function enemyInsight(g:Game,e:Enemy) {
  if((e.revealUntil??0)<=g.clock || e.hp<=0)return "";
  const lines=[`${Math.ceil(e.hp)} / ${Math.ceil(e.maxHp)}`];
  if(e.revealTags)lines.push(`物防 ${Number(g.enemyDefense(e,"physical").toFixed(1))} · 魔御 ${Number(g.enemyDefense(e,"magic").toFixed(1))}`);
  if(e.revealDetails) {
    if(e.elite || isBossKind(e.kind))lines.push("击退／困魔免疫");
    const timers:readonly [string,number|undefined][]=[["召唤",e.bossSummonCD],["跳跃",e.bossJumpCD],["法术",e.shockCD],["震地",e.stompCD]];
    const known=timers.filter(([,value])=>typeof value==="number" && Number.isFinite(value));
    if(known.length)lines.push(known.slice(0,2).map(([label,value])=>`${label} ${Math.max(0,value!).toFixed(1)}s`).join(" · "));
  }
  return lines.join("\n");
}
