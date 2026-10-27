import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { Game } from "../src/game";
import { testSpawn, testEquip, testClear } from "../src/test-mode";
import { MovementInput, movement } from "../src/input";
import { canStand, setWorldLayout } from "../src/world";
import { saveRun, history } from "../src/save";

describe("quick test mode isolation", () => {
  it("enables invulnerability only in test mode and allows turning it off", () => {
    const g = new Game();
    g.start("test");
    g.hurt(50, "physical", true);
    expect(g.player.hp).toBe(100);
    g.test.god = false;
    g.hurt(50, "physical", true);
    expect(g.player.hp).toBe(50);
    g.start("normal");
    g.hurt(50, "physical", true);
    expect(g.player.hp).toBe(50);
  });
  it("does not persist a test settlement or grant crystals", async () => {
    const g = new Game();
    g.start("test");
    g.finish(true);
    expect(g.result?.crystals).toBe(0);
    await saveRun(g.result!);
    expect((await history()).some((r) => r.runId === g.runId)).toBe(false);
  });
  it("spawns the requested count up to 300 and clearing grants no kills or money", () => {
    const g = new Game();
    g.start("test");
    testSpawn(g, "orc", 10);
    expect(g.enemies).toHaveLength(10);
    testSpawn(g, "boss", 300);
    expect(g.enemies).toHaveLength(300);
    testClear(g);
    expect(g.enemies).toHaveLength(0);
    expect(g.kills).toBe(0);
    expect(g.gold).toBe(0);
  });
  it("rejects test controls in normal runs and rejects skills from other classes", () => {
    const g = new Game();
    g.start("normal");
    testSpawn(g, "boss", 5);
    testClear(g);
    expect(g.enemies).toHaveLength(0);
    expect(testEquip(g, "lightning", 0)).toBe(false);
    g.start("test");
    expect(testEquip(g, "firesword", 0)).toBe(false);
    expect(testEquip(g, "lightning", 0)).toBe(true);
    expect(g.skills[0].id).toBe("lightning");
    expect(g.skills[0].cd).toBe(0);
  });
  it("replacing a persistent skill removes its old protection", () => {
    const g = new Game();
    g.start("test");
    g.skills = [g.newSkill("shield")];
    g.player.shieldUntil = 100;
    testEquip(g, "fireball", 0);
    expect(g.player.shieldUntil).toBe(0);
    expect(g.skills).toHaveLength(1);
  });
});

describe("real keyboard event adapter", () => {
  const key = (type: string, code: string, value: string) =>
    Object.assign(new Event(type, { cancelable: true }), { code, key: value });
  it("maps physical D to rightward movement even when an IME reports Process", () => {
    const target = new EventTarget(),
      input = new MovementInput(target, () => true);
    target.dispatchEvent(key("keydown", "KeyD", "Process"));
    expect(input.axes).toEqual({ x: 1, y: 0 });
    target.dispatchEvent(key("keyup", "KeyD", "Process"));
    expect(input.axes).toEqual({ x: 0, y: 0 });
    input.destroy();
  });
  it("supports the lowercase fallback, opposing keys, release and focus reset", () => {
    const target = new EventTarget(),
      input = new MovementInput(target, () => true);
    target.dispatchEvent(key("keydown", "", "d"));
    expect(input.axes.x).toBe(1);
    target.dispatchEvent(key("keydown", "KeyA", "a"));
    expect(input.axes.x).toBe(0);
    input.clear();
    expect(input.axes).toEqual({ x: 0, y: 0 });
    input.destroy();
  });
  it("does not move while gameplay is inactive", () => {
    const target = new EventTarget(),
      input = new MovementInput(target, () => false);
    target.dispatchEvent(key("keydown", "KeyD", "d"));
    expect(input.axes.x).toBe(0);
    input.destroy();
    expect(movement(new Set(["ArrowRight", "ArrowUp"]))).toEqual({
      x: 1,
      y: -1,
    });
  });
});

describe("original map collision grid", () => {
  afterEach(() => setWorldLayout(null));
  it("checks the footprint against the original walkability cells", () => {
    const walk = Array.from({ length: 16 }, () => 1);
    walk[10] = 0;
    setWorldLayout({
      width: 192,
      height: 128,
      cellWidth: 48,
      cellHeight: 32,
      walk,
      tiles: [],
      objects: [],
    });
    expect(canStand(24, 16, 8)).toBe(true);
    expect(canStand(120, 80, 8)).toBe(false);
    expect(canStand(92, 80, 8)).toBe(false);
    expect(canStand(-10, 20)).toBe(false);
  });
});
