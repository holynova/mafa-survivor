import { describe, it, expect } from "vitest";
import { Game } from "../src/game";
import {
  getItem,
  ITEMS,
  SLOT_KEYS,
  itemSchema,
  skillSchema,
} from "../src/content";
import {
  softCap,
  incomingDamage,
  rerollPrice,
  combine,
  Rng,
  SpatialHash,
} from "../src/rules";
function start() {
  const g = new Game();
  g.start("normal", 176);
  return g;
}
function shop() {
  const g = start();
  g.waveTime = 75;
  g.endWave();
  return g;
}
function advance(g: Game, seconds: number) {
  for (let i = 0; i < seconds * 60; i++) g.step(1 / 60);
}

describe("deterministic rules and data", () => {
  it("same seed produces the same random stream", () => {
    const a = new Rng(12),
      b = new Rng(12);
    expect(Array.from({ length: 500 }, () => a.next())).toEqual(
      Array.from({ length: 500 }, () => b.next()),
    );
  });
  it("rejects malformed item and skill definitions", () => {
    expect(() => itemSchema.parse({ id: "bad", price: -1 })).toThrow();
    expect(() =>
      skillSchema.parse({
        id: "bad",
        name: "bad",
        cooldown: 0,
        description: "",
        asset: "",
      }),
    ).toThrow();
  });
  it("loads unique item identities with valid equipment slots", () => {
    expect(new Set(ITEMS.map((x) => x.id)).size).toBe(ITEMS.length);
    for (const x of ITEMS.filter((x) => x.kind === "equipment"))
      expect([
        "weapon",
        "armor",
        "helmet",
        "necklace",
        "bracelet",
        "ring",
      ]).toContain(x.slot);
  });
  it("bounds repeated cooldown, speed and pickup bonuses", () => {
    const s = combine(
      Array.from({ length: 100 }, () => ({
        move_speed: 5,
        pickup_radius: 20,
        cooldown_reduction: 3,
        gold_gain: 8,
        exp_gain: 8,
      })),
    );
    expect(s).toMatchObject({
      move_speed: 35,
      pickup_radius: 150,
      cooldown_reduction: 40,
      gold_gain: 40,
      exp_gain: 50,
    });
    expect(softCap(100, 80, 150)).toBe(90);
  });
  it("leaves at least 35% damage after stacking shield and defense", () => {
    expect(incomingDamage(100, 100000, 0.35)).toBe(35);
    expect(incomingDamage(1, 100000, 0.35)).toBe(1);
  });
  it("queries nearby enemies without duplicate or distant entities", () => {
    const h = new SpatialHash<{ id: number; x: number; y: number }>();
    h.rebuild([
      { id: 1, x: 0, y: 0 },
      { id: 2, x: -50, y: 0 },
      { id: 3, x: 300, y: 300 },
    ]);
    expect(
      h
        .nearby(0, 0, 60)
        .map((e) => e.id)
        .sort(),
    ).toEqual([1, 2]);
  });
});

