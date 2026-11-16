import {z} from 'zod';
import type {Game} from './game';
import {checkpointSchema} from './checkpoint';
import {ITEMS,MONSTERS,STAT_NAMES,SLOT_KEYS} from './content';
import {SKILL_IDS} from './spells';
import {CHARMS,EVOLUTIONS} from './survivor';
export const SURVIVOR_SAVE_KEY='mafa-survival-run-v1';
const n=z.number().finite().min(-1e9).max(1e9),id=z.number().int().min(1).max(1e9);
const point=z.object({x:n,y:n}),entity=point.extend({id});
const skillId=z.enum(SKILL_IDS);
const monster=z.string().refine(v=>MONSTERS.some(m=>m.id===v));
const item=z.string().refine(v=>ITEMS.some(i=>i.id===v));
const enemy=entity.extend({kind:monster,hp:n,maxHp:n,speed:n,damage:n,exp:n,dir:n,windup:n,attackCD:n,hitAt:n,burnAt:n,elite:z.boolean(),born:n,
 ...Object.fromEntries(['level','attackTarget','agility','defense','magicDefense','trapUntil','revealUntil','bossPhase','bossJumpUntil','bossSummonCD','bossJumpCD','bossJumpWindupUntil','rangedCD','chargeUntil','chargeWindupUntil','chargeCD','stompAt','stompCD','staggerUntil','awakenAt','rangedFireAt','shockCD'].map(k=>[k,n.optional()])),
 ...Object.fromEntries(['revealTags','revealDetails','ranged','dormant','summoned'].map(k=>[k,z.boolean().optional()])),
 ...Object.fromEntries(['bossJumpTarget','bossJumpOrigin','chargeTarget','stompOrigin','rangedTarget'].map(k=>[k,point.optional()])),
 greenPoison:z.object({until:n,tickAt:n,damage:n,origin:z.literal('evolution:poison').optional()}).optional(),redPoison:z.object({until:n,reduction:n}).optional(),
 lastSeen:point.extend({id:n,until:n}).optional(),shock:z.object({origin:point,target:point,at:n,remaining:n}).optional(),
}).strict();
const projectile=entity.extend({vx:n,vy:n,damage:n,life:n,dir:n,skill:skillId.optional(),targetId:n.optional(),hitChance:n.optional(),enemyKind:monster.optional(),homing:z.boolean().optional(),faction:z.literal('enemy').optional(),visual:z.enum(['poison','arrow','womaFlame']).optional(),damageKind:z.enum(['physical','magic']).optional(),height:n.optional()}).strict();
const effect=entity.extend({kind:z.enum([...SKILL_IDS,'hit','cast','beastflame','talismanHit','womaShock','overlordBlade','overlordDeath']),life:n,total:n,radius:n,dir:n.optional(),targetId:n.optional(),width:n.optional(),spread:n.optional(),aimAngle:n.optional(),alpha:z.number().min(0).max(1).optional()}).strict();
const charmId=z.string().refine(v=>CHARMS.some(c=>c.id===v));
const survival=z.object({spawnAt:n,eliteAt:n,bossAt:n,rerolls:z.number().int().min(0).max(3),charms:z.record(charmId,z.number().int().min(1).max(5)).refine(v=>Object.keys(v).length<=6),evolved:z.array(skillId).max(6).refine(v=>new Set(v).size===v.length&&v.every(id=>!!EVOLUTIONS[id])),evoReadyAt:z.partialRecord(skillId,n).default(()=>({})),chests:z.array(entity.extend({eligible:z.boolean()})).max(1000),nextChest:id,choiceChest:z.boolean(),toast:z.string().max(200),end:z.boolean()}).strict();
const c=checkpointSchema.shape;
const stateSchema=z.object({
 classId:c.classId,mapId:c.mapId,runId:c.runId,seed:c.seed,phase:z.enum(['battle','upgrade','paused']),clock:z.number().finite().min(0).max(1200),wave:c.wave,waveTime:n,kills:c.kills,gold:c.gold,totalGold:c.totalGold,level:c.level,exp:c.exp,damageDealt:c.damageDealt,purchases:c.purchases,potions:c.potions,combatRecovery:c.combatRecovery,damageTaken:c.damageTaken,player:c.player,
 skills:z.array(c.skills.element.extend({rank:z.number().int().min(1).max(8),duration:z.number().finite().min(0).max(150)})).min(1).max(6),
 pets:z.array(c.pets.element.extend({hitUntil:n.optional(),hitDamage:n.optional()})).max(30),
 equipment:z.partialRecord(z.enum(SLOT_KEYS),z.object({itemId:item,paid:n})),
 passives:z.record(item,n),upgrades:z.record(z.string().refine(k=>k in STAT_NAMES),n),
 choices:z.array(c.choices.element.extend({skill:skillId.optional(),stat:z.string().refine(k=>k in STAT_NAMES).optional()})).max(6),charges:c.charges,basicCD:n,automaticTeleport:z.boolean(),automaticDash:z.boolean(),
 enemies:z.array(enemy).max(1000),projectiles:z.array(projectile).max(2000),drops:z.array(entity.extend({exp:n,gold:n,born:n,itemId:item.optional(),heal:n.optional(),level:n.optional(),count:n.optional()})).max(10000),effects:z.array(effect).max(2000),
 tao:z.object({poisonMode:z.enum(['green','red']),healPriority:z.enum(['self','pet']),healing:z.record(z.string(),n),buffs:z.record(z.string(),z.object({invisibleUntil:n,visibleUntil:n,invisibleSource:skillId.optional(),detectionRadius:n,armorUntil:n,armorPower:n,ghostUntil:n,ghostPower:n}).strict())}).strict(),survival,
}).strict();
export const survivorSaveSchema=z.object({version:z.literal(1),savedAt:z.number().finite(),nextId:id,rngState:z.number().int(),state:stateSchema}).strict().refine(v=>{
 const actors=[...v.state.enemies,...v.state.pets,...v.state.projectiles,...v.state.drops,...v.state.effects];
 return actors.every(a=>a.id<v.nextId)&&new Set(actors.map(a=>a.id)).size===actors.length&&new Set(v.state.skills.map(s=>s.id)).size===v.state.skills.length&&v.state.survival.evolved.every(id=>v.state.skills.some(s=>s.id===id&&s.rank===8));
});
export type SurvivorSave=z.infer<typeof survivorSaveSchema>;
export function snapshotSurvival(g:Game,nextId:number):SurvivorSave|null{
 if(!g.survivorMode||g.mode!=='normal'||!['battle','upgrade','paused'].includes(g.phase)||g.result)return null;
 const state=Object.fromEntries(Object.keys(stateSchema.shape).map(k=>[k,g[k as keyof Game]]));
 return survivorSaveSchema.parse(JSON.parse(JSON.stringify({version:1,savedAt:Date.now(),nextId,rngState:g.rng.seed,state})));
}
export function parseSurvivalSave(raw:unknown):SurvivorSave|null{const r=survivorSaveSchema.safeParse(raw);return r.success?r.data:null;}
export function readSurvivalSave(storage:Pick<Storage,'getItem'>):SurvivorSave|null{try{return parseSurvivalSave(JSON.parse(storage.getItem(SURVIVOR_SAVE_KEY)??'null'));}catch{return null;}}
