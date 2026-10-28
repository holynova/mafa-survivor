import type { Enemy, Game } from "./game";
import type { Point } from "./world";

export const TEMPLE_RANGED = ["flameWoma", "zumaArcher"];
export function inShockLane(point: Point, origin: Point, target: Point, width = 38) {
  const dx = target.x - origin.x, dy = target.y - origin.y;
  const length2 = dx * dx + dy * dy;
  const t = length2 ? ((point.x - origin.x) * dx + (point.y - origin.y) * dy) / length2 : 0;
  return t >= 0 && t <= 1 && Math.hypot(point.x - origin.x - dx * t, point.y - origin.y - dy * t) <= width;
}
function warning(g: Game, e: Enemy, victim: Point, remaining: number) {
  const dx = victim.x - e.x, dy = victim.y - e.y, d = Math.max(1, Math.hypot(dx, dy));
  e.shock = { origin: {x:e.x,y:e.y}, target: {x:e.x+dx/d*440,y:e.y+dy/d*440}, at:g.clock+0.8, remaining };
  e.dir = g.direction(dx,dy);
}
/** Returns true while an enemy is committed to a telegraphed action or recovery. */
export function updateTempleEnemy(g: Game, e: Enemy, dt: number, victim: Point & {visible:boolean}) {
  if ((e.staggerUntil ?? 0) > g.clock) return true;
  if (e.kind === "zumaStatue") {
    if (e.dormant) {
      if (Math.hypot(victim.x-e.x,victim.y-e.y)>170 && e.hitAt<e.born) return true;
      e.dormant=false; e.awakenAt=g.clock+0.8;
    }
    if ((e.awakenAt ?? 0)>g.clock) return true;
  }
  if (!["womaLord","zumaLord"].includes(e.kind)) return false;
  e.bossSummonCD=Math.max(0,(e.bossSummonCD ?? 6)-dt);
  e.shockCD=Math.max(0,(e.shockCD ?? 4)-dt);
  if (e.bossSummonCD===0) {
    const kinds=e.kind==="womaLord" ? ["womaWarrior","flameWoma"] : ["zumaGuard","zumaArcher","zumaStatue"];
    const points=g.navigation?.reachablePoints(e,90,200).filter(p=>Math.hypot(p.x-g.player.x,p.y-g.player.y)>80);
    for(let i=0;i<kinds.length && g.enemies.length<300;i++) {
      const point=points?.length ? g.rng.pick(points) : g.navigation ? null : {x:e.x+(i-1)*65,y:e.y+100};
      if(!point || !g.canStand(point.x,point.y))continue;
      const add=g.spawnEnemy(kinds[i],true);add.x=point.x;add.y=point.y;
    }
    e.bossSummonCD=20;
  }
  if(e.shock) {
    if(g.clock>=e.shock.at) {
      const shock=e.shock;
      for(const actor of [g.player,...g.pets.filter(p=>p.hp>0)]) {
        if(inShockLane(actor,shock.origin,shock.target) && g.attackLineClear(shock.origin,actor)) {
          if(actor===g.player)g.hurt(e.damage*1.15,"magic",false,`${e.kind}:shock`);
          else g.hurtPet(actor as typeof g.pets[number],e.damage*1.15,"magic");
        }
      }
      g.effect(e.kind==="womaLord" ? "womaShock" : "hellfire",shock.origin.x,shock.origin.y,440,0.55,e.dir);
      if(shock.remaining>1 && victim.visible)warning(g,e,victim,shock.remaining-1);
      else {e.shock=undefined;e.staggerUntil=g.clock+1.2;e.attackCD=1.2;}
    }
    return true;
  }
  if(e.shockCD===0 && victim.visible && Math.hypot(victim.x-e.x,victim.y-e.y)<430) {
    warning(g,e,victim,e.kind==="womaLord" ? 2 : e.bossPhase===2 ? 4 : 3);
    e.shockCD=e.bossPhase===2 ? 7 : 10;return true;
  }
  return false;
}