describe("combat and state transitions", () => {
  it("normal mode has 12×75 seconds; trial is explicit and shorter", () => {
    const g = start();
    expect([g.duration, g.maxWaves]).toEqual([75, 12]);
    g.start("trial", 176);
    expect([g.duration, g.maxWaves]).toEqual([35, 3]);
  });
  it("uses normalized movement and blocks world edges", () => {
    const a = start(),
      b = start();
    a.input = { x: 1, y: 0 };
    b.input = { x: 1, y: 1 };
    const p = { ...a.player };
    a.step(1 / 60);
    b.step(1 / 60);
    expect(Math.hypot(a.player.x - p.x, a.player.y - p.y)).toBeCloseTo(
      Math.hypot(b.player.x - p.x, b.player.y - p.y),
    );
    a.player.x = 2200;
    a.input = { x: 1, y: 0 };
    a.step(1 / 60);
    expect(a.player.x).toBeLessThanOrEqual(2173);
  });
  it("pausing freezes combat, cooldowns and the wave timer", () => {
    const g = start();
    advance(g, 1);
    g.pause();
    const snapshot = JSON.stringify({
      clock: g.clock,
      hp: g.player.hp,
      skills: g.skills,
      enemies: g.enemies,
    });
    advance(g, 3);
    expect(
      JSON.stringify({
        clock: g.clock,
        hp: g.player.hp,
        skills: g.skills,
        enemies: g.enemies,
      }),
    ).toBe(snapshot);
    g.pause();
    g.step(1 / 60);
    expect(g.clock).toBeGreaterThan(1);
  });
  it("fires automatically without a mana system", () => {
    const g = start();
    g.spawnEnemy("scarecrow");
    g.enemies[0].x = g.player.x + 100;
    g.enemies[0].y = g.player.y;
    advance(g, 2);
    expect(g.kills).toBeGreaterThan(0);
    expect(g.damageDealt.fireball).toBeGreaterThan(0);
  });
  it("enemy death grants loot only once despite repeated damage events", () => {
    const g = start();
    g.spawnEnemy("orc");
    const e = g.enemies[0];
    g.hit(e, 9999, "lightning");
    const total = JSON.stringify(g.drops);
    g.hit(e, 9999, "lightning");
    expect(g.kills).toBe(1);
    expect(JSON.stringify(g.drops)).toBe(total);
  });
  it("lightning additional targets hit distinct enemies", () => {
    const g = start();
    for (let i = 0; i < 3; i++) {
      g.spawnEnemy("boss");
      g.enemies[i].x = g.player.x + 60 + i * 20;
      g.enemies[i].y = g.player.y;
    }
    const s = g.newSkill("lightning");
    s.count = 2;
    g.skills = [s];
    s.cd = 0;
    g.cast(s);
    expect(g.enemies.filter((e) => e.hp < e.maxHp)).toHaveLength(3);
    expect(g.effects).toHaveLength(3);
  });
  it("overlapping firewalls tick once per enemy per 0.5 seconds", () => {
    const g = start();
    g.spawnEnemy("boss");
    const e = g.enemies[0];
    e.x = g.player.x + 90;
    e.y = g.player.y;
    g.skills = [g.newSkill("firewall")];
    g.skills[0].cd = 100;
    for (let i = 0; i < 4; i++)
      g.effects.push({
        id: 500 + i,
        kind: "firewall",
        x: e.x,
        y: e.y,
        life: 10,
        total: 10,
        radius: 100,
      });
    g.step(1 / 60);
    const hp = e.hp;
    expect(e.maxHp - hp).toBeLessThan(30);
    advance(g, 0.3);
    expect(e.hp).toBe(hp);
    advance(g, 0.3);
    expect(e.hp).toBeLessThan(hp);
  });
  it("limits active firewall instances", () => {
    const g = start();
    g.spawnEnemy("orc");
    g.enemies[0].x = g.player.x + 100;
    g.skills = [g.newSkill("firewall")];
    for (let i = 0; i < 10; i++) {
      g.skills[0].cd = 0;
      g.cast(g.skills[0]);
    }
    expect(
      g.effects.filter((f) => f.kind === "firewall" && f.life > 0).length,
    ).toBeLessThanOrEqual(4);
  });
  it("shield duration cannot cover the minimum cooldown even at maximum bonuses", () => {
    const g = start();
    g.spawnEnemy("orc");
    g.enemies[0].x = g.player.x + 100;
    g.upgrades = { cooldown_reduction: 1000, duration: 1000 };
    g.recompute();
    const s = g.newSkill("shield");
    s.duration = 1000;
    g.skills = [s];
    s.cd = 0;
    g.cast(s);
    expect(g.player.shieldUntil - g.clock).toBeLessThanOrEqual(7);
    expect(s.cd).toBeGreaterThan(7);
    g.player.shieldUntil = 0;
    expect(g.player.hp).toBe(100);
    g.hurt(2000);
    expect(g.phase).toBe("dead");
  });
  it("offers mixed upgrades and ignores repeat selection after resuming", () => {
    const g = start();
    g.exp = 100;
    g.beginUpgrade();
    expect(g.phase).toBe("upgrade");
    expect(g.choices).toHaveLength(3);
    expect(g.choices.some((c) => c.kind === "stat")).toBe(true);
    const id = g.choices.find((c) => c.id === "learn-lightning")!.id;
    g.choose(id);
    g.choose(id);
    expect(g.skills.filter((s) => s.id === "lightning")).toHaveLength(1);
  });
  it("reclaims ground experience completely and half the remaining gold", () => {
    const g = start();
    g.drops = [{ id: 99, x: 0, y: 0, gold: 100, exp: 2, born: 0 }];
    g.waveTime = 75;
    g.endWave();
    expect(g.gold).toBe(50);
    expect(g.exp).toBe(2);
    expect(g.phase).toBe("shop");
    g.endWave();
    expect(g.gold).toBe(50);
  });
  it("does not advance a wave while upgrade choices are pending", () => {
    const g = start();
    g.drops = [{ id: 1, x: 0, y: 0, gold: 100, exp: 30, born: 0 }];
    g.waveTime = 75;
    g.endWave();
    expect(g.phase).toBe("upgrade");
    expect(g.wave).toBe(1);
    g.choose(g.choices[2].id);
    g.step(1 / 60);
    expect(g.phase).toBe("shop");
    expect(g.gold).toBe(50);
  });
  it("boss rewards and settlement are idempotent", () => {
    const g = start();
    g.wave = 12;
    g.bossKilled = true;
    g.waveTime = 75;
    g.endWave();
    expect(g.result?.crystals).toBe(3);
    expect(g.phase).toBe("won");
    const result = g.result;
    g.finish(true);
    g.finish(false);
    expect(g.result).toBe(result);
    expect(g.phase).toBe("won");
  });
  it("loses on the final deadline when the boss survives", () => {
    const g = start();
    g.wave = 12;
    g.waveTime = 75;
    g.endWave();
    expect(g.phase).toBe("dead");
    expect(g.result?.won).toBe(false);
  });
  it("trial victories do not award permanent resources", () => {
    const g = start();
    g.start("trial", 176);
    g.wave = 3;
    g.bossKilled = true;
    g.endWave();
    expect(g.result?.crystals).toBe(0);
  });
  it("merges excessive drop entities without losing rewards", () => {
    const g = start();
    g.drops = Array.from({ length: 300 }, (_, i) => ({
      id: i,
      x: 0,
      y: 0,
      exp: 1,
      gold: 0,
      born: 0,
    }));
    g.spawnEnemy("orc");
    g.hit(g.enemies[0], 1000, "fireball");
    expect(g.drops.length).toBe(300);
    expect(g.drops.reduce((a, b) => a + b.exp, 0)).toBe(304);
  });
});

