import { Game, WORLD, type Mode, type Upgrade } from "./game";
import { getItem, type Bonuses, type MapId, type SkillId } from "./content";
import type { ClassId } from "./classes";
import { inShockLane } from "./temple";

export type SimulationOptions = { seed:number; classId:ClassId; mapId:MapId; mode:Exclude<Mode,"test">; warriorFourSlot?:boolean };
const priorities: Record<ClassId,SkillId[]> = {
  wizard:["firewall","lightning","ice","shield","bigfireball","fireball"],
  warrior:["cleave","thrust","firesword","powerstrike","dash","swordsmanship"],
  taoist:["skeleton","beast","poison","talisman","heal","ghost"],
};
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
function upgradeScore(g:Game,c:Upgrade) {
  if(c.skill) {
    const preference=priorities[g.classId].indexOf(c.skill);
    return (preference<0 ? 5 : 90-preference*7)+(c.field ? -25 : 0);
  }
  return c.stat==="hp_max" && g.player.hp/g.maxHP<0.5 ? 85 : c.stat==="move_speed" ? 30 : 22;
}
function statScore(g:Game,stats:Bonuses) {
  let score=0;
  for(const [key,value] of Object.entries(stats)) {
    const offense=g.classId==="wizard" ? "mc" : g.classId==="taoist" ? "sc" : "dc";
    const weight=key.startsWith(offense) ? 3 : key==="cooldown_reduction" ? 2 :
      key==="hp_max" ? 0.3 : key==="hp_regen" ? 10 : key==="move_speed" ? 1.5 :
      key.startsWith("def_") || key.startsWith("mdef_") ? 2 :
      g.classId==="taoist" && key.startsWith("summon_") ? 1.2 :
      ["accuracy","crit_chance","crit_damage","dodge","lifesteal"].includes(key) ? 1 : 0.1;
    score+=(value ?? 0)*weight;
  }
  return score;
}
function offerScore(g:Game,itemId:string) {
  const item=getItem(itemId);
  if(item.kind==="heal")return Math.min(35,g.maxHP-g.player.hp)*3;
  let value=statScore(g,item.stats);
  if(item.kind==="equipment") {
    const current=g.equipment[g.equipmentSlot(item)];
    if(current)value-=statScore(g,getItem(current.itemId).stats);
  }
  return value;
}

/** Observes the same combat state the view consumes; only returns legal input. */
export function simulationInput(g:Game,previous={x:0,y:0}) {
  const p=g.player;
  const enemies=g.enemies.filter(e=>e.hp>0 && distance(e,p)<650)
    .sort((a,b)=>distance(a,p)-distance(b,p)).slice(0,35);
  const drop=g.drops.filter(d=>d.exp>0 || d.gold>0 || d.itemId)
    .filter(d=>!g.navigation || g.navigation.connected(p,d))
    .sort((a,b)=>distance(a,p)-distance(b,p))[0];
  const destination=g.classId==="warrior" && g.boss ? g.boss : drop ?? (g.classId==="warrior" ? enemies[0] : undefined);
  const goal=destination && g.navigation ? g.navigation.waypoint(p,destination) : destination;
  const candidates=[{x:0,y:0},...Array.from({length:8},(_,i)=>({x:Math.cos(i*Math.PI/4),y:Math.sin(i*Math.PI/4)}))];
  if(goal){const dx=goal.x-p.x,dy=goal.y-p.y,d=Math.hypot(dx,dy);if(d>0)candidates.push({x:dx/d,y:dy/d});}
  let best=candidates[0],bestScore=-Infinity;
  for(const direction of candidates) {
    // The controller holds this action for ten fixed steps. Do not reject a
    // valid near waypoint by projecting several cells beyond that waypoint.
    const speed=goal ? Math.min(1,distance(p,goal)/(g.moveSpeed/6)) : 1;
    const input={x:direction.x*speed,y:direction.y*speed};
    const future={x:p.x+input.x*g.moveSpeed/6,y:p.y+input.y*g.moveSpeed/6};
    if(future.x<35 || future.y<55 || future.x>WORLD.w-35 || future.y>WORLD.h-35 ||
      !g.canStand(future.x,future.y) || g.navigation && !g.navigation.lineClear(p,future,12))continue;
    let score=(input.x*previous.x+input.y*previous.y)*0.4;
    if(g.classId==="warrior" && input.x===0 && input.y===0 && g.basicCD<0.2 && enemies.some(e=>distance(e,p)<48))score+=18;
    if(goal)score+=(distance(p,goal)-distance(future,goal))/35;
    else score+=(distance(p,{x:WORLD.w/2,y:WORLD.h/2})-distance(future,{x:WORLD.w/2,y:WORLD.h/2}))/100;
    for(const e of enemies) {
      const d=distance(e,p),horizon=0.4;
      const committed=e.windup>0 || e.shock || e.rangedFireAt!==undefined || e.dormant || (e.staggerUntil ?? 0)>g.clock;
      const predicted={x:e.x+(committed ? 0 : (p.x-e.x)/Math.max(1,d)*e.speed*horizon),
        y:e.y+(committed ? 0 : (p.y-e.y)/Math.max(1,d)*e.speed*horizon)};
      if(!g.navigation || g.navigation.lineClear(future,predicted,0)) {
        const radius=g.classId==="warrior" ? e.windup>0 ? 75 : 42 : e.ranged ? 75 : 105;
        score-=Math.max(0,1-distance(future,predicted)/radius)**2*50;
        if(distance(future,e)<30)score-=40;
      }
      if(e.shock && inShockLane(future,e.shock.origin,e.shock.target,55))score-=45;
      if(e.stompOrigin && distance(future,e.stompOrigin)<155)score-=45;
      if(e.bossJumpTarget && distance(future,e.bossJumpTarget)<135)score-=40;
      if(e.chargeTarget && inShockLane(future,e,e.chargeTarget,50))score-=35;
    }
    for(const missile of g.projectiles.filter(m=>m.faction==="enemy")) {
      const rx=missile.x-p.x,ry=missile.y-p.y;
      const vx=missile.vx-input.x*g.moveSpeed,vy=missile.vy-input.y*g.moveSpeed;
      const t=Math.max(0,Math.min(0.65,-(rx*vx+ry*vy)/Math.max(1,vx*vx+vy*vy)));
      const gap=Math.hypot(rx+vx*t,ry+vy*t);
      score-=Math.max(0,1-gap/45)*35;
    }
    if(score>bestScore){best=input;bestScore=score;}
  }
  return best;
}

