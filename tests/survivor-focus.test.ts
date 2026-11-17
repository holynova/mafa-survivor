import {expect,it} from 'vitest';
import {Game} from '../src/game';
import {survivalChoices} from '../src/survivor';
import {toggleMainSkill,mainRecipeForChoice} from '../src/survivor-focus';
import {changeSurvivalSkill} from '../src/survivor-skill-management';
function run(seed=176){const g=new Game();g.survivorMode=true;g.start('normal',seed,'wizard');return g;}
it('starts with two recommended main skills and only edits focus while paused within class/slot limits',()=>{
 const g=run();expect(g.survival.mainSkills).toEqual(['fireball','lightning']);expect(toggleMainSkill(g,'fireball')).toBe(false);g.pause();expect(toggleMainSkill(g,'beast')).toBe(false);expect(toggleMainSkill(g,'firewall')).toBe(false);expect(toggleMainSkill(g,'lightning')).toBe(true);expect(toggleMainSkill(g,'firewall')).toBe(true);expect(g.survival.mainSkills).toEqual(['fireball','firewall']);
});
it('guarantees each eligible main skill within three offers across seeds without duplicate choices or extra ranks',()=>{
 for(const seed of [1,42,176,2026,9999]){const g=run(seed),misses={fireball:0,lightning:0};g.skills.push(g.newSkill('ice'));for(let i=0;i<60;i++){const choices=survivalChoices(g);expect(choices).toHaveLength(3);expect(new Set(choices.map(c=>c.id)).size).toBe(3);expect(choices.some(c=>g.skills.some(s=>s.id===c.skill))).toBe(true);for(const id of ['fireball','lightning'] as const){misses[id]=choices.some(c=>c.skill===id)?0:misses[id]+1;expect(misses[id]).toBeLessThanOrEqual(2);}}expect(g.skills.map(s=>s.rank)).toEqual([1,1]);expect(g.level).toBe(1);}
});
it('never invents a max-rank upgrade or a seventh active slot to satisfy focus',()=>{
 const g=run();g.skills=['fireball','ice','nova','shield','hellfire','repulse'].map(id=>g.newSkill(id as 'fireball'));g.skills[0].rank=8;g.survival.focusMisses={fireball:2,lightning:2};for(let i=0;i<10;i++)expect(survivalChoices(g).some(c=>c.skill==='fireball'||c.skill==='lightning')).toBe(false);expect(g.survival.focusMisses).toEqual({fireball:0,lightning:0});
});
it('preserves the next guaranteed offer through save/resume',()=>{
 const g=run();g.survival.focusMisses={fireball:2,lightning:2};const restored=new Game();expect(restored.resumeSurvival(g.snapshotSurvival())).toBe(true);const a=survivalChoices(g),b=survivalChoices(restored);expect(b).toEqual(a);expect(a.map(c=>c.skill)).toEqual(expect.arrayContaining(['fireball','lightning']));
});
it('replacement follows the selected build and deletion frees a main slot',()=>{
 const g=run();g.pause();g.survival.seenSkills.push('firewall');expect(changeSurvivalSkill(g,'fireball','firewall')).toBe(true);expect(g.survival.mainSkills).toEqual(['firewall','lightning']);g.skills.push(g.newSkill('ice'));expect(changeSurvivalSkill(g,'firewall',null)).toBe(true);expect(g.survival.mainSkills).toEqual(['lightning']);
});
it('only marks passives related to an unfinished main evolution',()=>{
 const g=run();const c={id:'p:flame',kind:'stat' as const,value:8,name:'火焰戒指',description:''};expect(mainRecipeForChoice(g,c)).toEqual(['fireball']);expect(mainRecipeForChoice(g,{...c,id:'p:life'})).toEqual([]);g.survival.evolved=['fireball'];expect(mainRecipeForChoice(g,c)).toEqual([]);
});
