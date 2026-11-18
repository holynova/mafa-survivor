import {game} from './game';
import {CLASSES} from './classes';
import {ITEMS,MAPS,getSkill} from './content';
import {monsterName} from './encounters';
import {EVOLUTIONS} from './survivor';
import {START_UNLOCK_SECONDS,SURVIVOR_STARTS} from './survivor-starts';
import {chapterGoal,type SurvivorProgress} from './survivor-progress';
import {SurvivorRecap} from './SurvivorRecap';
import {SurvivorDiagnostics} from './SurvivorDiagnostics';
import {SurvivorArt} from './SurvivorArt';

const number = new Intl.NumberFormat('zh-CN');
export function SurvivorResult({progress,clock,onRetry,onLeave}: {
  progress:SurvivorProgress; clock:string; onRetry:()=>void; onLeave:()=>void;
}) {
  const sources=Object.entries(game.damageDealt).sort((a,b)=>b[1]-a[1]);
  const findIds=[...new Set(game.telemetry.equipmentFinds(game.runId).map(loot=>loot.to).reverse())].slice(0,3);
  const loot=findIds.flatMap(id=>ITEMS.find(item=>item.id===id)??[]);
  const won=game.phase==='won';
  const boss=monsterName(MAPS[game.mapId].boss);
  return <section className="survivor-panel survivor-result" aria-labelledby="bronze-result-title">
    <h1 className="bronze-plaque" id="bronze-result-title">{won?'击败首领':'本局结束'}</h1>
    <p className="bronze-result-time">生存时间 <strong>{clock}</strong></p>
    <dl className="bronze-result-ledger">
      <div><dt>获得金币</dt><dd>{number.format(game.totalGold)}</dd></div>
      <div><dt>造成伤害</dt><dd>{number.format(Math.round(sources.reduce((sum,[,value])=>sum+value,0)))}</dd></div>
    </dl>
    <h2 className="bronze-result-section">战利品</h2>
    {loot.length?<ul className="bronze-loot">{loot.map(item=><li key={item.id} title={item.name} aria-label={item.name}>
      <span className="bronze-item-slot"><SurvivorArt name={item.icon}/></span>
    </li>)}</ul>:<p className="bronze-loot-empty">本局未换上新装备</p>}
    <button className="survivor-primary" onClick={onRetry}>再战一次</button>
    <button className="survivor-secondary" onClick={onLeave}>返回大厅</button>
    <details className="survivor-more bronze-result-extra">
      <summary>本局战报</summary>
      <p>{MAPS[game.mapId].name} · {CLASSES[game.classId].name} · {won?`击败 ${boss}`:`首领 ${boss}`}</p>
      {game.survival.timedOut&&<p>决战时间已用尽，未能击败最终首领。</p>}
      <p className="survivor-goal">{chapterGoal(progress,game.mapId)}</p>
      <p>等级 {game.level} · 击败 {game.kills} · 进化 {game.survival.evolved.length}</p>
      {(progress.roleBest[game.classId]??0)>=START_UNLOCK_SECONDS&&<p>已开放{getSkill(SURVIVOR_STARTS[game.classId][1]).name}起手，可在开局页切换。</p>}
      <SurvivorRecap/><SurvivorDiagnostics/>
      {sources.length>0&&<details className="survivor-more"><summary>伤害统计</summary>
        {sources.slice(0,6).map(([id,value])=><div className="survivor-row survivor-rule" key={id}>
          <span>{id==='basic'?'普通攻击':id.startsWith('evolution:')?(EVOLUTIONS[id.slice(10) as keyof typeof EVOLUTIONS]?.name??id):(()=>{try{return getSkill(id as typeof game.skills[number]['id']).name;}catch{return id;}})()}</span>
          <b>{Math.round(value)}</b>
        </div>)}
      </details>}
    </details>
  </section>;
}
