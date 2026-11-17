import {expect,it} from 'vitest';
import {Game} from '../src/game';
import {ITEMS,getItem} from '../src/content';
import {compareEquipment,equipmentScore,setEquipmentPreference,toggleEquipmentLock,autoEquipSlot} from '../src/auto-equipment';
import {collectLoot} from '../src/loot';
const run=()=>{const g=new Game();g.survivorMode=true;g.start('normal',176,'taoist');return g;};
it('changes same-tier tradeoffs while retaining rarity priority and old-mode scores',()=>{
 const g=run(),base=ITEMS.find(i=>i.kind==='equipment')!;
 const attack={...base,tier:1,stats:{sc_max:10}},defense={...base,tier:1,stats:{def_max:10}},summon={...base,tier:1,stats:{summon_damage:10}};
 expect(compareEquipment(g,attack,defense)).toBeGreaterThan(0);g.pause();setEquipmentPreference(g,'survival');expect(compareEquipment(g,defense,attack)).toBeGreaterThan(0);setEquipmentPreference(g,'summon');expect(compareEquipment(g,summon,attack)).toBeGreaterThan(0);expect(compareEquipment(g,{...attack,tier:2},summon)).toBeGreaterThan(0);
 g.survivorMode=false;expect(equipmentScore(g,attack)).toBe(30);
});
it('locks existing equipment only while paused and rejects empty slots',()=>{const g=run();expect(toggleEquipmentLock(g,'weapon')).toBe(false);expect(setEquipmentPreference(g,'survival')).toBe(false);g.pause();expect(toggleEquipmentLock(g,'helmet')).toBe(false);expect(toggleEquipmentLock(g,'weapon')).toBe(true);expect(g.survival.equipmentLocks).toEqual(['weapon']);});
it('keeps the locked appearance while selling a better drop, then accepts it after unlock',()=>{
 const g=run(),old=getItem(g.equipment.weapon!.itemId),better=ITEMS.find(i=>i.slot==='weapon'&&i.tier>old.tier&&g.validItem(i))!;g.pause();toggleEquipmentLock(g,'weapon');expect(autoEquipSlot(g,better)).toBeUndefined();const gold=g.gold;collectLoot(g,{id:g.nextEntityId(),x:0,y:0,born:0,itemId:better.id,exp:0,gold:0});expect(g.equipment.weapon?.itemId).toBe(old.id);expect(g.gold).toBeGreaterThan(gold);toggleEquipmentLock(g,'weapon');expect(autoEquipSlot(g,better)).toBe('weapon');
});
it('allows the other ring slot and preserves lock and preference through resume',()=>{const g=run(),ring=ITEMS.find(i=>i.slot==='ring'&&g.validItem(i))!;g.equipment.ringL={itemId:ring.id,paid:0};g.pause();toggleEquipmentLock(g,'ringL');setEquipmentPreference(g,'survival');expect(autoEquipSlot(g,ring)).toBe('ringR');const restored=new Game();expect(restored.resumeSurvival(g.snapshotSurvival())).toBe(true);expect(restored.survival.equipmentLocks).toEqual(['ringL']);expect(restored.survival.equipmentPreference).toBe('survival');});
