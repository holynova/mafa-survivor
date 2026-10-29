import {afterEach,expect,it} from "vitest";
import {Game} from "../src/game";
import {getSkill,type SkillId} from "../src/spells";
import {setWorldLayouts} from "../src/world";
afterEach(()=>setWorldLayouts({}));
it.each(["fireball","lightning","hellfire","beam","explosion","ice","poison","trap","holy"] as SkillId[])("%s acquires only visible targets across source walk-grid walls",id=>{
 for(const open of [false,true]) {
  const walk=Array(46*48).fill(1);if(!open)for(let x=0;x<46;x++)walk[10*46+x]=0;
  setWorldLayouts({mine:{width:2208,height:1536,cellWidth:48,cellHeight:32,walk,tiles:[],objects:[],spawn:{x:504,y:304}}});
  const g=new Game();g.start("test",176,getSkill(id).classId,false,"mine");g.level=20;g.test.spawning=false;g.rng.next=()=>.01;
  const e=g.spawnEnemy("zombie");Object.assign(e,{x:504,y:368,hp:10000,maxHp:10000,speed:0});
  const s=g.newSkill(id,6);s.cd=0;g.skills=[s];g.cast(s);
  expect(s.cd>0).toBe(open);if(!open){expect(e.hp).toBe(10000);expect(g.projectiles).toHaveLength(0);expect(e.greenPoison).toBeUndefined();expect(e.trapUntil??0).toBe(0);}
 }
});
it("keeps the upgraded trap visual for its actual duration and clears it on damage",()=>{
 const g=new Game();g.start("test",176,"taoist");g.test.spawning=false;
 const e=g.spawnEnemy("orc");Object.assign(e,{x:g.player.x+100,y:g.player.y,hp:1000,maxHp:1000,speed:0});
 const s=g.newSkill("trap",6);s.cd=0;g.skills=[s];g.cast(s);
 const fx=g.effects.find(f=>f.kind==="trap")!;expect(fx.life).toBe(7);expect(e.trapUntil).toBe(7);
 g.hit(e,1,"talisman");expect(fx.life).toBe(0);expect(e.trapUntil).toBe(0);
});
