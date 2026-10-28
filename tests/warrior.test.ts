import { describe, expect, it } from "vitest";
import { Game, WORLD } from "../src/game";
import { SKILLS, ITEMS, getItem } from "../src/content";
import { Rng, rollRange, effective } from "../src/rules";

function setup() {
  const g = new Game();
  g.start("normal", 176, "warrior");
  // These mechanics probes explicitly measure the unarmed class baseline.
  g.equipment = {};
  g.upgrades.accuracy = 100;
  g.recompute();
  return g;
}
function enemy(g: Game, x: number, y = 0, kind = "orc") {
  g.spawnEnemy(kind);
  const e = g.enemies.at(-1)!;
  Object.assign(e, {
    x: g.player.x + x,
    y: g.player.y + y,
    hp: 10000,
    maxHp: 10000,
    speed: 0,
  });
  return e;
}
function skill(
  g: Game,
  id:
    | "swordsmanship"
    | "powerstrike"
    | "thrust"
    | "cleave"
    | "dash"
    | "firesword",
) {
  const s = g.newSkill(id);
  s.cd = 0;
  g.skills.push(s);
  return s;
}

describe("warrior class and equipment", () => {
  it("offers the six exact warrior skills with faster balanced attack cooldowns", () => {
    expect(
      Object.fromEntries(
        SKILLS.filter((s) => s.classId === "warrior").map((s) => [
          s.name,
          s.cooldown,
        ]),
      ),
    ).toEqual({
      基本剑术: 0,
      攻杀剑术: 1.6,
      刺杀剑术: 2.16,
      半月弯刀: 2.4,
      野蛮冲撞: 12,
      烈火剑法: 5.2,
    });
  });
  it("starts with warrior health, defense and one skill; changing class is lobby-only", () => {
    const g = setup();
    expect(g.player.hp).toBe(185);
    expect(g.moveSpeed).toBe(205);
    expect([g.stats.def_min, g.stats.def_max]).toEqual([5, 5]);
    expect(g.skills.map((s) => s.id)).toEqual(["powerstrike"]);
    g.selectClass("wizard");
    expect(g.classId).toBe("warrior");
    g.lobby();
    g.selectClass("wizard");
    g.start("trial");
    expect(g.player.hp).toBe(100);
    expect(g.skills[0].id).toBe("fireball");
  });
  it("never leaks wizard skills or class-restricted equipment into warrior offers", () => {
    const g = setup();
    for (let i = 0; i < 100; i++) {
      for (const c of g.makeChoices())
        if (c.skill)
          expect(SKILLS.find((s) => s.id === c.skill)?.classId).toBe("warrior");
      g.wave = 8;
      g.generateOffers(false);
      for (const o of g.offers)
        expect(getItem(o.itemId).classId ?? "warrior").toBe("warrior");
    }
    expect(g.validItem(ITEMS.find((i) => i.name === "海魂")!)).toBe(false);
    expect(g.validItem(ITEMS.find((i) => i.name === "魔法强化")!)).toBe(false);
  });
  it("preserves DC ranges and completely removes an equipped weapon on sale", () => {
    const g = setup(),
      base = { ...g.stats };
    const sword = ITEMS.find((i) => i.name === "八荒")!;
    expect(sword.stats).toMatchObject({ dc_min: 4, dc_max: 7 });
    expect(getItem("equip-1").name).toBe("海魂");
    g.equipment.weapon = { itemId: sword.id, paid: 85 };
    g.recompute();
    expect([g.stats.dc_min, g.stats.dc_max]).toEqual([12, 19]);
    g.phase = "shop";
    g.sell("weapon");
    expect(g.stats).toEqual(base);
  });
  it("records the selected class and resets charged attacks between runs", () => {
    const g = setup();
    g.charges.firesword = true;
    g.finish(false);
    expect(g.result?.classId).toBe("warrior");
    g.start("normal", 176, "wizard");
    expect(g.charges).toEqual({});
    expect(g.basicCD).toBe(0);
  });
});

