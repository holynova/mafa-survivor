import {z} from 'zod';
import type {Game} from './game';
import {releaseVersion,releaseCommit} from './release';
export const TELEMETRY_KEY='mafa-survivor-diagnostics-v1';
const MAX_EVENTS=1500,MAX_SAMPLES=60,MAX_BYTES=500_000;
const number=z.number().finite(),ledger=z.record(z.string().max(100),number);
const totalsSchema=z.object({damage:number,taken:number,kills:number,goldEarned:number,goldSpent:number,onKill:number,lifeSteal:number,skillAndPotionHealingIncludingAllies:number,naturalPlayerHealing:number,observedSeconds:number,lowHpSeconds:number});
type Totals=z.infer<typeof totalsSchema>;
const sampleSchema=z.object({from:number,to:number,elapsed:number,partial:z.boolean(),level:number,hp:number,maxHP:number,enemies:number,pets:number,dps:number,delta:totalsSchema,damageSources:ledger});
const eventSchema=z.object({at:number,type:z.string().max(40),details:z.record(z.string().max(40),z.union([number,z.string().max(500),z.boolean(),z.null()]))});
const reportSchema=z.object({schema:z.literal(1),runId:z.string().max(150),seed:number,classId:z.string().max(30),mapId:z.string().max(30),mode:z.string().max(20),version:z.string().max(60),commit:z.string().max(60),startedAt:number,lastAt:number,samples:z.array(sampleSchema).max(MAX_SAMPLES),events:z.array(eventSchema).max(MAX_EVENTS),omittedEvents:number,omittedSamples:number,baseline:totalsSchema,baselineAt:number,baselineSources:ledger,totals:totalsSchema});
type Report=z.infer<typeof reportSchema>;
type Details=z.infer<typeof eventSchema>['details'];
const sum=(v:Record<string,number>)=>Object.values(v).reduce((a,b)=>a+b,0);
const difference=(a:Record<string,number>,b:Record<string,number>)=>Object.fromEntries(Object.entries(a).map(([k,n])=>[k,n-(b[k]??0)]).filter(([,n])=>n!==0)) as Record<string,number>;
/** Local bounded diagnostic journal. No RNG, upload, combat mutation, or claimed deterministic replay. */
export class SurvivorTelemetry {
 private report:Report|null=null;
 private skills='';
 private choices:Game['choices']|null=null;
 private finished=false;
 private version=0;
 private written=-1;
 persistenceError='';
 private ensure(g:Game){
  if(!g.survivorMode||!g.runId)return false;
  if(this.report?.runId===g.runId)return true;
  this.skills='';this.choices=null;this.finished=false;this.written=-1;
  const zero={damage:0,taken:0,kills:0,goldEarned:0,goldSpent:0,onKill:0,lifeSteal:0,skillAndPotionHealingIncludingAllies:0,naturalPlayerHealing:0,observedSeconds:0,lowHpSeconds:0};
  this.report={schema:1,runId:g.runId,seed:g.seed,classId:g.classId,mapId:g.mapId,mode:g.mode,version:releaseVersion,commit:releaseCommit,startedAt:g.clock,lastAt:g.clock,samples:[],events:[],omittedEvents:0,omittedSamples:0,baseline:zero,baselineAt:g.clock,baselineSources:{...g.damageTaken.sources},totals:zero};
  const totals=this.totals(g);this.report.totals=totals;this.report.baseline={...totals};this.version++;
  return true;
 }
 private totals(g:Game):Totals{
  const old=this.report!.totals;
  return {damage:sum(g.damageDealt),taken:g.damageTaken.physical+g.damageTaken.magic,kills:g.kills,goldEarned:g.totalGold,goldSpent:g.totalGold-g.gold,onKill:g.combatRecovery.healing.onKill,lifeSteal:g.combatRecovery.healing.lifeSteal,skillAndPotionHealingIncludingAllies:sum(g.tao.healing),naturalPlayerHealing:old.naturalPlayerHealing,observedSeconds:old.observedSeconds,lowHpSeconds:old.lowHpSeconds};
 }
 event(g:Game,type:string,details:Details={}){
  if(!this.ensure(g))return;
  const r=this.report!;
  if(r.events.length<MAX_EVENTS)r.events.push({at:g.clock,type,details});else r.omittedEvents++;
  this.version++;
 }
 step(g:Game,dt:number){
  if(!this.ensure(g)||!Number.isFinite(dt)||dt<=0)return;
  const t=this.report!.totals;t.observedSeconds+=dt;if(g.player.hp/g.maxHP<.3)t.lowHpSeconds+=dt;this.version++;
 }
 regeneration(g:Game,amount:number){if(amount>0&&this.ensure(g)){this.report!.totals.naturalPlayerHealing+=amount;this.version++;}}
 private sample(g:Game,partial:boolean){
  const r=this.report!,to=g.clock,elapsed=to-r.baselineAt,totals=this.totals(g);
  if(elapsed<=0)return null;
  return {from:r.baselineAt,to,elapsed,partial,level:g.level,hp:g.player.hp,maxHP:g.maxHP,enemies:g.enemies.filter(e=>e.hp>0).length,pets:g.pets.filter(p=>p.hp>0).length,dps:(totals.damage-r.baseline.damage)/elapsed,delta:Object.fromEntries(Object.entries(totals).map(([k,n])=>[k,n-r.baseline[k as keyof Totals]])) as Totals,damageSources:difference(g.damageTaken.sources,r.baselineSources)};
 }
 observe(g:Game){
  if(!this.ensure(g))return;
  const r=this.report!;
  // Rewinding/debug jumps are explicit segments, never fabricated historical minutes.
  if(g.clock<r.lastAt){this.event(g,'clock-rewind',{from:r.lastAt,to:g.clock});r.baseline=this.totals(g);r.baselineAt=g.clock;r.baselineSources={...g.damageTaken.sources};}
  r.lastAt=g.clock;r.totals=this.totals(g);
  const skills=g.skills.map(s=>`${s.id}:${s.rank}${g.survival.evolved.includes(s.id)?':evolved':''}`).join(',');
  if(skills!==this.skills){this.event(g,'build',{skills});this.skills=skills;}
  if(g.phase==='upgrade'&&g.choices!==this.choices){this.event(g,'offers',{level:g.level,ids:g.choices.map(c=>c.id).join(','),chest:g.survival.choiceChest});this.choices=g.choices;}
  if(g.clock>=Math.floor(r.baselineAt/60+1)*60){
   const sample=this.sample(g,false);
   if(sample){if(r.samples.length<MAX_SAMPLES)r.samples.push(sample);else r.omittedSamples++;r.baseline=this.totals(g);r.baselineAt=g.clock;r.baselineSources={...g.damageTaken.sources};this.version++;}
  }
  if(g.result&&!this.finished){this.event(g,'end',{won:g.result.won,deathSource:g.result.deathSource??null,timedOut:g.survival.timedOut});this.finished=true;}
 }
 snapshot(g:Game){
  this.observe(g);if(!this.report)return null;
  const partial=this.sample(g,true);
  return {...structuredClone(this.report),current:partial,notes:['Intervals use observed game time; pauses are excluded.','Skill and potion healing includes allies; regeneration/on-kill/lifesteal are player-only.','This journal is not a full input replay. Test runs are labeled and do not overwrite normal diagnostics.']};
 }
 persist(g:Game,storage:Pick<Storage,'setItem'>){
  if(!g.survivorMode||g.mode!=='normal')return;
  this.observe(g);if(!this.report||this.report.mode!=='normal'||this.written===this.version)return;
  try{const text=JSON.stringify(this.report);if(new TextEncoder().encode(text).byteLength>MAX_BYTES)throw new Error('size');storage.setItem(TELEMETRY_KEY,text);this.written=this.version;this.persistenceError='';}catch{this.persistenceError='本机诊断未保存，当前页面仍可导出。';}
 }
 restore(g:Game,storage:Pick<Storage,'getItem'>){
  if(!g.survivorMode||g.mode!=='normal')return false;
  try{
   const raw=storage.getItem(TELEMETRY_KEY);if(!raw||raw.length>MAX_BYTES||new TextEncoder().encode(raw).byteLength>MAX_BYTES)return false;
   const parsed=reportSchema.safeParse(JSON.parse(raw));if(!parsed.success)return false;const r=parsed.data;
   if(r.runId!==g.runId||r.seed!==g.seed||r.mapId!==g.mapId||r.classId!==g.classId||r.mode!=='normal'||r.lastAt>g.clock||r.baselineAt>r.lastAt)return false;
   this.report=r;this.skills='';this.choices=null;this.finished=false;this.written=-1;
   this.event(g,'resume',{previous:r.lastAt,gap:Math.max(0,g.clock-r.lastAt),version:releaseVersion,commit:releaseCommit});this.observe(g);return true;
  }catch{return false;}
 }
}
