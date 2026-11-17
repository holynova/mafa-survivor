import type {Game} from './game';
import {SURVIVOR_SAVE_KEY} from './survivor-save';
/** Diagnostic timings are local only; no upload and no measured-memory claim. */
export const saveMetrics={writes:0,failures:0,snapshotMS:0,serializeMS:0,writeMS:0,characters:0};
export function writeSurvivalCheckpoint(g:Game,storage:Pick<Storage,'setItem'>){
 const start=performance.now();
 try{
  const checkpoint=g.snapshotSurvival();saveMetrics.snapshotMS=performance.now()-start;
  if(!checkpoint)return null;
  const encode=performance.now(),serialized=JSON.stringify(checkpoint);
  saveMetrics.serializeMS=performance.now()-encode;saveMetrics.characters=serialized.length;
  const write=performance.now();storage.setItem(SURVIVOR_SAVE_KEY,serialized);
  saveMetrics.writeMS=performance.now()-write;saveMetrics.writes++;
  return checkpoint;
 }catch(error){saveMetrics.failures++;throw error;}
}
