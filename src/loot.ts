import {getItem,SLOT_KEYS,isBossKind} from "./content";
import {sellPrice} from "./rules";
import type {Drop,Enemy,Game} from "./game";

/** Small, source-backed potions: rare ordinary drops and reliable Boss recovery. */
export function healthDrop(enemy:Enemy,roll:()=>number) {
  if(enemy.summoned)return 0;
  if(isBossKind(enemy.kind))return 35;
  return roll()<(enemy.elite ? .15 : .04) ? 20 : 0;
}
const currency=(d:Drop)=>!d.itemId && !d.heal;
function mergeCurrency(a:Drop,b:Drop){a.exp+=b.exp;a.gold+=b.gold;a.level=Math.max(a.level??1,b.level??1);}
const stackKey=(d:Drop)=>d.itemId ? `item:${d.itemId}` : d.heal ? `potion:${d.heal}` : "currency";
/** Bound field clutter by coalescing coins, preserving rare drops and all value. */
export function appendLoot(drops:Drop[],drop:Drop) {
  if(drops.length<300){drops.push(drop);return;}
  const plain=drops.filter(currency);
  if(currency(drop)){mergeCurrency(plain[0] ?? drops[0],drop);return;}
  if(plain.length>=2){mergeCurrency(plain[0],plain[1]);drops.splice(drops.indexOf(plain[1]),1);drops.push(drop);return;}
  if(plain.length===1){mergeCurrency(drop,plain[0]);drops.splice(drops.indexOf(plain[0]),1,drop);return;}
  const same=drops.find(d=>stackKey(d)===stackKey(drop));
  if(same){same.count=(same.count??1)+(drop.count??1);mergeCurrency(same,drop);return;}
  const seen=new Map<string,Drop>();
  for(const old of drops){
    const key=stackKey(old),first=seen.get(key);
    if(first){first.count=(first.count??1)+(old.count??1);mergeCurrency(first,old);drops.splice(drops.indexOf(old),1);drops.push(drop);return;}
    seen.set(key,old);
  }
  // There are fewer than 300 native equipment/potion identities, so this is
  // only a defensive future-content fallback: never silently delete rare loot.
  drops.push(drop);
}
function gold(g:Game,amount:number){g.gold+=amount;g.waveGold+=amount;g.totalGold+=amount;}
/** Return false only when a full-health potion stack should stay on the floor. */
export function collectLoot(g:Game,d:Drop) {
  gold(g,d.gold);g.exp+=d.exp;d.gold=0;d.exp=0;
  if(d.heal) {
    if(g.player.hp>=g.maxHP)return false;
    let count=d.count??1,actual=0;
    while(count>0 && g.player.hp<g.maxHP){
      const before=g.player.hp;g.player.hp=Math.min(g.maxHP,before+d.heal*(1+(g.stats.healing_received??0)/100));actual+=g.player.hp-before;count--;
    }
    g.tao.healing.bloodPotion=(g.tao.healing.bloodPotion??0)+actual;
    g.floating.push({id:g.nextEntityId(),x:g.player.x,y:g.player.y-65,text:`+${Math.round(actual)} 血瓶`,color:"#96e6a4",life:1.1});
    g.effect("heal",g.player.x,g.player.y,0,.7);
    d.count=count;return count===0;
  }
  if(d.itemId) {
    const item=getItem(d.itemId),count=d.count??1;let sold=0,equipped=false;
    for(let i=0;i<count;i++) {
      const slot=SLOT_KEYS.find(s=>(s===item.slot || s.startsWith(item.slot==="bracelet" ? "bracelet" : item.slot==="ring" ? "ring" : "~")) && !g.equipment[s]);
      if(slot){g.equipment[slot]={itemId:item.id,paid:0};g.recompute();equipped=true;}
      else{const value=sellPrice(0,item.price);gold(g,value);sold+=value;}
    }
    g.floating.push({id:g.nextEntityId(),x:g.player.x,y:g.player.y-70,text:equipped ? `拾取 ${item.name}` : `售出 ${item.name} +${sold}`,color:"#ecd087",life:1.3});
  }
  return true;
}
