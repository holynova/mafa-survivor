import {canonicalBonuses,MAX_SKILL_RANK} from "./skill-growth";
import { getSkill } from "./spells";
import { ITEMS,MAPS,MONSTERS,isBossKind } from "./content";
import { hasWorldAppearance } from "./appearance";
import { clearTaoSkill } from "./taoist";
import type { Enemy, Game } from "./game";
import type { SkillId } from "./spells";
import { canStand } from "./world";
import {appendLoot} from "./loot";
export const newTestSettings = () => ({
  god: true,
  autowalk: false,
  spawning: true,
  speed: 1,
  pose: "live",
  direction: 4,
  visualEpoch: 0,
  recoverySample:false,
  summonWallSample:false,
  healthWalkSample:false,
  engagementSample:false,
  meleeDodgeSample:false,
  footOcclusionSample:false,
  cadenceSample:false,
  bossBuild:null as {name:string;boss:Enemy;branches:string[];equipment:string[]} | null,
  cameraEdgeSample:false,
  potionReserveSample:false,
  incomingWallSample:false,
  showDetection:false,
  lootLabels:false,
});
export function testSpawn(g: Game, kind: string, count: number) {
  if (g.mode !== "test" || !["battle", "paused"].includes(g.phase)) return;
  const total = Math.min(
    300 - g.enemies.length,
    Math.max(0, Math.floor(count)),
  );
  for (let i = 0; i < total; i++) {
    g.spawnEnemy(kind);
    const e = g.enemies.at(-1)!;
    const a = (i * Math.PI * 2) / Math.max(1, count),
      r = 180 + (i % 3) * 45;
    const desired = { x: Math.max(35, Math.min(2173, g.player.x + Math.cos(a) * r)),
      y: Math.max(55, Math.min(1501, g.player.y + Math.sin(a) * r)) };
    const points = g.navigation?.reachablePoints(g.player, 150, 350);
    const point = points?.length ? points.reduce((best, p) =>
      Math.hypot(p.x - desired.x, p.y - desired.y) < Math.hypot(best.x - desired.x, best.y - desired.y) ? p : best) : desired;
    e.x = point.x; e.y = point.y;
  }
  g.emit();
}
export function testEquip(g: Game, id: SkillId, slot: number) {
  if (g.mode !== "test" || !Number.isInteger(slot) || slot < 0 || slot > 5)
    return false;
  if (getSkill(id).classId !== g.classId || g.skills.some((s) => s.id === id))
    return false;
  const skill = g.newSkill(id);
  skill.cd = 0;
  if (slot < g.skills.length) {
    const old = g.skills[slot];
    clearTaoSkill(g, old.id);
    if (old.id === "shield") g.player.shieldUntil = 0;
    if (old.id === "charm")
      g.pets = g.pets.filter((p) => p.source && p.source !== "charm");
    if (old.id === "powerstrike" || old.id === "firesword")
      delete g.charges[old.id];
    g.effects = g.effects.filter((f) => f.kind !== old.id);
    g.skills[slot] = skill;
  } else if (g.skills.length < 6) g.skills.push(skill);
  g.recompute();
  g.emit();
  return true;
}
/** Explicit rank controls never enter normal/trial progression. */
export function testSkillRank(g:Game,id:SkillId,slot:number,rank:number) {
  if(g.mode!=="test" || !["battle","paused"].includes(g.phase) || !Number.isInteger(rank) || rank<1 || rank>MAX_SKILL_RANK || getSkill(id).classId!==g.classId)return false;
  if(!g.skills.some(s=>s.id===id) && !testEquip(g,id,slot))return false;
  const skill=g.skills.find(s=>s.id===id)!;
  clearTaoSkill(g,id);g.effects=g.effects.filter(f=>f.kind!==id);
  if(id==="shield")g.player.shieldUntil=0;
  Object.assign(skill,canonicalBonuses(id,rank),{rank,cd:0});
  g.recompute();g.emit();return true;
}
export function testClear(g: Game) {
  if (g.mode !== "test") return;
  g.test.visualEpoch++;
  g.enemies = [];
  g.projectiles = [];
  g.effects = [];
  g.drops = [];
  g.floating = [];
  g.emit();
}
/** Freeze actual casts for visual inspection; ordinary runs cannot load it. */
export function testSpellVisual(g: Game, sample: "hellfire" | "beast" | "poison",rank=1) {
  if (g.mode !== "test") return false;
  g.start("test", 176, sample === "hellfire" ? "wizard" : "taoist", false, "biche");
  g.test.spawning = false;
  g.basicCD = Infinity;
  const point = g.navigation?.reachablePoints(g.player, 130, 210).sort((a,b)=>
    Math.hypot(a.x-g.player.x+170,a.y-g.player.y)-Math.hypot(b.x-g.player.x+170,b.y-g.player.y)).find(p =>
    g.attackLineClear(g.player, p)) ?? {x:g.player.x+170,y:g.player.y};
  const enemy = g.spawnEnemy("orcWarrior");
  Object.assign(enemy, point, {hp:10000,maxHp:10000,speed:0,attackCD:Infinity});
  const skill = g.newSkill(sample,rank);
  skill.cd=0;g.skills=[skill];g.cast(skill);
  if (sample === "poison") {
    // The first enemy has green poison; give the second a higher target weight.
    const other=g.spawnEnemy("orcWarrior");
    Object.assign(other,{x:point.x,y:point.y+60,hp:11000,maxHp:11000,speed:0,attackCD:Infinity});
    g.setPoisonMode("red");skill.cd=0;g.cast(skill);
  }
  for (let i=0;i<360;i++) {
    g.step(1/60);
    if (sample!=="beast" || g.effects.some(f=>f.kind==="beastflame")) break;
  }
  for(let i=0;i<12;i++)g.step(1/60);
  g.pause();g.emit();
  return sample!=="beast" || g.effects.some(f=>f.kind==="beastflame");
}
/** Source chapter floor and actual roster, paused so models can be compared. */
export function testChapterVisual(g:Game) {
  if(g.mode!=="test")return false;
  g.start("test",g.seed,g.classId,false,g.mapId);
  g.test.spawning=false;g.skills=[];g.basicCD=Infinity;
  const kinds=[MAPS[g.mapId].boss,...MAPS[g.mapId].monsterPool];
  const nativeGallery=g.mapId==="bairimen" || g.mapId==="shimu";
  const targets=g.mapId==="shimu" ? [[180,30],[100,30],[220,100],[105,105],[190,165]] : nativeGallery ? [[185,35],[-185,35],[-120,80],[100,80],[-90,140],[95,140]] : g.mapId==="woma" || g.mapId==="zuma"
    ? [[220,70],[-220,70],[-75,60],[75,60]]
    : [[185,0],[-185,0],[-110,-105],[100,-105],[0,125],[-90,125],[130,120],[0,-140]];
  const points=g.navigation?.reachablePoints(g.player,80,260).filter(p=>g.attackLineClear(g.player,p) && (!nativeGallery || p.y>=g.player.y+20 && p.y<=g.player.y+170) && (g.mapId!=="shimu" || p.x>=g.player.x+70));
  for(let i=0;i<kinds.length;i++) {
    const [dx,dy]=targets[i%targets.length],desired={x:g.player.x+dx,y:g.player.y+dy};
    const candidates=points?.filter(p=>g.enemies.every(e=>Math.hypot(e.x-p.x,e.y-p.y)>66));
    const point=candidates?.length ? candidates.reduce((a,b)=>Math.hypot(a.x-desired.x,a.y-desired.y)<Math.hypot(b.x-desired.x,b.y-desired.y) ? a : b) : !g.navigation ? desired : null;
    if(!point)continue;
    const e=g.spawnEnemy(kinds[i]);Object.assign(e,point,{awakenAt:undefined});
    g.floating.push({id:-e.id,x:e.x,y:e.y-(isBossKind(e.kind) ? 100 : 65),life:100,text:MONSTERS.find(m=>m.id===e.kind)!.name+(e.elite ? " · 精英" : ""),color:isBossKind(e.kind) ? "#ffdd8a" : e.elite ? "#ffa971" : "#e4e3cb"});
  }
  g.pause();g.emit();return g.enemies.length===kinds.length;
}
function lootArena(g:Game) {
  if(g.mode!=="test")return false;
  g.start("test",176,g.classId,false,"woma");
  g.test.spawning=false;g.skills=[];g.basicCD=Infinity;return true;
}
/** Real mine geometry: the fire cone has a visible target and a wall-side one. */
export function testSummonWall(g:Game) {
  if(g.mode!=="test")return false;
  g.start("test",176,"taoist",false,"mine");
  g.test.spawning=false;g.skills=[];g.basicCD=Infinity;
  const nav=g.navigation;if(!nav)return false;
  const homes=[...nav.points].sort((a,b)=>Math.hypot(a.x-g.player.x,a.y-g.player.y)-Math.hypot(b.x-g.player.x,b.y-g.player.y));
  for(const home of homes) {
    const nearby=nav.reachablePoints(home,25,135);
    for(const blocked of nearby.filter(p=>!g.attackLineClear(home,p))) {
      const bx=blocked.x-home.x,by=blocked.y-home.y,bd=Math.hypot(bx,by);
      const visible=nearby.find(p=>{
        const dx=p.x-home.x,dy=p.y-home.y,d=Math.hypot(dx,dy);
        return d<bd && g.attackLineClear(home,p) && (dx*bx+dy*by)/(d*bd)>Math.cos(Math.PI/5);
      });
      const owner=nav.reachablePoints(home,90,150).find(p=>g.attackLineClear(home,p) && Math.hypot(p.x-blocked.x,p.y-blocked.y)>100);
      if(!visible || !owner)continue;
      Object.assign(g.player,owner);
      const skill=g.newSkill("beast");skill.cd=0;g.skills=[skill];g.cast(skill);skill.cd=999;
      const pet=g.pets[0];if(!pet)return false;
      Object.assign(pet,home,{cd:0,speed:0});
      for(const point of [blocked,visible]) {
        const e=g.spawnEnemy("orcWarrior");Object.assign(e,point,{hp:600,maxHp:600,speed:0,attackCD:Infinity});
      }
      for(let i=0;i<12;i++)g.step(1/60);
      g.test.summonWallSample=true;
      g.enemies.forEach((e,i)=>g.floating.push({id:g.nextEntityId(),x:e.x,y:e.y-80,text:`${i ? "可见" : "墙后"} · ${Math.round(e.maxHp-e.hp)}伤害`,color:i ? "#f2cf8a" : "#9bd3e0",life:100}));
      g.pause();g.emit();return true;
    }
  }
  return false;
}
export function testLootVisual(g:Game) {
  if(!lootArena(g))return false;
  g.test.lootLabels=true;g.player.hp=g.maxHP-7;
  const points=g.navigation?.reachablePoints(g.player,75,260).filter(p=>g.attackLineClear(g.player,p));
  const add=(dx:number,dy:number,extra:Partial<typeof g.drops[number]>)=>{
    const desired={x:g.player.x+dx,y:g.player.y+dy};
    const p=points?.filter(p=>g.drops.every(d=>Math.hypot(d.x-p.x,d.y-p.y)>35)).reduce<{x:number;y:number}|null>((best,p)=>!best || Math.hypot(p.x-desired.x,p.y-desired.y)<Math.hypot(best.x-desired.x,best.y-desired.y) ? p : best,null) ?? desired;
    appendLoot(g.drops,{id:g.nextEntityId(),...p,born:g.clock,exp:0,gold:0,...extra});
  };
  [1,4,7,10,12].forEach((level,i)=>add(-160+i*80,80,{level,exp:[2,5,10,20,100][i],gold:[0,5,10,20,50][i]}));
  const names=g.classId==="wizard" ? ["骨玉权杖","魔法长袍"] : g.classId==="warrior" ? ["裁决之杖","战神盔甲"] : ["龙纹剑","灵魂战衣"];
  names.forEach((name,i)=>{const item=ITEMS.find(it=>it.name===name && hasWorldAppearance(it));if(item)add(i ? 110 : -110,-80,{itemId:item.id});});
  add(-185,0,{heal:20});add(185,0,{heal:35});
  g.pause();g.emit();return true;
}
export function testPotionPickup(g:Game) {
  if(!lootArena(g))return false;
  g.player.hp=g.maxHP-7;
  for(let i=0;i<3;i++)appendLoot(g.drops,{id:g.nextEntityId(),x:g.player.x+i*10,y:g.player.y,born:0,exp:0,gold:0,heal:20});
  g.step(1/60);g.step(1/60);g.pause();g.emit();return true;
}
export function testHealthWalk(g:Game) {
  if(!lootArena(g))return false;
  const points=g.navigation?.reachablePoints(g.player,90,160).filter(p=>g.attackLineClear(g.player,p));
  const potion=points?.sort((a,b)=>Math.hypot(a.x-g.player.x-120,a.y-g.player.y)-Math.hypot(b.x-g.player.x-120,b.y-g.player.y))[0];
  if(!potion)return false;
  const coin=points?.find(p=>(p.x-g.player.x)*(potion.x-g.player.x)+(p.y-g.player.y)*(potion.y-g.player.y)<0);
  g.player.hp=g.maxHP-60;g.test.autowalk=true;g.test.healthWalkSample=true;g.test.lootLabels=true;
  appendLoot(g.drops,{id:g.nextEntityId(),...potion,exp:0,gold:0,heal:20,count:3,born:0});
  if(coin)appendLoot(g.drops,{id:g.nextEntityId(),...coin,exp:2,gold:4,born:0});
  g.pause();g.emit();return true;
}
export function testPotionReserve(g:Game,automatic=false) {
  if(!lootArena(g))return false;
  appendLoot(g.drops,{id:g.nextEntityId(),x:g.player.x,y:g.player.y,born:0,exp:0,gold:0,heal:20,count:4});
  g.step(1/60);
  const point=g.navigation?.reachablePoints(g.player,130,200).find(p=>g.attackLineClear(g.player,p));
  if(!point)return false;
  for(const drop of g.drops)Object.assign(drop,point);
  g.test.god=false;g.test.lootLabels=true;g.test.potionReserveSample=true;
  g.hurt(g.maxHP*(automatic ? .7 : .25),"physical",true,"test:potion-reserve");
  if(automatic)g.step(1/60);
  g.pause();g.emit();return true;
}
export function testBossEngagement(g:Game) {
  if(g.mode!=="test")return false;
  g.start("test",176,g.classId,false,"redmoon");
  const point=g.navigation?.reachablePoints(g.player,380,480).sort((a,b)=>
    Math.hypot(a.x-g.player.x+420,a.y-g.player.y)-Math.hypot(b.x-g.player.x+420,b.y-g.player.y))[0];
  if(!point)return false;
  g.test.spawning=false;g.test.god=false;g.test.autowalk=true;g.test.engagementSample=true;
  const skills:SkillId[]=g.classId==="wizard" ? ["fireball","lightning"] : g.classId==="taoist" ? ["talisman","skeleton","beast"] : ["powerstrike","cleave","thrust"];
  g.skills=skills.map(id=>{const s=g.newSkill(id);s.cd=0;return s;});
  Object.assign(g.spawnEnemy("redMoon"),point);
  g.pause();g.emit();return true;
}
export function testMeleeDodge(g:Game) {
  if(g.mode!=="test")return false;
  g.start("test",176,"warrior",false,"woma");
  const nav=g.navigation;if(!nav)return false;
  const home=[...nav.points].sort((a,b)=>Math.hypot(a.x-g.player.x,a.y-g.player.y)-Math.hypot(b.x-g.player.x,b.y-g.player.y)).find(p=>
    [-120,-80,40].every(dx=>g.canStand(p.x+dx,p.y) && g.attackLineClear(p,{x:p.x+dx,y:p.y})));
  if(!home)return false;
  Object.assign(g.player,home);g.test.spawning=false;g.test.god=false;g.test.autowalk=true;g.test.meleeDodgeSample=true;
  g.skills=[g.newSkill("powerstrike"),g.newSkill("cleave")];g.skills.forEach(s=>s.cd=0);
  Object.assign(g.spawnEnemy("womaLord"),{x:home.x+40,y:home.y,speed:0,windup:.65,attackTarget:0,shockCD:Infinity,bossSummonCD:Infinity});
  g.pause();g.emit();return true;
}
export function testFootOcclusion(g:Game) {
  if(g.mode!=="test")return false;
  g.start("test",176,"wizard",false,"redmoon");
  // Pinned D1001 crop: the walkable cell (14,27) sits behind a foreground ledge.
  const point={x:696,y:880};if(!g.canStand(point.x,point.y))return false;
  Object.assign(g.player,point,{dir:0});g.skills=[];g.basicCD=Infinity;
  Object.assign(g.test,{spawning:false,footOcclusionSample:true,pose:"idle",direction:0});
  g.pause();g.emit();return true;
}
export function testViewportEdge(g:Game) {
  if(g.mode!=="test")return false;
  g.start("test",176,"warrior",false,"woma");
  const point=g.navigation?.points.filter(p=>p.y<1500 && p.x>100 && p.x<2100)
    .sort((a,b)=>b.y-a.y || Math.abs(a.x-1104)-Math.abs(b.x-1104))[0];
  if(!point)return false;
  Object.assign(g.player,point);g.skills=[];g.basicCD=Infinity;
  Object.assign(g.test,{spawning:false,cameraEdgeSample:true,pose:"idle",direction:4});
  g.pause();g.emit();return true;
}
/** Actual timed casts against stationary source monsters; no ordinary save rewards. */
export function testRoleCadence(g:Game) {
  if(g.mode!=="test" || g.classId==="wizard")return false;
  g.start("test",176,g.classId,false,"woma");
  const nav=g.navigation;if(!nav)return false;
  const offsets=g.classId==="warrior" ? [40,62,145] : [90,145,200];
  const home=[...nav.points].sort((a,b)=>Math.hypot(a.x-g.player.x,a.y-g.player.y)-Math.hypot(b.x-g.player.x,b.y-g.player.y)).find(p=>
    offsets.every(dx=>g.canStand(p.x+dx,p.y) && g.attackLineClear(p,{x:p.x+dx,y:p.y})));
  if(!home)return false;
  Object.assign(g.player,home,{dir:2});
  Object.assign(g.test,{spawning:false,autowalk:false,god:true,cadenceSample:true});
  g.basicCD=Infinity;
  g.skills=(g.classId==="warrior" ? ["cleave","thrust"] as const : ["talisman","poison"] as const).map(id=>{
    const s=g.newSkill(id);s.cd=0;return s;
  });
  offsets.forEach((dx,i)=>Object.assign(g.spawnEnemy("orcWarrior"),{
    x:home.x+dx,y:home.y,hp:10000,maxHp:10000,speed:0,attackCD:Infinity,elite:i===0,
  }));
  g.pause();g.emit();return true;
}
export function testPlayerFeedback(g:Game,lethal=false) {
  if(!lootArena(g))return false;
  g.test.god=false;g.hurt(lethal ? 1e6 : 20,"physical",true,"test:feedback");
  if(!lethal)g.pause();g.emit();return true;
}
/** Isolated, source-map wall probe. No ordinary run can load this scenario. */
export function testMeleeWall(g: Game) {
  if (g.mode !== "test" || g.classId !== "warrior" ||
      !["battle", "paused"].includes(g.phase) || !g.navigation) return false;
  const nav=g.navigation;
  const homes=[...nav.points].sort((a,b)=>
    Math.hypot(a.x-g.player.x,a.y-g.player.y)-Math.hypot(b.x-g.player.x,b.y-g.player.y));
  for (const home of homes) for (const sign of [-1,1]) {
    const targets=[-24,24].map(dx=>({x:home.x+dx,y:home.y+sign*64}));
    if (!targets.every(p=>canStand(p.x,p.y,12,nav.layout) && nav.connected(home,p) && !nav.lineClear(home,p,0))) continue;
    testClear(g);
    Object.assign(g.player,home,{dir:sign>0 ? 4 : 0,moving:false,attackUntil:0});
    g.input={x:0,y:0};g.basicCD=0;g.charges={};
    g.skills=[g.newSkill("cleave"),g.newSkill("thrust")];
    g.skills.forEach(s=>s.cd=0);
    Object.assign(g.test,{spawning:false,autowalk:false,pose:"idle",direction:sign>0 ? 4 : 0});
    for (const point of targets) {
      const e=g.spawnEnemy("skeletonWarrior");
      Object.assign(e,point,{speed:0});
    }
    g.recompute();g.emit();return true;
  }
  return false;
}
/** Prepare the real Boss AI transition without skipping time or awarding loot. */
export function testBossPhase(g: Game) {
  if (g.mode !== "test" || !["battle", "paused"].includes(g.phase) || !g.boss) return false;
  const boss = g.boss;
  boss.hp = Math.min(boss.hp, boss.maxHp * 0.49);
  boss.stompCD = 0; boss.bossJumpCD = 0; boss.bossSummonCD = 0; boss.shockCD = 0;
  g.emit(); return true;
}

