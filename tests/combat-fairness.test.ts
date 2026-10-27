import {afterEach,describe,expect,it} from "vitest";
import {Game} from "../src/game";
import {setWorldLayouts} from "../src/world";

afterEach(()=>setWorldLayouts({}));
function arena(kind:string,distance=200){
  const g=new Game();g.start("test",176,"wizard");g.skills=[];g.basicCD=Infinity;g.test.god=false;
  const e=g.spawnEnemy(kind);e.x=g.player.x+distance;e.y=g.player.y;e.speed=0;e.bossSummonCD=Infinity;e.bossJumpCD=Infinity;
  g.rng.next=()=>0.99;return {g,e};
}
function advance(g:Game,seconds:number){for(let t=0;t<Math.ceil(seconds*60);t++)g.step(1/60);}
describe("avoidable combat and legal source-map actions",()=>{
  it.each(["spider","skeletonArcher"])("%s gives a warning before firing a slower-than-player shot",kind=>{
    const {g,e}=arena(kind);advance(g,0.5);
    expect(g.projectiles).toHaveLength(0);expect(e.rangedTarget).toBeDefined();
    advance(g,0.3);expect(g.projectiles).toHaveLength(1);
    expect(Math.hypot(g.projectiles[0].vx,g.projectiles[0].vy)).toBeLessThan(205);
  });
  it("the forest Boss remains still during its warning and lands at its locked safe target",()=>{
    const {g,e}=arena("boss",160);e.speed=60;e.bossJumpCD=0;
    const before={x:e.x,y:e.y};const hp=g.player.hp;
    g.step(1/60);const target={...e.bossJumpTarget!};
    g.input={x:0,y:1};advance(g,0.5);
    expect({x:e.x,y:e.y}).toEqual(before);expect(e.bossJumpTarget).toEqual(target);
    advance(g,1);expect(e.bossJumpTarget).toBeUndefined();
    expect(e.x).toBeCloseTo(target.x);expect(e.y).toBeCloseTo(target.y);
    expect(g.player.hp).toBe(hp);
  });
  it("forest summons use connected floor and cannot grant repeatable rewards",()=>{
    const walk=Array.from({length:46*48},(_,i)=>Math.floor(i/46)===10 ? 1 : 0);
    setWorldLayouts({biche:{width:2208,height:1536,cellWidth:48,cellHeight:32,walk,tiles:[],objects:[],spawn:{x:504,y:336}}});
    const {g,e}=arena("boss",120);g.test.god=true;e.bossSummonCD=0;g.rng.next=()=>0.25;
    g.step(1/60);const adds=g.enemies.filter(a=>a.kind==="scarecrow");
    expect(adds.length).toBeGreaterThan(0);expect(e.bossSummonCD).toBe(20);
    for(const add of adds){expect(g.canStand(add.x,add.y)).toBe(true);expect(add.summoned).toBe(true);g.hit(add,1e9,"test");}
    expect(g.drops).toHaveLength(0);
  });
  it("corpse king reinforcements keep a 20-second gap even after rage",()=>{
    const {g,e}=arena("corpseKing");e.hp=e.maxHp*0.49;e.bossSummonCD=0;
    g.step(1/60);expect(e.bossSummonCD).toBe(20);
  });
  it("keeps firing at a still-visible nearby wounded target when another foe steps slightly closer",()=>{
    const {g,e}=arena("womaWarrior");
    const other=g.spawnEnemy("womaWarrior");other.x=g.player.x+215;other.y=g.player.y;other.speed=0;
    g.skills=[g.newSkill("fireball")];g.skills[0].cd=0;
    advance(g,0.8);expect(e.hp).toBeLessThan(e.maxHp);
    other.x=g.player.x+185;advance(g,0.4);
    expect(g.projectiles.at(-1)?.targetId).toBe(e.id);
  });
});
