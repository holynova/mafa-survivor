import { afterEach, describe, expect, it } from "vitest";
import { Game } from "../src/game";
import { setWorldLayouts } from "../src/world";
import mine from "./fixtures/mine-layout.json";
import { testBossPhase } from "../src/test-mode";

afterEach(() => setWorldLayouts({}));
function arena(kind: string, distance = 80) {
  const g = new Game(); g.start("test",176,"wizard",false,"mine");
  g.test.god = false; g.skills = []; g.basicCD = Infinity;
  const e=g.spawnEnemy(kind); e.x=g.player.x+distance; e.y=g.player.y;
  e.bossSummonCD=Infinity; e.speed=0;
  g.rng.next=()=>0.99;
  return {g,e};
}
function advance(g:Game,seconds:number) { for(let t=0;t<seconds;t+=1/60) g.step(1/60); }
describe("mine enemy behaviors", () => {
  it("the quick Boss phase tool uses real AI and never works in ordinary runs", () => {
    const {g,e}=arena("corpseKing"); const hp=e.hp;
    g.mode="normal"; expect(testBossPhase(g)).toBe(false); expect(e.hp).toBe(hp);
    g.mode="test"; expect(testBossPhase(g)).toBe(true); g.step(1/60);
    expect(e.bossPhase).toBe(2); expect(e.stompAt).toBeGreaterThan(g.clock);
    expect(e.bossSummonCD).toBe(20); expect(e.stompCD).toBe(6);
    expect(g.kills).toBe(0); expect(g.crystals).toBe(0);
  });
  function wall() {
    const walk = Array.from({length:46*48},()=>1);
    for(let y=0;y<48;y++) walk[y*46+23]=y===10 ? 1 : 0;
    setWorldLayouts({mine:{width:2208,height:1536,cellWidth:48,cellHeight:32,walk,tiles:[],objects:[],spawn:{x:1032,y:768}}});
  }
  it("repulse cannot throw an enemy across an intervening wall", () => {
    wall(); const {g,e}=arena("skeleton",48);
    const spell=g.newSkill("repulse"); spell.cd=0; g.skills=[spell];
    g.cast(spell);
    expect(e.x).toBeLessThan(1104); expect(g.canStand(e.x,e.y)).toBe(true);
  });
  it("hostile arrows collide with the wall before reaching the player", () => {
    wall(); const {g,e}=arena("skeletonArcher",180); const hp=g.player.hp;
    g.fireEliteProjectile(e); advance(g,1);
    expect(g.projectiles).toHaveLength(0); expect(g.player.hp).toBe(hp);
  });
  it("automatic fireballs choose a visible enemy instead of wasting shots on a nearer wall-blocked enemy", () => {
    wall(); const {g,e}=arena("skeleton",180);
    const visible=g.spawnEnemy("skeleton"); visible.x=g.player.x; visible.y=g.player.y+280;
    const spell=g.newSkill("fireball"); spell.cd=0; g.skills=[spell]; g.cast(spell);
    expect(g.projectiles[0]?.targetId).toBe(visible.id);
    expect(g.projectiles[0]?.targetId).not.toBe(e.id);
  });
  it("keeps projectile height visual so a shot can travel along a narrow walkable corridor", () => {
    const walk=Array.from({length:46*48},(_,i)=>Math.floor(i/46)===10 ? 1 : 0);
    setWorldLayouts({mine:{width:2208,height:1536,cellWidth:48,cellHeight:32,walk,tiles:[],objects:[],spawn:{x:504,y:336}}});
    const {g,e}=arena("caveMaggot",200); const hp=e.hp;
    const spell=g.newSkill("fireball"); spell.cd=0; g.skills=[spell]; g.cast(spell);
    advance(g,1); expect(e.hp).toBeLessThan(hp);
  });
  it("lets a summon traverse a one-cell corridor using its navigation footprint", () => {
    const walk=Array.from({length:46*48},(_,i)=>Math.floor(i/46)===10 ? 1 : 0);
    setWorldLayouts({mine:{width:2208,height:1536,cellWidth:48,cellHeight:32,walk,tiles:[],objects:[],spawn:{x:792,y:336}}});
    const g=new Game(); g.start("test",176,"taoist",false,"mine"); g.skills=[]; g.basicCD=Infinity;
    const pet={id:g.nextEntityId(),kind:"summonedSkeleton",source:"skeleton" as const,x:504,y:336,hp:110,maxHp:110,damage:0,speed:155,dir:4,cd:Infinity,born:0,attackUntil:0};
    g.pets.push(pet); advance(g,1.5);
    // Natural spawns may become its preferred target; either direction must
    // remain traversable instead of the summon being pinned to its spawn.
    expect(Math.abs(pet.x-504)).toBeGreaterThan(100); expect(pet.y).toBe(336);
    expect(g.canStand(pet.x,pet.y)).toBe(true);
  });
  it("the actual enemy movement loop follows the passage around a wall", () => {
    wall(); const {g,e}=arena("zombie",220); g.test.god=true; e.speed=180;
    for(let step=0;step<1500;step++) {g.step(1/60); expect(g.canStand(e.x,e.y)).toBe(true);}
    expect(Math.hypot(e.x-g.player.x,e.y-g.player.y)).toBeLessThan(60);
  });
  it("corpse king warns for a second, then damages a stationary target", () => {
    const {g,e}=arena("corpseKing"); e.stompCD=0;
    const hp=g.player.hp; advance(g,0.6);
    expect(e.stompOrigin).toBeDefined(); expect(g.player.hp).toBe(hp);
    advance(g,0.6); expect(g.player.hp).toBeLessThan(hp);
    expect(e.stompAt).toBeUndefined(); expect(e.stompCD).toBeGreaterThan(0);
  });
  it("lets the player leave the warned stomp circle without being tracked", () => {
    const {g,e}=arena("corpseKing"); e.stompCD=0;
    g.step(1/60); const origin={...e.stompOrigin!}, hp=g.player.hp;
    g.input={x:0,y:1}; advance(g,1.2);
    expect(Math.hypot(g.player.x-origin.x,g.player.y-origin.y)).toBeGreaterThan(130);
    expect(g.player.hp).toBe(hp);
  });
  it("summons zombies, not forest monsters, within the 300-enemy cap", () => {
    const {g,e}=arena("corpseKing"); g.test.god=true; e.bossSummonCD=0;
    g.step(1/60);
    expect(g.enemies.filter((e)=>e.kind==="zombie")).toHaveLength(2);
    while(g.enemies.length<299) g.spawnEnemy("skeleton");
    e.bossSummonCD=0; g.step(1/60); expect(g.enemies).toHaveLength(300);
  });
  it("shoots a physical original-arrow projectile that can hit the player", () => {
    const {g,e}=arena("skeletonArcher",200); const hp=g.player.hp;
    advance(g,0.8);
    expect(g.projectiles[0]).toMatchObject({visual:"arrow",faction:"enemy",damageKind:"physical"});
    advance(g,1.2); expect(g.player.hp).toBeLessThan(hp);
  });
  it("the undead ordinary archer can be affected by holy, while the corpse king cannot be one-shot", () => {
    for(const kind of ["skeletonArcher","corpseKing"]) {
      const {g,e}=arena(kind,100); const s=g.newSkill("holy"); s.cd=0; s.chance=1000;
      g.level=20; g.skills=[s]; g.rng.next=()=>0;
      g.cast(s);
      if(kind==="corpseKing") expect(e.hp).toBeGreaterThanOrEqual(e.maxHp*0.85);
      else expect(e.hp).toBeLessThanOrEqual(0);
    }
  });
  it("original mine spawns and repeated movement remain on source walkable cells", () => {
    setWorldLayouts({mine});
    const g=new Game(); g.start("test",176,"taoist",false,"mine");
    g.skills=[]; g.basicCD=Infinity;
    for(let i=0;i<50;i++) g.spawnEnemy(i%2 ? "zombie" : "caveMaggot");
    for(let step=0;step<600;step++) {
      g.input={x:Math.cos(step/80),y:Math.sin(step/80)}; g.step(1/60);
      expect(g.canStand(g.player.x,g.player.y)).toBe(true);
      for(const e of g.enemies) expect(g.canStand(e.x,e.y)).toBe(true);
    }
    expect(g.phase).toBe("battle");
  });
});
