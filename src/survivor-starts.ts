import type {ClassId} from './classes';
import type {SkillId} from './spells';
export const START_UNLOCK_SECONDS=300;
export const SURVIVOR_STARTS:Record<ClassId,readonly [SkillId,SkillId]>={wizard:['fireball','lightning'],warrior:['cleave','thrust'],taoist:['talisman','skeleton']};
export const START_DESCRIPTIONS:Partial<Record<SkillId,string>>={fireball:'远程投射，稳步清怪',lightning:'定点雷击，优先处理单体',cleave:'正面扇形，清出近身空间',thrust:'直线贯穿，1级需同时瞄准至少2敌',talisman:'火符远攻，保持移动',skeleton:'召唤伙伴，以普攻协同作战'};
export function resolveSurvivorStart(role:ClassId,requested?:SkillId){return requested&&SURVIVOR_STARTS[role].includes(requested)?requested:SURVIVOR_STARTS[role][0];}
export function availableSurvivorStarts(role:ClassId,roleBest:Partial<Record<ClassId,number>>){return (roleBest[role]??0)>=START_UNLOCK_SECONDS?[...SURVIVOR_STARTS[role]]:[SURVIVOR_STARTS[role][0]];}
