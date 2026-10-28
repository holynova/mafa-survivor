import {afterEach,expect,it} from "vitest";
import {Game} from "../src/game";
import {MAPS,MAP_IDS,NATIVE_ELITES} from "../src/content";
import {canStand,setWorldLayouts} from "../src/world";
import {progressSchema} from "../src/save-format";
import mengzhong from "./fixtures/mengzhong-layout.json";
import centipede from "./fixtures/centipede-layout.json";
import stone from "./fixtures/stone-layout.json";
import redmoon from "./fixtures/redmoon-layout.json";
import models from "../tools/monster-models.json";
import {testChapterVisual} from "../src/test-mode";
const layouts={mengzhong,centipede,stone,redmoon};
afterEach(()=>setWorldLayouts({}));
function advance(g:Game,seconds:number){for(let i=0;i<seconds*60;i++)g.step(1/60);}
function arena(kind:string){const g=new Game();g.start("test",176);g.test.spawning=false;g.test.god=false;g.skills=[];g.basicCD=Infinity;g.rng.next=()=>.99;
 const e=g.spawnEnemy(kind);Object.assign(e,{x:g.player.x+220,y:g.player.y});return {g,e};}
it.each(Object.keys(layouts) as (keyof typeof layouts)[])("%s uses a different original map, legal spawn and connected enemies",id=>{
 setWorldLayouts(layouts);const g=new Game();g.start("test",176,"wizard",false,id);g.test.spawning=false;
 expect(g.layout).toBe(layouts[id]);expect(canStand(g.player.x,g.player.y,12,g.layout)).toBe(true);
 for(let i=0;i<30;i++){const e=g.spawnEnemy();expect(g.canStand(e.x,e.y)).toBe(true);expect(g.navigation!.connected(g.player,e)).toBe(true);}
 expect(g.enemies.every(e=>MAPS[id].monsterPool.includes(e.kind))).toBe(true);
 g.wave=4;g.test.spawning=true;g.skills=[];g.basicCD=Infinity;
 for(let i=0;i<3600 && !g.enemies.some(e=>NATIVE_ELITES.includes(e.kind));i++)g.step(1/60);
 const elite=g.enemies.find(e=>NATIVE_ELITES.includes(e.kind));expect(elite?.elite).toBe(true);
});
it("retains distinct source identities and full chapter unlocks in backups",()=>{
 expect(new Set(Object.values(layouts).map(x=>x.sourceSha256)).size).toBe(4);
 expect(new Set([models.models.boss,models.models.corpseKing,models.models.womaLord,models.models.zumaLord,models.models.chulong,models.models.whiteBoar,models.models.redMoon,models.models.overlord]).size).toBe(8);
 expect(progressSchema.parse({schemaVersion:1,crystals:0,unlockedMaps:MAP_IDS}).unlockedMaps).toHaveLength(8);
});
it.each(["chulong","redMoon"])("%s stays planted and damages only after a warning",kind=>{
 const {g,e}=arena(kind),hp=g.player.hp,x=e.x,y=e.y;
 advance(g,kind==="chulong" ? 2.6 : 1.6);expect(e.x).toBe(x);expect(e.y).toBe(y);expect(g.player.hp).toBe(hp);
 expect(e.shock || e.stompAt).toBeTruthy();advance(g,1.2);expect(g.player.hp).toBeLessThan(hp);
});
it("locks the red-moon eruption to its warning so movement avoids it",()=>{
 const {g,e}=arena("redMoon");advance(g,1.6);const warning={...e.stompOrigin!},hp=g.player.hp;
 g.input={x:0,y:1};advance(g,1.2);expect(g.player.y-warning.y).toBeGreaterThan(160);expect(g.player.hp).toBe(hp);
});
it("only the actual chapter Boss kill satisfies its victory condition",()=>{
 const g=new Game();g.start("test",176,"wizard",false,"stone");g.hit(g.spawnEnemy("boss"),1e9,"test");expect(g.bossKilled).toBe(false);
 g.hit(g.spawnEnemy("whiteBoar"),1e9,"test");expect(g.bossKilled).toBe(true);
});
it("evil snakes telegraph three original poison bolts, rather than an unnamed fireball",()=>{
 const {g,e}=arena("evilSnake");advance(g,.5);expect(e.rangedTarget).toBeDefined();expect(g.projectiles).toHaveLength(0);
 advance(g,.3);expect(g.projectiles).toHaveLength(3);expect(g.projectiles.every(p=>p.visual==="poison" && p.damageKind==="magic")).toBe(true);
});
it("the overlord summons its own insects without creating reward farming",()=>{
 const {g,e}=arena("overlord");e.bossSummonCD=0;g.step(1/60);
 const adds=g.enemies.filter(n=>n.id!==e.id);expect(adds.map(n=>n.kind)).toEqual(["centipede","pincer"]);
 for(const add of adds){expect(add.summoned).toBe(true);g.hit(add,1e9,"test");}
 expect(g.drops).toHaveLength(0);expect(g.bossKilled).toBe(false);
});
it.each(Object.keys(layouts) as (keyof typeof layouts)[])("%s gallery places the actual full roster on reachable source floor",id=>{
 setWorldLayouts(layouts);const g=new Game();g.start("test",176,"taoist",false,id);
 expect(testChapterVisual(g)).toBe(true);expect(g.phase).toBe("paused");
 expect(g.enemies.map(e=>e.kind)).toEqual([MAPS[id].boss,...MAPS[id].monsterPool]);
 for(const e of g.enemies)expect(g.canStand(e.x,e.y)).toBe(true);
 expect(g.floating.every(f=>f.text.length>0)).toBe(true);
});
