import { getSkill } from "./spells";
import { clearTaoSkill } from "./taoist";
import type { Game } from "./game";
import type { SkillId } from "./spells";
export const newTestSettings = () => ({
  god: true,
  speed: 1,
  pose: "live",
  direction: 4,
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
    e.x = Math.max(35, Math.min(2173, g.player.x + Math.cos(a) * r));
    e.y = Math.max(55, Math.min(1501, g.player.y + Math.sin(a) * r));
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
  g.enemies = [];
  g.projectiles = [];
  g.effects = [];
  g.drops = [];
  g.floating = [];
  g.emit();
}
