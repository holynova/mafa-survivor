import type {Game,Skill} from './game';
import {isBossKind} from './content';
import {getSkill} from './spells';
import {healingCandidates,summonCapacity} from './taoist';
import {skillExtras} from './skill-growth';
export type SkillStatus={label:string;detail:string;active:boolean};
/** Read-only explanation; never calls cast(), rolls randomness or changes targeting. */
export function skillStatus(g:Game,s:Skill):SkillStatus{
 const state=(label:string,detail=label,active=false)=>({label,detail,active});
 if(getSkill(s.id).passive)return state('常驻','已学习后持续生效');
 const buff=g.tao.buffs[0];
 const until=s.id==='shield'?g.player.shieldUntil:s.id==='ghost'?buff?.ghostUntil:s.id==='armor'?buff?.armorUntil:
 ['invisible','groupInvisible'].includes(s.id)&&buff?.invisibleSource===s.id?buff.invisibleUntil:0;
 if((until??0)>g.clock)return state('生效中',`效果剩余 ${Math.ceil(until!-g.clock)} 秒${s.cd>0?` · 冷却 ${s.cd.toFixed(1)} 秒`:''}`,true);
 if(s.cd>0)return state(`冷却 ${s.cd.toFixed(1)} 秒`);
 if(s.id==='heal'||s.id==='groupHeal'){
  const h=healingCandidates(g,s);if(!h.triggered)return state('等待受伤',s.id==='heal'?'自身生命低于70%，或范围内召唤物低于50%时自动治疗。':`范围内至少两名友方受伤，或自身生命低于${(g.survivorMode?70:35)+(skillExtras(s).triggerHP??0)}%时自动治疗。`);
 }
 if(s.id==='skeleton'||s.id==='beast'){
  const c=summonCapacity(g,s);return c.full?state('召唤已满',`同类存活 ${c.owned}/${c.cap}；骷髅与神兽共用总上限。`):state('等待召唤','附近有可站立的空位时自动补充召唤物。');
 }
 const targets=g.targetList(s,false),near=(r:number)=>targets.filter(e=>Math.hypot(e.x-g.player.x,e.y-g.player.y)<r);
 if(s.id==='invisible'){
  if((buff?.visibleUntil??0)>g.clock)return state('显形恢复中','受到显形影响后，短暂等待才能再次隐身。');
  if(!g.survivorMode&&g.player.moving)return state('等待停步');
  const threshold=60+(skillExtras(s).triggerHP??0);
  if(g.player.hp/g.maxHP>=threshold/100)return state('等待受伤',`自身生命低于${threshold}%且有敌人逼近时自动隐身。`);
  if(near(120).length<(g.survivorMode?1:2))return state('等待敌人逼近','敌人进入近身范围时触发；隐身不能避开首领与精英的侦测。');
 }
 if(s.id==='groupInvisible'&&g.survivorMode&&!near(160).length)return state('等待敌人逼近','敌人接近时隐藏自身与附近友方。');
 if(['ghost','armor','heal','groupHeal'].includes(s.id))return state('等待施放');
 if(s.id==='teleport')return state('等待脱险','可点击瞬息移动主动施放；生命低于30%且敌人贴近时自动脱险。');
 if(s.id==='dash')return state('等待突围','自动突围需要低生命和近身敌群；也可手动触发。');
 if(!targets.length)return state('附近无可用目标',s.id==='poison'?'没有可重新施毒的目标；目标需在侦测范围内且不被地形阻挡。':'敌人必须在侦测范围内且不被地形阻挡。');
 if(s.id==='reveal'&&!targets.some(e=>e.elite||isBossKind(e.kind)))return state('等待精英或首领');
 return state('等待触发','冷却已结束；满足技能的距离、目标类型或敌人数要求后自动施放。');
}
