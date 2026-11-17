import {BUILD_GUIDES} from './survivor';
import type {ClassId} from './classes';
import type {SkillId} from './spells';
export const START_UNLOCK_SECONDS=300;
export const SURVIVOR_STARTS:Record<ClassId,readonly [SkillId,SkillId]>={wizard:['fireball','lightning'],warrior:['cleave','thrust'],taoist:['talisman','skeleton']};
export const START_DESCRIPTIONS:Partial<Record<SkillId,string>>={fireball:'远程投射，稳步清怪',lightning:'定点雷击，优先处理单体',cleave:'正面扇形，清出近身空间',thrust:'直线贯穿，1级需同时瞄准至少2敌',talisman:'火符远攻，保持移动',skeleton:'召唤伙伴，以普攻协同作战'};
export function resolveSurvivorStart(role:ClassId,requested?:SkillId){return requested&&SURVIVOR_STARTS[role].includes(requested)?requested:SURVIVOR_STARTS[role][0];}
export function availableSurvivorStarts(role:ClassId,roleBest:Partial<Record<ClassId,number>>){return (roleBest[role]??0)>=START_UNLOCK_SECONDS?[...SURVIVOR_STARTS[role]]:[SURVIVOR_STARTS[role][0]];}

/** Opening support does not have to occupy a long-term damage focus slot. */
export function survivorStartGuide(role:ClassId,requested?:SkillId):{main:SkillId[];text:string}{
 const starter=resolveSurvivorStart(role,requested),base=BUILD_GUIDES[role];
 if(starter==='skeleton')return {main:[...base.main],text:'骷髅起手协助战斗，随后主修火符与神兽；沿安全路线拾取金币经验，灵魂项链用于两条进化配方。'};
 if(starter==='thrust')return {main:['thrust','cleave'],text:'刺杀沿直线穿透，1级需要至少2个目标；随后补半月清理近身敌人，广域护符用于半月进化。'};
 return {main:[starter,...base.main.filter(id=>id!==starter)].slice(0,2),text:starter==='lightning'?'雷电起手处理单体，随后补火球清怪；优先广域护符与火焰戒指。':base.text};
}
