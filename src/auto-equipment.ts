import {getItem,SLOT_KEYS,type Item,type Slot} from './content';
import type {Game} from './game';
/** Same rarity: prefer the current class's offense, then useful defenses. */
export function equipmentScore(g:Game,item:Item){
 const offense=g.classId==='wizard'?'mc':g.classId==='taoist'?'sc':'dc';
 return Object.entries(item.stats).reduce((sum,[key,value])=>sum+(value??0)*(key.startsWith(offense)?3:key.startsWith('def_')||key.startsWith('mdef_')?2:key==='hp_max'?.3:key==='hp_regen'?10:key==='cooldown_reduction'?2:key==='move_speed'?1.5:key.startsWith('summon_')&&g.classId==='taoist'?1.2:.1),0);
}
export function compareEquipment(g:Game,a:Item,b:Item){return a.tier-b.tier || equipmentScore(g,a)-equipmentScore(g,b);}
export function autoEquipSlot(g:Game,item:Item):Slot|undefined{
 if(item.kind!=='equipment'||!g.validItem(item))return;
 const slots=SLOT_KEYS.filter(s=>s===item.slot || item.slot==='ring'&&s.startsWith('ring') || item.slot==='bracelet'&&s.startsWith('bracelet'));
 const empty=slots.find(s=>!g.equipment[s]);if(empty)return empty;
 if(!g.survivorMode)return;
 const weakest=[...slots].sort((a,b)=>compareEquipment(g,getItem(g.equipment[a]!.itemId),getItem(g.equipment[b]!.itemId)))[0];
 if(weakest&&compareEquipment(g,item,getItem(g.equipment[weakest]!.itemId))>0)return weakest;
}
