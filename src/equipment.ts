import type {ClassId} from "./classes";
import type {Bonuses,Item} from "./content";

export function primaryRange(classId:ClassId,stats:Bonuses) {
  const prefix=classId==="warrior" ? "dc" : classId==="wizard" ? "mc" : "sc";
  const flat=prefix==="mc" ? stats.mc_flat ?? 0 : 0;
  return {label:classId==="warrior" ? "攻击" : classId==="wizard" ? "魔法" : "道术",
    min:(stats[`${prefix}_min`] ?? 0)+flat,max:(stats[`${prefix}_max`] ?? 0)+flat};
}

export function isPrimaryWeaponUpgrade(classId:ClassId,current:Item|undefined,candidate:Item) {
  if(candidate.slot!=="weapon")return false;
  const before=primaryRange(classId,current?.stats ?? {}),after=primaryRange(classId,candidate.stats);
  return after.min+after.max>before.min+before.max;
}
