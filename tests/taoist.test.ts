import { describe, it, expect } from "vitest";
import { Game, WORLD, type Enemy } from "../src/game";
import { SKILLS as ALL_SKILLS, getSkill, type SkillId } from "../src/content";
import { taoDamage } from "../src/taoist";
const SKILLS = ALL_SKILLS.filter((s) => s.classId === "taoist");
function setup(id: SkillId) {
  const g = new Game();
  g.start("normal", 176, "taoist");
  g.skills = [g.newSkill(id)];
  g.skills[0].cd = 0;
  return g;
}
function enemy(g: Game, kind = "orc", dx = 100, dy = 0) {
  g.spawnEnemy(kind);
  const e = g.enemies.at(-1)!;
  e.x = g.player.x + dx;
  e.y = g.player.y + dy;
  e.hp = e.maxHp = 1000;
  return e;
}
function fire(g: Game) {
  g.cast(g.skills[0]);
}
describe("taoist skill pool", () => {
  it("has exactly thirteen named classic skills", () => {
    expect(SKILLS).toHaveLength(13);
    expect(new Set(SKILLS.map((s) => s.id)).size).toBe(13);
  });
  it("heal restores HP without exceeding max", () => {
    const g = setup("heal");
    g.player.hp = 50;
    fire(g);
    expect(g.player.hp).toBeGreaterThan(50);
    expect(g.player.hp).toBeLessThanOrEqual(g.maxHP);
  });
  it("talisman fires homing projectile at target", () => {
    const g = setup("talisman");
    const e = enemy(g, "orc", 120);
    fire(g);
    expect(g.projectiles.length).toBeGreaterThan(0);
    expect(g.projectiles[0].skill).toBe("talisman");
  });
  it("poison (green) applies greenPoison to target", () => {
    const g = setup("poison");
    const e = enemy(g, "orc", 100);
    g.setPoisonMode("green");
    fire(g);
    expect(e.greenPoison).toBeDefined();
  });
  it("poison (red) applies redPoison reduction", () => {
    const g = setup("poison");
    const e = enemy(g, "orc", 100);
    g.setPoisonMode("red");
    fire(g);
    expect(e.redPoison).toBeDefined();
    expect(e.redPoison!.reduction).toBeLessThanOrEqual(0.35);
  });
  it("skeleton summons up to two skeletons", () => {
    const g = setup("skeleton");
    g.skills[0].cd = 0;
    g.cast(g.skills[0]);
    g.skills[0].cd = 0;
    g.cast(g.skills[0]);
    g.skills[0].cd = 0;
    g.cast(g.skills[0]);
    const skeletons = g.pets.filter((p) => p.source === "skeleton");
    expect(skeletons.length).toBeLessThanOrEqual(2);
  });
  it("beast summons at most one beast", () => {
    const g = setup("beast");
    for (let i = 0; i < 5; i++) {
      g.skills[0].cd = 0;
      g.cast(g.skills[0]);
    }
    const beasts = g.pets.filter((p) => p.source === "beast");
    expect(beasts.length).toBeLessThanOrEqual(1);
  });
  it("summons share total load of 3", () => {
    const g = new Game();
    g.start("normal", 176, "taoist");
    g.skills = [g.newSkill("skeleton"), g.newSkill("beast")];
    g.skills[0].cd = 0;
    g.skills[1].cd = 0;
    g.cast(g.skills[0]);
    g.cast(g.skills[0]);
    g.cast(g.skills[1]);
    const total = g.pets.filter((p) => p.hp > 0).length;
    expect(total).toBeLessThanOrEqual(3);
  });
  it("trap only affects ordinary non-elite monsters", () => {
    const g = setup("trap");
    const normal = enemy(g, "orc", 80);
    const elite = enemy(g, "cat", 90);
    elite.elite = true;
    fire(g);
    expect(normal.trapUntil).toBeGreaterThan(0);
    expect(elite.trapUntil ?? 0).toBe(0);
  });
  it("reveal targets elites/bosses only", () => {
    const g = setup("reveal");
    const normal = enemy(g, "orc", 80);
    const elite = enemy(g, "cat", 90);
    elite.elite = true;
    fire(g);
    expect(normal.revealUntil ?? 0).toBe(0);
    expect(elite.revealUntil).toBeGreaterThan(0);
  });
  it("ghost and armor apply buffs to player", () => {
    const g = setup("ghost");
    fire(g);
    expect(g.tao.buffs[0].ghostUntil).toBeGreaterThan(g.clock - 1);
    const g2 = setup("armor");
    g2.cast(g2.skills[0]);
    expect(g2.tao.buffs[0].armorUntil).toBeGreaterThan(g2.clock - 1);
  });
  it("invisible requires stationary and nearby threats", () => {
    const g = setup("invisible");
    // moving -> no cast
    g.player.moving = true;
    const cdBefore = g.skills[0].cd;
    fire(g);
    // cd unchanged means didn't cast
    expect(g.skills[0].cd).toBe(cdBefore);
  });
  it("groupHeal heals multiple injured friends", () => {
    const g = setup("groupHeal");
    g.player.hp = 50;
    // spawn a pet
    g.pets.push({
      id: g.nextEntityId(), x: g.player.x + 20, y: g.player.y, kind: "skeleton",
      source: "skeleton", hp: 30, maxHp: 110, baseMaxHp: 110, damage: 11,
      speed: 155, dir: 4, cd: 0.5, born: g.clock, attackUntil: 0, moving: false,
    });
    const before = g.player.hp;
    fire(g);
    expect(g.player.hp).toBeGreaterThan(before);
  });
  it("updateTaoist ticks green poison damage", () => {
    const g = new Game();
    g.start("normal", 176, "taoist");
    g.skills = [g.newSkill("poison")];
    const e = enemy(g, "orc", 100);
    g.setPoisonMode("green");
    g.skills[0].cd = 0;
    g.cast(g.skills[0]);
    const hpBefore = e.hp;
    // advance 2 seconds
    for (let i = 0; i < 120; i++) g.step(1 / 60);
    expect(e.hp).toBeLessThan(hpBefore);
  });
  it("clearTaoSkill removes pets and buffs", async () => {
    const { clearTaoSkill } = await import("../src/taoist");
    const g = setup("skeleton");
    g.skills[0].cd = 0;
    g.cast(g.skills[0]);
    expect(g.pets.length).toBeGreaterThan(0);
    clearTaoSkill(g, "skeleton");
    expect(g.pets.filter((p) => p.source === "skeleton").length).toBe(0);
  });
});
