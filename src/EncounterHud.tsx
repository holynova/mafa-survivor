import {game} from './game';
import {activeBosses,monsterName,finalBossBearing} from './encounters';
export function EncounterHud(){
 const bosses=activeBosses(game),alert=game.encounterAlert;
 return <div className="encounter-hud">
 <div className="boss-health-list" aria-label="首领生命">{bosses.map(e=>{const bearing=finalBossBearing(game,e);return <div className={`boss-health${e.bossPhase===2?' is-enraged':''}`} key={e.id}>
 <div><strong>{e.id===game.survival.finalBossId?'最终首领 · ':''}{monsterName(e.kind)}</strong><span>{e.bossPhase===2?'狂暴 · ':''}{Math.ceil(Math.max(0,e.hp))} / {Math.ceil(e.maxHp)}</span></div>
 <progress aria-label={`${monsterName(e.kind)}生命`} max={e.maxHp} value={Math.max(0,e.hp)}/>{bearing&&<p className="boss-bearing" title="首领相对方位；视线受阻时需要寻找绕行路线"><span aria-hidden="true">{bearing.arrow}</span> 方位 · {bearing.direction}{bearing.status&&` · ${bearing.status}`}</p>}</div>;})}</div>
 {alert&&alert.until>game.clock&&<div className={`encounter-warning${alert.boss?' is-boss':''}`} role="status" key={`${alert.name}-${alert.until}`}><small>{alert.final?'最终首领降临':alert.boss?'首领来袭':'精英现身'}</small><strong>{alert.name}</strong></div>}
 </div>;
}
