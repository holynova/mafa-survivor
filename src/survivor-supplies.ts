import type {Game,Enemy} from './game';
import {isBossKind} from './content';
import {POTION_CAPACITY} from './potions';
export const SUPPLIES={potion:{name:'强效血瓶',cost:80},reroll:{name:'重掷次数',cost:120}} as const;
export type SupplyId=keyof typeof SUPPLIES;
export function supplyCredits(g:Game){return Math.max(0,g.survival.supplyBosses.length-g.survival.suppliesBought);}
export function awardSupply(g:Game,e:Enemy){
 if(!g.survivorMode||e.summoned||!isBossKind(e.kind)||e.id===g.survival.finalBossId||g.survival.supplyBosses.length>=3||g.survival.supplyBosses.includes(e.id))return;
 g.survival.supplyBosses.push(e.id);
 g.floating.push({id:g.nextEntityId(),x:g.player.x,y:g.player.y-80,text:'补给机会 +1 · 暂停采购',color:'#ecd087',life:2});
}
export function supplyUnavailable(g:Game,id:SupplyId){
 if(!g.survivorMode||g.phase!=='paused')return '暂停后采购';
 if(!supplyCredits(g))return '击败阶段首领后获得补给机会';
 if(id==='potion'&&g.potions.reserve.length>=POTION_CAPACITY)return '血瓶已满';
 if(id==='reroll'&&g.survival.rerolls>=3)return '重掷次数已满';
 if(g.gold<SUPPLIES[id].cost)return '金币不足';
 return '';
}
export function buySupply(g:Game,id:SupplyId){
 if(supplyUnavailable(g,id))return false;
 g.gold-=SUPPLIES[id].cost;g.survival.suppliesBought++;
 if(id==='potion')g.potions.reserve.push(35);else g.survival.rerolls++;
 g.sound('coin');g.emit();return true;
}
