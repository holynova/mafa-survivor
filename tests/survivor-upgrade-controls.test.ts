import {it,expect} from 'vitest';
import {Game} from '../src/game';
import {ITEMS,getItem} from '../src/content';
import {collectLoot} from '../src/loot';
import {compareEquipment} from '../src/auto-equipment';
import {resolveAppearance} from '../src/appearance';
import {sellPrice} from '../src/rules';
import {changeSurvivalSkill} from '../src/survivor-skill-management';
import {survivalBonuses} from '../src/survivor';
import {skillCooldown} from '../src/skill-metrics';
const run=()=>{const g=new Game();g.survivorMode=true;g.start('normal',176,'taoist');return g;};
function pickup(g:Game,id:string,count=1){collectLoot(g,{id:g.nextEntityId(),x:g.player.x,y:g.player.y,born:g.clock,itemId:id,count,exp:0,gold:0});}
it('caps equipment notices without removing unrelated combat feedback',()=>{
 const g=run(),damage={id:g.nextEntityId(),x:0,y:0,text:'20',color:'#ff0000',life:1};g.floating.push(damage);
 const item=ITEMS.find(i=>i.kind==='equipment'&&g.validItem(i))!;
 for(let i=0;i<5;i++)pickup(g,item.id);
 expect(g.floating).toContain(damage);expect(g.floating.filter(f=>f.color==='#ecd087')).toHaveLength(3);
});
it.each(['weapon','armor'] as const)('equips a better %s, changes real appearance, sells the old item exactly once',slot=>{
 const g=run(),pool=ITEMS.filter(i=>i.kind==='equipment'&&i.slot===slot&&g.validItem(i)).sort((a,b)=>compareEquipment(g,a,b)),low=pool[0],high=pool.at(-1)!;
 g.equipment[slot]={itemId:low.id,paid:0};const before=resolveAppearance(g.classId,g.equipment);g.recompute();const gold=g.gold;pickup(g,high.id);
 expect(g.equipment[slot]?.itemId).toBe(high.id);expect(resolveAppearance(g.classId,g.equipment)).not.toEqual(before);expect(g.gold-gold).toBe(sellPrice(0,low.price));
 const upgraded=resolveAppearance(g.classId,g.equipment);pickup(g,low.id,2);expect(resolveAppearance(g.classId,g.equipment)).toEqual(upgraded);expect(g.gold-gold).toBe(3*sellPrice(0,low.price));
});
it('uses both ring slots then replaces the weaker one without duplicating loot value',()=>{
 const g=run(),pool=ITEMS.filter(i=>i.slot==='ring'&&g.validItem(i)).sort((a,b)=>compareEquipment(g,a,b));const low=pool[0],high=pool.at(-1)!;pickup(g,low.id,2);pickup(g,high.id);
 expect(Object.values(g.equipment).filter(e=>e.itemId===low.id)).toHaveLength(1);expect(Object.values(g.equipment).filter(e=>e.itemId===high.id)).toHaveLength(1);
});
it('rejects incompatible equipment and preserves the original mode occupied-slot behavior',()=>{
 const g=run();const incompatible=ITEMS.find(i=>i.kind==='equipment'&&i.classId==='warrior')!;pickup(g,incompatible.id);expect(Object.values(g.equipment).some(e=>e.itemId===incompatible.id)).toBe(false);
 g.survivorMode=false;const old=g.equipment.weapon!.itemId;const better=ITEMS.find(i=>i.slot==='weapon'&&i.tier>getItem(old).tier&&g.validItem(i))!;pickup(g,better.id);expect(g.equipment.weapon!.itemId).toBe(old);
});
it('requires pause, keeps at least one skill, validates replacements and starts rank-one at full cooldown',()=>{
 const g=run(),old=g.skills[0].id;expect(changeSurvivalSkill(g,old,'heal')).toBe(false);g.pause();expect(changeSurvivalSkill(g,old,null)).toBe(false);expect(changeSurvivalSkill(g,old,'fireball')).toBe(false);expect(changeSurvivalSkill(g,old,'heal')).toBe(true);
 expect(g.skills[0].rank).toBe(1);expect(g.skills[0].cd).toBe(skillCooldown(g.skills[0]));expect(g.phase).toBe('paused');expect(g.snapshotSurvival()).not.toBeNull();
});
it('cleans summoned pets, evolution, projectiles and timed buffs and round-trips the edited build',()=>{
 const g=run();const beast=g.newSkill('beast');beast.rank=8;Object.assign(beast,survivalBonuses(beast));beast.cd=0;g.skills.push(beast);g.survival.evolved=['beast'];g.cast(beast);expect(g.pets.length).toBeGreaterThan(0);g.pause();expect(changeSurvivalSkill(g,'beast','invisible')).toBe(true);expect(g.pets).toHaveLength(0);expect(g.survival.evolved).toHaveLength(0);
 expect(changeSurvivalSkill(g,'talisman',null)).toBe(true);const cp=g.snapshotSurvival();const restored=new Game();expect(restored.resumeSurvival(cp)).toBe(true);expect(restored.skills.map(s=>s.id)).toEqual(['invisible']);
});
it('removing a skill stops its existing poison, defensive buff and in-flight projectile',()=>{
 const g=run();const e=g.spawnEnemy('orc');e.x=g.player.x+100;e.y=g.player.y;
 for(const id of ['poison','armor','talisman'] as const){const s=g.newSkill(id);s.cd=0;g.skills=[g.newSkill('heal'),s];g.phase='battle';g.cast(s);g.pause();expect(changeSurvivalSkill(g,id,null)).toBe(true);expect(g.projectiles.some(p=>p.skill===id)).toBe(false);}
 expect(e.greenPoison).toBeUndefined();expect(g.tao.buffs[0]?.armorUntil??0).toBe(0);
});