/** Equip real inventory items in the isolated test run, using the regular slots. */
export function testWear(g: Game, itemId: string) {
  const item = ITEMS.find((i) => i.id === itemId);
  if (g.mode !== "test" || !item || !["weapon", "armor"].includes(item.slot ?? "") ||
      (item.classId && item.classId !== g.classId) || !hasWorldAppearance(item)) return false;
  const slot = item.slot as "weapon" | "armor";
  g.equipment[slot] = { itemId: item.id, paid: 0 };
  g.recompute();
  g.emit();
  return true;
}

/** Pause just after one real cleave, with a closer blocked target behind it. */
export function testMeleeFacing(g:Game) {
  if(g.mode!=="test" || g.classId!=="warrior" || !["battle","paused"].includes(g.phase) || !g.navigation)return false;
  const nav=g.navigation;
  const homes=[...nav.points].sort((a,b)=>Math.hypot(a.x-g.player.x,a.y-g.player.y)-Math.hypot(b.x-g.player.x,b.y-g.player.y));
  for(const home of homes)for(const sign of [-1,1]) {
    const blocked={x:home.x,y:home.y+sign*64};
    const visible=[-45,45].map(dx=>({x:home.x+dx,y:home.y-sign*50}));
    if(![blocked,...visible].every(p=>g.canStand(p.x,p.y) && nav.connected(home,p)) ||
      nav.lineClear(home,blocked,0) || !visible.every(p=>nav.lineClear(home,p,0)))continue;
    testClear(g);
    Object.assign(g.player,home,{dir:sign>0 ? 4 : 0,moving:false,attackUntil:0});
    g.input={x:0,y:0};g.basicCD=0;g.charges={};
    const s=g.newSkill("cleave");s.cd=0;g.skills=[s];
    Object.assign(g.test,{spawning:false,autowalk:false,pose:"live"});
    for(const point of [blocked,...visible])Object.assign(g.spawnEnemy("skeletonWarrior"),point,{speed:0});
    g.recompute();
    if(g.phase==="paused")g.pause();
    g.cast(s);g.pause();g.emit();return true;
  }
  return false;
}

