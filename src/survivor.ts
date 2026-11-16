import type {Game,Enemy,Skill,Upgrade} from './game';
import {getSkill,SKILLS,MAPS,NATIVE_ELITES,CHAPTER_PRESSURE,type StatKey} from './content';
import type {SkillId} from './spells';
import {canonicalBonuses,SKILL_GROWTH, type GrowthStep} from './skill-growth';
export const SURVIVAL_SECONDS=1200;
export const CHARMS=[
 {id:'flame',name:'火焰戒指',stat:'mc_bonus_pct',value:8},
 {id:'edge',name:'锋锐戒指',stat:'dc_bonus_pct',value:8},
 {id:'spirit',name:'灵魂项链',stat:'sc_bonus_pct',value:8},
 {id:'haste',name:'疾风项链',stat:'cooldown_reduction',value:6},
 {id:'area',name:'广域护符',stat:'skill_radius',value:8},
 {id:'life',name:'长生手镯',stat:'hp_max',value:15},
 {id:'magnet',name:'拾取护符',stat:'pickup_radius',value:25},
 {id:'recovery',name:'回春戒指',stat:'hp_regen',value:.5},
] as const;
export const EVOLUTIONS:Partial<Record<SkillId,{name:string;charm:string;description:string}>>={
 fireball:{name:'爆裂火球',charm:'flame',description:'命中时爆炸，对附近敌人造成50%溅射伤害。'},
 lightning:{name:'雷霆连锁',charm:'area',description:'命中后向附近最多4个敌人跳跃，每跳伤害递减20%。'},
 cleave:{name:'环月刀阵',charm:'area',description:'命中后围绕自身释放刀气，覆盖半径140px。'},
 firesword:{name:'烈焰斩',charm:'edge',description:'烈火刀命中产生半径120px的高强度爆发。'},
 talisman:{name:'灵符阵',charm:'spirit',description:'火符命中扩散灵力，对周围敌人造成额外伤害。'},
 beast:{name:'圣兽',charm:'spirit',description:'喷火引发额外灵焰，扩大灼烧覆盖范围。'},
};
export function newSurvival(){return {spawnAt:0,eliteAt:120,bossAt:300,rerolls:3,charms:{} as Record<string,number>,evolved:[] as SkillId[],chests:[] as {id:number;x:number;y:number;eligible:boolean}[],nextChest:1,choiceChest:false,toast:'',end:false};}
/** Rank 1–6 retain verified effects; the last two ranks specialize by skill role. */
export function survivalLateGrowth(id:SkillId):readonly GrowthStep[]{
 if(['skeleton','beast','charm'].includes(id))return [{label:'召唤生命+25%；召唤伤害+20%',add:{summonHP:25,summonPower:20}},{label:'召唤伤害+25%；补召冷却−10%',add:{summonPower:25,localCDR:10}}];
 if(id==='shield')return [{label:'持续时间+20%',add:{duration:20}},{label:'冷却−15%',add:{localCDR:15}}];
 if(['repulse','trap','invisible','groupInvisible','teleport','dash','reveal'].includes(id))return [{label:'冷却−10%',add:{localCDR:10}},{label:'冷却−10%',add:{localCDR:10}}];
 if(['swordsmanship','spirit'].includes(id))return [{label:'普攻威力+20%',add:{power:20}},{label:'普攻威力+25%；准确+3',add:{power:25,accuracy:3}}];
 if(id==='poison')return [{label:'毒素持续时间+25%',add:{duration:25}},{label:'冷却−15%',add:{localCDR:15}}];
 if(id==='holy')return [{label:'成功率+5个百分点',add:{chance:5}},{label:'冷却−15%',add:{localCDR:15}}];
 return [{label:'威力+20%',add:{power:20}},{label:'冷却−10%；威力+15%',add:{localCDR:10,power:15}}];
}
export function survivalGrowth(id:SkillId){return [...SKILL_GROWTH[id],...survivalLateGrowth(id)];}
export function survivalBonuses(s:Skill){const b=canonicalBonuses(s.id,Math.min(6,s.rank));for(const step of survivalLateGrowth(s.id).slice(0,Math.max(0,s.rank-6)))for(const [key,value] of Object.entries(step.add))if(key in b)b[key as keyof typeof b]+=value;return b;}
export function survivalChoices(g:Game):Upgrade[]{const pool:Upgrade[]=[];
 for(const s of g.skills.filter(s=>s.rank<8))pool.push({id:'s:'+s.id,kind:'skill',skill:s.id,name:getSkill(s.id).name+` ${s.rank}→${s.rank+1}`,description:survivalGrowth(s.id)[s.rank].label,value:0});
 if(g.skills.length<6)for(const s of SKILLS.filter(s=>s.classId===g.classId&&!g.skills.some(x=>x.id===s.id)))pool.push({id:'s:'+s.id,kind:'skill',skill:s.id,name:'学习 '+s.name,description:survivalGrowth(s.id)[0].label,value:0});
 for(const c of CHARMS){if((c.id==='flame'&&g.classId!=='wizard')||(c.id==='edge'&&g.classId!=='warrior')||(c.id==='spirit'&&g.classId!=='taoist'))continue;const n=g.survival.charms[c.id]??0;if(n>=5||(!n&&Object.keys(g.survival.charms).length>=6))continue;pool.push({id:'p:'+c.id,kind:'stat',stat:c.stat as StatKey,value:c.value,name:`${c.name} ${n}→${n+1}`,description:`${c.stat==='hp_max'?'最大生命':c.stat==='hp_regen'?'每秒生命恢复':c.stat==='cooldown_reduction'?'冷却缩减':c.stat==='skill_radius'?'技能范围':c.stat==='pickup_radius'?'拾取范围':'职业伤害'} +${c.value}${['hp_max','hp_regen'].includes(c.stat)?'':'%'}`});}
 const shuffled=g.rng.shuffle(pool);const owned=shuffled.find(c=>c.skill&&g.skills.some(s=>s.id===c.skill));return (owned?[owned,...shuffled.filter(c=>c!==owned)]:shuffled).slice(0,3);
}
export function chooseSurvival(g:Game,id:string){const c=g.choices.find(x=>x.id===id);if(!c)return;
 if(c.skill){let s=g.skills.find(x=>x.id===c.skill);if(s){if(s.rank>=8)return;s.rank++;}else{if(g.skills.length>=6)return;s=g.newSkill(c.skill);g.skills.push(s);}Object.assign(s,survivalBonuses(s));}
 else{const key=id.slice(2),n=g.survival.charms[key]??0;if(n>=5)return;g.survival.charms[key]=n+1;g.upgrades[c.stat!]=(g.upgrades[c.stat!]??0)+c.value;g.recompute();if(c.stat==='hp_max')g.player.hp=Math.min(g.maxHP,g.player.hp+c.value);}
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
 for(const c of [...state.chests])if(Math.hypot(g.player.x-c.x,g.player.y-c.y)<55){state.chests=state.chests.filter(x=>x.id!==c.id);const s=g.skills.find(s=>s.rank===8&&!state.evolved.includes(s.id)&&EVOLUTIONS[s.id]&&(state.charms[EVOLUTIONS[s.id]!.charm]??0)>0);
 if(c.eligible&&s){state.evolved.push(s.id);state.toast='进化完成：'+EVOLUTIONS[s.id]!.name;g.pause();}
 else{g.choices=survivalChoices(g);if(g.choices.length){state.choiceChest=true;g.phase='upgrade';}else g.player.hp=g.maxHP;state.toast='宝箱强化';}g.input={x:0,y:0};g.emit();break;}
}
export function survivalDeath(g:Game,e:Enemy){if(!e.summoned&&(e.elite||e.kind===MAPS[g.mapId].boss))g.survival.chests.push({id:g.survival.nextChest++,x:e.x,y:e.y,eligible:e.born>=360});}
export function survivalSplash(g:Game,e:Enemy,damage:number,id:string){if(!g.survival.evolved.includes(id as SkillId))return;
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
