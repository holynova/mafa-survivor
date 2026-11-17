import {getItem,SLOT_KEYS,type Item,type Slot} from './content';
import type {Game} from './game';
export const EQUIPMENT_PREFERENCES=['offense','survival','summon'] as const;
export type EquipmentPreference=typeof EQUIPMENT_PREFERENCES[number];
export function setEquipmentPreference(g:Game,value:EquipmentPreference){if(!g.survivorMode||g.phase!=='paused'||!EQUIPMENT_PREFERENCES.includes(value))return false;g.survival.equipmentPreference=value;g.emit();return true;}
export function toggleEquipmentLock(g:Game,slot:Slot){if(!g.survivorMode||g.phase!=='paused'||!SLOT_KEYS.includes(slot)||!g.equipment[slot])return false;const locks=g.survival.equipmentLocks;g.survival.equipmentLocks=locks.includes(slot)?locks.filter(s=>s!==slot):[...locks,slot];g.emit();return true;}
/** Same rarity: prefer the current class's offense, then useful defenses. */
export function equipmentScore(g:Game,item:Item){
 const offense=g.classId==='wizard'?'mc':g.classId==='taoist'?'sc':'dc';
 const preference=g.survivorMode?g.survival.equipmentPreference:'offense';
 const base=(key:string)=>key.startsWith(offense)?3:key.startsWith('def_')||key.startsWith('mdef_')?2:key==='hp_max'?.3:key==='hp_regen'?10:key==='cooldown_reduction'?2:key==='move_speed'?1.5:key.startsWith('summon_')&&g.classId==='taoist'?1.2:.1;
 const weight=(key:string)=>preference==='survival'?(key.startsWith('def_')||key.startsWith('mdef_')||['hp_max','hp_regen','healing_received'].includes(key)?base(key)*3:key.startsWith(offense)?base(key)*.5:base(key)):preference==='summon'?(key.startsWith('summon_')?base(key)*5:key.startsWith(offense)?base(key)*.75:base(key)):base(key);
 return Object.entries(item.stats).reduce((sum,[key,value])=>sum+(value??0)*weight(key),0);
}
export function compareEquipment(g:Game,a:Item,b:Item){return a.tier-b.tier || equipmentScore(g,a)-equipmentScore(g,b);}
export function autoEquipSlot(g:Game,item:Item):Slot|undefined{
 if(item.kind!=='equipment'||!g.validItem(item))return;
 const slots=SLOT_KEYS.filter(s=>(s===item.slot || item.slot==='ring'&&s.startsWith('ring') || item.slot==='bracelet'&&s.startsWith('bracelet'))&&(!g.survivorMode||!g.survival.equipmentLocks.includes(s)));
 const empty=slots.find(s=>!g.equipment[s]);if(empty)return empty;
 if(!g.survivorMode)return;
 const weakest=[...slots].sort((a,b)=>compareEquipment(g,getItem(g.equipment[a]!.itemId),getItem(g.equipment[b]!.itemId)))[0];
 if(weakest&&compareEquipment(g,item,getItem(g.equipment[weakest]!.itemId))>0)return weakest;
}
