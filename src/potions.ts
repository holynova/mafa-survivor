import type {Drop,Game} from "./game";
export const POTION_CAPACITY=3;
export const POTION_COOLDOWN=2;
export type BloodPotion=20|35;
export const newPotionState=()=>({reserve:[] as BloodPotion[],cd:0});
const storable=(heal:number):heal is BloodPotion=>heal===20 || heal===35;
export function canCollectPotion(g:Game,d:Drop) {
  return g.player.hp<g.maxHP || !!d.heal && storable(d.heal) && g.potions.reserve.length<POTION_CAPACITY;
}
function restoreHealth(g:Game,raw:number) {
  const before=g.player.hp;g.player.hp=Math.min(g.maxHP,before+raw*(1+(g.stats.healing_received??0)/100));
  return g.player.hp-before;
}
function feedback(g:Game,actual:number) {
  if(actual<=0)return;
  g.tao.healing.bloodPotion=(g.tao.healing.bloodPotion??0)+actual;
  g.floating.push({id:g.nextEntityId(),x:g.player.x,y:g.player.y-65,text:`+${Math.round(actual)} 血瓶`,color:"#96e6a4",life:1.1});
  g.effect("heal",g.player.x,g.player.y,0,.7);
}
/** Conserve each bottle: immediate healing first, spare bottles into a bounded reserve. */
export function collectPotion(g:Game,d:Drop) {
  if(!d.heal)return true;
  let count=d.count??1,actual=0;
  while(count>0 && g.player.hp<g.maxHP){actual+=restoreHealth(g,d.heal);count--;}
  if(storable(d.heal))while(count>0 && g.potions.reserve.length<POTION_CAPACITY){g.potions.reserve.push(d.heal);count--;}
  feedback(g,actual);d.count=count;return count===0;
}
export function useBloodPotion(g:Game) {
  if(g.phase!=="battle" || g.player.hp<=0 || g.player.hp>=g.maxHP || g.potions.cd>0 || !g.potions.reserve.length)return false;
  const needed=(g.maxHP-g.player.hp)/(1+(g.stats.healing_received??0)/100);
  const sorted=[...g.potions.reserve].sort((a,b)=>a-b),chosen=sorted.find(raw=>raw>=needed) ?? sorted.at(-1)!;
  const index=g.potions.reserve.indexOf(chosen);g.potions.reserve.splice(index,1);
  feedback(g,restoreHealth(g,chosen));g.potions.cd=POTION_COOLDOWN;g.sound("heal");return true;
}
