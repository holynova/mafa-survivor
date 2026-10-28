import {expect,it} from "vitest";
import {Game} from "../src/game";
import {ITEMS,getItem} from "../src/content";

it.each(["warrior","wizard","taoist"] as const)("supplies a usable primary weapon upgrade for %s on waves 3, 6 and 9",classId=>{
  const prefix=classId==="warrior" ? "dc" : classId==="wizard" ? "mc" : "sc";
  for(const wave of [3,6,9])for(const seed of [1,17,176,991]) {
    const g=new Game();g.start("normal",seed,classId);g.wave=wave;g.generateOffers(false);
    const current=getItem(g.equipment.weapon!.itemId);
    const score=(stats:typeof current.stats)=>(stats[`${prefix}_min`]??0)+(stats[`${prefix}_max`]??0);
    expect(g.offers.some(o=>{const i=getItem(o.itemId);return i.slot==="weapon" && g.validItem(i) && score(i.stats)>score(current.stats);})).toBe(true);
    expect(g.offers.some(o=>getItem(o.itemId).kind==="passive" && g.validItem(getItem(o.itemId)))).toBe(true);
  }
});

it("keeps two retained armour pieces while adding both a passive and an entry upgrade weapon",()=>{
  const g=new Game();g.start("normal",176,"warrior");g.wave=3;g.endWave();
  g.offers[0].itemId=ITEMS.find(i=>i.name==="布衣")!.id;
  g.offers[1].itemId=ITEMS.find(i=>i.name==="青铜头盔")!.id;
  g.lock(g.offers[0].id);g.lock(g.offers[1].id);
  const retained=g.offers.slice(0,2);g.generateOffers(true);
  expect(g.offers).toHaveLength(4);for(const o of retained)expect(g.offers).toContain(o);
  expect(g.offers.some(o=>getItem(o.itemId).kind==="passive")).toBe(true);
  const weapon=g.offers.map(o=>getItem(o.itemId)).find(i=>i.slot==="weapon");
  expect(weapon).toBeDefined();expect(weapon!.tier).toBe(2);
  expect(g.offers.find(o=>o.itemId===weapon!.id)!.price).toBe(Math.round(weapon!.price*1.09));
});

it("still creates valid stock when no primary weapon upgrade remains",()=>{
  const g=new Game();g.start("normal",176,"warrior");
  g.equipment.weapon={itemId:ITEMS.find(i=>i.name==="屠龙")!.id,paid:560};g.recompute();
  g.wave=9;g.generateOffers(false);
  expect(g.offers).toHaveLength(4);expect(g.offers.every(o=>g.validItem(getItem(o.itemId)))).toBe(true);
});

it("previews the real replacement stats without changing health, gear or economy",()=>{
  const g=new Game();g.start("normal",176,"warrior");g.player.hp=100;
  const item=ITEMS.find(i=>i.name==="破魂")!;
  const before=JSON.stringify({equipment:g.equipment,stats:g.stats,raw:g.rawStats,hp:g.player.hp,gold:g.gold,pets:g.pets});
  const preview=g.previewEquipment(item);
  expect(preview).toMatchObject({dc_min:14,dc_max:22});
  expect(JSON.stringify({equipment:g.equipment,stats:g.stats,raw:g.rawStats,hp:g.player.hp,gold:g.gold,pets:g.pets})).toBe(before);
  g.phase="shop";g.gold=1000;g.offers=[{id:42,itemId:item.id,price:item.price,locked:false,sold:false}];
  expect(g.buy(42)).toBe(true);expect(g.stats).toEqual(preview);
});
