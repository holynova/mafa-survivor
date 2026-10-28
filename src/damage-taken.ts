import { MONSTERS } from "./content";

/** Actual player HP removed, after dodge, invulnerability and all mitigation. */
export type DamageTaken = { physical: number; magic: number; sources: Record<string, number> };
export const newDamageTaken = (): DamageTaken => ({ physical: 0, magic: 0, sources: {} });
export function recordDamageTaken(state: DamageTaken, kind: "physical" | "magic", source: string, actual: number) {
  if (!Number.isFinite(actual) || actual <= 0) return;
  state[kind] += actual;
  state.sources[source] = (state.sources[source] ?? 0) + actual;
}
export function damageSourceName(source: string) {
  if (source === "unknown") return "其他伤害";
  if (source === "recoil") return "野蛮撞墙";
  const [enemy, attack] = source.split(":");
  const names: Record<string, string> = { melee: "挥击", charge: "冲锋", jump: "跃击", stomp: "震地", projectile: "弹体", shock: "冲击" };
  return `${MONSTERS.find(m => m.id === enemy)?.name ?? "敌方"} · ${names[attack] ?? "攻击"}`;
}
