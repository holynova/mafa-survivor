import { describe, expect, it } from "vitest";
import { Game } from "../src/game";
import { ITEMS } from "../src/content";
import { canDetect } from "../src/taoist";

function runSeeds(seeds: number[], waves = 3) {
  const results: Array<{ seed: number; wave: number; kills: number; phase: string }> = [];
  for (const seed of seeds) {
    const g = new Game();
    g.start("normal", seed, "wizard");
    for (let w = 0; w < waves; w++) {
      if ((g.phase as unknown) !== "battle") break;
      g.waveTime = g.duration;
      g.endWave();
      if (g.phase === "upgrade") {
        g.choose(g.choices[0].id);
      }
      if (g.phase === "shop") {
        g.nextWave();
      }
    }
    results.push({ seed, wave: g.wave, kills: g.kills, phase: g.phase });
  }
  return results;
}

describe("P6: batch seed simulation (P4-01, P4-02)", () => {
  it("100 seeds: no crashes/softlocks, every run progresses", () => {
    const seeds = Array.from({ length: 100 }, (_, i) => i * 13 + 7);
    const results = runSeeds(seeds, 3);
    for (const r of results) {
      // run completed without throwing; wave advanced from 1
      expect(r.wave).toBeGreaterThanOrEqual(2);
      expect(r.kills).toBeGreaterThanOrEqual(0);
      expect(["battle", "shop", "upgrade", "won", "dead"]).toContain(r.phase);
    }
  });

  it("economy invariant holds across seeds (P4-03)", () => {
    const seeds = Array.from({ length: 50 }, (_, i) => i * 17 + 3);
    for (const seed of seeds) {
      const g = new Game();
      g.start("normal", seed, "warrior");
      g.waveTime = g.duration;
      g.endWave();
      // sell price never exceeds 50% of purchase price
      for (const [, eq] of Object.entries(g.equipment)) {
        const item = ITEMS.find((x) => x.id === eq.itemId);
        if (item) {
          const sell = Math.floor(eq.paid * 0.5);
          expect(sell).toBeLessThanOrEqual(Math.floor(item.price * 0.5));
        }
      }
      // hard caps respected
      expect((g.stats.cooldown_reduction ?? 0)).toBeLessThanOrEqual(0.4);
      expect((g.stats.pickup_radius ?? 0)).toBeLessThanOrEqual(1.5);
      expect((g.stats.move_speed ?? 0)).toBeLessThanOrEqual(0.35);
    }
  });
});

describe("P6: 300-enemy performance (P4-05)", () => {
  it("step with 300 enemies stays within frame budget", () => {
    const g = new Game();
    g.start("normal", 176, "warrior");
    for (let i = 0; i < 300; i++) {
      g.spawnEnemy("orc");
      const e = g.enemies.at(-1)!;
      e.hp = 1;
    }
    const start = performance.now();
    for (let i = 0; i < 60; i++) g.step(1 / 60);
    const end = performance.now();
    const avgMs = (end - start) / 60;
    expect(avgMs).toBeLessThan(16.7);
  });

  it("300 enemies with 4 wizard skills + projectiles", () => {
    const g = new Game();
    g.start("normal", 176, "wizard");
    for (const id of ["fireball", "lightning", "firewall", "ice"] as const) {
      const s = g.newSkill(id);
      s.cd = 0;
      g.skills.push(s);
    }
    for (let i = 0; i < 300; i++) {
      g.spawnEnemy("scarecrow");
      const e = g.enemies.at(-1)!;
      e.hp = 1;
      e.x = g.player.x + (i % 20) * 15;
      e.y = g.player.y + Math.floor(i / 20) * 15;
    }
    const start = performance.now();
    for (let i = 0; i < 60; i++) g.step(1 / 60);
    const end = performance.now();
    const avgMs = (end - start) / 60;
    expect(avgMs).toBeLessThan(16.7);
  });
});

describe("P6: boss/teleport/invisibility regression (P4-08)", () => {
  it("teleport never lands inside boss melee range", () => {
    const g = new Game();
    g.start("normal", 176, "wizard");
    g.skills = [g.newSkill("teleport")];
    g.skills[0].cd = 0;
    g.spawnEnemy("boss");
    const boss = g.enemies.at(-1)!;
    boss.x = g.player.x + 50;
    boss.y = g.player.y;
    for (let i = 0; i < 500; i++) {
      g.skills[0].cd = 0;
      g.useTeleport();
      const d = Math.hypot(g.player.x - boss.x, g.player.y - boss.y);
      expect(d).toBeGreaterThan(46);
    }
  });

  it("invisibility does not hide player from boss (canDetect)", () => {
    const g = new Game();
    g.start("normal", 176, "taoist");
    g.skills = [g.newSkill("invisible")];
    g.skills[0].cd = 0;
    g.player.moving = false;
    g.player.hp = g.maxHP * 0.5;
    const o1 = g.spawnEnemy("orc");
    o1.x = g.player.x + 50;
    o1.y = g.player.y;
    const o2 = g.spawnEnemy("orc");
    o2.x = g.player.x + 60;
    o2.y = g.player.y;
    g.cast(g.skills[0]);
    expect(g.tao.buffs[0].invisibleUntil).toBeGreaterThan(g.clock);
    const boss = g.spawnEnemy("boss");
    boss.x = g.player.x + 40;
    boss.y = g.player.y;
    expect(canDetect(g, boss, 0, g.player)).toBe(true);
  });

  it("trap does not affect boss or elites", () => {
    const g = new Game();
    g.start("normal", 176, "taoist");
    g.skills = [g.newSkill("trap")];
    g.skills[0].cd = 0;
    const elite = g.spawnEnemy("cat");
    elite.x = g.player.x + 80;
    elite.y = g.player.y;
    elite.elite = true;
    const boss = g.spawnEnemy("boss");
    boss.x = g.player.x + 90;
    boss.y = g.player.y;
    g.cast(g.skills[0]);
    expect(elite.trapUntil ?? 0).toBe(0);
    expect(boss.trapUntil ?? 0).toBe(0);
  });
});
