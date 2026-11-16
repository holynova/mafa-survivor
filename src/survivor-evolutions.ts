import type {Game,Enemy} from './game';
import {isBossKind} from './content';
import type {SkillId} from './spells';
export const EVOLUTIONS:Partial<Record<SkillId,{name:string;charm:string;description:string}>>={
 fireball:{name:'爆裂火球',charm:'flame',description:'命中时爆炸，对附近敌人造成50%溅射伤害。'},
 lightning:{name:'雷霆连锁',charm:'area',description:'命中后向附近最多4个敌人跳跃，每跳伤害递减20%。'},
 cleave:{name:'环月刀阵',charm:'area',description:'命中后围绕自身释放刀气，覆盖半径140px。'},
 firesword:{name:'烈焰斩',charm:'edge',description:'烈火刀命中产生半径120px的高强度爆发。'},
 talisman:{name:'灵符阵',charm:'spirit',description:'火符命中扩散灵力，对周围敌人造成额外伤害。'},
 firewall:{name:'焚天火域',charm:'area',description:'火墙命中时每1.2秒引发一次炎爆，对140px内其他敌人追加本次伤害的100%。'},
 powerstrike:{name:'开山斩',charm:'edge',description:'攻杀命中释放110px冲击，对其他敌人追加65%伤害，并束缚普通怪0.3秒（再受伤解除）；每1.2秒至多一次。'},
 poison:{name:'瘟疫毒雾',charm:'haste',description:'绿毒跳伤每秒最多感染附近3只未中毒敌人：60%毒伤，持续4秒。传播毒不再传染；红毒保持减防。'},
 beast:{name:'圣兽',charm:'spirit',description:'喷火引发额外灵焰，扩大灼烧覆盖范围。'},
};

export function evolutionReadiness(g:Game,id:SkillId){const recipe=EVOLUTIONS[id];if(!recipe)return null;const skill=g.skills.find(s=>s.id===id);return {recipe,rank:skill?.rank??0,hasCharm:(g.survival.charms[recipe.charm]??0)>0,evolved:g.survival.evolved.includes(id),eligibleChests:g.survival.chests.filter(c=>c.eligible).length};}
export function eligibleEvolutions(g:Game){return g.skills.filter(s=>{const r=evolutionReadiness(g,s.id);return r&&r.rank===8&&r.hasCharm&&!r.evolved;});}
export function evolveSkill(g:Game,id:SkillId){if(!eligibleEvolutions(g).some(s=>s.id===id))return;g.survival.evolved.push(id);g.survival.toast='进化完成：'+EVOLUTIONS[id]!.name;g.survival.choiceChest=false;g.choices=[];if(g.phase==='battle')g.pause();else g.phase='paused';g.input={x:0,y:0};g.touchInput={x:0,y:0};g.emit();}
function ready(g:Game,id:SkillId,seconds:number){if(g.clock<(g.survival.evoReadyAt[id]??0))return false;g.survival.evoReadyAt[id]=g.clock+seconds;return true;}
export function survivalSplash(g:Game,e:Enemy,damage:number,id:string){if(!g.survival.evolved.includes(id as SkillId))return;
 if(id==='poison'){
   if(!ready(g,'poison',1))return;
   const source=e.greenPoison;if(!source)return;
   const targets=g.enemies.filter(o=>o.id!==e.id&&o.hp>0&&!(o.greenPoison&&o.greenPoison.until>g.clock)&&Math.hypot(o.x-e.x,o.y-e.y)<120&&Math.hypot(o.x-g.player.x,o.y-g.player.y)<=g.detectionRange&&g.attackLineClear(e,o)).slice(0,3);
   for(const o of targets){o.greenPoison={until:g.clock+4,tickAt:g.clock+1,damage:Math.max(1,Math.round(source.damage*.6)),origin:'evolution:poison'};g.effect('poison',o.x,o.y,0,.7);}return;
 }
 if(id==='firewall'||id==='powerstrike'){
   if(!ready(g,id,1.2))return;
   const radius=id==='firewall'?140:110;const pulse=g.effect(id==='firewall'?'explosion':'powerstrike',e.x,e.y,radius,.45);if(id==='firewall')pulse.alpha=.5;
   const targets=g.enemies.filter(o=>o.hp>0&&Math.hypot(o.x-e.x,o.y-e.y)<radius&&g.attackLineClear(e,o)).slice(0,12);
   for(const o of targets){if(o.id!==e.id)g.hit(o,damage*(id==='firewall'?1:.65),'evolution:'+id,id==='firewall'?'magic':'physical');if(id==='powerstrike'&&o.hp>0&&!o.elite&&!isBossKind(o.kind))o.trapUntil=Math.max(o.trapUntil??0,g.clock+.3);}return;
 }
 if(id==='lightning'){
   let from=e,amount=damage*.65;const visited=new Set([e.id]);
   for(let i=0;i<4;i++){const origin=from;const next=g.enemies.filter(o=>!visited.has(o.id)&&o.hp>0&&Math.hypot(o.x-origin.x,o.y-origin.y)<170&&g.attackLineClear(origin,o)).sort((a,b)=>Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y))[0];if(!next)break;visited.add(next.id);g.effect('lightning',next.x,next.y,20,.3);g.hit(next,amount,'evolution:'+id,'magic');amount*=.8;from=next;}return;
 }
 const origin=id==='cleave'?g.player:e;
 const radius=id==='cleave'?140:id==='firesword'?120:id==='beast'?110:90;
 const factor=id==='firesword'?.85:id==='beast'?.35:.5;
 g.effect(id==='cleave'?'cleave':id==='talisman'?'talismanHit':'explosion',origin.x,origin.y,radius,.35);
 for(const other of g.enemies.filter(o=>o.id!==e.id&&o.hp>0&&Math.hypot(o.x-origin.x,o.y-origin.y)<radius&&g.attackLineClear(origin,o)).slice(0,12))g.hit(other,damage*factor,'evolution:'+id,id==='cleave'?'physical':'magic');
}
