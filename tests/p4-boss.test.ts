import { describe, expect, it } from "vitest";
import { Game } from "../src/game";

function setupBoss() {
  const g = new Game();
  g.start("normal", 176, "wizard");
  g.spawnEnemy("boss");
  const b = g.enemies.at(-1)!;
  b.x = g.player.x;
  b.y = g.player.y;
  b.bossJumpCD=0;
  return { g, b };
}

function setupElite() {
  const g = new Game();
  g.start("normal", 176, "wizard");
  g.spawnEnemy("orc");
  const e = g.enemies.at(-1)!;
  e.elite = true;
  e.x = g.player.x + 100;
  e.y = g.player.y;
  e.hp = e.maxHp = 1000;
  return { g, e };
}

describe("Boss phases & special behaviors (GDD §11 / P4)", () => {
  it("boss summons respect the shared 300-enemy cap", () => {
    const { g, b } = setupBoss();
    while (g.enemies.length < 300) g.spawnEnemy("scarecrow");
    b.bossSummonCD = 0;
    g.skills = []; g.basicCD = Infinity;
    g.step(1 / 60);
    expect(g.enemies).toHaveLength(300);
  });
  it("boss enters phase 2 at 50% HP with speed and damage buff", () => {
    const { g, b } = setupBoss();
    b.hp = Math.floor(b.maxHp * 0.5) - 1;
    g.step(1 / 60);
    expect(b.bossPhase).toBe(2);
    expect(b.speed).toBeGreaterThan(58);
    expect(b.damage).toBeGreaterThan(18);
  });

  it("boss summons a minion when summonCD elapses", () => {
    const { g, b } = setupBoss();
    b.bossSummonCD = 0;
    const countBefore = g.enemies.length;
    g.step(1 / 60);
    expect(g.enemies.length).toBeGreaterThan(countBefore);
    const newcomer = g.enemies.find(
      (x) => x.id > b.id && x.kind === "scarecrow",
    );
    expect(newcomer).toBeDefined();
    expect(
      Math.hypot(newcomer!.x - b.x, newcomer!.y - b.y),
    ).toBeLessThan(140);
  });

  it("boss jump sets airborne target, landing deals damage and clears target", () => {
    const { g, b } = setupBoss();
    // Explicit ready cooldown starts the full warning + flight sequence.
    g.step(1 / 60);
    expect(b.bossJumpTarget).toBeDefined();
    expect(b.bossJumpUntil).toBeGreaterThan(g.clock);
    // Real fixed steps cover warning, flight, then landing damage.
    const hpBefore = g.player.hp;
    for(let i=0;i<90;i++)g.step(1/60);
    expect(b.bossJumpTarget).toBeUndefined();
    expect(g.player.hp).toBeLessThan(hpBefore);
  });

  it("ranged elite fires a projectile at the player", () => {
    const { g, e } = setupElite();
    e.ranged = true;
    e.rangedCD = 0;
    e.windup = 0;
    const d = Math.hypot(e.x - g.player.x, e.y - g.player.y);
    expect(d).toBeLessThan(420);
    g.fireEliteProjectile(e);
    expect(g.projectiles.length).toBeGreaterThan(0);
    const p = g.projectiles[g.projectiles.length - 1];
    expect(p.damage).toBeGreaterThan(0);
    // step once: projectile should not be instantly filtered out
    g.step(1 / 60);
    expect(g.projectiles.length).toBeGreaterThan(0);
  });

  it("holy never insta-kills a boss; deals max 15% of max HP", () => {
    const { g, b } = setupBoss();
    const s = g.newSkill("holy");
    s.cd = 0;
    s.chance = 1000;
    g.skills.push(s);
    g.rng.next = () => 0;
    const hpBefore = b.hp;
    g.cast(s);
    expect(b.hp).toBeLessThan(hpBefore);
    expect(b.hp).toBeGreaterThanOrEqual(Math.floor(b.maxHp * 0.85));
    expect(b.hp).toBeGreaterThan(0);
  });

  it("holy still one-shots an eligible undead ordinary monster", () => {
    const g = new Game();
    g.start("normal", 176, "wizard");
    g.spawnEnemy("scarecrow");
    const e = g.enemies.at(-1)!;
    e.x = g.player.x + 60;
    e.y = g.player.y;
    e.hp = e.maxHp = 100;
    const s = g.newSkill("holy");
    s.cd = 0;
    s.chance = 1000;
    g.skills.push(s);
    g.rng.next = () => 0;
    g.cast(s);
    expect(e.hp).toBe(0);
    expect(g.kills).toBe(1);
  });
});