describe("independent ordinary attacks and charged swings", () => {
  it("keeps basic attack available with no equipped skills, and melee never shoots", () => {
    const g = setup();
    g.skills = [];
    const near = enemy(g, 35),
      far = enemy(g, 200);
    expect(g.basicAttack()).toBe(true);
    expect(near.hp).toBeLessThan(10000);
    expect(far.hp).toBe(10000);
    expect(g.skills).toHaveLength(0);
    expect(g.projectiles).toHaveLength(0);
    expect(g.basicAttack()).toBe(false);
  });
  it("also gives wizards a weak melee attack separate from the six slots", () => {
    const g = new Game();
    g.start("normal");
    g.equipment = {};
    g.skills = [];
    g.upgrades.accuracy = 100;
    g.recompute();
    const e = enemy(g, 30);
    g.basicAttack();
    expect(10000 - e.hp).toBeGreaterThanOrEqual(2);
    expect(10000 - e.hp).toBeLessThanOrEqual(4);
  });
  it("merges attack and fire charges into one swing, consumes once and attributes actual damage", () => {
    const g = setup();
    g.skills = [];
    const power = skill(g, "powerstrike"),
      fire = skill(g, "firesword");
    const e = enemy(g, 40);
    g.cast(power);
    g.cast(fire);
    expect(g.charges).toEqual({ powerstrike: true, firesword: true });
    expect(e.hp).toBe(10000);
    g.basicAttack();
    const first = 10000 - e.hp;
    expect(first).toBeGreaterThan(32);
    expect(g.charges).toEqual({});
    expect(g.projectiles).toHaveLength(0);
    expect(Object.values(g.damageDealt).reduce((a, b) => a + b, 0)).toBeCloseTo(
      first,
    );
    const attributed = g.damageDealt.firesword;
    g.basicCD = 0;
    g.player.attackUntil = 0;
    g.basicAttack();
    expect(10000 - first - e.hp).toBeLessThan(first);
    expect(g.damageDealt.firesword).toBe(attributed);
  });
  it("does not waste a charge without a reachable target or duplicate an existing charge", () => {
    const g = setup(),
      s = g.skills[0];
    s.cd = 0;
    enemy(g, 200);
    g.cast(s);
    expect(s.cd).toBe(0);
    expect(g.charges).toEqual({});
    g.enemies[0].x = g.player.x + 40;
    g.cast(s);
    expect(s.cd).toBe(1.6);
    s.cd = 0;
    g.cast(s);
    expect(s.cd).toBe(0);
    expect(g.charges.powerstrike).toBe(true);
  });
  it("makes basic swordsmanship a slotted passive with no fake cast or zero-CD loop", () => {
    const g = setup();
    g.skills = [];
    const s = skill(g, "swordsmanship");
    enemy(g, 200);
    g.cast(s);
    g.step(1 / 60);
    expect(s.cd).toBe(0);
    expect(g.effects).toHaveLength(0);
    expect(g.skills).toHaveLength(1);
  });
});

