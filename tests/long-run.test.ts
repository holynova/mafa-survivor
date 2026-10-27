import { it, expect } from "vitest";
import { Game, WORLD } from "../src/game";
import { getItem } from "../src/content";
import type { ClassId } from "../src/classes";
function run(seed: number, classId: ClassId = "wizard") {
  const g = new Game();
  g.start("normal", seed, classId);
  let last = -1,
    shops = 0,
    upgrades = 0;
  // Test bot intentionally observes all simulated entities to collect loot and kite.
  for (let step = 0; step < 60 * 940; step++) {
    if (g.phase === "upgrade") {
      g.choose(g.choices[0].id);
      upgrades++;
      continue;
    }
    if (g.phase === "replace") {
      g.replaceSkill(null);
      continue;
    }
    if (g.phase === "shop") {
      shops++;
      const heal = g.offers.find(
        (o) => getItem(o.itemId).kind === "heal" && !o.sold,
      );
      if (heal) g.buy(heal.id);
      for (const o of g.offers) g.buy(o.id);
      g.nextWave();
      continue;
    }
    if (g.phase === "won" || g.phase === "dead") break;
    const target = g.drops.reduce<(typeof g.drops)[number] | null>(
      (best, d) =>
        !best ||
        Math.hypot(d.x - g.player.x, d.y - g.player.y) <
          Math.hypot(best.x - g.player.x, best.y - g.player.y)
          ? d
          : best,
      null,
    );
    const meleeTarget =
      classId === "warrior"
        ? g.enemies
            .filter((e) => e.hp > 0)
            .sort(
              (a, b) =>
                Math.hypot(a.x - g.player.x, a.y - g.player.y) -
                Math.hypot(b.x - g.player.x, b.y - g.player.y),
            )[0]
        : undefined;
    const destination = target ?? meleeTarget;
    const dx =
        (destination?.x ?? WORLD.w / 2 + Math.cos(g.clock * 0.1) * 300) -
        g.player.x,
      dy =
        (destination?.y ?? WORLD.h / 2 + Math.sin(g.clock * 0.1) * 300) -
        g.player.y;
    g.input = {
      x: dx / Math.max(25, Math.hypot(dx, dy)),
      y: dy / Math.max(25, Math.hypot(dx, dy)),
    };
    g.step(1 / 60);
    expect(g.gold).toBeGreaterThanOrEqual(0);
    expect(g.enemies.length).toBeLessThanOrEqual(300);
    expect(g.drops.length).toBeLessThanOrEqual(300);
    expect(g.skills.length).toBeLessThanOrEqual(6);
    expect(g.clock).toBeGreaterThanOrEqual(last);
    last = g.clock;
  }
  return {
    phase: g.phase,
    clock: g.clock,
    wave: g.wave,
    kills: g.kills,
    level: g.level,
    shops,
    upgrades,
    stats: g.stats,
    result: g.result,
  };
}
// These probes simulate two full runs. Their wall-clock allowance is not a game performance target.
it("completes a deterministic seeded run without softlocks or economy errors", () => {
  const a = run(176),
    b = run(176);
  expect({ ...a, result: { ...a.result, runId: "" } }).toEqual({
    ...b,
    result: { ...b.result, runId: "" },
  });
  expect(["won", "dead"]).toContain(a.phase);
  expect(a.shops).toBeGreaterThan(0);
  expect(a.upgrades).toBeGreaterThan(0);
  console.log(
    "seed-176 balance probe",
    JSON.stringify({
      phase: a.phase,
      wave: a.wave,
      kills: a.kills,
      clock: Math.round(a.clock),
      shops: a.shops,
      upgrades: a.upgrades,
    }),
  );
}, 20_000);
it("keeps a seeded warrior run deterministic across melee upgrades and shops", () => {
  const a = run(176, "warrior"),
    b = run(176, "warrior");
  expect({ ...a, result: { ...a.result, runId: "" } }).toEqual({
    ...b,
    result: { ...b.result, runId: "" },
  });
  expect(["won", "dead"]).toContain(a.phase);
  expect(a.shops).toBeGreaterThan(0);
  expect(a.kills).toBeGreaterThan(0);
  expect(a.result?.classId).toBe("warrior");
  console.log(
    "warrior-176 balance probe",
    JSON.stringify({
      phase: a.phase,
      wave: a.wave,
      kills: a.kills,
      clock: Math.round(a.clock),
      shops: a.shops,
      upgrades: a.upgrades,
    }),
  );
}, 20_000);

it("plays a normal taoist run through upgrades, shops and a terminal result deterministically", () => {
  const a = run(176, "taoist"), b = run(176, "taoist");
  expect({ ...a, result: { ...a.result, runId: "" } }).toEqual({
    ...b, result: { ...b.result, runId: "" },
  });
  expect(["won", "dead"]).toContain(a.phase);
  expect(a.shops).toBeGreaterThan(0);
  expect(a.upgrades).toBeGreaterThan(0);
  expect(a.kills).toBeGreaterThan(0);
  expect(a.result?.classId).toBe("taoist");
  expect(a.result?.skills).toContain("灵魂火符 Lv.1");
  expect(a.result?.skillDamage.talisman).toBeGreaterThan(0);
  console.log("taoist-176 balance probe", JSON.stringify({
    phase: a.phase, wave: a.wave, kills: a.kills, clock: Math.round(a.clock),
    shops: a.shops, upgrades: a.upgrades, skills: a.result?.skills,
  }));
}, 20_000);
