import type {Game,Skill} from "./game";
import {getSkill} from "./spells";
import {cooldownScale} from "./cadence";
import {skillExtras} from "./skill-growth";

export function skillCooldown(s:Pick<Skill,"id"|"localCDR">,globalCDR=0) {
  if(getSkill(s.id).passive)return 0;
  const floor=s.id==="shield" ? 8 : ["ghost","armor"].includes(s.id) ? 14 :
    s.id==="invisible" ? 12 : s.id==="groupInvisible" ? 15 : .4*cooldownScale(s.id);
  return Math.max(floor,getSkill(s.id).cooldown*(1-globalCDR/100)*(1-Math.min(60,s.localCDR)/100));
}
const n=(v:number)=>Number(v.toFixed(2));
/** Effective boundaries, with the same equipment caps and cooldown floor as combat. */
export function skillMetrics(g:Game,s:Skill):string[] {
  const extra=skillExtras(s),out:string[]=[];
  const rad=(base:number)=>(base+(s.id==="groupInvisible" ? s.range : 0))*(1+s.radius/100)*(1+(g.stats.skill_radius??0)/100);
  const duration=(base:number,cap=Infinity)=>n(Math.min(cap,base*(1+s.duration/100)*(1+(g.stats.duration??0)/100)));
  out.push(getSkill(s.id).passive ? "常驻" : `实际冷却 ${n(skillCooldown(s,g.stats.cooldown_reduction??0))}秒`);
  if(s.power && !["poison","reveal","ghost","armor"].includes(s.id))out.push(`${["heal","groupHeal"].includes(s.id) ? "治疗量" : "威力"} +${n(s.power)}%`);
  if(["fireball","bigfireball","lightning","talisman","poison","holy","heal","reveal"].includes(s.id))out.push(`最多${Math.min(3,1+s.count)}个不同目标`);
  if(s.id==="firewall")out.push(`每次最多${Math.min(3,1+s.count)}片／同存${Math.min(4,2+s.count)}片`,`半径${n(rad(64))}px／持续${duration(6)}秒`);
  if(s.id==="shield")out.push(`减伤${n(Math.min(35,20+s.shieldReduction))}%／持续${n(Math.min(7,6*(1+s.duration/100)))}秒`);
  if(["hellfire","beam"].includes(s.id))out.push(`有效长度${n(Math.min(g.detectionRange,(s.id==="hellfire" ? 240 : 520)+s.range))}px`,`宽度${n(rad(s.id==="hellfire" ? 26 : 18)*2)}px`);
  if(["repulse","explosion","ice","nova","cleave","trap","groupHeal","groupInvisible","ghost","armor","heal"].includes(s.id)) {
    const base={repulse:120,explosion:80,ice:110,nova:140,cleave:70,trap:72,groupHeal:144,groupInvisible:72,ghost:160,armor:160,heal:180}[s.id as "repulse"];
    out.push(`半径${n(rad(base))}px`);
  }
  if(s.id==="repulse")out.push(`击退${n(110*(1+s.knockback/100))}px／无伤害`);
  if(s.id==="nova")out.push(`至少${4-(extra.triggerReduction??0)}敌触发`);
  if(s.id==="thrust")out.push(`直线${n((96+s.range)*(1+(g.stats.skill_radius??0)/100))}px`,`至少${extra.solo ? 1 : 2}敌命中`);
  if(s.id==="cleave")out.push(`正面${Math.min(230,180+s.angle)}°`);
  if(s.id==="dash")out.push(`冲刺${180+s.range}px`);
  if(s.id==="firesword")out.push(`烈火刀距离${48+s.range}px`);
  if(s.id==="poison")out.push(`持续${duration(6,15)}秒`,`红毒减防${Math.min(35,15+s.power)}%／绿毒跳伤+${extra.poisonPower??0}%`);
  if(s.id==="skeleton" || s.id==="beast")out.push(`上限${s.id==="skeleton" ? Math.min(2,1+s.count) : 1}只`,`生命+${s.summonHP}%／伤害+${s.summonPower}%`,`攻击间隔−${extra.petHaste??0}%`);
  if(s.id==="beast")out.push(`喷火长度${n(140*(1+s.radius/100))}px／张角${n(72*(1+(extra.flameAngle??0)/100))}°`);
  if(s.id==="charm")out.push(`上限${Math.min(5,2+s.count)}只／伤害+${s.summonPower}%／生命+${s.summonHP}%`);
  if(s.id==="invisible" || s.id==="groupInvisible")out.push(`持续${duration(s.id==="invisible" ? 6 : 5,s.id==="invisible" ? 8 : 9)}秒`,`发现距离${Math.max(8,28-s.chance)}px`);
  if(s.id==="invisible")out.push(`自身生命低于${60+(extra.triggerHP??0)}%触发`);
  if(s.id==="groupHeal")out.push(`自身急救阈值${35+(extra.triggerHP??0)}%`);
  if(["ghost","armor"].includes(s.id))out.push(`加成值+${s.power}%／持续${duration(8,12)}秒`);
  if(s.id==="trap")out.push(`持续${duration(4,8)}秒／受伤解除`);
  if(s.id==="reveal")out.push(`显示${duration(6,12)}秒`,extra.revealDetails ? "防御／免疫／可追踪冷却" : s.power ? "血量／防御" : "血量");
  if(s.id==="teleport")out.push(`最小距离${200+s.range}px／落点优选${Math.min(90,50+s.chance)}%`);
  if(s.id==="spirit")out.push(`火符自身命中${Math.min(100,90+s.chance)}%`);
  if(extra.basicHaste)out.push(`普攻间隔−${extra.basicHaste}%`);
  return out;
}
