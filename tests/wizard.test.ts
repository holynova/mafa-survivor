import { describe, it, expect } from "vitest";
import { Game, WORLD, type Enemy } from "../src/game";
import {
  SKILLS as ALL_SKILLS,
  getSkill,
  SCENERY,
  type SkillId,
} from "../src/content";
const SKILLS = ALL_SKILLS.filter((s) => s.classId === "wizard");
function setup(id: SkillId) {
  const g = new Game();
  g.start("normal", 176);
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
describe("complete classic wizard skill pool", () => {
  it("has exactly the fourteen named classic skills with GDD cooldowns", () => {
    expect(SKILLS).toHaveLength(14);
    expect(new Set(SKILLS.map((s) => s.id)).size).toBe(14);
    expect(Object.fromEntries(SKILLS.map((s) => [s.name, s.cooldown]))).toEqual(
      {
        火球术: 1.1,
        抗拒火环: 11,
        诱惑之光: 7,
        地狱火: 2.2,
        雷电术: 1.35,
        大火球: 1.65,
        瞬息移动: 24,
        爆裂火焰: 2.6,
        火墙: 6.5,
        疾光电影: 3.2,
        地狱雷光: 4.5,
        魔法盾: 15,
        圣言术: 7.5,
        冰咆哮: 4,
      },
    );
  });
  it("repulses ordinary in-range targets without damage, but never elites or bosses", () => {
    const g = setup("repulse"),
      normal = enemy(g, "orc", 50),
      elite = enemy(g, "cat", 60),
      boss = enemy(g, "boss", 70);
    elite.elite = true;
    const hp = normal.hp;
    fire(g);
    expect(normal.x - g.player.x).toBeGreaterThan(100);
    expect(normal.hp).toBe(hp);
    expect(elite.x - g.player.x).toBe(60);
    expect(boss.x - g.player.x).toBe(70);
    expect(g.kills).toBe(0);
  });
  it("does not repulse an enemy above the allowed level", () => {
    const g = setup("repulse"),
      e = enemy(g, "orc", 50);
    e.level = 10;
    const x = e.x;
    fire(g);
    expect(e.x).toBe(x);
  });
  it.each(["hellfire", "beam"] as const)(
    "%s hits only the aligned forward targets once",
    (id) => {
      const g = setup(id),
        a = enemy(g, "orc", 70, 0),
        b = enemy(g, "orc", 140, 0),
        side = enemy(g, "orc", 80, 90),
        back = enemy(g, "orc", -50, 0);
      fire(g);
      expect(a.hp).toBeLessThan(1000);
      expect(b.hp).toBeLessThan(1000);
      expect(side.hp).toBe(1000);
      expect(back.hp).toBe(1000);
      expect(g.effects[0].kind).toBe(id);
    },
  );
  it("big fireball has independent target projectiles and no area explosion", () => {
    const g = setup("bigfireball"),
      a = enemy(g, "boss", 70),
      b = enemy(g, "orc", 120);
    g.skills[0].count = 1;
    fire(g);
    expect(g.projectiles.map((p) => p.targetId)).toEqual([a.id, b.id]);
    expect(g.projectiles.every((p) => p.skill === "bigfireball")).toBe(true);
    expect(g.effects.some((f) => f.kind === "explosion")).toBe(false);
  });
  it.each(["ice", "explosion"] as const)(
    "%s aims at the densest cluster and damages it without slowing",
    (id) => {
      const g = setup(id),
        near = enemy(g, "orc", 50, -150),
        cluster = [
          enemy(g, "orc", 200, 0),
          enemy(g, "orc", 210, 12),
          enemy(g, "orc", 210, -15),
        ];
      const speed = cluster[0].speed;
      fire(g);
      expect(near.hp).toBe(1000);
      expect(cluster.every((e) => e.hp < 1000)).toBe(true);
      expect(cluster[0].speed).toBe(speed);
    },
  );
  it("nova requires more than three nearby enemies", () => {
    const g = setup("nova");
    for (let i = 0; i < 3; i++) enemy(g, "orc", 30 + i * 20);
    fire(g);
    expect(g.skills[0].cd).toBe(0);
    enemy(g, "cat", 40, 30);
    fire(g);
    expect(g.enemies.every((e) => e.hp < 1000)).toBe(true);
    expect(g.skills[0].cd).toBe(4.5);
  });
  it("holy ignores living enemies and never instantly kills an undead boss or elite", () => {
    const g = setup("holy"),
      living = enemy(g, "orc", 30),
      boss = enemy(g, "boss", 60);
    g.skills[0].count = 2;
    g.skills[0].chance = 1000;
    fire(g);
    expect(living.hp).toBe(1000);
    expect(boss.hp).toBeGreaterThanOrEqual(850);
    expect(boss.hp).toBeLessThan(1000);
  });
  it("successful holy can eliminate an eligible undead ordinary monster once", () => {
    const g = setup("holy"),
      e = enemy(g, "scarecrow", 60);
    g.rng.next = () => 0;
    fire(g);
    expect(e.hp).toBe(0);
    expect(g.kills).toBe(1);
    g.hit(e, 1000, "holy");
    expect(g.kills).toBe(1);
  });
  it("charm transfers allegiance with no kill, experience or gold awarded", () => {
    const g = setup("charm");
    enemy(g, "cat", 80);
    g.rng.next = () => 0;
    fire(g);
    expect(g.enemies).toHaveLength(0);
    expect(g.pets).toHaveLength(1);
    expect(g.kills).toBe(0);
    expect(g.drops).toHaveLength(0);
    expect(g.pets[0].kind).toBe("cat");
  });
  it("charm never recruits bosses, elites or non-tameable monsters", () => {
    const g = setup("charm");
    enemy(g, "boss", 30);
    enemy(g, "cat", 50).elite = true;
    enemy(g, "scarecrow", 70);
    g.rng.next = () => 0;
    fire(g);
    expect(g.pets).toHaveLength(0);
    expect(g.enemies).toHaveLength(3);
  });
  it("charm failure consumes its independent cooldown", () => {
    const g = setup("charm");
    enemy(g, "cat", 80);
    g.rng.next = () => 0.99;
    fire(g);
    expect(g.pets).toHaveLength(0);
    expect(g.skills[0].cd).toBe(7);
  });
  it("caps recruited companions at five even with excessive count bonuses", () => {
    const g = setup("charm");
    g.skills[0].count = 999;
    g.rng.next = () => 0;
    for (let i = 0; i < 8; i++) {
      enemy(g, "cat", 80 + i);
      g.skills[0].cd = 0;
      fire(g);
    }
    expect(g.pets).toHaveLength(5);
  });
  it("companions fight and can draw enemy aggro, then die without enemy loot", () => {
    const g = setup("charm");
    enemy(g, "cat", 80);
    g.rng.next = () => 0;
    fire(g);
    const p = g.pets[0],
      e = enemy(g, "orc", 90);
    p.cd = 0;
    g.step(1 / 60);
    expect(e.hp).toBeLessThan(1000);
    p.hp = 0;
    const kills = g.kills;
    g.step(1 / 60);
    expect(g.pets).toHaveLength(0);
    expect(g.kills).toBe(kills);
  });
  it("teleport remains manual by default and cooldown is not spent without a safe destination", () => {
    const g = setup("teleport"),
      x = g.player.x,
      y = g.player.y;
    g.step(1 / 60);
    expect([g.player.x, g.player.y]).toEqual([x, y]);
    g.useTeleport();
    expect(Math.hypot(g.player.x - x, g.player.y - y)).toBeGreaterThanOrEqual(
      200,
    );
    expect(g.skills[0].cd).toBe(24);
  });
  it("ten thousand teleports never leave the arena or enter an obstacle", () => {
    const g = setup("teleport");
    for (let i = 0; i < 10000; i++) {
      g.skills[0].cd = 0;
      g.useTeleport();
      expect(g.player.x).toBeGreaterThanOrEqual(35);
      expect(g.player.x).toBeLessThanOrEqual(WORLD.w - 35);
      expect(g.player.y).toBeGreaterThanOrEqual(55);
      expect(g.player.y).toBeLessThanOrEqual(WORLD.h - 35);
      expect(
        SCENERY.every(
          (o) => Math.hypot(g.player.x - o.x, g.player.y - o.y) > o.r + 16,
        ),
      ).toBe(true);
    }
  });
});
describe("six-slot replacement decisions", () => {
  function full() {
    const g = new Game();
    g.start("normal");
    g.skills = SKILLS.slice(0, 6).map((s) => g.newSkill(s.id));
    g.phase = "upgrade";
    g.choices = [
      {
        id: "learn-ice",
        kind: "skill",
        skill: "ice",
        name: "冰咆哮",
        description: "",
        value: 0,
      },
    ];
    return g;
  }
  it("pauses for explicit replacement and never temporarily creates a seventh skill", () => {
    const g = full();
    g.choose("learn-ice");
    expect(g.phase).toBe("replace");
    expect(g.skills).toHaveLength(6);
    const before = g.clock;
    g.step(1);
    expect(g.clock).toBe(before);
    expect(g.replaceSkill(0)).toBe(true);
    expect(g.skills).toHaveLength(6);
    expect(g.skills[0].id).toBe("ice");
    expect(g.phase).toBe("battle");
  });
  it("allows declining and rejects invalid or repeated replacement", () => {
    const g = full(),
      before = structuredClone(g.skills);
    g.choose("learn-ice");
    expect(g.replaceSkill(9)).toBe(false);
    expect(g.phase).toBe("replace");
    g.replaceSkill(null);
    expect(g.skills).toEqual(before);
    expect(g.replaceSkill(0)).toBe(false);
  });
  it("offers every unlearned skill rather than permanently hiding the eight overflow skills", () => {
    const g = full(),
      offered = new Set<string>();
    for (let i = 0; i < 250; i++)
      for (const c of g.makeChoices())
        if (c.id.startsWith("learn-")) offered.add(c.skill!);
    expect([...offered].sort()).toEqual(
      SKILLS.slice(6)
        .map((s) => s.id)
        .sort(),
    );
  });
  it("cleans up persistent effects from a replaced skill without deleting the remaining build", () => {
    const g = full();
    g.player.shieldUntil = 10;
    g.choose("learn-ice");
    g.replaceSkill(3);
    expect(g.player.shieldUntil).toBe(0);
    expect(g.skills.map((s) => s.id)).toContain("firewall");
  });
});
it("returning to the lobby clears combat overlays and friendly entities", () => {
  const g = setup("charm");
  enemy(g, "cat", 80);
  g.rng.next = () => 0;
  fire(g);
  const e = enemy(g, "orc", 90);
  g.hit(e, 1, "charm");
  expect(g.floating.length).toBeGreaterThan(0);
  g.lobby();
  expect(g.floating).toEqual([]);
  expect(g.effects).toEqual([]);
  expect(g.pets).toEqual([]);
  expect(g.enemies).toEqual([]);
});
