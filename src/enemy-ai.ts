import type {Enemy,Game} from "./game";
import type {Point} from "./world";

/** Shared ranged windup: a fixed aim, a visible warning, then a dodgeable shot. */
export function updateRangedEnemy(g:Game,e:Enemy,dt:number,victim:Point & {visible:boolean}) {
  if(!e.ranged)return false;
  if((e.staggerUntil ?? 0)>g.clock)return true;
  if (e.ranged) {
    e.rangedCD=Math.max(0,(e.rangedCD ?? 1)-dt);
    if (e.rangedFireAt !== undefined && e.rangedTarget) {
      if (g.clock>=e.rangedFireAt) {
        g.fireEliteProjectile(e,e.rangedTarget);
        e.rangedTarget=undefined; e.rangedFireAt=undefined;
        e.rangedCD=e.kind==="zumaArcher" ? 3.2 : e.kind==="flameWoma" ? 2.8 : 2.5;
        e.windup=0; e.staggerUntil=g.clock+0.35;
      }
      return true;
    }
    const d=Math.hypot(victim.x-e.x,victim.y-e.y);
    if (victim.visible && d<420 && e.rangedCD===0 && (!g.navigation || g.navigation.lineClear(e,victim,0))) {
      e.rangedTarget={x:victim.x,y:victim.y}; e.rangedFireAt=g.clock+0.7;
      e.dir=g.direction(victim.x-e.x,victim.y-e.y);
      return true;
    }
    if (d<145) {
      const x=e.x+(e.x-victim.x)/Math.max(1,d)*e.speed*dt;
      const y=e.y+(e.y-victim.y)/Math.max(1,d)*e.speed*dt;
      if(g.canStand(x,y)) {e.x=x;e.y=y;return true;}
    }
  }
  return false;
}
