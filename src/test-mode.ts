import { getSkill } from "./spells";
import { ITEMS } from "./content";
import { hasWorldAppearance } from "./appearance";
import { clearTaoSkill } from "./taoist";
import type { Game } from "./game";
import type { SkillId } from "./spells";
import { canStand } from "./world";
export const newTestSettings = () => ({
  god: true,
  autowalk: false,
  spawning: true,
  speed: 1,
  pose: "live",
  direction: 4,
  visualEpoch: 0,
  recoverySample:false,
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
