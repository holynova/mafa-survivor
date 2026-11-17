import {announceEncounter} from './encounters';
import {EVOLUTION_CHEST_AFTER,survivorSpawnInterval,survivalThreatScale} from './survivor-pacing';
import {SURVIVAL_LATE_GROWTH} from './survivor-growth';
import {EVOLUTIONS,eligibleEvolutions,evolveSkill} from './survivor-evolutions';
export {EVOLUTIONS,survivalSplash,evolutionReadiness} from './survivor-evolutions';
import {CLASSES,type ClassId} from './classes';
import type {Game,Enemy,Skill,Upgrade} from './game';
import {getSkill,SKILLS,MAPS,NATIVE_ELITES,STATIONARY_MONSTERS,CHAPTER_PRESSURE,EXPANSION_RANGED,isBossKind,type StatKey} from './content';
import type {SkillId} from './spells';
import {canonicalBonuses,SKILL_GROWTH} from './skill-growth';
export const SURVIVAL_SECONDS=1200;
export const FINAL_OVERTIME_SECONDS=120;
// Temporary open roster requested for scene testing; earned progress remains separate.
export const SURVIVAL_OPEN_MAP_TEST=true;
export const survivalStarter=(id:ClassId)=>id==='warrior'?'cleave':CLASSES[id].startingSkill;
export const BUILD_GUIDES={wizard:{main:['fireball','lightning'],text:'火球清怪，雷电补足精英伤害；优先火焰戒指与广域护符。'},warrior:{main:['cleave','firesword'],text:'先强化半月清出空间，再用烈火击破精英；搭配广域护符与锋锐戒指。'},taoist:{main:['talisman','beast'],text:'火符负责前期，神兽形成双核；灵魂项链同时满足两条进化配方。'}} as const;
export const CHARMS=[
 {id:'flame',name:'火焰戒指',stat:'mc_bonus_pct',value:8},
 {id:'edge',name:'锋锐戒指',stat:'dc_bonus_pct',value:8},
 {id:'spirit',name:'灵魂项链',stat:'sc_bonus_pct',value:8},
 {id:'haste',name:'疾风项链',stat:'cooldown_reduction',value:6},
 {id:'area',name:'广域护符',stat:'skill_radius',value:8},
 {id:'life',name:'长生手镯',stat:'hp_max',value:15},
 {id:'magnet',name:'拾取护符',stat:'pickup_radius',value:25},
 {id:'eagle',name:'鹰眼戒指',stat:'detection_range',value:10},
 {id:'swift',name:'疾行靴',stat:'move_speed',value:4},
 {id:'recovery',name:'回春戒指',stat:'hp_regen',value:.5},
] as const;
export function newSurvival(){return {spawnAt:0,eliteAt:120,bossAt:300,finalBossId:0,finalBossDefeated:false,overtimeEndsAt:0,timedOut:false,respecs:2,seenSkills:[] as SkillId[],eliteDefeats:0,rerolls:3,charms:{} as Record<string,number>,evolved:[] as SkillId[],evoReadyAt:{} as Partial<Record<SkillId,number>>,chests:[] as {id:number;x:number;y:number;eligible:boolean}[],nextChest:1,choiceChest:false,toast:'',end:false};}
/** Rank 1–6 retain verified effects; the last two ranks specialize by skill role. */
export const survivalLateGrowth=(id:SkillId)=>SURVIVAL_LATE_GROWTH[id];
export function survivalDescription(id:SkillId){
 const descriptions:Partial<Record<SkillId,string>>={
  cleave:'向附近敌人挥出半月刀光；一个目标即可触发，优先覆盖敌群。',
  invisible:'生命低于60%且120px内有敌人时隐身；移动和自动攻击不解除。普通怪贴身、精英与首领仍可侦测。',
  groupInvisible:'160px内有敌人时，为自身及范围内宝宝隐身；单人也可施放，移动和自动攻击不解除。精英与首领仍可侦测。',
  groupHeal:'附近至少两名友方受伤，或自身生命低于70%时治疗范围内所有受伤友方；无需召唤物也能自救。',
  teleport:'生命低于30%且90px内有敌人时自动传送到远处空地；无安全落点时等待。',
 };
 return descriptions[id]??getSkill(id).description;
}
export function survivalGrowth(id:SkillId){return [...SKILL_GROWTH[id],...survivalLateGrowth(id)].map((step,index)=>{
 const labels:Partial<Record<SkillId,Record<number,string>>>={
  cleave:{0:'正面180°；半径70px；单个近敌即可触发，优先覆盖敌群'},
  invisible:{0:'隐身6秒；生命低于60%且近处有敌触发；移动/自动攻击不解除'},
  groupInvisible:{0:'自身及72px内友方隐身5秒；近敌触发，单人可用，行动不解除'},
  groupHeal:{0:'半径144px群疗；两名友方受伤或自身生命低于70%触发',4:'自身治疗阈值70%→80%'},
  teleport:{0:'生命低于30%且近处有敌时自动传送；最小距离200px'},
 };
 return labels[id]?.[index]?{...step,label:labels[id]![index]}:step;
});}
export function survivalBonuses(s:Skill){const b=canonicalBonuses(s.id,Math.min(6,s.rank));for(const step of survivalLateGrowth(s.id).slice(0,Math.max(0,s.rank-6)))for(const [key,value] of Object.entries(step.add))if(key in b)b[key as keyof typeof b]+=value;return b;}
export function survivalChoices(g:Game):Upgrade[]{const pool:Upgrade[]=[];
 for(const s of g.skills.filter(s=>s.rank<8))pool.push({id:'s:'+s.id,kind:'skill',skill:s.id,name:getSkill(s.id).name+` ${s.rank}→${s.rank+1}`,description:survivalGrowth(s.id)[s.rank].label,value:0});
 if(g.skills.length<6)for(const s of SKILLS.filter(s=>s.classId===g.classId&&!g.skills.some(x=>x.id===s.id)))pool.push({id:'s:'+s.id,kind:'skill',skill:s.id,name:'学习 '+s.name,description:survivalGrowth(s.id)[0].label,value:0});
 for(const c of CHARMS){if((c.id==='flame'&&g.classId!=='wizard')||(c.id==='edge'&&g.classId!=='warrior')||(c.id==='spirit'&&g.classId!=='taoist'))continue;const n=g.survival.charms[c.id]??0;if(n>=5||(!n&&Object.keys(g.survival.charms).length>=6))continue;pool.push({id:'p:'+c.id,kind:'stat',stat:c.stat as StatKey,value:c.value,name:`${c.name} ${n}→${n+1}`,description:`${c.stat==='detection_range'?'侦测距离':c.stat==='move_speed'?'移动速度':c.stat==='hp_max'?'最大生命':c.stat==='hp_regen'?'每秒生命恢复':c.stat==='cooldown_reduction'?'冷却缩减':c.stat==='skill_radius'?'技能范围':c.stat==='pickup_radius'?'拾取范围':'职业伤害'} +${c.value}${['hp_max','hp_regen'].includes(c.stat)?'':'%'}`});}
 const shuffled=g.rng.shuffle(pool);const owned=shuffled.find(c=>c.skill&&g.skills.some(s=>s.id===c.skill));const choices=(owned?[owned,...shuffled.filter(c=>c!==owned)]:shuffled).slice(0,3);
 g.survival.seenSkills=[...new Set([...g.survival.seenSkills,...g.skills.map(s=>s.id),...choices.flatMap(c=>c.skill?[c.skill]:[])])];return choices;
}
export function chooseSurvival(g:Game,id:string){const c=g.choices.find(x=>x.id===id);if(!c)return;
 if(c.id.startsWith('evo:')){if(c.skill&&eligibleEvolutions(g).some(s=>s.id===c.skill))evolveSkill(g,c.skill);return;}
 if(c.skill){let s=g.skills.find(x=>x.id===c.skill);if(s){if(s.rank>=8)return;s.rank++;}else{if(g.skills.length>=6)return;s=g.newSkill(c.skill);g.skills.push(s);}Object.assign(s,survivalBonuses(s));g.recompute();}
 else{const key=id.slice(2),n=g.survival.charms[key]??0;if(n>=5||(!n&&Object.keys(g.survival.charms).length>=6))return;g.survival.charms[key]=n+1;g.upgrades[c.stat!]=(g.upgrades[c.stat!]??0)+c.value;g.recompute();if(c.stat==='hp_max')g.player.hp=Math.min(g.maxHP,g.player.hp+c.value);}
 g.choices=[];g.phase='battle';g.survival.choiceChest=false;g.emit();
}
/** Every chapter starts at level one in this mode; legacy chapter stats assumed prior equipment. */
export function tuneSurvivalEnemy(g:Game,e:Enemy,tier:'normal'|'elite'|'boss'){
 const pressure=g.mapId==='bairimen'?2:CHAPTER_PRESSURE[g.mapId];
 const hp=tier==='boss'?(.7+g.clock/1200)/Math.sqrt(pressure):(tier==='normal'?.65:1)/pressure;
 const threat=survivalThreatScale(g.clock,tier);
 e.hp=e.maxHp=Math.max(8,e.maxHp*hp*threat.hp);
 e.speed*=threat.speed;
 e.damage*=(tier==='normal'?.7:1)/Math.sqrt(pressure)*threat.damage;
 e.defense=(e.defense??0)/pressure;e.magicDefense=(e.magicDefense??0)/pressure;
 if(tier==='normal')e.exp=Math.max(2,Math.round(e.exp*1.5/Math.sqrt(pressure)));
}
const rangedKinds=new Set(['spider','skeletonArcher','flameWoma','zumaArcher',...EXPANSION_RANGED]);
export const survivalRangedBudget=(seconds:number)=>Math.min(24,6+Math.floor(Math.max(0,seconds)/60));
/** More melee early; ranged units cannot accumulate into an unbounded firing line. */
export function survivalSpawnKind(g:Game){
 const ordinary=MAPS[g.mapId].monsterPool.filter(id=>!isBossKind(id)&&!NATIVE_ELITES.includes(id));
 const rangedCount=g.enemies.filter(e=>e.hp>0&&e.ranged).length;
 const allowed=ordinary.filter(id=>!rangedKinds.has(id)||rangedCount<survivalRangedBudget(g.clock));
 const pool=allowed.length?allowed:ordinary;
 const meleeWeight=g.clock<300?4:2;
 return g.rng.pick(pool.flatMap(id=>Array(rangedKinds.has(id)?1:meleeWeight).fill(id) as string[]));
}
export function survivalTick(g:Game){const state=g.survival;g.wave=Math.min(12,1+Math.floor(g.clock/100));
 if(g.clock>=SURVIVAL_SECONDS&&state.finalBossDefeated){g.finish(true);return;}
 if(g.clock>=SURVIVAL_SECONDS){
  state.overtimeEndsAt ||= SURVIVAL_SECONDS+FINAL_OVERTIME_SECONDS;
  if(g.clock>=state.overtimeEndsAt){state.timedOut=true;g.finish(false);return;}
 }
 // The final encounter is mandatory and cannot be blocked by the ordinary population cap.
 if(g.clock>=1080&&!state.finalBossId){const boss=g.spawnEnemy(MAPS[g.mapId].boss);if(STATIONARY_MONSTERS.includes(boss.kind)){const nearby=g.navigation?.reachablePoints(g.player,160,260).filter(p=>g.canStand(p.x,p.y)&&g.attackLineClear(g.player,p));if(nearby?.length)Object.assign(boss,g.rng.pick(nearby));}tuneSurvivalEnemy(g,boss,'boss');boss.hp=boss.maxHp=boss.maxHp*1.5;state.finalBossId=boss.id;state.toast='';announceEncounter(g,boss);}
 if(g.clock<SURVIVAL_SECONDS&&g.clock>=state.spawnAt&&g.enemies.length<220){const e=g.spawnEnemy(survivalSpawnKind(g));tuneSurvivalEnemy(g,e,'normal');state.spawnAt=g.clock+survivorSpawnInterval(g.clock);}
 if(g.clock>=state.eliteAt&&g.clock<1080){const native=MAPS[g.mapId].monsterPool.filter(id=>NATIVE_ELITES.includes(id));const e=g.spawnEnemy(native.length?g.rng.pick(native):survivalSpawnKind(g));if(!e.elite){e.elite=true;e.hp=e.maxHp=e.maxHp*4;}tuneSurvivalEnemy(g,e,'elite');e.exp=Math.max(4,Math.round(e.exp*1.5));state.eliteAt=g.clock+(g.clock>=600?90:120);announceEncounter(g,e);}
 if(g.clock>=state.bossAt&&g.clock<1080){const boss=g.spawnEnemy(MAPS[g.mapId].boss);tuneSurvivalEnemy(g,boss,'boss');state.bossAt=g.clock+300;announceEncounter(g,boss);}
 for(const c of [...state.chests])if(Math.hypot(g.player.x-c.x,g.player.y-c.y)<55){state.chests=state.chests.filter(x=>x.id!==c.id);const candidates=eligibleEvolutions(g);
 if(c.eligible&&candidates.length===1){evolveSkill(g,candidates[0].id);}
 else if(c.eligible&&candidates.length>1){state.choiceChest=true;state.toast='选择进化';g.choices=candidates.map(s=>({id:'evo:'+s.id,kind:'skill',skill:s.id,name:EVOLUTIONS[s.id]!.name,description:EVOLUTIONS[s.id]!.description,value:0}));g.phase='upgrade';}
 else{g.choices=survivalChoices(g);if(g.choices.length){state.choiceChest=true;g.phase='upgrade';}else g.player.hp=g.maxHP;state.toast='宝箱强化';}g.input={x:0,y:0};g.emit();break;}
}
export function survivalDeath(g:Game,e:Enemy){
 if(e.id===g.survival.finalBossId)g.survival.finalBossDefeated=true;
 if(e.summoned)return;
 const boss=isBossKind(e.kind);
 if(!boss&&!e.elite)return;
 // Elites still give XP/equipment/recovery; every second defeat adds a skill chest.
 if(!boss&&++g.survival.eliteDefeats%2!==0)return;
 g.survival.chests.push({id:g.survival.nextChest++,x:e.x,y:e.y,eligible:e.born>=EVOLUTION_CHEST_AFTER});
}
