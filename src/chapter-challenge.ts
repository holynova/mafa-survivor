import type {Game,Enemy} from './game';
import {ITEMS,type MapId} from './content';
import {isPrimaryWeaponUpgrade} from './equipment';
import {appendLoot} from './loot';
import {announceEncounter} from './encounters';
import {tuneSurvivalEnemy} from './survivor';
export type ChapterChallenge={status:'idle'|'active'|'won'|'expired';enemyId:number;endsAt:number};
export const newChapterChallenge=():ChapterChallenge=>({status:'idle',enemyId:0,endsAt:0});
export const CHAPTER_CHALLENGES:Partial<Record<MapId,{name:string;kind:string}>>={biche:{name:'郊外剿匪',kind:'orcWarrior'},shimu:{name:'石墓清道',kind:'blackBoar'},bairimen:{name:'林地猎蛛',kind:'moonSpider'}};
export function challengeAvailable(g:Game){return g.survivorMode&&!!CHAPTER_CHALLENGES[g.mapId]&&g.survival.challenge.status==='idle'&&g.clock>=120&&g.clock<240;}
const starterWeapon=ITEMS.find(i=>i.name==='木剑');
// A class-legal weapon can still have zero magic/taoist offense. The guaranteed
// bonus should improve the starter's primary stat, without scaling to current gear.
const rewards=(g:Game)=>ITEMS.filter(i=>i.kind==='equipment'&&i.slot==='weapon'&&i.tier===2&&g.validItem(i)&&isPrimaryWeaponUpgrade(g.classId,starterWeapon,i));
export function acceptChapterChallenge(g:Game){
 if(g.phase!=='paused'||!challengeAvailable(g)||g.enemies.filter(e=>e.hp>0).length>=220||!rewards(g).length)return false;
 const points=g.navigation?.reachablePoints(g.player,180,280).filter(p=>g.canStand(p.x,p.y)&&g.navigation!.lineClear(g.player,p,12));
 const fallback=Array.from({length:8},(_,i)=>({x:g.player.x+220*Math.cos(i*Math.PI/4),y:g.player.y+220*Math.sin(i*Math.PI/4)})).filter(p=>g.canStand(p.x,p.y));
 const point=(points??fallback).sort((a,b)=>Math.hypot(a.x-g.player.x,a.y-g.player.y)-Math.hypot(b.x-g.player.x,b.y-g.player.y))[0];if(!point)return false;
 const e=g.spawnEnemy(CHAPTER_CHALLENGES[g.mapId]!.kind);
 Object.assign(e,point);if(!e.elite){e.elite=true;e.hp=e.maxHp=e.maxHp*4;}tuneSurvivalEnemy(g,e,'elite');
 g.survival.challenge={status:'active',enemyId:e.id,endsAt:g.clock+60};
 g.telemetry.event(g,'challenge-accepted',{map:g.mapId,enemy:e.id,endsAt:g.clock+60});announceEncounter(g,e);g.emit();return true;
}
export function tickChapterChallenge(g:Game){
 const c=g.survival.challenge;if(!g.survivorMode||c.status!=='active')return;
 if(g.clock>=c.endsAt||!g.enemies.some(e=>e.id===c.enemyId&&e.hp>0)){
  c.status='expired';g.telemetry.event(g,'challenge-expired',{enemy:c.enemyId});
  g.floating.push({id:g.nextEntityId(),x:g.player.x,y:g.player.y-85,text:'悬赏结束 · 额外奖励失效',color:'#ecd087',life:2});
 }
}
export function completeChapterChallenge(g:Game,e:Enemy){
 const c=g.survival.challenge;
 if(!g.survivorMode||c.status!=='active'||c.enemyId!==e.id||e.summoned)return;
 if(g.clock>=c.endsAt){c.status='expired';g.telemetry.event(g,'challenge-expired',{enemy:e.id});return;}
 c.status='won';const pool=rewards(g);if(!pool.length)return;
 const item=g.rng.pick(pool);appendLoot(g.drops,{id:g.nextEntityId(),x:e.x,y:e.y,born:g.clock,itemId:item.id,exp:0,gold:0});
 g.telemetry.event(g,'challenge-complete',{enemy:e.id,item:item.id});
 g.floating.push({id:g.nextEntityId(),x:e.x,y:e.y-90,text:'悬赏完成 · 二阶武器掉落',color:'#ecd087',life:2});
}
