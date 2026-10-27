import { getSkill } from "./spells";
import { ITEMS } from "./content";
import { hasWorldAppearance } from "./appearance";
import { clearTaoSkill } from "./taoist";
import type { Game } from "./game";
import type { SkillId } from "./spells";
export const newTestSettings = () => ({
  god: true,
  autowalk: false,
  speed: 1,
  pose: "live",
  direction: 4,
  visualEpoch: 0,
});
export function testSpawn(g: Game, kind: string, count: number) {
  if (g.mode !== "test" || !["battle", "paused"].includes(g.phase)) return;
  const total = Math.min(
    300 - g.enemies.length,
    Math.max(0, Math.floor(count)),
  );
  for (let i = 0; i < total; i++) {
    g.spawnEnemy(kind);
    const e = g.enemies.at(-1)!;
    const a = (i * Math.PI * 2) / Math.max(1, count),
      r = 180 + (i % 3) * 45;
    const desired = { x: Math.max(35, Math.min(2173, g.player.x + Math.cos(a) * r)),
      y: Math.max(55, Math.min(1501, g.player.y + Math.sin(a) * r)) };
    const points = g.navigation?.reachablePoints(g.player, 150, 350);
    const point = points?.length ? points.reduce((best, p) =>
      Math.hypot(p.x - desired.x, p.y - desired.y) < Math.hypot(best.x - desired.x, best.y - desired.y) ? p : best) : desired;
    e.x = point.x; e.y = point.y;
  }
  g.emit();
}
export function testEquip(g: Game, id: SkillId, slot: number) {
  if (g.mode !== "test" || !Number.isInteger(slot) || slot < 0 || slot > 5)
    return false;
  if (getSkill(id).classId !== g.classId || g.skills.some((s) => s.id === id))
    return false;
  const skill = g.newSkill(id);
  skill.cd = 0;
  if (slot < g.skills.length) {
    const old = g.skills[slot];
    clearTaoSkill(g, old.id);
    if (old.id === "shield") g.player.shieldUntil = 0;
    if (old.id === "charm")
      g.pets = g.pets.filter((p) => p.source && p.source !== "charm");
    if (old.id === "powerstrike" || old.id === "firesword")
      delete g.charges[old.id];
    g.effects = g.effects.filter((f) => f.kind !== old.id);
    g.skills[slot] = skill;
  } else if (g.skills.length < 6) g.skills.push(skill);
  g.recompute();
  g.emit();
  return true;
}
export function testClear(g: Game) {
  if (g.mode !== "test") return;
  g.test.visualEpoch++;
  g.enemies = [];
  g.projectiles = [];
  g.effects = [];
  g.drops = [];
  g.floating = [];
  g.emit();
}
/** Prepare the real Boss AI transition without skipping time or awarding loot. */
export function testBossPhase(g: Game) {
  if (g.mode !== "test" || !["battle", "paused"].includes(g.phase) || !g.boss) return false;
  const boss = g.boss;
  boss.hp = Math.min(boss.hp, boss.maxHp * 0.49);
  boss.stompCD = 0; boss.bossJumpCD = 0; boss.bossSummonCD = 0; boss.shockCD = 0;
  g.emit(); return true;
}

/** Equip real inventory items in the isolated test run, using the regular slots. */
export function testWear(g: Game, itemId: string) {
  const item = ITEMS.find((i) => i.id === itemId);
  if (g.mode !== "test" || !item || !["weapon", "armor"].includes(item.slot ?? "") ||
      (item.classId && item.classId !== g.classId) || !hasWorldAppearance(item)) return false;
  const slot = item.slot as "weapon" | "armor";
  g.equipment[slot] = { itemId: item.id, paid: 0 };
  g.recompute();
  g.emit();
  return true;
}
