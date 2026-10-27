import { describe, expect, it } from "vitest";
import { Game } from "../src/game";
import { MAPS, MONSTERS } from "../src/content";

function arena(kind = "orc") {
  const g = new Game();
  g.start("normal", 176, "taoist");
  g.skills = [];
  g.basicCD = Infinity;
  const e = g.spawnEnemy(kind);
  e.x = g.player.x + 200;
  e.y = g.player.y;
  e.speed = 0;
  g.rng.next = () => 0.99; // No dodge; this probe measures projectile collision.
  return { g, e };
}
function advance(g: Game, seconds: number) {
  for (let t = 0; t < seconds; t += 1 / 60) g.step(1 / 60);
}

describe("hostile projectiles", () => {
  it("actually damages the player and is consumed on contact", () => {
    const { g, e } = arena();
    const hp = g.player.hp;
    g.fireEliteProjectile(e);
    advance(g, 1.3);
    expect(g.player.hp).toBeLessThan(hp);
    expect(g.projectiles).toHaveLength(0);
  });
  it("can be dodged by moving out of its fixed flight path", () => {
    const { g, e } = arena();
    const hp = g.player.hp;
    g.fireEliteProjectile(e);
    g.input = { x: 0, y: 1 };
    advance(g, 1);
    expect(g.player.hp).toBe(hp);
  });
  it("hits a summon in the flight path before reaching the player", () => {
    const { g, e } = arena();
    g.pets.push({ id: g.nextEntityId(), kind: "summonedSkeleton", source: "skeleton",
      x: g.player.x + 90, y: g.player.y, hp: 110, maxHp: 110,
      damage: 0, speed: 0, cd: Infinity, dir: 4, born: 0, attackUntil: 0 });
    const hp = g.player.hp;
    g.fireEliteProjectile(e);
    advance(g, 1);
    expect(g.pets[0].hp).toBeLessThan(110);
    expect(g.player.hp).toBe(hp);
  });
});

describe("first chapter roster", () => {
  it("uses the seven GDD forest species", () => {
    expect(MAPS.biche.monsterPool).toEqual([
      "scarecrow", "cat", "rakecat", "orc", "orcWarrior", "spider", "orcBrave",
    ]);
    for (const id of MAPS.biche.monsterPool) expect(MONSTERS.some((m) => m.id === id)).toBe(true);
  });
  it("introduces the charging native elite once at the scheduled fourth-wave slot", () => {
    const g = new Game(); g.start("test"); g.wave = 4;
    g.skills = []; g.basicCD = Infinity;
    advance(g, 40);
    const elites = g.enemies.filter((e) => e.kind === "orcBrave");
    expect(elites).toHaveLength(1);
    const e = elites[0];
    expect(e.kind).toBe("orcBrave");
    expect(e.elite).toBe(true);
    expect(e.maxHp).toBeCloseTo(280 * 1.36); // GDD wave-four HP; no second 4x elite multiplier.
  });
  it("spider fires a slow hostile poison shot that hurts without poisoning other monsters", () => {
    const { g, e } = arena("spider");
    const friend = g.spawnEnemy("scarecrow");
    friend.x = e.x - 80; friend.y = e.y; friend.speed = 0;
    const hp = g.player.hp, monsterHP = friend.hp;
    advance(g,0.5);expect(g.projectiles).toHaveLength(0);expect(e.rangedTarget).toBeDefined();
    advance(g,0.3);
    expect(g.projectiles[0]?.visual).toBe("poison");
    expect(Math.hypot(g.projectiles[0]!.vx, g.projectiles[0]!.vy)).toBeLessThan(200);
    advance(g, 1.6);
    expect(g.player.hp).toBeLessThan(hp);
    expect(friend.hp).toBe(monsterHP);
  });
  it("makes the spider part of normal fifth-wave spawning", () => {
    const g = new Game(); g.start("normal"); g.wave = 5;
    const kinds = new Set(Array.from({ length: 100 }, () => g.spawnEnemy().kind));
    expect(kinds.has("spider")).toBe(true);
    expect(kinds.has("orcWarrior")).toBe(true);
    expect(kinds.has("orcBrave")).toBe(false); // Scheduled elite, not a random swarm.
  });
  it("charges toward a warned position; the target can sidestep during windup", () => {
    const { g, e } = arena("orcBrave");
    e.speed = 55;
    const hp = g.player.hp;
    g.step(1 / 60);
    expect(e.chargeTarget).toBeDefined();
    expect(e.chargeWindupUntil).toBeGreaterThan(g.clock);
    const startX = e.x;
    g.input = { x: 0, y: 1 };
    advance(g, 1.5);
    expect(e.x).toBeLessThan(startX - 100);
    expect(g.player.hp).toBe(hp);
  });
  it("the charging elite hits a stationary target once after its warning", () => {
    const { g, e } = arena("orcBrave"); e.speed = 55;
    const hp = g.player.hp;
    advance(g, 0.6);
    expect(g.player.hp).toBe(hp);
    advance(g, 1.1);
    expect(g.player.hp).toBeLessThan(hp);
    expect(e.chargeTarget).toBeUndefined();
    expect(e.chargeCD).toBeGreaterThan(0);
  });
});
