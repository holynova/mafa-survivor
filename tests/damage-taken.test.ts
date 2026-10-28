import {describe,it,expect} from "vitest";
import {Game} from "../src/game";
import {damageSourceName} from "../src/damage-taken";
function arena(){const g=new Game();g.start("test",176,"warrior");g.test.god=false;g.test.spawning=false;g.skills=[];g.basicCD=Infinity;g.rng.next=()=>.99;return g;}
describe("actual player damage attribution",()=>{
  it("counts HP removed, caps overkill, and does not net later healing against earlier damage",()=>{
    const g=arena();g.hurt(20,"physical",false,"orc:melee");const removed=g.maxHP-g.player.hp;
    expect(g.damageTaken).toEqual({physical:removed,magic:0,sources:{"orc:melee":removed}});
    g.player.hp=g.maxHP;g.clock=1;g.hurt(20,"physical",false,"orc:melee");
    expect(g.damageTaken.physical).toBe(removed*2);
    g.player.hp=3;g.clock=2;g.hurt(10000,"magic",false,"flameWoma:projectile");
    expect(g.damageTaken.magic).toBe(3);expect(g.result?.damageTaken?.magic).toBe(3);
    g.damageTaken.sources["flameWoma:projectile"]=99;
    expect(g.result?.damageTaken?.sources["flameWoma:projectile"]).toBe(3);
  });
  it("does not attribute dodges, god mode, pause or rejected invulnerability hits",()=>{
    const g=arena();g.rng.next=()=>0;g.hurt(10);expect(g.damageTaken.physical).toBe(0);
    g.rng.next=()=>.99;g.test.god=true;g.hurt(10);g.test.god=false;
    g.pause();g.hurt(10);g.pause();g.hurt(10);const first=g.damageTaken.physical;
    g.hurt(10);expect(g.damageTaken.physical).toBe(first);expect(first).toBeGreaterThan(0);
    g.start("normal");expect(g.damageTaken).toEqual({physical:0,magic:0,sources:{}});
  });
  it("tracks actual hostile arrows with the firing enemy kind",()=>{
    const g=arena(),e=g.spawnEnemy("skeletonArcher");Object.assign(e,{x:g.player.x+90,y:g.player.y,speed:0,rangedCD:Infinity});
    g.fireEliteProjectile(e);
    for(let i=0;i<40;i++)g.step(1/60);
    expect(g.damageTaken.sources["skeletonArcher:projectile"]).toBe(g.maxHP-g.player.hp);
    expect(g.damageTaken.physical).toBeGreaterThan(0);expect(g.damageTaken.magic).toBe(0);
  });
  it("uses readable labels and a bounded unknown-source fallback",()=>{
    expect(damageSourceName("corpseKing:stomp")).toBe("尸王 · 震地");
    expect(damageSourceName("recoil")).toBe("野蛮撞墙");expect(damageSourceName("unknown")).toBe("其他伤害");
  });
});
