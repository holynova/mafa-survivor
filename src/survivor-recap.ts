import type {Game} from './game';
import {damageSourceName} from './damage-taken';
import {EVOLUTIONS} from './survivor-evolutions';
import {getSkill} from './spells';
export function survivorRecap(g:Game){
 const result=g.result;
 const damage=result?.damageTaken??g.damageTaken;
 const sources=Object.entries(damage.sources).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]);
 const total=damage.physical+damage.magic;
 const top=sources.slice(0,3).map(([id,amount])=>({id,name:damageSourceName(id),amount,share:total?Math.round(amount/total*100):0}));
 const cause=g.survival.timedOut?'决战时间耗尽':result?.won?'生存目标完成':result?.deathSource?damageSourceName(result.deathSource):'本局结束';
 const combat=result?.combatHealing??g.combatRecovery.healing;
 const healing=[{name:'击杀回复',amount:combat.onKill},{name:'吸血回复',amount:combat.lifeSteal},...Object.entries(result?.healing??g.tao.healing).map(([id,amount])=>({name:id==='bloodPotion'?'血瓶':(()=>{try{return `${getSkill(id as typeof g.skills[number]['id']).name}（含友方）`;}catch{return '其他治疗';}})(),amount}))].filter(x=>x.amount>0);
 const build=g.skills.map(s=>({id:s.id,name:getSkill(s.id).name,rank:s.rank,evolution:g.survival.evolved.includes(s.id)?EVOLUTIONS[s.id]?.name:undefined}));
 let tip='留意首领蓄力后的停顿，利用空档输出并拾取奖励。';
 if(!g.survival.evolved.length&&g.skills.some(s=>s.rank===8&&EVOLUTIONS[s.id]))tip='已有满级主攻技能：下一局留意进化配方缺项，并主动拾取进化宝箱。';
 else if(g.survival.timedOut)tip='决战输出不足：优先完善主攻技能与进化，首领停顿时靠近输出。';
 else if(top[0]?.id.endsWith(':projectile'))tip='主要承伤来自弹体：尝试横向走位，利用地形切断远程敌人的射线。';
 else if(g.skills.length>=4&&g.skills.filter(s=>s.rank>=4).length<2)tip='技能较分散：下一局先集中升级1—2个主攻技能，再补辅助。';
 return {cause,total,physical:damage.physical,magic:damage.magic,top,healing,build,tip};
}
