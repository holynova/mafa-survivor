import {expect,it} from 'vitest';
import {Game} from '../src/game';
import {skillCooldown,skillMetrics} from '../src/skill-metrics';
import {skillCooldownView,skillReadiness} from '../src/SurvivorHud';
import {changeSurvivalSkill} from '../src/survivor-skill-management';
import {survivalBonuses} from '../src/survivor';

function arena(survivor=true){
 const g=new Game();g.survivorMode=survivor;g.start('test',176,'taoist');g.test.spawning=false;
 g.enemies=[];g.survival.spawnAt=g.survival.eliteAt=g.survival.bossAt=1e9;g.basicCD=1e9;
 const s=g.newSkill('poison');s.cd=0;g.skills=[s];
 for(let i=0;i<4;i++){const e=g.spawnEnemy('orc');Object.assign(e,{x:g.player.x+60+i*20,y:g.player.y,hp:10000,maxHp:10000,speed:0,attackCD:1e9});}
 return {g,s};
}
it('covers a second enemy within 1.7 seconds while keeping one-second ticks and no stacking',()=>{
 const {g,s}=arena();g.cast(s);const first=g.enemies[0],tick=first.greenPoison!.tickAt;
 for(let i=0;i<102;i++)g.step(1/60);
 expect(g.enemies.filter(e=>e.greenPoison)).toHaveLength(2);
 expect(first.greenPoison!.tickAt).toBeCloseTo(tick+1);expect(first.greenPoison!.until).toBeCloseTo(6);
});
it('uses the same total in real casts, HUD cooldown, readiness and effective metrics',()=>{
 const {g,s}=arena();g.cast(s);expect(s.cd).toBeCloseTo(1.6);expect(skillCooldown(s,0,true)).toBe(s.cd);
 expect(skillCooldownView(s,0,true).ratio).toBe(1);s.cd=.8;
 expect(skillReadiness([s],0,true)).toBeCloseTo(.5);expect(skillMetrics(g,s)).toContain('实际冷却 1.6秒');
});
it('retains classic four-second casts and a single poisoned target before that cooldown ends',()=>{
 const {g,s}=arena(false);g.cast(s);expect(s.cd).toBe(4);
 for(let i=0;i<102;i++)g.step(1/60);
 expect(g.enemies.filter(e=>e.greenPoison)).toHaveLength(1);expect(skillMetrics(g,s)).toContain('实际冷却 4秒');
});
it('also spreads red poison without increasing its defense reduction',()=>{
 const {g,s}=arena();g.tao.poisonMode='red';g.cast(s);for(let i=0;i<102;i++)g.step(1/60);
 const poisoned=g.enemies.filter(e=>e.redPoison);expect(poisoned).toHaveLength(2);
 for(const e of poisoned)expect(e.redPoison!.reduction).toBe(.15);
});
it('does not gain extra single-target poison ticks from faster cast checks',()=>{
 const {g,s}=arena();g.enemies=g.enemies.slice(0,1);g.cast(s);const damage=g.enemies[0].greenPoison!.damage;
 for(let i=0;i<240;i++)g.step(1/60);expect(g.damageDealt.poison).toBeCloseTo(damage*4);
 expect(g.enemies[0].greenPoison!.until).toBe(6);
});
it('keeps the rank-eight cooldown upgrade and global cooldown reduction effective',()=>{
 const {g,s}=arena();s.rank=8;Object.assign(s,survivalBonuses(s));
 expect(skillCooldown(s,0,true)).toBeCloseTo(1.44);expect(skillCooldown(s,25,true)).toBeCloseTo(1.08);
});
it('starts a replacement at its full survivor cooldown and retains an older saved cooldown',()=>{
 const {g}=arena();g.skills=[g.newSkill('talisman')];g.survival.seenSkills=['talisman','poison'];g.pause();
 expect(changeSurvivalSkill(g,'talisman','poison')).toBe(true);expect(g.skills[0].cd).toBeCloseTo(1.6);
 g.mode='normal';g.skills[0].cd=3.5;const cp=g.snapshotSurvival()!,restored=new Game();expect(restored.resumeSurvival(cp)).toBe(true);
 expect(restored.skills[0].cd).toBe(3.5);expect(skillCooldownView(restored.skills[0],0,true).ratio).toBe(1);
});
