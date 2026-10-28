import { ITEMS, SKILLS, STAT_NAMES, type StatKey } from "./content";

/** One skill or basic-attack row of the post-run damage breakdown. */
export type DamageRow = {
  id: string;
  name: string;
  damage: number;
  /** Damage per second over the whole run. */
  dps: number;
  /** Percent of all recorded damage, 0–100. */
  share: number;
};

export type PurchaseRow = { itemId: string; name: string; count: number };
export type StatRow = { key: StatKey; name: string; value: number; unit: string; prefix: string };

const displayName = (id: string) =>
  id === "basic"
    ? "普通攻击"
    : (SKILLS.find((s) => s.id === id)?.name ??
      ITEMS.find((i) => i.id === id)?.name ??
      id);

/**
 * Sort recorded damage descending and derive DPS and share. A run shorter than
 * one second reports DPS 0 rather than dividing by zero.
 */
export function damageRows(
  damage: Record<string, number>,
  seconds: number,
): DamageRow[] {
  const total = Object.values(damage).reduce(
    (sum, value) => sum + Math.max(0, value),
    0,
  );
  return Object.entries(damage)
    .filter(([, value]) => value > 0)
    .map(([id, value]) => ({
      id,
      name: displayName(id),
      damage: value,
      dps: seconds > 0 ? value / seconds : 0,
      share: total > 0 ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.damage - a.damage || a.id.localeCompare(b.id));
}

/** Counts of shop purchases, most frequent first. */
export function purchaseRows(
  purchases: Record<string, number> | undefined,
): PurchaseRow[] {
  return Object.entries(purchases ?? {})
    .filter(([, count]) => count > 0)
    .map(([itemId, count]) => ({
      itemId,
      name: ITEMS.find((i) => i.id === itemId)?.name ?? itemId,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.itemId.localeCompare(b.itemId));
}

const ABSOLUTE: StatKey[] = ["dc_min", "dc_max", "mc_min", "mc_max", "sc_min", "sc_max",
  "def_min", "def_max", "mdef_min", "mdef_max", "accuracy", "agility", "luck"];
const FLAT: StatKey[] = [...ABSOLUTE, "hp_max", "def_flat", "mdef_flat", "mc_flat"];

const unitFor = (key: StatKey): string => {
  if (FLAT.includes(key)) return "";
  if (key === "hp_on_kill") return "点/次";
  if (key === "hp_regen") return "/秒";
  if (key === "crit_mult") return "倍";
  return "%";
};

/** Final run stats in display order, dropping zeros the player never gained. */
export function statRows(stats: Partial<Record<StatKey, number>>): StatRow[] {
  return (Object.keys(STAT_NAMES) as StatKey[])
    .filter((key) => (stats[key] ?? 0) > 0)
    .map((key) => ({
      key,
      name: STAT_NAMES[key],
      value: stats[key] ?? 0,
      prefix: ABSOLUTE.includes(key) ? "" : "+",
      unit: unitFor(key),
    }));
}

export const dpsText = (value: number) => value.toFixed(1);