/** Buy real capped items, then run real fixed steps through one isolated kill. */
export function testCombatRecovery(g:Game) {
  if(g.mode!=="test" || !["battle","paused"].includes(g.phase))return false;
  g.start("test",g.seed,g.classId,false,g.mapId);
  const points=g.navigation?.reachablePoints(g.player,20,35)
    .filter(p=>g.canStand(p.x,p.y) && g.navigation!.lineClear(g.player,p,0));
  const fallback=[[28,0],[-28,0],[0,28],[0,-28],[20,0],[-20,0],[0,20],[0,-20]]
    .map(([dx,dy])=>({x:g.player.x+dx,y:g.player.y+dy}))
    .find(p=>g.canStand(p.x,p.y) && (!g.navigation || g.navigation.lineClear(g.player,p,0)) &&
      g.obstacles.every(o=>Math.hypot(p.x-o.x,p.y-o.y)>o.r+12));
  const point=points?.[0] ?? fallback;
  if(!point)return false;
  g.test.spawning=false;g.test.recoverySample=true;
  g.endWave();g.gold=2000;
  for(const name of ["击杀回复强化","生命偷取强化"]) {
    const item=ITEMS.find(i=>i.name===name)!;
    for(let i=0;i<item.maxCount!;i++) {
      g.offers=[{id:g.nextEntityId(),itemId:item.id,price:item.price,locked:false,sold:false}];
      if(!g.buy(g.offers[0].id))return false;
    }
  }
  g.nextWave();g.skills=[];g.player.hp=g.maxHP/2;
  const target=g.spawnEnemy("scarecrow");Object.assign(target,point,{speed:0});
  for(let tick=0;tick<900 && target.hp>0 && g.phase==="battle";tick++)g.step(1/60);
  if(g.phase==="battle")g.pause();g.emit();return target.hp<=0;
}

