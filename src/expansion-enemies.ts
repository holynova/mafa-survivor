import type {Enemy,Game} from "./game";
import type {Point} from "./world";
import {inShockLane} from "./temple";

/** Survivor encounters using source models: fixed aims always leave a dodge window. */
export function updateExpansionEnemy(g:Game,e:Enemy,dt:number,victim:Point & {visible:boolean}) {
  if(!["chulong","redMoon","whiteBoar","overlord"].includes(e.kind))return false;
  if((e.awakenAt ?? 0)>g.clock || (e.staggerUntil ?? 0)>g.clock)return true;
  if(e.kind==="chulong") {
    e.shockCD=Math.max(0,(e.shockCD ?? 1.5)-dt);
    if(e.shock) {
      if(g.clock>=e.shock.at) {
        const line=e.shock;
        for(const actor of [g.player,...g.pets.filter(p=>p.hp>0)])
          if(inShockLane(actor,line.origin,line.target,38) && g.attackLineClear(e,actor)) {
            if(actor===g.player)g.hurt(e.damage,"magic",false,"chulong:poison");
            else g.hurtPet(actor as typeof g.pets[number],e.damage,"magic");
          }
        const dx=line.target.x-e.x,dy=line.target.y-e.y,len=Math.max(1,Math.hypot(dx,dy));
        for(let d=40;d<400;d+=48)g.effect("poison",e.x+dx/len*d,e.y+dy/len*d,0,.7);
        e.shock=undefined;e.staggerUntil=g.clock+.7;
      }
    }else if(e.shockCD===0 && victim.visible && Math.hypot(victim.x-e.x,victim.y-e.y)<420 && g.attackLineClear(e,victim)) {
      const dx=victim.x-e.x,dy=victim.y-e.y,len=Math.max(1,Math.hypot(dx,dy));
      e.shock={origin:{x:e.x,y:e.y},target:{x:e.x+dx/len*400,y:e.y+dy/len*400},at:g.clock+.9,remaining:1};
      g.monsterSound(e,"attack");
      e.shockCD=e.bossPhase===2 ? 4 : 6;
    }
    return true;
  }
  if(e.kind==="overlord") {
    e.bossSummonCD=Math.max(0,(e.bossSummonCD ?? 5)-dt);
    if(e.bossSummonCD===0) {
      const points=g.navigation?.reachablePoints(e,90,170).filter(p=>Math.hypot(p.x-g.player.x,p.y-g.player.y)>80);
      for(let i=0;i<2 && g.enemies.length<300;i++) {
        const point=points?.length ? g.rng.pick(points) : !g.navigation ? {x:e.x+(i ? 70 : -70),y:e.y+80} : null;
        if(point && g.canStand(point.x,point.y))Object.assign(g.spawnEnemy(i ? "pincer" : "centipede",true),point);
      }
      e.bossSummonCD=e.bossPhase===2 ? 14 : 18;
    }
  }
  e.stompCD=Math.max(0,(e.stompCD ?? 1.5)-dt);
  if(e.stompAt!==undefined && e.stompOrigin) {
    if(g.clock>=e.stompAt) {
      const point=e.stompOrigin;
      for(const actor of [g.player,...g.pets.filter(p=>p.hp>0)])
        if(Math.hypot(actor.x-point.x,actor.y-point.y)<130 && g.attackLineClear(e,actor) && g.attackLineClear(point,actor)) {
          if(actor===g.player)g.hurt(e.damage*1.15,"magic",false,`${e.kind}:stomp`);
          else g.hurtPet(actor as typeof g.pets[number],e.damage*1.15,"magic");
        }
      g.effect(e.kind==="overlord" ? "overlordBlade" : "explosion",point.x,point.y,130,.8,e.dir);
      e.stompAt=undefined;e.stompOrigin=undefined;e.staggerUntil=g.clock+1;
    }
    return true;
  }
  if(e.stompCD===0 && victim.visible && Math.hypot(victim.x-e.x,victim.y-e.y)<(e.kind==="redMoon" ? 420 : 160) && g.attackLineClear(e,victim)) {
    e.stompOrigin=e.kind==="redMoon" ? {x:victim.x,y:victim.y} : {x:e.x,y:e.y};
    g.monsterSound(e,"attack");
    e.stompAt=g.clock+.9;e.stompCD=e.bossPhase===2 ? 4 : 6;return true;
  }
  return e.kind==="redMoon";
}
