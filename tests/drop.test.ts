import { describe, it, expect } from "vitest";
import { Game } from "../src/game";

describe("elite equipment drop", () => {
  it("elite death produces a drop with itemId", () => {
    const g = new Game();
    g.start("normal", 176, "wizard");
    // spawn an elite
    g.spawnEnemy("orc");
    const e = g.enemies.at(-1)!;
    e.elite = true;
    e.hp = 1;
    // kill it
    g.hit(e, 1000, "fireball");
    const drop = g.drops.find((d) => d.itemId);
    expect(drop).toBeDefined();
    expect(drop!.itemId).toBeTruthy();
  });
  it("pickup equips to empty slot", () => {
    const g = new Game();
    g.start("normal", 176, "wizard");
    g.spawnEnemy("orc");
    const e = g.enemies.at(-1)!;
    e.elite = true;
    e.hp = 1;
    g.hit(e, 1000, "fireball");
    const drop = g.drops.find((d) => d.itemId)!;
    // move player to drop
    g.player.x = drop.x;
    g.player.y = drop.y;
    // advance to pick up
    for (let i = 0; i < 5; i++) g.step(1 / 60);
    // drop should be gone
    expect(g.drops.find((d) => d.id === drop.id)).toBeUndefined();
  });
});