/** Runs real fixed steps, upgrades and purchases. Never changes HP, clocks or loot. */
export function runSimulation(options:SimulationOptions) {
  const g=new Game();
  // An existing unlocked profile grants access to the selected benchmark arena.
  g.applyProgress({crystals:0,unlockedMaps:[options.mapId]});
  g.start(options.mode,options.seed,options.classId,options.warriorFourSlot ?? false,options.mapId);
  let ticks=0,interactions=0,shops=0,upgrades=0,purchases=0,hpLost=0,stationary=0,longestStationary=0;
  const waves:{wave:number;seconds:number;hp:number;level:number;kills:number;gold:number}[]=[];
  let failure:string|null=null;
  let lastBoss:{kind:string;hp:number;maxHp:number}|null=null;
  const check=()=>{
    if(g.mode==="test")return "test immunity must not enter a balance probe";
    if(!Number.isFinite(g.player.hp) || !Number.isFinite(g.clock))return "non-finite combat state";
    if(g.gold<0 || g.enemies.length>300 || g.drops.length>300 || g.skills.length>g.maxSkills)return "economy/entity/skill cap violated";
    if(!g.canStand(g.player.x,g.player.y))return "player left source walkable floor";
    for(const e of g.enemies)if(e.hp>0 && (e.bossJumpUntil ?? 0)<=g.clock && !g.canStand(e.x,e.y))return `grounded ${e.kind} left source walkable floor`;
    return null;
  };
  while(ticks<Math.ceil((g.maxWaves*g.duration+1)*60) && interactions<5000) {
    if(g.phase==="won" || g.phase==="dead")break;
    if(g.phase==="upgrade") {
      const choice=[...g.choices].sort((a,b)=>upgradeScore(g,b)-upgradeScore(g,a))[0];
      g.choose(choice.id);upgrades++;interactions++;continue;
    }
    if(g.phase==="replace") {
      const rank=(id:SkillId)=>{const n=priorities[g.classId].indexOf(id);return n<0 ? 99 : n;};
      const worst=g.skills.reduce((a,b)=>rank(a.id)>rank(b.id) ? a : b);
      g.replaceSkill(g.pendingSkill && rank(g.pendingSkill)<rank(worst.id) ? g.skills.indexOf(worst) : null);interactions++;continue;
    }
    if(g.phase==="shop") {
      shops++;waves.push({wave:g.wave,seconds:g.clock,hp:g.player.hp,level:g.level,kills:g.kills,gold:g.lastWaveGold});
      for(let round=0;round<3;round++) {
        for(const offer of [...g.offers].sort((a,b)=>offerScore(g,b.itemId)-offerScore(g,a.itemId)))
          if(!offer.sold && offerScore(g,offer.itemId)>0 && g.buy(offer.id))purchases++;
        if(round===2 || g.gold<g.cooldownCost+70 || !g.reroll())break;
      }
      g.nextWave();interactions++;continue;
    }
    if(g.phase!=="battle"){failure=`unhandled phase ${g.phase}`;break;}
    if(ticks%10===0)g.input=simulationInput(g,g.input);
    const before={x:g.player.x,y:g.player.y,hp:g.player.hp};
    g.step(1/60);ticks++;
    if(g.boss)lastBoss={kind:g.boss.kind,hp:g.boss.hp,maxHp:g.boss.maxHp};
    hpLost+=Math.max(0,before.hp-g.player.hp);
    stationary=distance(g.player,before)<0.01 ? stationary+1/60 : 0;
    longestStationary=Math.max(longestStationary,stationary);
    if(ticks%60===0){failure=check();if(failure)break;}
  }
  failure ??=check();
  const terminal=g.phase==="won" || g.phase==="dead";
  const report={...options,phase:g.phase,terminal,failure,ticks,seconds:g.clock,wave:g.wave,kills:g.kills,
    level:g.level,shops,upgrades,purchases,hpLost,longestStationary,bossKilled:g.bossKilled,
    bossHP:lastBoss ? {...lastBoss,hp:g.bossKilled ? 0 : lastBoss.hp} : null,
    goldEarned:g.totalGold,goldRemaining:g.gold,equipment:{...g.equipment},passives:{...g.passives},
    skills:g.result?.skills ?? g.skills.map(s=>`${s.id}:${s.rank}`),damage:{...g.damageDealt},waves};
  return report;
}
