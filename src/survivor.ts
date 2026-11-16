import {SURVIVAL_LATE_GROWTH} from './survivor-growth';
import {EVOLUTIONS,eligibleEvolutions,evolveSkill} from './survivor-evolutions';
export {EVOLUTIONS,survivalSplash,evolutionReadiness} from './survivor-evolutions';
import {CLASSES,type ClassId} from './classes';
import type {Game,Enemy,Skill,Upgrade} from './game';
import {getSkill,SKILLS,MAPS,NATIVE_ELITES,CHAPTER_PRESSURE,type StatKey} from './content';
import type {SkillId} from './spells';
import {canonicalBonuses,SKILL_GROWTH} from './skill-growth';
export const SURVIVAL_SECONDS=1200;
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
export function newSurvival(){return {spawnAt:0,eliteAt:120,bossAt:300,rerolls:3,charms:{} as Record<string,number>,evolved:[] as SkillId[],evoReadyAt:{} as Partial<Record<SkillId,number>>,chests:[] as {id:number;x:number;y:number;eligible:boolean}[],nextChest:1,choiceChest:false,toast:'',end:false};}
/** Rank 1–6 retain verified effects; the last two ranks specialize by skill role. */
export const survivalLateGrowth=(id:SkillId)=>SURVIVAL_LATE_GROWTH[id];
export function survivalGrowth(id:SkillId){return [...SKILL_GROWTH[id],...survivalLateGrowth(id)];}
export function survivalBonuses(s:Skill){const b=canonicalBonuses(s.id,Math.min(6,s.rank));for(const step of survivalLateGrowth(s.id).slice(0,Math.max(0,s.rank-6)))for(const [key,value] of Object.entries(step.add))if(key in b)b[key as keyof typeof b]+=value;return b;}
export function survivalChoices(g:Game):Upgrade[]{const pool:Upgrade[]=[];
 for(const s of g.skills.filter(s=>s.rank<8))pool.push({id:'s:'+s.id,kind:'skill',skill:s.id,name:getSkill(s.id).name+` ${s.rank}→${s.rank+1}`,description:survivalGrowth(s.id)[s.rank].label,value:0});
 if(g.skills.length<6)for(const s of SKILLS.filter(s=>s.classId===g.classId&&!g.skills.some(x=>x.id===s.id)))pool.push({id:'s:'+s.id,kind:'skill',skill:s.id,name:'学习 '+s.name,description:survivalGrowth(s.id)[0].label,value:0});
 for(const c of CHARMS){if((c.id==='flame'&&g.classId!=='wizard')||(c.id==='edge'&&g.classId!=='warrior')||(c.id==='spirit'&&g.classId!=='taoist'))continue;const n=g.survival.charms[c.id]??0;if(n>=5||(!n&&Object.keys(g.survival.charms).length>=6))continue;pool.push({id:'p:'+c.id,kind:'stat',stat:c.stat as StatKey,value:c.value,name:`${c.name} ${n}→${n+1}`,description:`${c.stat==='detection_range'?'侦测距离':c.stat==='move_speed'?'移动速度':c.stat==='hp_max'?'最大生命':c.stat==='hp_regen'?'每秒生命恢复':c.stat==='cooldown_reduction'?'冷却缩减':c.stat==='skill_radius'?'技能范围':c.stat==='pickup_radius'?'拾取范围':'职业伤害'} +${c.value}${['hp_max','hp_regen'].includes(c.stat)?'':'%'}`});}
 const shuffled=g.rng.shuffle(pool);const owned=shuffled.find(c=>c.skill&&g.skills.some(s=>s.id===c.skill));return (owned?[owned,...shuffled.filter(c=>c!==owned)]:shuffled).slice(0,3);
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
 e.hp=e.maxHp=Math.max(8,e.maxHp*hp);
 e.damage*=(tier==='normal'?.7:1)/Math.sqrt(pressure);
 e.defense=(e.defense??0)/pressure;e.magicDefense=(e.magicDefense??0)/pressure;
 if(tier==='normal')e.exp=Math.max(2,Math.round(e.exp*2/Math.sqrt(pressure)));
}
export function survivalTick(g:Game){const state=g.survival;g.wave=Math.min(12,1+Math.floor(g.clock/100));
 if(g.clock>=SURVIVAL_SECONDS){g.finish(true);return;}
 if(g.clock>=state.spawnAt&&g.enemies.length<220){const e=g.spawnEnemy();tuneSurvivalEnemy(g,e,'normal');state.spawnAt=g.clock+Math.max(.14,1.1-g.clock/1200);}
 if(g.clock>=state.eliteAt&&g.enemies.length<240){const native=MAPS[g.mapId].monsterPool.filter(id=>NATIVE_ELITES.includes(id));const e=g.spawnEnemy(native.length?g.rng.pick(native):undefined);if(!e.elite){e.elite=true;e.hp=e.maxHp=e.maxHp*4;}tuneSurvivalEnemy(g,e,'elite');e.exp*=3;state.eliteAt=g.clock+120;}
 if(g.clock>=state.bossAt&&g.enemies.length<240){const boss=g.spawnEnemy(MAPS[g.mapId].boss);tuneSurvivalEnemy(g,boss,'boss');state.bossAt=g.clock+300;}
 for(const c of [...state.chests])if(Math.hypot(g.player.x-c.x,g.player.y-c.y)<55){state.chests=state.chests.filter(x=>x.id!==c.id);const candidates=eligibleEvolutions(g);
 if(c.eligible&&candidates.length===1){evolveSkill(g,candidates[0].id);}
 else if(c.eligible&&candidates.length>1){state.choiceChest=true;state.toast='选择进化';g.choices=candidates.map(s=>({id:'evo:'+s.id,kind:'skill',skill:s.id,name:EVOLUTIONS[s.id]!.name,description:EVOLUTIONS[s.id]!.description,value:0}));g.phase='upgrade';}
 else{g.choices=survivalChoices(g);if(g.choices.length){state.choiceChest=true;g.phase='upgrade';}else g.player.hp=g.maxHP;state.toast='宝箱强化';}g.input={x:0,y:0};g.emit();break;}
}
export function survivalDeath(g:Game,e:Enemy){if(!e.summoned&&(e.elite||e.kind===MAPS[g.mapId].boss))g.survival.chests.push({id:g.survival.nextChest++,x:e.x,y:e.y,eligible:e.born>=360});}
