import catalogue from "../tools/equipment-appearance.json";
import { getItem, type Item } from "./content";
import type { ClassId } from "./classes";

type Equipment = Partial<Record<"weapon" | "armor", { itemId: string }>>;
const weapons: Record<string, number> = catalogue.weapons;
const clothes: Record<string, number> = catalogue.clothes;
export function hasWorldAppearance(item: Item) {
  if (item.slot === "weapon") return weapons[item.name] !== undefined;
  if (item.slot === "armor") return clothes[item.name] !== undefined;
  return true;
}
export function resolveAppearance(_classId: ClassId, equipment: Equipment) {
  const weapon = equipment.weapon ? getItem(equipment.weapon.itemId) : null;
  const armor = equipment.armor ? getItem(equipment.armor.itemId) : null;
  return {
    body: `dress-${armor ? clothes[armor.name] ?? 1 : 1}`,
    weapon: weapon && weapons[weapon.name] !== undefined ? `weapon-${weapons[weapon.name]}` : null,
  };
}
export function weaponBehind(motion: string, direction: number, frame: number) {
  const gfx: Record<string, number> = catalogue.motions;
  return catalogue.weaponOrder[(gfx[motion] ?? 0) * 80 + direction * 10 + frame] === 1;
}
