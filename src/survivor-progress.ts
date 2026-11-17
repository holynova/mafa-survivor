import {CLASS_IDS} from './classes';
import {z} from 'zod';
import type {Game} from './game';
import {MAPS,MAP_IDS,type MapId} from './content';
import {SKILL_IDS} from './spells';
import {readSurvivorRecords} from './survivor-records';
export const SURVIVOR_PROGRESS_KEY='mafa-survival-progress-v1';
export const CHAPTER_PATH:readonly MapId[]=['biche','mine','woma','zuma','mengzhong','centipede','stone','shimu','bairimen','redmoon'];
const schema=z.object({version:z.literal(1),roleBest:z.partialRecord(z.enum(CLASS_IDS),z.number().finite().min(0).max(1200)).default({}),wardUnlocked:z.boolean().default(false),best:z.partialRecord(z.enum(MAP_IDS),z.number().finite().min(0).max(1200)),visited:z.array(z.enum(MAP_IDS)).max(10),won:z.array(z.enum(MAP_IDS)).max(10),evolved:z.array(z.enum(SKILL_IDS)).max(33)}).strict();
export type SurvivorProgress=z.infer<typeof schema>;
export const newSurvivorProgress=():SurvivorProgress=>({version:1,roleBest:{},wardUnlocked:false,best:{},visited:[],won:[],evolved:[]});
export function readSurvivorProgress(storage:Pick<Storage,'getItem'>):SurvivorProgress{
 let progress=newSurvivorProgress();try{const r=schema.safeParse(JSON.parse(storage.getItem(SURVIVOR_PROGRESS_KEY)??'null'));if(r.success)progress=r.data;}catch{/* Keep the game playable when browser storage is unavailable. */}
 // Migrate earned results from the earlier playable branch without relocking visited chapters.
 for(const row of readSurvivorRecords(storage)){progress.roleBest[row.classId]=Math.max(progress.roleBest[row.classId]??0,Math.min(1200,row.seconds));progress.best[row.mapId]=Math.max(progress.best[row.mapId]??0,Math.min(1200,row.seconds));if(!progress.visited.includes(row.mapId))progress.visited.push(row.mapId);if(row.won&&!progress.won.includes(row.mapId))progress.won.push(row.mapId);for(const id of row.evolved)if(SKILL_IDS.includes(id as typeof SKILL_IDS[number])&&!progress.evolved.includes(id as typeof SKILL_IDS[number]))progress.evolved.push(id as typeof SKILL_IDS[number]);}
 return progress;
}
export function chapterRequirement(map:MapId){const index=CHAPTER_PATH.indexOf(map);return index<=0?null:{map:CHAPTER_PATH[index-1],seconds:index===1?300:index===2?480:600};}
export function chapterUnlocked(progress:SurvivorProgress,map:MapId){const requirement=chapterRequirement(map);return !requirement||progress.visited.includes(map)||(progress.best[requirement.map]??0)>=requirement.seconds;}
export function chapterGoal(progress:SurvivorProgress,map:MapId){const next=CHAPTER_PATH[CHAPTER_PATH.indexOf(map)+1];if(!next)return '最终目标：生存20分钟，完成赤月挑战';const requirement=chapterRequirement(next)!;return chapterUnlocked(progress,next)?`已开放${MAPS[next].name}；本章挑战20分钟与两次进化`:`本章生存${requirement.seconds/60}分钟，解锁${MAPS[next].name}`;}
export function updateSurvivorProgress(g:Game,storage:Pick<Storage,'getItem'|'setItem'>):SurvivorProgress{
 const progress=readSurvivorProgress(storage);if(!g.survivorMode||g.mode!=='normal'||!['battle','upgrade','paused','won','dead'].includes(g.phase))return progress;
 progress.roleBest[g.classId]=Math.max(progress.roleBest[g.classId]??0,Math.min(1200,g.clock));
 progress.best[g.mapId]=Math.max(progress.best[g.mapId]??0,Math.min(1200,g.clock));if(!progress.visited.includes(g.mapId))progress.visited.push(g.mapId);
 if(g.survival.challenge.status==='won'&&!g.survival.challenge.ward)progress.wardUnlocked=true;
 if(g.result?.won&&!progress.won.includes(g.mapId))progress.won.push(g.mapId);
 for(const id of g.survival.evolved)if(!progress.evolved.includes(id))progress.evolved.push(id);
 storage.setItem(SURVIVOR_PROGRESS_KEY,JSON.stringify(schema.parse(progress)));return progress;
}