describe("directional melee and collision-safe dash", () => {
  it("thrust requires two targets in the forward two-tile line", () => {
    const g = setup();
    g.skills = [];
    g.player.moving = true;
    g.player.dir = 2;
    const s = skill(g, "thrust"),
      a = enemy(g, 40),
      b = enemy(g, 90);
    const side = enemy(g, 40, 50),
      rear = enemy(g, -40),
      far = enemy(g, 110);
    g.cast(s);
    expect(a.hp).toBeLessThan(10000);
    expect(b.hp).toBeLessThan(10000);
    for (const e of [side, rear, far]) expect(e.hp).toBe(10000);
    expect(s.cd).toBe(2.16);
    const single = setup();
    single.skills = [];
    const t = skill(single, "thrust");
    enemy(single, 50);
    single.cast(t);
    expect(t.cd).toBe(0);
  });
  it("cleave hits a forward semicircle and never a full 360° even after angle upgrades", () => {
    const g = setup();
    g.skills = [];
    g.player.moving = true;
    g.player.dir = 2;
    const s = skill(g, "cleave");
    s.angle = 50;
    const a = enemy(g, 30, 10),
      b = enemy(g, 35, -10),
      back = enemy(g, -35);
    g.cast(s);
    expect(a.hp).toBeLessThan(10000);
    expect(b.hp).toBeLessThan(10000);
    expect(back.hp).toBe(10000);
    expect(g.projectiles).toHaveLength(0);
  });
  it("manual dash pushes ordinary enemies without moving the boss or granting damage loot", () => {
    const g = setup();
    g.skills = [];
    g.player.dir = 2;
    const s = skill(g, "dash"),
      normal = enemy(g, 70),
      boss = enemy(g, 120, 15, "boss");
    const x = g.player.x,
      bx = boss.x,
      nx = normal.x;
    g.cast(s, true);
    expect(g.player.x).toBeCloseTo(x + 180);
    expect(normal.x).toBeGreaterThan(nx);
    expect(boss.x).toBe(bx);
    expect(g.kills).toBe(0);
    expect(normal.hp).toBe(10000);
  });
  it("stops at arena walls, incurs recoil and consumes cooldown", () => {
    const g = setup();
    g.skills = [];
    g.player.x = WORLD.w - 40;
    g.player.dir = 2;
    const s = skill(g, "dash"),
      hp = g.player.hp;
    g.cast(s, true);
    expect(g.player.x).toBeLessThanOrEqual(WORLD.w - 35);
    expect(g.player.hp).toBeLessThan(hp);
    expect(s.cd).toBe(12);
  });
  it("stops before scenery instead of tunneling through its collision circle", () => {
    const g = setup();
    g.skills = [];
    Object.assign(g.player, { x: 700, y: 580, dir: 2 });
    const s = skill(g, "dash");
    g.cast(s, true);
    expect(g.player.x).toBeLessThan(780 - 30);
    expect(g.player.hp).toBeLessThan(185);
  });
  it("does not auto-charge a boss or auto-dash while healthy", () => {
    const g = setup();
    g.skills = [];
    const s = skill(g, "dash"),
      x = g.player.x;
    enemy(g, 40, 0, "boss");
    enemy(g, 35, 20);
    enemy(g, 35, -20);
    g.cast(s);
    expect(g.player.x).toBe(x);
    expect(s.cd).toBe(0);
    g.player.hp = 40;
    g.cast(s);
    expect(
      Math.hypot(g.player.x - g.enemies[0].x, g.player.y - g.enemies[0].y),
    ).toBeGreaterThan(120);
  });
  it("pausing freezes basic swing cooldowns and charged skills", () => {
    const g = setup();
    g.basicCD = 0.8;
    g.charges.powerstrike = true;
    g.pause();
    g.step(5);
    expect(g.basicCD).toBe(0.8);
    expect(g.charges.powerstrike).toBe(true);
  });
});

describe("shared range and defense pipeline", () => {
  it("uses seeded bounded rolls and luck biases damage, leaving drop luck separate", () => {
    const a = new Rng(8),
      b = new Rng(8),
      c = new Rng(8);
    for (let i = 0; i < 1000; i++) {
      const neutral = rollRange(a, 3, 7),
        lucky = rollRange(b, 3, 7, 5),
        unlucky = rollRange(c, 3, 7, -5);
      expect(lucky).toBeGreaterThanOrEqual(neutral);
      expect(lucky).toBeLessThanOrEqual(7);
      expect(unlucky).toBeLessThanOrEqual(neutral);
      expect(unlucky).toBeGreaterThanOrEqual(3);
    }
    expect(a.seed).toBe(b.seed);
    expect(a.seed).toBe(c.seed);
  });
  it("separates physical defense from magic defense", () => {
    const physical = setup(),
      magic = setup();
    for (const g of [physical, magic]) {
      g.upgrades.def_min = 1000;
      g.upgrades.def_max = 1000;
      g.recompute();
      g.rng.next = () => 0.99;
    }
    physical.hurt(100, "physical");
    magic.hurt(100, "magic");
    expect(185 - physical.player.hp).toBe(35);
    expect(185 - magic.player.hp).toBeGreaterThan(90);
  });
  it("applies the specified soft caps to experience and gold", () => {
    expect(effective("gold_gain", 30)).toBe(25);
    expect(effective("exp_gain", 35)).toBe(30);
  });
});
