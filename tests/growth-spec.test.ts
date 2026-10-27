import {expect,it} from "vitest";
import {Game} from "../src/game";
import {MONSTERS,ITEMS,getItem} from "../src/content";

it.each([1,2,6,12])("uses the GDD wave-%i health and attack curves for ordinary, native elites and bosses",wave=>{
  const g=new Game();g.start("normal",176,"warrior");g.wave=wave;
  for(const source of MONSTERS) {
    const e=g.spawnEnemy(source.id);
    expect(e.maxHp).toBeCloseTo(source.hp*(1+(wave-1)*0.12),6);
    expect(e.damage).toBeCloseTo(source.damage*(1+(wave-1)*0.07),6);
  }
});

it("uses the GDD 70px base pickup radius and its effective 150% cap",()=>{
  const g=new Game();g.start("normal",176,"warrior");
  expect(g.pickupRadius).toBe(70);
  g.upgrades.pickup_radius=1000;g.recompute();
  expect(g.stats.pickup_radius).toBe(150);expect(g.pickupRadius).toBe(175);
});

it.each([["stat-pickup","pickup_radius",25],["stat-speed","move_speed",8]] as const)("offers and applies %s at the GDD upgrade value",(id,stat,value)=>{
  const g=new Game();g.start("normal",176,"warrior");
  for(let i=0;i<100;i++) {
    const choices=g.makeChoices(),choice=choices.find(c=>c.id===id);
    if(!choice)continue;
    expect(choice.value).toBe(value);
    g.choices=choices;g.phase="upgrade";g.choose(id);
    expect(g.rawStats[stat]).toBe(value);return;
  }
  throw new Error(`No ${id} offered in deterministic choices`);
});

it("limits stock locks to two and lets an unlocked slot be reused",()=>{
  const g=new Game();g.start("normal",176,"warrior");g.endWave();
  for(const o of g.offers.slice(0,3))g.lock(o.id);
  expect(g.offers.filter(o=>o.locked)).toHaveLength(2);
  g.lock(g.offers[0].id);g.lock(g.offers[2].id);
  expect(g.offers.filter(o=>o.locked)).toHaveLength(2);
  expect(g.offers[2].locked).toBe(true);
});

it("keeps a universal passive in stock after two equipment locks without replacing retained instances",()=>{
  const g=new Game();g.start("normal",176,"warrior");g.endWave();
  for(let tries=0;tries<100;tries++) {
    const equipment=g.offers.filter(o=>getItem(o.itemId).kind==="equipment");
    if(equipment.length>=2){for(const o of equipment.slice(0,2))g.lock(o.id);break;}
    g.generateOffers(false);
  }
  const retained=g.offers.filter(o=>o.locked);expect(retained).toHaveLength(2);
  for(let round=0;round<50;round++) {
    g.generateOffers(true);
    expect(g.offers).toHaveLength(4);
    for(const o of retained)expect(g.offers).toContain(o);
    expect(g.offers.some(o=>!o.sold && getItem(o.itemId).kind==="passive")).toBe(true);
  }
});

it("does not let a retained capped passive replace the usable passive guarantee",()=>{
  const g=new Game();g.start("normal",176,"warrior");g.endWave();
  const passive=ITEMS.find(i=>i.kind==="passive" && "pickup_radius" in i.stats)!;
  const gear=ITEMS.find(i=>i.name==="布衣")!;
  g.offers[0].itemId=passive.id;g.offers[1].itemId=gear.id;
  g.lock(g.offers[0].id);g.lock(g.offers[1].id);
  const retained=g.offers[0];g.upgrades.pickup_radius=1000;g.recompute();
  expect(g.validItem(passive)).toBe(false);
  for(let round=0;round<50;round++) {
    g.generateOffers(true);
    expect(g.offers).toContain(retained);
    expect(g.offers.some(o=>getItem(o.itemId).kind==="passive" && g.validItem(getItem(o.itemId)))).toBe(true);
  }
});
