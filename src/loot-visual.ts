import type {Drop} from "./game";
import {getItem} from "./content";
export function goldPile(d:Drop) {
  const valueTier=d.exp>=60 ? 4 : d.exp>=20 ? 3 : d.exp>=10 ? 2 : d.exp>=5 ? 1 : 0;
  const tier=Math.min(4,Math.max(valueTier,Math.floor(((d.level??1)-1)/3)));
  return `item/金币（${["小","中","大","特","超"][tier]}）`;
}
export function lootName(d:Drop) {
  const count=(d.count??1)>1 ? ` ×${d.count}` : "";
  return d.itemId ? getItem(d.itemId).name+count : d.heal ? (d.heal>20 ? "金创药（中）" : "金创药（小）")+count : `经验 ${d.exp} · 金币 ${d.gold}`;
}
export function dropVisuals(d:Drop):{frame:string;dx:number;dy:number}[] {
  const primary=d.itemId ? getItem(d.itemId).icon : d.heal ? `item/金创药（${d.heal>20 ? "中" : "小"}）` : goldPile(d);
  const result=primary ? [{frame:primary,dx:0,dy:0}] : [];
  if((d.itemId || d.heal) && (d.exp>0 || d.gold>0))result.unshift({frame:goldPile(d),dx:-14,dy:9});
  return result;
}