/** Real mine geometry and real stomp AI, first behind a wall, then in sight. */
export function testIncomingWall(g:Game, visible = false) {
  if(g.mode!=="test" || g.mapId!=="mine" || !["battle","paused"].includes(g.phase) || !g.navigation)return false;
  if(!visible) {
    const nav=g.navigation;
    const homes=[...nav.points].sort((a,b)=>Math.hypot(a.x-g.player.x,a.y-g.player.y)-Math.hypot(b.x-g.player.x,b.y-g.player.y));
    const pair=homes.flatMap(home=>[-1,1].map(sign=>({home,enemy:{x:home.x,y:home.y+sign*64}})))
      .find(({home,enemy})=>g.canStand(enemy.x,enemy.y) && nav.connected(home,enemy) && !nav.lineClear(home,enemy,0));
    if(!pair)return false;
    g.start("test",17,g.classId,false,"mine");
    Object.assign(g.player,pair.home,{moving:false});
    g.test.incomingWallSample=true;g.test.spawning=false;g.test.god=false;g.skills=[];g.basicCD=Infinity;
    Object.assign(g.spawnEnemy("corpseKing"),pair.enemy,{speed:0,attackCD:Infinity,bossSummonCD:Infinity,stompCD:0});
  } else {
    if(!g.test.incomingWallSample)return false;
    const boss=g.enemies.find(e=>e.kind==="corpseKing" && e.hp>0);
    if(!boss)return false;
    const point=g.navigation.reachablePoints(boss,50,100)
      .filter(p=>g.canStand(p.x,p.y) && g.attackLineClear(boss,p))
      .sort((a,b)=>Math.hypot(a.x-g.player.x,a.y-g.player.y)-Math.hypot(b.x-g.player.x,b.y-g.player.y))[0];
    if(!point)return false;
    Object.assign(g.player,point,{moving:false});boss.stompCD=0;
    if(g.phase==="paused")g.pause();
  }
  for(let tick=0;tick<66 && g.phase==="battle";tick++)g.step(1/60);
  if(g.phase==="battle")g.pause();g.emit();return true;
}
