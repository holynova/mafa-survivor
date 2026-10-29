import { Game, WORLD, type Mode, type Upgrade, type Offer, type Enemy } from "./game";
import { getItem, isBossKind, type Bonuses, type MapId, type SkillId } from "./content";
import type { ClassId } from "./classes";
import {isPrimaryWeaponUpgrade,primaryRange} from "./equipment";

export type SimulationOptions = { seed:number; classId:ClassId; mapId:MapId; mode:Exclude<Mode,"test">; warriorFourSlot?:boolean; traceShops?:boolean };
export type ShopTrace = {wave:number;round:number;gold:number;weapon:string|null;
  offers:{id:number;itemId:string;name:string;price:number;locked:boolean;sold:boolean}[];
  actions:{kind:"buy"|"lock"|"unlock"|"reroll";itemId?:string;price?:number;gold:number}[]};
const priorities: Record<ClassId,SkillId[]> = {
  wizard:["firewall","lightning","ice","shield","bigfireball","fireball"],
  warrior:["cleave","thrust","firesword","powerstrike","dash","swordsmanship"],
  taoist:["skeleton","beast","poison","talisman","heal","ghost"],
};
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
type Point={x:number;y:number};
function lanePressure(point:Point,origin:Point,target:Point,width:number) {
  const dx=target.x-origin.x,dy=target.y-origin.y,length2=dx*dx+dy*dy;
  const t=length2 ? ((point.x-origin.x)*dx+(point.y-origin.y)*dy)/length2 : 0;
  return t<0 || t>1 ? 0 : Math.max(0,1-Math.hypot(point.x-origin.x-dx*t,point.y-origin.y-dy*t)/width)*65;
}
function warningPressure(point:Point,e:Enemy) {
  return (e.shock ? lanePressure(point,e.shock.origin,e.shock.target,55) : 0)+
    (e.stompOrigin ? Math.max(0,1-distance(point,e.stompOrigin)/155)*65 : 0)+
    (e.bossJumpTarget ? Math.max(0,1-distance(point,e.bossJumpTarget)/135)*65 : 0)+
    (e.chargeTarget ? lanePressure(point,e,e.chargeTarget,50) : 0);
}
function engagementPoint(g:Game,target:Enemy):Point {
  const reach=g.classId==="warrior" ? 40 : g.detectionRange*.75;
  const dx=g.player.x-target.x,dy=g.player.y-target.y,d=Math.max(1,Math.hypot(dx,dy));
  const point={x:target.x+dx/d*reach,y:target.y+dy/d*reach};
  const nav=g.navigation;
  if(g.canStand(point.x,point.y) && g.attackLineClear(point,target) && (!nav || nav.connected(g.player,point)))return point;
  // A firing position must be real source floor; otherwise follow the legal
  // route toward the target until a visible position becomes available.
  return nav?.reachablePoints(target,reach*.6,reach).filter(p=>nav.connected(g.player,p))
    .sort((a,b)=>distance(a,g.player)-distance(b,g.player)).slice(0,12)
    .find(p=>g.attackLineClear(p,target)) ?? target;
}
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

