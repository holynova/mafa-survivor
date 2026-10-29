import {describe,expect,it} from "vitest";
import {Game,type Skill} from "../src/game";
import {SKILLS,type SkillId} from "../src/spells";
import {canonicalBonuses,SKILL_GROWTH} from "../src/skill-growth";
import {skillCooldown,skillMetrics} from "../src/skill-metrics";
import {testSkillRank} from "../src/test-mode";
import {enemyInsight} from "../src/enemy-insight";
import {effectSprites} from "../src/effect-visual";

function arena(id:SkillId,rank=1) {
 const g=new Game();g.start("normal",176,SKILLS.find(s=>s.id===id)!.classId);
 const s=g.newSkill(id,rank);s.cd=0;g.skills=[s];g.wave=6;return {g,s};
}
function target(g:Game,x:number,y=0,kind="orc") {
 const e=g.spawnEnemy(kind);Object.assign(e,{x:g.player.x+x,y:g.player.y+y,hp:10000,maxHp:10000,speed:0,attackCD:999});return e;
}
function advance(g:Game,s:Skill) {
 g.setSkillFocus(s.id);let found=false;
 for(let i=0;i<4;i++){g.choices=g.makeChoices();if(g.choices.some(c=>c.skill===s.id)){found=true;break;}}
 expect(found).toBe(true);g.phase="upgrade";g.choose(g.choices.find(c=>c.skill===s.id)!.id);
}

