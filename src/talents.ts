import type { StatKey } from "./content";

/**
 * Cross-run permanent talents bought with Mafa crystals.
 * GDD §10.1 caps permanent numeric talent growth at +5% per stat, so every
 * talent below uses 1% per level with a hard maximum of five levels.
 */
export const TALENT_IDS = [
  "vitality",
  "might",
  "haste",
  "fortune",
  "wisdom",
  "swiftness",
  "magnet",
  "precision",
] as const;
export type TalentId = (typeof TALENT_IDS)[number];

export type TalentDef = {
  id: TalentId;
  name: string;
  stat: StatKey;
  perLevel: number;
  maxLevel: number;
  description: string;
};

export const MAX_TALENT_BONUS = 5;
export const TALENTS: TalentDef[] = [
  { id: "vitality", name: "体魄", stat: "hp_max", perLevel: 1, maxLevel: 5, description: "每级最大生命 +1" },
  { id: "might", name: "武运", stat: "all_damage_pct", perLevel: 1, maxLevel: 5, description: "每级全部伤害 +1%" },
  { id: "haste", name: "灵巧", stat: "cooldown_reduction", perLevel: 1, maxLevel: 5, description: "每级全局冷却缩减 +1%" },
  { id: "fortune", name: "财源", stat: "gold_gain", perLevel: 1, maxLevel: 5, description: "每级金币获取 +1%" },
  { id: "wisdom", name: "悟性", stat: "exp_gain", perLevel: 1, maxLevel: 5, description: "每级经验获取 +1%" },
  { id: "swiftness", name: "身法", stat: "move_speed", perLevel: 1, maxLevel: 5, description: "每级移动速度 +1%" },
  { id: "magnet", name: "灵觉", stat: "pickup_radius", perLevel: 1, maxLevel: 5, description: "每级拾取范围 +1%" },
  { id: "precision", name: "锐眼", stat: "crit_chance", perLevel: 1, maxLevel: 5, description: "每级暴击概率 +1%" },
];

/** Crystal cost to buy the next level, indexed by the current level (0-4). */
const COSTS = [1, 2, 3, 4, 5];
export const talentCost = (level: number) =>
  COSTS[Math.min(Math.max(0, level), COSTS.length - 1)];

export const emptyTalents = (): Record<TalentId, number> =>
  Object.fromEntries(TALENT_IDS.map((id) => [id, 0])) as Record<TalentId, number>;

export const talentLevel = (
  talents: Partial<Record<TalentId, number>>,
  id: TalentId,
) => Math.min(getTalent(id).maxLevel, Math.max(0, Math.floor(talents[id] ?? 0)));

const getTalent = (id: TalentId) => {
  const def = TALENTS.find((t) => t.id === id);
  if (!def) throw new Error("Unknown talent: " + id);
  return def;
};

export function talentBonuses(
  talents: Partial<Record<TalentId, number>>,
): Partial<Record<StatKey, number>> {
  const out: Partial<Record<StatKey, number>> = {};
  for (const def of TALENTS) {
    const level = talentLevel(talents, def.id);
    if (level <= 0) continue;
    out[def.stat] = (out[def.stat] ?? 0) + def.perLevel * level;
  }
  return out;
}

/** Drop unknown ids and clamp to the legal level range before persisting. */
export function sanitizeTalents(
  talents: Partial<Record<string, number>> | undefined,
): Record<TalentId, number> {
  const out = emptyTalents();
  for (const def of TALENTS) {
    const value = Math.floor(Number(talents?.[def.id] ?? 0));
    out[def.id] = Math.min(def.maxLevel, Math.max(0, Number.isFinite(value) ? value : 0));
  }
  return out;
}