export function simulateShop(g:Game,trace?:ShopTrace[]) {
  let purchases=0;
  for(let round=0;round<3;round++) {
    const record:ShopTrace|undefined=trace ? {wave:g.wave,round,gold:g.gold,weapon:g.equipment.weapon?.itemId ?? null,
      offers:g.offers.map(o=>({...o,name:getItem(o.itemId).name})),actions:[]} : undefined;
    if(record)trace!.push(record);
    const equipped=g.equipment.weapon ? getItem(g.equipment.weapon.itemId) : undefined;
    for(const offer of g.offers)if(offer.locked && getItem(offer.itemId).slot==="weapon" &&
      !isPrimaryWeaponUpgrade(g.classId,equipped,getItem(offer.itemId))) {
      g.lock(offer.id);record?.actions.push({kind:"unlock",itemId:offer.itemId,gold:g.gold});
    }
    const buy=(offer:Offer)=>{
      if(!g.buy(offer.id))return false;
      purchases++;record?.actions.push({kind:"buy",itemId:offer.itemId,price:offer.price,gold:g.gold});return true;
    };
    const heal=g.offers.find(o=>!o.sold && getItem(o.itemId).kind==="heal");
    if(heal && g.player.hp/g.maxHP<0.4 && g.gold>=heal.price)buy(heal);
    // Reserve an actual visible offer; no projected income or free equipment.
    for(let attempt=0;attempt<4;attempt++) {
      const current=g.equipment.weapon ? getItem(g.equipment.weapon.itemId) : undefined;
      const target=g.offers.filter(o=>!o.sold && g.validItem(getItem(o.itemId)) &&
        isPrimaryWeaponUpgrade(g.classId,current,getItem(o.itemId))).sort((a,b)=>a.price-b.price)[0];
      if(!target)break;
      if(g.gold<target.price) {
        if(!target.locked && g.shopLocksRemaining>0) {
          g.lock(target.id);record?.actions.push({kind:"lock",itemId:target.itemId,gold:g.gold});
        }
        return purchases;
      }
      if(!buy(target))break;
    }
    for(const offer of [...g.offers].sort((a,b)=>offerScore(g,b.itemId)-offerScore(g,a.itemId))) {
      if(offer.sold)continue;
      const item=getItem(offer.itemId);
      if(item.kind==="heal" && g.player.hp/g.maxHP>0.75)continue;
      if(item.slot==="weapon") {
        const current=g.equipment.weapon ? getItem(g.equipment.weapon.itemId) : undefined;
        const before=primaryRange(g.classId,current?.stats ?? {}),after=primaryRange(g.classId,item.stats);
        if(after.min+after.max<before.min+before.max)continue;
      }
      if(offerScore(g,offer.itemId)>0)buy(offer);
    }
    if(round===2 || g.gold<g.cooldownCost+70)break;
    const price=g.cooldownCost;if(!g.reroll())break;
    record?.actions.push({kind:"reroll",price,gold:g.gold});
  }
  return purchases;
}

