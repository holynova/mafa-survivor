import { afterEach, describe, expect, it } from "vitest";
import { Game } from "../src/game";
import { setWorldLayouts } from "../src/world";
import {testIncomingWall} from "../src/test-mode";
import mine from "./fixtures/mine-layout.json";

afterEach(() => setWorldLayouts({}));
function arena(kind: string, open = false) {
  const walk = Array.from({ length: 46 * 48 }, () => 1);
  // A thin horizontal source-grid wall, with a real doorway to the east.
  for (let x = 0; x < 46; x++) walk[10 * 46 + x] = open || x === 25 ? 1 : 0;
  setWorldLayouts({ mine: { width: 2208, height: 1536, cellWidth: 48, cellHeight: 32,
    walk, tiles: [], objects: [], spawn: { x: 504, y: 304 } } });
  const g = new Game(); g.start("test", 176, "warrior", false, "mine");
  g.test.god = false; g.test.spawning = false; g.skills = []; g.basicCD = Infinity;
  const e = g.spawnEnemy(kind);
  Object.assign(e, { x: 504, y: 368, speed: 0, bossSummonCD: Infinity, bossJumpCD: Infinity, stompCD: Infinity });
  g.rng.next = () => .99;
  return { g, e };
}
describe("hostile attacks respect source-map walls", () => {
  it.each([false, true])("forest Boss melee resolves through real AI, open=%s", open => {
    const { g, e } = arena("boss", open), hp = g.player.hp;
    expect(g.canStand(e.x, e.y)).toBe(true); expect(g.canStand(g.player.x, g.player.y)).toBe(true);
    expect(g.navigation!.lineClear(e, g.player, 0)).toBe(open);
    // The Boss is close enough to begin its real 0.65s swing.
    for (let i = 0; i < 42; i++) g.step(1 / 60);
    expect(g.player.hp < hp).toBe(open);
  });
  it.each([false, true])("corpse king stomp hits only actors reachable from the fixed origin, open=%s", open => {
    const { g, e } = arena("corpseKing", open), hp = g.player.hp;
    e.stompCD = 0;
    g.step(1 / 60); expect(e.stompOrigin).toBeDefined();
    for (let i = 0; i < 62; i++) g.step(1 / 60);
    expect(g.player.hp < hp).toBe(open);
  });
  it("rechecks a committed melee hit when its target moves behind a wall during windup", () => {
    const {g,e}=arena("boss");g.player.y=400;
    g.step(1/60);expect(e.windup).toBeGreaterThan(0);
    g.player.y=304;const hp=g.player.hp;
    for(let i=0;i<42;i++)g.step(1/60);
    expect(g.player.hp).toBe(hp);expect(g.damageTaken.sources).toEqual({});
  });
  it.each([false,true])("jump keeps its legal landing but respects walls around its landing blast, open=%s",open=>{
    const {g,e}=arena("boss",open);g.player.y=400;e.y=430;e.bossJumpCD=0;
    g.step(1/60);expect(e.bossJumpTarget?.y).toBe(400);
    g.player.y=304;const hp=g.player.hp;
    for(let i=0;i<86;i++)g.step(1/60);
    expect(e.y).toBe(400);expect(g.player.hp<hp).toBe(open);
    expect(g.damageTaken.magic>0).toBe(open);
  });
  it.each(["boss","corpseKing"])("%s wall protection applies to summons too",kind=>{
    const {g,e}=arena(kind);g.player.x=800;
    g.pets.push({id:g.nextEntityId(),kind:"summonedSkeleton",source:"skeleton",x:504,y:304,hp:200,maxHp:200,damage:0,speed:0,dir:4,cd:Infinity,born:0,attackUntil:0});
    if(kind==="corpseKing")e.stompCD=0;
    for(let i=0;i<66;i++)g.step(1/60);
    expect(g.pets[0].hp).toBe(200);
  });
  it.each(["wizard","warrior","taoist"] as const)("source mine sample uses actual blocked/visible damage, not god mode, for %s",classId=>{
    setWorldLayouts({mine});const g=new Game();g.start("test",176,classId,false,"mine");
    expect(testIncomingWall(g)).toBe(true);expect(g.phase).toBe("paused");expect(g.test.god).toBe(false);
    expect(g.player.hp).toBe(g.maxHP);expect(g.damageTaken.physical).toBe(0);
    expect(testIncomingWall(g,true)).toBe(true);expect(g.phase).toBe("paused");
    expect(g.player.hp).toBeLessThan(g.maxHP);expect(g.damageTaken.sources["corpseKing:stomp"]).toBe(g.maxHP-g.player.hp);
    expect(g.enemies.every(e=>g.canStand(e.x,e.y))).toBe(true);expect(g.canStand(g.player.x,g.player.y)).toBe(true);
    expect(g.kills).toBe(0);expect(g.gold).toBe(0);expect(g.crystals).toBe(0);
    g.start("trial",176,classId,false,"mine");const before=JSON.stringify({player:g.player,enemies:g.enemies,phase:g.phase});
    expect(testIncomingWall(g)).toBe(false);expect(JSON.stringify({player:g.player,enemies:g.enemies,phase:g.phase})).toBe(before);
  });
});