describe("six-level fixed progression",()=>{
 it("covers 33 skills with six nonempty milestones and finite cumulative effects",()=>{
  expect(SKILLS).toHaveLength(33);
  for(const def of SKILLS) {
   expect(SKILL_GROWTH[def.id]).toHaveLength(6);
   for(let rank=1;rank<=6;rank++) {
    expect(SKILL_GROWTH[def.id][rank-1].label.length).toBeGreaterThan(0);
    expect(Object.values(canonicalBonuses(def.id,rank)).every(Number.isFinite)).toBe(true);
   }
  }
 });
 it("applies the fixed next level once, preserves live cooldown and gates the final rank",()=>{
  const {g,s}=arena("fireball");s.cd=5;
  advance(g,s);expect(s.rank).toBe(2);expect(s.count).toBe(1);expect(s.cd).toBe(5);
  advance(g,s);advance(g,s);advance(g,s);expect(s.rank).toBe(5);expect(s.power).toBe(24);
  g.wave=5;g.choices=g.makeChoices();expect(g.choices.some(c=>c.skill===s.id)).toBe(false);
  g.wave=6;advance(g,s);expect(s.rank).toBe(6);expect(s.count).toBe(2);expect(s.power).toBe(24);
  expect(skillCooldown(s)).toBeCloseTo(.748);expect(g.skillFocus).toBeNull();
  g.choices=g.makeChoices();expect(g.choices.some(c=>c.skill===s.id)).toBe(false);
 });
 it.each([[1,1],[2,2],[5,2],[6,3]])("fireball rank %i fires %i projectiles at distinct targets",(rank,count)=>{
  const {g,s}=arena("fireball",rank);[80,130,180,230].forEach(x=>target(g,x));g.cast(s);
  expect(g.projectiles).toHaveLength(count);expect(new Set(g.projectiles.map(p=>p.targetId)).size).toBe(count);
 });
 it("never shotguns a single Boss and keeps big fireball to two heavy shots",()=>{
  const {g,s}=arena("fireball",6);target(g,100,0,"boss");g.cast(s);expect(g.projectiles).toHaveLength(1);
  const a=arena("bigfireball",6);[80,130,180].forEach(x=>target(a.g,x));a.g.cast(a.s);expect(a.g.projectiles).toHaveLength(2);expect(a.s.power).toBe(50);
 });
 it("gives focus a bounded candidate guarantee without suppressing the stat choice",()=>{
  const {g}=arena("fireball");g.skills=["fireball","lightning","firewall","shield"].map(id=>g.newSkill(id as SkillId));g.setSkillFocus("fireball");
  let misses=0;for(let n=0;n<100;n++) {
   const choices=g.makeChoices();expect(choices.some(c=>c.kind==="stat")).toBe(true);
   misses=choices.some(c=>c.skill==="fireball") ? 0 : misses+1;expect(misses).toBeLessThan(3);
   expect(new Set(choices.map(c=>c.id)).size).toBe(choices.length);
  }
 });
 it("places several real separated firewalls at the count milestone without stacking target damage",()=>{
  const {g,s}=arena("firewall",6);target(g,100,-110);target(g,200,0);target(g,100,110);g.cast(s);
  expect(g.effects.filter(f=>f.kind==="firewall")).toHaveLength(3);
  s.cd=0;g.cast(s);expect(g.effects.filter(f=>f.kind==="firewall" && f.life>0)).toHaveLength(4);
 });
 it("unlocks single-target thrust at rank two while rank one needs multiple aligned targets",()=>{
  const {g,s}=arena("thrust");const e=target(g,70);g.cast(s);expect(e.hp).toBe(10000);expect(s.cd).toBe(0);
  Object.assign(s,canonicalBonuses("thrust",2),{rank:2});g.cast(s);expect(e.hp).toBeLessThan(10000);expect(s.cd).toBeGreaterThan(0);
 });
 it("increases green poison tick output independently of red defense reduction",()=>{
  const one=arena("poison",1),six=arena("poison",6);
  const a=target(one.g,100),b=target(six.g,100);one.g.cast(one.s);six.g.cast(six.s);
  expect(b.greenPoison!.damage).toBeGreaterThan(a.greenPoison!.damage);
  expect(b.greenPoison!.until-six.g.clock).toBeCloseTo(10);
  six.g.setPoisonMode("red");six.s.cd=0;six.g.cast(six.s);expect(b.redPoison!.reduction).toBeCloseTo(.35);
 });
 it("changes actual flame cone coverage and cadence with visible matching sprite spread",()=>{
  const run=(rank:number)=>{
   const {g,s}=arena("beast",rank);g.test.spawning=false;g.mode="test";g.cast(s);g.skills[0].cd=999;
   const pet=g.pets[0];Object.assign(pet,{x:g.player.x,y:g.player.y,cd:0,speed:0});
   const near=target(g,90),angle=43*Math.PI/180,side=target(g,120*Math.cos(angle),120*Math.sin(angle));
   g.step(1/60);return {g,pet,near,side};
  };
  const a=run(1),b=run(6);expect(a.side.hp).toBe(10000);expect(b.side.hp).toBeLessThan(10000);
  expect(b.pet.cd).toBeLessThan(a.pet.cd);
  const fx=b.g.effects.find(f=>f.kind==="beastflame")!;expect(fx.radius).toBeCloseTo(161);expect(fx.spread).toBeCloseTo(1.3);expect(effectSprites(fx)).toHaveLength(3);
 });
 it("limits beam damage length and the rendered scale to detection distance",()=>{
  const {g,s}=arena("beam",6);const near=target(g,250),far=target(g,400);g.cast(s);
  expect(near.hp).toBeLessThan(10000);expect(far.hp).toBe(10000);
  const fx=g.effects.find(f=>f.kind==="beam")!;expect(fx.radius).toBe(300);expect(effectSprites(fx)[0].scale).toBeCloseTo(300/520);
 });
 it("renders reveal information from real defenses, immunity and known cooldowns only",()=>{
  const {g,s}=arena("reveal",6);const e=target(g,100,0,"boss");e.defense=10;e.magicDefense=20;e.bossSummonCD=3;g.cast(s);
  const label=enemyInsight(g,e);expect(label).toContain("物防 10");expect(label).toContain("困魔免疫");expect(label).toContain("召唤 3.0s");expect(label).not.toContain("跳跃");
 });
 it("applies the shield floor and leaves a real gap under maximum global CDR",()=>{
  const {g,s}=arena("shield",6);g.upgrades.cooldown_reduction=1000;g.recompute();target(g,100);g.cast(s);
  expect(g.player.shieldUntil-g.clock).toBe(7);expect(s.cd).toBeGreaterThanOrEqual(8);
  expect(skillMetrics(g,s).join(" ")).toContain("减伤35%");
 });
 it("test rank controls reject normal play, invalid rank and another class",()=>{
  const {g}=arena("fireball");expect(testSkillRank(g,"fireball",0,6)).toBe(false);
  g.start("test");expect(testSkillRank(g,"fireball",0,6)).toBe(true);expect(g.skills[0].count).toBe(2);
  expect(testSkillRank(g,"beast",0,6)).toBe(false);expect(testSkillRank(g,"fireball",0,7)).toBe(false);
 });
});
