import {getSkill, type SkillId, type SkillField} from "./spells";

export const MAX_SKILL_RANK = 6;
export const FINAL_RANK_WAVE = 6;
export const SKILL_FIELDS: readonly SkillField[] = ["power","count","radius","duration","localCDR","shieldReduction","speed","range","knockback","chance","summonPower","accuracy","angle","hitFloor","summonHP"];
type ExtraField = "basicHaste" | "petHaste" | "flameAngle" | "poisonPower" | "triggerReduction" | "triggerHP" | "solo" | "lineWidth" | "revealDetails";
type Effects = Partial<Record<SkillField | ExtraField, number>>;
export type GrowthStep = {label:string;add:Effects};
/** Authoritative fixed track; labels, cards, testing and combat read the same data. */
export const SKILL_GROWTH: Record<SkillId, readonly GrowthStep[]> = {
  fireball: [{"label":"1发","add":{}},{"label":"最多2发","add":{"count":1}},{"label":"威力+12%","add":{"power":12}},{"label":"CD−8%；弹速+20%","add":{"localCDR":8,"speed":20}},{"label":"威力+12%","add":{"power":12}},{"label":"最多3发；CD−7%","add":{"count":1,"localCDR":7}}],
  lightning: [{"label":"1个目标","add":{}},{"label":"最多2个目标","add":{"count":1}},{"label":"威力+15%","add":{"power":15}},{"label":"CD−10%","add":{"localCDR":10}},{"label":"威力+15%","add":{"power":15}},{"label":"最多3个目标；威力+10%","add":{"count":1,"power":10}}],
  firewall: [{"label":"每次1片；同存2片；持续6秒","add":{}},{"label":"每次最多2片；同存3片","add":{"count":1}},{"label":"每秒伤害+10%","add":{"power":10}},{"label":"半径+15%；持续→7秒","add":{"radius":15,"duration":16.666666666666668}},{"label":"CD−10%","add":{"localCDR":10}},{"label":"每次最多3片；同存4片；持续→8秒；每秒伤害+10%","add":{"count":1,"duration":16.666666666666668,"power":10}}],
  shield: [{"label":"减伤20%；持续6秒","add":{}},{"label":"减伤→25%","add":{"shieldReduction":5}},{"label":"持续→6.5秒","add":{"duration":8.333333333333334}},{"label":"CD−10%","add":{"localCDR":10}},{"label":"减伤→30%","add":{"shieldReduction":5}},{"label":"减伤→35%；持续→7秒","add":{"shieldReduction":5,"duration":8.333333333333334}}],
  repulse: [{"label":"半径120px；击退110px；无伤害","add":{}},{"label":"半径+15%","add":{"radius":15}},{"label":"击退距离+20%","add":{"knockback":20}},{"label":"CD−10%","add":{"localCDR":10}},{"label":"半径+15%","add":{"radius":15}},{"label":"半径+10%；击退距离+10%；CD−5%","add":{"radius":10,"knockback":10,"localCDR":5}}],
  hellfire: [{"label":"长240px、宽52px的直线火焰","add":{}},{"label":"宽度+20%","add":{"radius":20}},{"label":"威力+15%","add":{"power":15}},{"label":"长度→288px","add":{"range":48}},{"label":"CD−10%","add":{"localCDR":10}},{"label":"威力+20%；宽度+10%；CD−5%","add":{"power":20,"radius":10,"localCDR":5}}],
  bigfireball: [{"label":"1发重火球","add":{}},{"label":"威力+15%","add":{"power":15}},{"label":"CD−8%","add":{"localCDR":8}},{"label":"最多2发","add":{"count":1}},{"label":"威力+15%","add":{"power":15}},{"label":"威力+20%；CD−7%","add":{"power":20,"localCDR":7}}],
  teleport: [{"label":"手动；最小距离200px；落点优选50%","add":{}},{"label":"落点优选→60%","add":{"chance":10}},{"label":"CD−10%","add":{"localCDR":10}},{"label":"最小距离→220px","add":{"range":20}},{"label":"落点优选→70%","add":{"chance":10}},{"label":"最小距离→240px；落点优选→85%；CD−10%","add":{"range":20,"chance":15,"localCDR":10}}],
  explosion: [{"label":"半径80px的落点爆发","add":{}},{"label":"半径+20%","add":{"radius":20}},{"label":"威力+15%","add":{"power":15}},{"label":"CD−10%","add":{"localCDR":10}},{"label":"半径+20%","add":{"radius":20}},{"label":"威力+20%；CD−5%","add":{"power":20,"localCDR":5}}],
  beam: [{"label":"直线贯通；形状宽36px、长520px","add":{}},{"label":"宽度+20%","add":{"radius":20}},{"label":"威力+15%","add":{"power":15}},{"label":"CD−10%","add":{"localCDR":10}},{"label":"宽度+20%","add":{"radius":20}},{"label":"威力+20%；宽度+10%；CD−5%","add":{"power":20,"radius":10,"localCDR":5}}],
  nova: [{"label":"半径140px；至少4敌触发","add":{}},{"label":"触发门槛→至少3敌","add":{"triggerReduction":1}},{"label":"威力+15%","add":{"power":15}},{"label":"半径+20%","add":{"radius":20}},{"label":"CD−10%","add":{"localCDR":10}},{"label":"触发门槛→至少2敌；威力+15%","add":{"triggerReduction":1,"power":15}}],
  holy: [{"label":"1个合格亡灵；基础成功率35%","add":{}},{"label":"最多2个目标","add":{"count":1}},{"label":"成功率+5个百分点","add":{"chance":5}},{"label":"CD−10%","add":{"localCDR":10}},{"label":"成功率+5个百分点","add":{"chance":5}},{"label":"最多3个目标；对合格精英／Boss普通伤害+20%","add":{"count":1,"power":20}}],
  ice: [{"label":"半径110px的范围冰伤","add":{}},{"label":"半径+20%","add":{"radius":20}},{"label":"威力+10%","add":{"power":10}},{"label":"CD−10%","add":{"localCDR":10}},{"label":"半径+20%","add":{"radius":20}},{"label":"半径+15%；威力+15%；CD−5%","add":{"radius":15,"power":15,"localCDR":5}}],
  charm: [{"label":"诱惑宝宝上限2只","add":{}},{"label":"上限→3只","add":{"count":1}},{"label":"成功率+5个百分点","add":{"chance":5}},{"label":"上限→4只","add":{"count":1}},{"label":"宝宝伤害+15%","add":{"summonPower":15}},{"label":"上限→5只；成功率+5个百分点；生命+20%","add":{"count":1,"chance":5,"summonHP":20}}],
  swordsmanship: [{"label":"准确+5","add":{}},{"label":"普攻威力+10%","add":{"power":10}},{"label":"普攻间隔−5%","add":{"basicHaste":5}},{"label":"准确+3；普攻威力+5%","add":{"accuracy":3,"power":5}},{"label":"普攻威力+10%","add":{"power":10}},{"label":"普攻间隔−5%；普攻威力+10%","add":{"basicHaste":5,"power":10}}],
  powerstrike: [{"label":"强化下一次挥刀的附加伤害","add":{}},{"label":"附加伤害+15%","add":{"power":15}},{"label":"蓄力CD−8%","add":{"localCDR":8}},{"label":"准确+3；附加伤害+10%","add":{"accuracy":3,"power":10}},{"label":"附加伤害+15%","add":{"power":15}},{"label":"附加伤害+15%；蓄力CD−7%","add":{"power":15,"localCDR":7}}],
  thrust: [{"label":"长96px直线；至少命中2敌发动","add":{}},{"label":"允许单目标；自动瞄准首领／精英","add":{"solo":1}},{"label":"威力+12%","add":{"power":12}},{"label":"长度→144px；宽度+10%","add":{"range":48,"lineWidth":10}},{"label":"CD−10%","add":{"localCDR":10}},{"label":"长度→192px；威力+18%","add":{"range":48,"power":18}}],
  cleave: [{"label":"正面180°；半径70px；自动选群；至少2敌","add":{}},{"label":"扇角→200°","add":{"angle":20}},{"label":"威力+12%","add":{"power":12}},{"label":"CD−10%","add":{"localCDR":10}},{"label":"半径+10%","add":{"radius":10}},{"label":"扇角→230°；威力+15%；CD−5%","add":{"angle":30,"power":15,"localCDR":5}}],
  dash: [{"label":"冲刺180px，推开合格普通怪","add":{}},{"label":"距离→204px","add":{"range":24}},{"label":"CD−10%","add":{"localCDR":10}},{"label":"击退宽度+20%","add":{"radius":20}},{"label":"距离→228px","add":{"range":24}},{"label":"距离→252px；CD−10%","add":{"range":24,"localCDR":10}}],
  firesword: [{"label":"下一刀附加烈火伤害","add":{}},{"label":"附加伤害+15%","add":{"power":15}},{"label":"烈火刀近战距离+4px","add":{"range":4}},{"label":"蓄力CD−10%","add":{"localCDR":10}},{"label":"附加伤害+15%","add":{"power":15}},{"label":"附加伤害+20%；近战距离+4px；CD−5%","add":{"power":20,"range":4,"localCDR":5}}],
  heal: [{"label":"最多治疗1个目标；半径180px","add":{}},{"label":"最多治疗2个目标","add":{"count":1}},{"label":"治疗量+10%","add":{"power":10}},{"label":"CD−10%","add":{"localCDR":10}},{"label":"治疗量+10%","add":{"power":10}},{"label":"最多治疗3个目标；治疗量+15%；CD−5%","add":{"count":1,"power":15,"localCDR":5}}],
  spirit: [{"label":"准确+5；火符自身命中90%","add":{}},{"label":"火符自身命中→94%","add":{"chance":4}},{"label":"普攻威力+10%","add":{"power":10}},{"label":"普攻间隔−5%","add":{"basicHaste":5}},{"label":"火符自身命中→98%","add":{"chance":4}},{"label":"火符自身命中→100%；普攻威力+15%；普攻间隔−5%","add":{"chance":2,"power":15,"basicHaste":5}}],
  poison: [{"label":"1目标；持续6秒；红毒减防15%","add":{}},{"label":"最多2个目标","add":{"count":1}},{"label":"绿毒每跳伤害+10%","add":{"poisonPower":10}},{"label":"持续→8秒；红毒减防→25%","add":{"duration":33.333333333333336,"power":10}},{"label":"绿毒每跳伤害+10%","add":{"poisonPower":10}},{"label":"最多3个目标；持续→10秒；红毒减防→35%","add":{"count":1,"duration":33.333333333333336,"power":10}}],
  talisman: [{"label":"1张火符","add":{}},{"label":"最多2张","add":{"count":1}},{"label":"威力+12%","add":{"power":12}},{"label":"CD−8%；弹速+15%","add":{"localCDR":8,"speed":15}},{"label":"威力+12%","add":{"power":12}},{"label":"最多3张；CD−7%","add":{"count":1,"localCDR":7}}],
  skeleton: [{"label":"骷髅上限1只；基础生命110","add":{}},{"label":"骷髅生命+15%","add":{"summonHP":15}},{"label":"骷髅伤害+12%","add":{"summonPower":12}},{"label":"上限→2只","add":{"count":1}},{"label":"补召CD−10%","add":{"localCDR":10}},{"label":"生命+20%；伤害+12%；攻击间隔−10%","add":{"summonHP":20,"summonPower":12,"petHaste":10}}],
  invisible: [{"label":"静止隐身6秒；发现距离28px；生命阈值60%","add":{}},{"label":"持续→7秒","add":{"duration":16.666666666666668}},{"label":"发现距离→24px","add":{"chance":4}},{"label":"生命阈值→65%","add":{"triggerHP":5}},{"label":"CD−10%","add":{"localCDR":10}},{"label":"持续→8秒；发现距离→18px；生命阈值→70%","add":{"duration":16.666666666666668,"chance":6,"triggerHP":5}}],
  groupInvisible: [{"label":"半径72px；静止隐身5秒","add":{}},{"label":"半径→96px","add":{"range":24}},{"label":"持续→6秒","add":{"duration":20}},{"label":"CD−10%","add":{"localCDR":10}},{"label":"半径→120px","add":{"range":24}},{"label":"半径→144px；持续→8秒；发现距离→20px","add":{"range":24,"duration":40,"chance":8}}],
  ghost: [{"label":"增加魔御；持续8秒；半径160px","add":{}},{"label":"魔御加成值+10%","add":{"power":10}},{"label":"持续→9秒","add":{"duration":12.5}},{"label":"半径+20%","add":{"radius":20}},{"label":"魔御加成值+10%","add":{"power":10}},{"label":"持续→12秒；半径+10%；加成值+10%","add":{"duration":37.5,"radius":10,"power":10}}],
  armor: [{"label":"增加物防；持续8秒；半径160px","add":{}},{"label":"物防加成值+10%","add":{"power":10}},{"label":"持续→9秒","add":{"duration":12.5}},{"label":"半径+20%","add":{"radius":20}},{"label":"物防加成值+10%","add":{"power":10}},{"label":"持续→12秒；半径+10%；加成值+10%","add":{"duration":37.5,"radius":10,"power":10}}],
  reveal: [{"label":"显示1个精英／Boss的血量6秒","add":{}},{"label":"最多显示2个目标","add":{"count":1}},{"label":"显示持续→8秒","add":{"duration":33.333333333333336}},{"label":"增加物防／魔御信息","add":{"power":1}},{"label":"最多显示3个目标；持续→10秒","add":{"count":1,"duration":33.333333333333336}},{"label":"持续→12秒；增加控制免疫与可追踪的关键技能冷却信息","add":{"duration":33.333333333333336,"revealDetails":1}}],
  trap: [{"label":"半径72px；困住合格普通怪4秒","add":{}},{"label":"半径+15%","add":{"radius":15}},{"label":"持续→5秒","add":{"duration":25}},{"label":"CD−10%","add":{"localCDR":10}},{"label":"半径+15%","add":{"radius":15}},{"label":"持续→7秒；半径+10%；CD−5%","add":{"duration":50,"radius":10,"localCDR":5}}],
  groupHeal: [{"label":"半径144px内治疗受伤友方","add":{}},{"label":"半径+15%","add":{"radius":15}},{"label":"治疗量+12%","add":{"power":12}},{"label":"CD−10%","add":{"localCDR":10}},{"label":"自身急救阈值35%→45%","add":{"triggerHP":10}},{"label":"半径+15%；治疗量+18%；CD−5%","add":{"radius":15,"power":18,"localCDR":5}}],
  beast: [{"label":"上限1只；生命270；喷火长140px、张角72°","add":{}},{"label":"生命+15%","add":{"summonHP":15}},{"label":"喷火张角+15%","add":{"flameAngle":15}},{"label":"伤害+12%；喷火长度+15%","add":{"summonPower":12,"radius":15}},{"label":"生命+20%","add":{"summonHP":20}},{"label":"伤害+18%；张角+15%；喷火间隔−10%","add":{"summonPower":18,"flameAngle":15,"petHaste":10}}],
};
const effectCache=new Map<string,Effects>();
export function growthEffects(id:SkillId,rank:number):Effects {
  rank=Math.max(1,Math.min(MAX_SKILL_RANK,Math.floor(rank)));
  const key=id+":"+rank,cached=effectCache.get(key);if(cached)return cached;
  const out:Effects={};
  for(const step of SKILL_GROWTH[id].slice(0,Math.max(1,Math.min(MAX_SKILL_RANK,Math.floor(rank)))))
    for(const [key,value] of Object.entries(step.add))out[key as keyof Effects]=(out[key as keyof Effects]??0)+value;
  effectCache.set(key,Object.freeze(out));
  return out;
}
export function canonicalBonuses(id:SkillId,rank:number) {
  const effects=growthEffects(id,rank);
  return Object.fromEntries(SKILL_FIELDS.map(key=>[key,effects[key]??0])) as Record<SkillField,number>;
}
export const skillExtras = (s:{id:SkillId;rank:number}) => growthEffects(s.id,s.rank);
export const canAdvanceSkill = (s:{rank:number},wave:number,testing=false) =>
  s.rank<MAX_SKILL_RANK && (s.rank<MAX_SKILL_RANK-1 || wave>=FINAL_RANK_WAVE || testing);
export function nextSkillLabel(s:{id:SkillId;rank:number}) {
  return s.rank>=MAX_SKILL_RANK ? "已达6级" : `Lv.${s.rank} → Lv.${s.rank+1}：${SKILL_GROWTH[s.id][s.rank].label}`;
}
/** Book prices are explicit per skill and independent of upgrade-card RNG. */
const advanced = new Set<SkillId>(["ice","beam","nova","holy","charm","beast","groupHeal","groupInvisible"]);
const intermediate = new Set<SkillId>(["lightning","firewall","bigfireball","explosion","teleport","firesword","powerstrike","poison","ghost","armor"]);
export function bookTier(id:SkillId) {return advanced.has(id) ? 3 : intermediate.has(id) ? 2 : 1;}
export function bookPrice(id:SkillId,wave:number) {return Math.round(([0,80,140,220][bookTier(id)])*(1+.045*(wave-1)));}
export function bookAvailable(id:SkillId,wave:number) {return bookTier(id)<3 || wave>=3;}
export const bookName = (id:SkillId) => `${getSkill(id).name}·技能书`;
