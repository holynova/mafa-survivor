import {expect,it} from "vitest";
import {Game} from "../src/game";
import {ITEMS} from "../src/content";
import {simulateShop} from "../src/simulation";

function shop(gold:number) {
  const g=new Game();g.start("normal",176,"warrior");g.endWave();g.gold=gold;
  const weapon=ITEMS.find(i=>i.name==="破魂")!;
  const passive=ITEMS.find(i=>i.kind==="passive" && "hp_max" in i.stats)!;
  g.offers=[{id:100,itemId:weapon.id,price:175,sold:false,locked:false},
    {id:101,itemId:passive.id,price:85,sold:false,locked:false}];
  return g;
}

it("locks an unaffordable weapon and saves gold instead of spending the upgrade budget",()=>{
  const g=shop(100);expect(simulateShop(g)).toBe(0);
  expect(g.gold).toBe(100);expect(g.offers[0].locked).toBe(true);
  expect(g.offers[1].sold).toBe(false);expect(g.rerolls).toBe(0);
});

it("buys the reserved weapon when later income makes it affordable",()=>{
  const g=shop(100);simulateShop(g);
  const reserved=g.offers[0];g.gold+=100;
  expect(simulateShop(g)).toBe(1);
  expect(reserved.sold).toBe(true);expect(reserved.locked).toBe(false);
  expect(g.equipment.weapon?.itemId).toBe(reserved.itemId);expect(g.gold).toBe(50);
});

it("prioritizes an affordable primary weapon before cheap stat purchases",()=>{
  const g=shop(200);simulateShop(g);
  expect(g.equipment.weapon?.itemId).toBe(g.offers.find(o=>o.id===100)?.itemId);
});

it("still buys an emergency heal before saving for a weapon",()=>{
  const g=shop(100);g.player.hp=40;
  g.offers.push({id:102,itemId:"heal",price:45,sold:false,locked:false});
  simulateShop(g);
  expect(g.player.hp).toBe(75);expect(g.gold).toBe(55);
  expect(g.offers.find(o=>o.id===100)?.locked).toBe(true);
});

it("releases an obsolete reservation after a better weapon is equipped",()=>{
  const g=shop(0);g.offers[0].locked=true;
  g.equipment.weapon={itemId:ITEMS.find(i=>i.name==="井中月")!.id,paid:560};g.recompute();
  simulateShop(g);expect(g.offers[0].locked).toBe(false);expect(g.shopLocksRemaining).toBe(2);
});

it("records real shop decisions without changing them",()=>{
  const a=shop(100),b=shop(100),trace:Parameters<typeof simulateShop>[1]=[];
  simulateShop(a);simulateShop(b,trace);
  expect(b.equipment).toEqual(a.equipment);expect(b.gold).toBe(a.gold);expect(b.offers).toEqual(a.offers);
  expect(trace[0].actions).toContainEqual({kind:"lock",itemId:b.offers[0].itemId,gold:100});
});
