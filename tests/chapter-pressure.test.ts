import {describe,expect,it} from "vitest";
import {Game} from "../src/game";
import {MONSTERS,CHAPTER_PRESSURE} from "../src/content";

describe("chapter threat and growth budgets",()=>{
  it.each(["biche","mine","woma","zuma"] as const)("%s spends a first-wave budget on its own roster with unchanged monster stats",map=>{
    const g=new Game();g.start("test",176,"wizard",false,map);g.skills=[];g.basicCD=Infinity;
    for(let i=0;i<74*60;i++)g.step(1/60);
    expect(g.enemies).toHaveLength(g.spawnBudget);
    expect(g.spawnBudget).toBe(Math.ceil(35/CHAPTER_PRESSURE[map]));
    for(const e of g.enemies){
      const source=MONSTERS.find(m=>m.id===e.kind)!;
      expect(e.maxHp).toBe(source.hp);expect(e.damage).toBe(source.damage);
      expect(e.elite).toBe(false);
    }
  });
  it.each(["biche","mine","woma","zuma"] as const)("%s rewards fewer enemies without changing the pickup multiplier",map=>{
    const g=new Game();g.start("test",176,"wizard",false,map);g.rng.next=()=>0;
    const e=g.spawnEnemy("scarecrow");g.hit(e,1e9,"test");
    expect(g.drops[0].gold).toBe(Math.round(4*CHAPTER_PRESSURE[map]));
    expect(g.drops[0].exp).toBe(e.exp);
  });
  it.each(["warrior","taoist"] as const)("%s is offered a second offensive tool on the first level-up",id=>{
    const g=new Game();g.start("normal",176,id);g.exp=20;g.beginUpgrade();
    const choice=g.choices.find(c=>c.id===`learn-${id==="warrior" ? "cleave" : "skeleton"}`);
    expect(choice).toBeDefined();g.choose(choice!.id);
    expect(g.skills).toHaveLength(2);expect(g.skills[1].id).toBe(id==="warrior" ? "cleave" : "skeleton");
  });
  it("keeps native Woma elites out of the random ordinary swarm",()=>{
    const g=new Game();g.start("test",176,"wizard",false,"woma");g.wave=3;
    for(let i=0;i<200;i++)expect(g.spawnEnemy().kind).not.toBe("womaBrave");
  });
});
