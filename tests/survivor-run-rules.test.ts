import {expect,it} from 'vitest';
import {Game} from '../src/game';
import {survivalChoices,survivalTick} from '../src/survivor';
import {changeSurvivalSkill,replacementSkills} from '../src/survivor-skill-management';
const run=()=>{const g=new Game();g.survivorMode=true;g.start('normal',176,'taoist');return g;};
it('records only offered skills, keeps exposure across rerolls and validates a replacement before spending',()=>{
 const g=run();expect(g.survival.seenSkills).toEqual(['talisman']);g.pause();
 expect(changeSurvivalSkill(g,'talisman','beast')).toBe(false);expect(g.survival.respecs).toBe(2);
 const first=survivalChoices(g),second=survivalChoices(g);
 expect(new Set(g.survival.seenSkills)).toEqual(new Set(['talisman',...[...first,...second].flatMap(c=>c.skill?[c.skill]:[])]));
 expect(replacementSkills(g).every(s=>g.survival.seenSkills.includes(s.id))).toBe(true);
 const next=replacementSkills(g)[0];expect(next).toBeDefined();
 expect(changeSurvivalSkill(g,'talisman',next.id)).toBe(true);expect(g.survival.respecs).toBe(1);
 expect(changeSurvivalSkill(g,next.id,'talisman')).toBe(true);expect(g.survival.respecs).toBe(0);
 expect(changeSurvivalSkill(g,'talisman',next.id)).toBe(false);expect(replacementSkills(g)).toHaveLength(0);
 g.skills.push(g.newSkill('heal'));expect(changeSurvivalSkill(g,'heal',null)).toBe(true);expect(g.survival.respecs).toBe(0);
});
it('test mode has unrestricted replacement without spending normal-run uses',()=>{
 const g=run();g.mode='test';g.phase='paused';for(let i=0;i<4;i++){expect(changeSurvivalSkill(g,g.skills[0].id,i%2?'talisman':'beast')).toBe(true);}
 expect(g.survival.respecs).toBe(2);expect(g.snapshotSurvival()).toBeNull();
});
it('replacement uses and exposure survive saving and cannot be replenished by resume',()=>{
 const g=run();g.survival.seenSkills.push('beast');g.pause();changeSurvivalSkill(g,'talisman','beast');
 const restored=new Game();expect(restored.resumeSurvival(g.snapshotSurvival())).toBe(true);expect(restored.survival.respecs).toBe(1);expect(restored.survival.seenSkills).toEqual(g.survival.seenSkills);
});
it('stops ordinary spawns at 20 minutes and loses after exactly two minutes of overtime',()=>{
 const g=run();g.clock=1080;survivalTick(g);g.clock=1200;g.survival.spawnAt=0;const before=g.enemies.length;survivalTick(g);
 expect(g.enemies).toHaveLength(before);expect(g.survival.overtimeEndsAt).toBe(1320);expect(g.phase).toBe('battle');
 g.clock=1319.99;survivalTick(g);expect(g.phase).toBe('battle');g.clock=1320;survivalTick(g);expect(g.phase).toBe('dead');expect(g.survival.timedOut).toBe(true);expect(g.result?.won).toBe(false);
});
it('early boss defeat still requires 20 minutes; a defeat by the deadline wins',()=>{
 const g=run();g.clock=1080;survivalTick(g);g.survival.finalBossDefeated=true;survivalTick(g);expect(g.phase).toBe('battle');g.clock=1200;survivalTick(g);expect(g.phase).toBe('won');
 const last=run();last.clock=1200;survivalTick(last);last.clock=1320;last.survival.finalBossDefeated=true;survivalTick(last);expect(last.phase).toBe('won');expect(last.survival.timedOut).toBe(false);
});
it('resume keeps the overtime deadline; legacy overtime receives a single migration grace',()=>{
 const g=run();g.clock=1200;survivalTick(g);g.clock=1300;
 const saved=g.snapshotSurvival()!;const restored=new Game();expect(restored.resumeSurvival(saved)).toBe(true);expect(restored.survival.overtimeEndsAt).toBe(1320);
 const old=JSON.parse(JSON.stringify(saved));delete old.state.survival.overtimeEndsAt;delete old.state.survival.respecs;delete old.state.survival.seenSkills;delete old.state.survival.timedOut;old.state.clock=1500;
 expect(restored.resumeSurvival(old)).toBe(true);expect(restored.survival.overtimeEndsAt).toBe(1620);expect(restored.survival.respecs).toBe(2);
 const again=new Game();expect(again.resumeSurvival(restored.snapshotSurvival())).toBe(true);expect(again.survival.overtimeEndsAt).toBe(1620);
});
