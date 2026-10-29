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
  it("handles Q without cancelling held movement and ignores key repeat",()=>{
    let uses=0;const target=new EventTarget(),input=new MovementInput(target,()=>true,()=>uses++);
    target.dispatchEvent(key("keydown","KeyD","d"));target.dispatchEvent(key("keydown","KeyQ","q"));
    target.dispatchEvent(Object.assign(key("keydown","KeyQ","q"),{repeat:true}));
    expect(uses).toBe(1);expect(input.axes).toEqual({x:1,y:0});expect(input.held.has("KeyQ")).toBe(false);input.destroy();
  });
  it("does not drink when editing a field, using a browser shortcut, or outside battle",()=>{
    let uses=0;const field=Object.assign(new EventTarget(),{closest:()=>({})}),input=new MovementInput(field,()=>true,()=>uses++);
    field.dispatchEvent(key("keydown","KeyQ","q"));expect(uses).toBe(0);input.destroy();
    const target=new EventTarget(),active=new MovementInput(target,()=>true,()=>uses++);
    target.dispatchEvent(Object.assign(key("keydown","KeyQ","q"),{ctrlKey:true}));active.destroy();
    const inactive=new MovementInput(target,()=>false,()=>uses++);target.dispatchEvent(key("keydown","KeyQ","q"));expect(uses).toBe(0);inactive.destroy();
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


import {testNextWave} from "../src/test-mode";
it("advances the test tool from both paused combat and shop without granting normal rewards",()=>{
 const g=new Game();g.start("test");g.pause();expect(testNextWave(g)).toBe(true);expect(g.phase).toBe("shop");expect(g.wave).toBe(1);
 expect(g.training.total).toBe(0);expect(testNextWave(g)).toBe(true);expect(g.phase).toBe("battle");expect(g.wave).toBe(2);
});
it("does not let the test wave shortcut change an ordinary run or settled test run",()=>{
 const g=new Game();g.start("normal");const clock=g.clock;expect(testNextWave(g)).toBe(false);expect(g.wave).toBe(1);expect(g.clock).toBe(clock);
 g.start("test");g.finish(false);expect(testNextWave(g)).toBe(false);
});