/** Observes the same combat state the view consumes; only returns legal input. */
export function simulationInput(g:Game,previous={x:0,y:0}) {
  const p=g.player;
  const health=p.hp/g.maxHP;
  const enemies=g.enemies.filter(e=>e.hp>0 && distance(e,p)<650)
    .sort((a,b)=>distance(a,p)-distance(b,p)).slice(0,35);
  const drop=g.drops.filter(d=>d.exp>0 || d.gold>0 || d.itemId || d.heal && health<1)
    .filter(d=>!g.navigation || g.navigation.connected(p,d))
    .sort((a,b)=>(distance(a,p)-(a.heal && health<.7 ? 200*(1-health) : 0))-
      (distance(b,p)-(b.heal && health<.7 ? 200*(1-health) : 0)))[0];
  const emergency=!!drop?.heal && health<.7;
  const boss=g.boss;
  const focus=boss ?? (g.classId==="warrior" ? enemies.find(e=>distance(e,p)<48 && g.attackLineClear(p,e)) ?? enemies[0] : undefined);
  const destination=emergency ? drop : boss ? engagementPoint(g,boss) : drop ?? (focus ? engagementPoint(g,focus) : undefined);
  const goal=destination && g.navigation ? g.navigation.waypoint(p,destination) : destination;
  const candidates=[{x:0,y:0},...Array.from({length:8},(_,i)=>({x:Math.cos(i*Math.PI/4),y:Math.sin(i*Math.PI/4)}))];
  if(goal){const dx=goal.x-p.x,dy=goal.y-p.y,d=Math.hypot(dx,dy),scale=Math.min(1,d/(g.moveSpeed/6));if(d>0)candidates.push({x:dx/d*scale,y:dy/d*scale});}
  const threatened=enemies.some(e=>(e.windup>0 && distance(e,p)<125) || warningPressure(p,e)>0);
  let best=candidates[0],bestScore=-Infinity;
  for(const input of candidates) {
    // The exact waypoint gets a short legal step; other candidates retain full
    // speed so a nearby goal never prevents dodging a committed warning.
    const future={x:p.x+input.x*g.moveSpeed/6,y:p.y+input.y*g.moveSpeed/6};
    if(future.x<35 || future.y<55 || future.x>WORLD.w-35 || future.y>WORLD.h-35 ||
      !g.canStand(future.x,future.y) || g.navigation && !g.navigation.lineClear(p,future,12))continue;
    let score=(input.x*previous.x+input.y*previous.y)*0.4;
    if(g.classId==="warrior" && !emergency && !threatened && input.x===0 && input.y===0 && g.basicCD<0.2 && enemies.some(e=>distance(e,p)<48))score+=18;
    if(goal)score+=(distance(p,goal)-distance(future,goal))/35;
    else score+=(distance(p,{x:WORLD.w/2,y:WORLD.h/2})-distance(future,{x:WORLD.w/2,y:WORLD.h/2}))/100;
    for(const e of enemies) {
      const d=distance(e,p),horizon=0.4;
      const committed=e.windup>0 || e.shock || e.rangedFireAt!==undefined || e.dormant || (e.staggerUntil ?? 0)>g.clock;
      const approach=g.classId==="warrior" && e.id===focus?.id && !committed;
      const predicted={x:e.x+(committed || approach ? 0 : (p.x-e.x)/Math.max(1,d)*e.speed*horizon),
        y:e.y+(committed || approach ? 0 : (p.y-e.y)/Math.max(1,d)*e.speed*horizon)};
      if(!g.navigation || g.navigation.lineClear(future,predicted,0)) {
        const radius=g.classId==="warrior" ? e.windup>0 ? (isBossKind(e.kind) ? 125 : 75) : approach ? 28 : 42 : e.ranged ? 75 : 105;
        score-=Math.max(0,1-distance(future,predicted)/radius)**2*50;
        if(distance(future,e)<30)score-=40;
      }
      score-=warningPressure(future,e);
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
  const shopTrace:ShopTrace[]|undefined=options.traceShops ? [] : undefined;
  let failure:string|null=null;
  let lastBoss:{kind:string;hp:number;maxHp:number}|null=null;
  const check=()=>{
    if(g.mode==="test")return "test immunity must not enter a balance probe";
    if(!Number.isFinite(g.player.hp) || !Number.isFinite(g.clock))return "non-finite combat state";
    if(g.player.hp>g.maxHP+1e-6)return "healing exceeded maximum health";
    if(g.damageTaken && Math.abs(g.damageTaken.physical+g.damageTaken.magic-Object.values(g.damageTaken.sources).reduce((a,b)=>a+b,0))>1e-6)return "incoming damage totals disagree with source ledger";
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
      purchases+=simulateShop(g,shopTrace);
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
    finalHP:g.player.hp,maxHP:g.maxHP,endReason:g.phase==="won" ? "victory" : g.player.hp<=0 ? "hp-depleted" : terminal ? "boss-timeout" : "incomplete",
    bossHP:lastBoss ? {...lastBoss,hp:g.bossKilled ? 0 : lastBoss.hp} : null,
    goldEarned:g.totalGold,goldRemaining:g.gold,equipment:{...g.equipment},passives:{...g.passives},
    skills:g.result?.skills ?? g.skills.map(s=>`${s.id}:${s.rank}`),damage:{...g.damageDealt},
    combatHealing:{...(g.combatRecovery?.healing ?? {onKill:0,lifeSteal:0})},
    healing:{...g.tao.healing},
    damageTaken:g.damageTaken ? {...g.damageTaken,sources:{...g.damageTaken.sources}} : undefined,waves,shopTrace};
  return report;
}
