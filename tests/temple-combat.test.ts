import {afterEach,describe,expect,it} from "vitest";
import {Game} from "../src/game";
import {MAPS,isBossKind} from "../src/content";
import {setWorldLayouts} from "../src/world";
import woma from "./fixtures/woma-layout.json";
import zuma from "./fixtures/zuma-layout.json";

afterEach(()=>setWorldLayouts({}));
function arena(kind:string,distance=200) {
  const g=new Game();g.start("test",176,"wizard",false,kind.startsWith("zuma") ? "zuma" : "woma");
  g.test.god=false;g.skills=[];g.basicCD=Infinity;
  const e=g.spawnEnemy(kind);e.x=g.player.x+distance;e.y=g.player.y;
  e.speed=0;e.bossSummonCD=Infinity;e.shockCD=Infinity;
  g.rng.next=()=>0.99;
  return {g,e};
}
function advance(g:Game,seconds:number){for(let n=0;n<Math.ceil(seconds*60);n++)g.step(1/60);}
describe("original temple combat",()=>{
  it("has distinct rosters and chapter Bosses",()=>{
    expect(MAPS.woma.monsterPool).toEqual(["womaWarrior","flameWoma","womaBrave"]);
    expect(MAPS.zuma.monsterPool).toEqual(["zumaGuard","zumaArcher","zumaStatue"]);
    for(const id of ["woma","zuma"] as const){
      const g=new Game();g.start("trial",176,"wizard",false,id);
      g.wave=g.maxWaves;g.waveTime=16;g.step(1/60);
      expect(g.boss?.kind).toBe(MAPS[id].boss);expect(isBossKind(g.boss!.kind)).toBe(true);
    }
  });
  it("warns before firing a non-homing original flame that can actually hit",()=>{
    const {g,e}=arena("flameWoma",180);const hp=g.player.hp;
    advance(g,0.5);expect(e.rangedTarget).toBeDefined();expect(g.projectiles).toHaveLength(0);expect(g.player.hp).toBe(hp);
    advance(g,0.3);expect(g.projectiles[0]).toMatchObject({visual:"womaFlame",damageKind:"magic",homing:false});
    advance(g,1);expect(g.player.hp).toBeLessThan(hp);
  });
  it("locks the warned aim so stepping aside dodges the flame",()=>{
    const {g,e}=arena("flameWoma",180);g.step(1/60);const aim={...e.rangedTarget!},hp=g.player.hp;
    g.input={x:0,y:1};advance(g,1.8);
    expect(g.player.y).toBeGreaterThan(aim.y+200);expect(g.player.hp).toBe(hp);
  });
  it("fires three separated physical arrows after a visible warning",()=>{
    const {g,e}=arena("zumaArcher",220);advance(g,0.5);expect(g.projectiles).toHaveLength(0);
    expect(e.rangedFireAt).toBeGreaterThan(g.clock);advance(g,0.3);
    expect(g.projectiles).toHaveLength(3);
    expect(new Set(g.projectiles.map(p=>p.vy)).size).toBe(3);
    for(const p of g.projectiles)expect(p).toMatchObject({visual:"arrow",damageKind:"physical",faction:"enemy"});
  });
  it("leaves a disguised statue still, then gives an awakening window before pursuit",()=>{
    const {g,e}=arena("zumaStatue",280);e.speed=90;const x=e.x;
    advance(g,1);expect(e.dormant).toBe(true);expect(e.x).toBe(x);
    g.player.x=e.x-120;g.step(1/60);expect(e.dormant).toBe(false);expect(e.awakenAt).toBeGreaterThan(g.clock);
    advance(g,0.5);expect(e.x).toBe(x);advance(g,0.5);expect(e.x).toBeLessThan(x);
  });
  it("an attack wakes a statue even before proximity activation",()=>{
    const {g,e}=arena("zumaStatue",300);g.hit(e,1,"fireball");g.step(1/60);
    expect(e.dormant).toBe(false);expect(e.awakenAt).toBeGreaterThan(g.clock);
  });
  it("makes guards resist physical damage without globally reducing magic",()=>{
    const {g,e}=arena("zumaGuard");const other=g.spawnEnemy("womaWarrior");
    const hp=e.hp,otherHP=other.hp;g.hit(e,30,"sword","physical");g.hit(other,30,"sword","physical");
    expect(hp-e.hp).toBeLessThan(otherHP-other.hp);
    const physical=hp-e.hp,before=e.hp;g.hit(e,30,"fireball","magic");expect(before-e.hp).toBeGreaterThan(physical);
  });
  it("gives the brave its designed HP, a locked charge and a recovery window",()=>{
    const {g,e}=arena("womaBrave",180);e.speed=130;
    expect(e.maxHp).toBe(140);expect(e.elite).toBe(true);
    g.step(1/60);const target={...e.chargeTarget!};expect(target.x).toBe(g.player.x);
    const x=e.x;g.input={x:0,y:1};advance(g,0.6);expect(e.x).toBe(x);
    expect(e.chargeTarget).toEqual(target);advance(g,1.2);expect(e.staggerUntil).toBeGreaterThan(g.clock);
    const end=e.x;advance(g,0.5);expect(e.x).toBe(end);
  });
  it.each(["womaLord","zumaLord"])("%s warns along a fixed lane and lets the player leave it",kind=>{
    const {g,e}=arena(kind,200);e.shockCD=0;const hp=g.player.hp;
    g.step(1/60);const target={...e.shock!.target};expect(e.shock!.at-g.clock).toBeCloseTo(0.8);
    g.input={x:0,y:1};advance(g,0.6);expect(e.shock!.target).toEqual(target);expect(g.player.hp).toBe(hp);
    advance(g,0.3);expect(g.player.hp).toBe(hp);expect(e.shock!.remaining).toBe(kind==="womaLord" ? 1 : 2);
  });
  it("a stationary player is damaged by the warned shock",()=>{
    const {g,e}=arena("womaLord",200);e.shockCD=0;const hp=g.player.hp;
    advance(g,0.7);expect(g.player.hp).toBe(hp);advance(g,0.2);expect(g.player.hp).toBeLessThan(hp);
    expect(g.effects.some(f=>f.kind==="womaShock")).toBe(true);
  });
  it("a temple wall blocks both a ranged firing decision and Boss shock damage",()=>{
    const walk=Array.from({length:46*48},(_,i)=>i%46===23 ? 0 : 1);
    setWorldLayouts({woma:{width:2208,height:1536,cellWidth:48,cellHeight:32,walk,tiles:[],objects:[],spawn:{x:1032,y:752}}});
    for(const kind of ["flameWoma","womaLord"]){
      const {g,e}=arena(kind,200);e.shockCD=0;const hp=g.player.hp;
      advance(g,1.1);expect(g.player.hp).toBe(hp);
      expect(g.projectiles).toHaveLength(0);
      if(kind==="flameWoma")expect(e.rangedTarget).toBeUndefined();
    }
  });
  it.each(["womaLord","zumaLord"])("%s cannot be instantly killed or charmed by ordinary control spells",kind=>{
    const {g,e}=arena(kind,100);g.level=30;
    const spell=g.newSkill("holy");spell.cd=0;spell.chance=1000;g.rng.next=()=>0;
    g.cast(spell);expect(e.hp).toBeGreaterThanOrEqual(e.maxHp*0.85);
    const charm=g.newSkill("charm");charm.cd=0;charm.chance=1000;g.cast(charm);
    expect(g.pets).toHaveLength(0);expect(g.enemies.some(a=>a.id===e.id)).toBe(true);
  });
  it("zuma rage adds a fourth warned pulse and leaves recovery afterward",()=>{
    const {g,e}=arena("zumaLord",200);g.test.god=true;e.hp=e.maxHp*0.49;e.shockCD=0;
    const remaining=new Set<number>();
    for(let i=0;i<230;i++){g.step(1/60);if(e.shock)remaining.add(e.shock.remaining);}
    expect(e.bossPhase).toBe(2);expect([...remaining]).toEqual([4,3,2,1]);
    expect(e.shock).toBeUndefined();expect(e.staggerUntil).toBeGreaterThan(g.clock);
  });
  it.each(["womaLord","zumaLord"])("%s summons chapter minions no faster than once per 20 seconds without farmable drops",kind=>{
    const {g,e}=arena(kind,280);g.test.god=true;e.bossSummonCD=0;
    g.step(1/60);const adds=g.enemies.filter(a=>a.summoned);
    expect(adds.length).toBe(kind==="womaLord" ? 2 : 3);expect(e.bossSummonCD).toBe(20);
    for(const add of adds)g.hit(add,1e9,"test");
    expect(g.drops).toHaveLength(0);
    advance(g,10);expect(g.enemies.some(a=>a.hp>0 && a.summoned)).toBe(false);
    while(g.enemies.length<299)g.spawnEnemy("womaWarrior");e.bossSummonCD=0;g.step(1/60);expect(g.enemies).toHaveLength(300);
  });
  it.each(["woma","zuma"] as const)("%s original grid supports legal spawns and wall-aware movement",id=>{
    setWorldLayouts({woma,zuma});const g=new Game();g.start("test",176,"wizard",false,id);g.skills=[];g.basicCD=Infinity;
    for(let i=0;i<40;i++)g.spawnEnemy(MAPS[id].monsterPool[i%3]);
    for(let i=0;i<300;i++){
      g.input={x:Math.cos(i/40),y:Math.sin(i/40)};g.step(1/60);
      expect(g.canStand(g.player.x,g.player.y)).toBe(true);
      for(const e of g.enemies){expect(g.canStand(e.x,e.y)).toBe(true);expect(g.navigation!.connected(g.player,e)).toBe(true);}
    }
  });
});
