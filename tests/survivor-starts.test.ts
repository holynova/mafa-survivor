import {expect,it} from 'vitest';
import {Game} from '../src/game';
import {SURVIVOR_STARTS,availableSurvivorStarts,survivorStartGuide} from '../src/survivor-starts';
import {SURVIVOR_PROGRESS_KEY,newSurvivorProgress,readSurvivorProgress,updateSurvivorProgress} from '../src/survivor-progress';
import {recordSurvival,SURVIVOR_RECORD_KEY} from '../src/survivor-records';
const storage=()=>{const m=new Map<string,string>();return {getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v);}};};
it('unlocks only the played class at five minutes, retaining the achievement beyond recent history',()=>{
 const g=new Game(),s=storage();g.survivorMode=true;g.start('normal',7,'warrior');g.clock=299.9;
 let p=updateSurvivorProgress(g,s);expect(availableSurvivorStarts('warrior',p.roleBest)).toEqual(['cleave']);
 g.clock=300;p=updateSurvivorProgress(g,s);expect(availableSurvivorStarts('warrior',p.roleBest)).toEqual(['cleave','thrust']);expect(availableSurvivorStarts('wizard',p.roleBest)).toEqual(['fireball']);
 g.clock=1;updateSurvivorProgress(g,s);s.setItem(SURVIVOR_RECORD_KEY,'[]');expect(readSurvivorProgress(s).roleBest.warrior).toBe(300);
});
it('migrates old progress and qualifying class records without guessing a role from chapter time',()=>{
 const s=storage();s.setItem(SURVIVOR_PROGRESS_KEY,JSON.stringify({version:1,best:{biche:600},visited:['biche'],won:[],evolved:[]}));
 expect(readSurvivorProgress(s).roleBest).toEqual({});
 const g=new Game();g.survivorMode=true;g.start('normal',7,'taoist');g.clock=300;g.finish(false);recordSurvival(g,s);
 expect(readSurvivorProgress(s).roleBest).toEqual({taoist:300});
});
it('test and legacy play cannot earn the alternative starts',()=>{
 const g=new Game(),s=storage();g.survivorMode=true;g.start('test',7,'wizard');g.clock=600;expect(updateSurvivorProgress(g,s)).toEqual(newSurvivorProgress());
 g.survivorMode=false;g.mode='normal';expect(updateSurvivorProgress(g,s).roleBest).toEqual({});expect(s.getItem(SURVIVOR_PROGRESS_KEY)).toBeNull();
});
it('starts with exactly one rank-one class skill, no permanent stats, and preserves it on resume',()=>{
 for(const role of ['wizard','warrior','taoist'] as const){
  const a=new Game(),b=new Game();a.survivorMode=b.survivorMode=true;a.start('normal',7,role);b.start('normal',7,role,false,'biche',SURVIVOR_STARTS[role][1]);
  expect(b.skills).toHaveLength(1);expect(b.skills[0]).toMatchObject({id:SURVIVOR_STARTS[role][1],rank:1,cd:.3});expect(b.stats).toEqual(a.stats);expect(b.equipment).toEqual(a.equipment);expect(b.level).toBe(1);expect(b.survival.seenSkills).toEqual([b.skills[0].id]);expect(b.survival.mainSkills).toEqual(survivorStartGuide(role,b.skills[0].id).main);
  const save=b.snapshotSurvival()!,next=new Game();expect(next.resumeSurvival(save)).toBe(true);expect(next.skills).toEqual(b.skills);expect(next.survival.mainSkills).toEqual(b.survival.mainSkills);
 }
});
it('rejects foreign/non-preset starts and keeps original mode starting skills',()=>{
 const g=new Game();g.survivorMode=true;g.start('normal',7,'warrior',false,'biche','lightning');expect(g.skills[0].id).toBe('cleave');
 g.start('normal',7,'wizard',false,'biche','shield');expect(g.skills[0].id).toBe('fireball');
 g.survivorMode=false;g.start('normal',7,'warrior',false,'biche','thrust');expect(g.skills[0].id).toBe('powerstrike');
});
it('each alternative casts through the real combat loop at rank one',()=>{
 for(const role of ['wizard','warrior','taoist'] as const){
  const g=new Game();g.survivorMode=true;const id=SURVIVOR_STARTS[role][1];g.start('normal',7,role,false,'biche',id);
  g.survival.spawnAt=g.survival.eliteAt=g.survival.bossAt=1e9;
  const e=g.spawnEnemy('orc');Object.assign(e,{x:g.player.x+55,y:g.player.y,hp:10000,maxHp:10000,speed:0,damage:0});
  if(role==='warrior'){const second=g.spawnEnemy('orc');Object.assign(second,{x:g.player.x+80,y:g.player.y,hp:10000,maxHp:10000,speed:0,damage:0});}
  for(let i=0;i<160;i++)g.step(.05);
  expect(g.damageDealt[id]??0,`${role}: ${id} damage`).toBeGreaterThan(0);
  if(role==='taoist')expect(g.pets.some(p=>p.hp>0)).toBe(true);
 }
});

it('keeps the skeleton as opening support and describes the actual two damage focuses',()=>{
 const guide=survivorStartGuide('taoist','skeleton');expect(guide.main).toEqual(['talisman','beast']);expect(guide.text).toContain('主修火符与神兽');
 const g=new Game();g.survivorMode=true;g.start('normal',42,'taoist',false,'biche','skeleton');
 expect(g.skills.map(s=>s.id)).toEqual(['skeleton']);expect(g.survival.mainSkills).toEqual(['talisman','beast']);
 // A saved deliberate focus selection wins over a later lobby recommendation.
 g.survival.mainSkills=['skeleton','poison'];const save=g.snapshotSurvival()!;const next=new Game();expect(next.resumeSurvival(save)).toBe(true);expect(next.survival.mainSkills).toEqual(['skeleton','poison']);
});
