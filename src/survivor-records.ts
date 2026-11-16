import {z} from 'zod';
import type {Game} from './game';
import {CLASS_IDS} from './classes';
import {MAP_IDS} from './content';
export const SURVIVOR_RECORD_KEY='mafa-survival-records-v1';
const record=z.object({runId:z.string().max(150),classId:z.enum(CLASS_IDS),mapId:z.enum(MAP_IDS),won:z.boolean(),seconds:z.number().finite().min(0).max(86400),level:z.number().int().min(1).max(10000),kills:z.number().int().min(0),evolved:z.array(z.string().max(40)).max(6),at:z.number().finite()});
export type SurvivorRecord=z.infer<typeof record>;
export function readSurvivorRecords(storage:Pick<Storage,'getItem'>):SurvivorRecord[]{try{const parsed=z.array(record).max(20).safeParse(JSON.parse(storage.getItem(SURVIVOR_RECORD_KEY)??'[]'));return parsed.success?parsed.data:[];}catch{return [];}}
export function recordSurvival(g:Game,storage:Pick<Storage,'getItem'|'setItem'>){if(!g.survivorMode||!g.result||g.mode!=='normal')return;const rows=readSurvivorRecords(storage);if(rows.some(r=>r.runId===g.runId))return;const row=record.parse({runId:g.runId,classId:g.classId,mapId:g.mapId,won:g.phase==='won',seconds:g.clock,level:g.level,kills:g.kills,evolved:g.survival.evolved,at:Date.now()});storage.setItem(SURVIVOR_RECORD_KEY,JSON.stringify([row,...rows].slice(0,20)));}