describe("shop economy", () => {
  it("rejects purchases outside shops and with insufficient gold", () => {
    const g = start();
    g.offers = [
      { id: 1, itemId: ITEMS[0].id, price: 1, locked: false, sold: false },
    ];
    g.gold = 100;
    expect(g.buy(1)).toBe(false);
    g.phase = "shop";
    g.gold = 0;
    expect(g.buy(1)).toBe(false);
    expect(g.gold).toBe(0);
  });
  it("purchases exactly once, and cannot buy and sell for profit", () => {
    const g = shop();
    g.gold = 1000;
    const item = ITEMS.find((x) => x.name === "海魂")!;
    g.offers = [
      { id: 1, itemId: item.id, price: 85, locked: false, sold: false },
    ];
    expect(g.buy(1)).toBe(true);
    expect(g.buy(1)).toBe(false);
    expect(g.gold).toBe(915);
    g.sell("weapon");
    expect(g.gold).toBe(957);
    g.sell("weapon");
    expect(g.gold).toBe(957);
  });
  it("recomputes stats from inventory without accumulating unequip bonuses", () => {
    const g = shop();
    const item = ITEMS.find((x) => x.name === "魔杖")!;
    const baseline = { ...g.stats };
    for (let i = 0; i < 1000; i++) {
      g.equipment.weapon = { itemId: item.id, paid: 175 };
      g.recompute();
      delete g.equipment.weapon;
      g.recompute();
    }
    expect(g.stats).toEqual(baseline);
  });
  it("uses separate left and right ring slots", () => {
    const g = shop();
    g.gold = 2000;
    const item = ITEMS.find((x) => x.slot === "ring")!;
    for (let i = 1; i <= 2; i++) {
      g.offers = [
        { id: i, itemId: item.id, price: 100, locked: false, sold: false },
      ];
      g.buy(i);
    }
    expect(g.equipment.ringL).toBeDefined();
    expect(g.equipment.ringR).toBeDefined();
    expect(SLOT_KEYS).toHaveLength(8);
  });
  it("keeps locked offer identity and price across refreshes and waves", () => {
    const g = shop();
    g.gold = 1000;
    const o = { ...g.offers[1] };
    g.lock(o.id);
    g.reroll();
    expect(g.offers.find((x) => x.id === o.id)).toMatchObject({
      ...o,
      locked: true,
    });
    g.nextWave();
    g.waveTime = 75;
    g.endWave();
    expect(g.offers.find((x) => x.id === o.id)).toMatchObject({
      ...o,
      locked: true,
    });
  });
  it("charges increasing refresh costs and resets them at the next shop", () => {
    expect([0, 1, 2, 3].map(rerollPrice)).toEqual([20, 40, 70, 110]);
    const g = shop();
    g.gold = 1000;
    g.reroll();
    g.reroll();
    expect(g.gold).toBe(940);
    expect(g.cooldownCost).toBe(70);
    g.nextWave();
    g.endWave();
    expect(g.cooldownCost).toBe(20);
  });
  it("supports stacking without consuming equipment slots", () => {
    const g = shop();
    g.gold = 10000;
    const item = ITEMS.find((x) => x.name === "生命强化")!;
    for (let i = 0; i < 25; i++) {
      g.offers = [
        {
          id: i,
          itemId: item.id,
          price: item.price,
          locked: false,
          sold: false,
        },
      ];
      expect(g.buy(i)).toBe(true);
    }
    expect(g.passives[item.id]).toBe(25);
    expect(Object.keys(g.equipment)).toHaveLength(0);
    expect(g.maxHP).toBe(300);
  });
  it("enforces limited passive counts", () => {
    const g = shop();
    g.gold = 50000;
    const item = ITEMS.find((x) => x.name === "施法加速")!;
    for (let i = 0; i < 6; i++) {
      g.offers = [
        {
          id: i,
          itemId: item.id,
          price: item.price,
          locked: false,
          sold: false,
        },
      ];
      expect(g.buy(i)).toBe(true);
    }
    g.offers = [
      {
        id: 99,
        itemId: item.id,
        price: item.price,
        locked: false,
        sold: false,
      },
    ];
    expect(g.buy(99)).toBe(false);
    expect(g.passives[item.id]).toBe(6);
  });
});
describe("regressions from browser and limit verification", () => {
  it("continues buying move bonuses through the soft-cap region until the hard cap", () => {
    const g = shop();
    g.gold = 10000;
    const item = ITEMS.find((x) => x.name === "轻装强化")!;
    for (let i = 0; i < 10; i++) {
      g.offers = [
        {
          id: i,
          itemId: item.id,
          price: item.price,
          locked: false,
          sold: false,
        },
      ];
      expect(g.buy(i)).toBe(true);
    }
    expect(g.stats.move_speed).toBe(35);
    expect(g.rawStats.move_speed).toBe(50);
    g.offers = [
      {
        id: 99,
        itemId: item.id,
        price: item.price,
        locked: false,
        sold: false,
      },
    ];
    expect(g.buy(99)).toBe(false);
  });
  it("returns three meaningful choices even after all skills and capped stats are full", () => {
    const g = start();
    g.skills = ["fireball", "lightning", "firewall", "shield"].map((id) => ({
      ...g.newSkill(id as "fireball"),
      rank: 3,
    }));
    g.upgrades = {
      move_speed: 1000,
      pickup_radius: 1000,
      cooldown_reduction: 1000,
    };
    g.recompute();
    expect(g.makeChoices()).toHaveLength(3);
  });
  it("does not cast twice by re-entering the cast command during its cooldown", () => {
    const g = start();
    g.spawnEnemy("boss");
    g.enemies[0].x = g.player.x + 80;
    const s = g.newSkill("lightning");
    s.cd = 0;
    g.skills = [s];
    g.cast(s);
    const hp = g.enemies[0].hp;
    g.cast(s);
    expect(g.enemies[0].hp).toBe(hp);
  });
  it("prevents the player from walking through the original scenery footprint", () => {
    const g = start();
    g.player.x = 750;
    g.player.y = 580;
    g.input = { x: 1, y: 0 };
    advance(g, 0.5);
    expect(g.player.x).toBeLessThan(754);
  });
});
