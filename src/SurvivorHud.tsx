import type {CSSProperties} from 'react';
import {game,type Skill} from './game';
import {getSkill,type SkillId} from './spells';
import {assetUrl} from './release';
import {expNeeded} from './rules';
import {skillCooldown} from './skill-metrics';
export function SkillIcon({id}:{id:SkillId}){return id==='reveal'?<span className="mir-skill-fallback" title="心灵启示：原版按钮图标待补">启</span>:<img className="mir-skill-icon" src={assetUrl(`ui/skills/${id}.png`)} alt="" draggable={false}/>;}
export function skillCooldownView(skill:Skill,globalCDR:number){const total=skillCooldown(skill,globalCDR);return {remaining:Math.max(0,skill.cd),ratio:total>0?Math.max(0,Math.min(1,skill.cd/total)):0};}
export function skillReadiness(skills:Skill[],cdr:number){const active=skills.filter(s=>!getSkill(s.id).passive);return active.length?active.reduce((sum,s)=>sum+1-skillCooldownView(s,cdr).ratio,0)/active.length:1;}
export function SurvivorHud(){
 const hp=Math.max(0,Math.min(1,game.player.hp/game.maxHP));
 const readiness=skillReadiness(game.skills,game.stats.cooldown_reduction??0);
 const time=`${Math.floor(game.clock/60).toString().padStart(2,'0')}:${Math.floor(game.clock%60).toString().padStart(2,'0')}`;
 const art={'--mir-board':`url("${assetUrl('ui/board.png')}")`,'--mir-chat':`url("${assetUrl('ui/chat.png')}")`} as CSSProperties;
 return <footer className="mir-survival-hud" style={art}>
 <div className="mir-vital" aria-label="生命与技能就绪度"><div className="mir-orb-art" aria-hidden="true"><img src={assetUrl('ui/hp.png')} className="mir-orb-left" style={{clipPath:`inset(${(1-hp)*100}% 0 0 0)`}} alt=""/><img src={assetUrl('ui/mp.png')} className="mir-orb-right" style={{clipPath:`inset(${(1-readiness)*100}% 0 0 0)`}} alt=""/></div><div className="mir-vital-bars"><progress className="mir-hp-bar" aria-label={`生命 ${Math.ceil(game.player.hp)}/${game.maxHP}`} value={hp} max={1}/><progress className="mir-ready-bar" aria-label={`技能就绪度 ${Math.round(readiness*100)}%`} value={readiness} max={1}/></div><span>{Math.ceil(game.player.hp)} / {game.maxHP}</span></div>
 <div className="mir-hud-frame"><div className="mir-hud-readout"><span>等级 <b>{game.level}</b></span><strong aria-label={`生存时间 ${time}`}>{time}</strong><button aria-label="暂停游戏" onClick={()=>game.pause()}>暂停</button></div>
 <div className="mir-skill-dock" aria-label="已学技能">{game.skills.map(s=>{const def=getSkill(s.id),cooldown=skillCooldownView(s,game.stats.cooldown_reduction??0),evolved=game.survival.evolved.includes(s.id);const status=def.passive?'常驻':cooldown.remaining>0?`${cooldown.remaining.toFixed(1)}秒`:'就绪';return <button className={`mir-skill-slot${evolved?' is-evolved':''}`} key={s.id} aria-label={`${def.name} ${s.rank}级 · ${status}，点击查看构筑`} title={`${def.name} · ${status}`} onClick={()=>game.pause()}><SkillIcon id={s.id}/>{cooldown.ratio>0&&<span aria-hidden="true" className="mir-cooldown-shade" style={{background:`conic-gradient(#050403d9 ${cooldown.ratio*360}deg,transparent 0)`}}/>}{!def.passive&&cooldown.remaining>0&&<span className="mir-cooldown-number" aria-hidden="true">{cooldown.remaining<10?cooldown.remaining.toFixed(1):Math.ceil(cooldown.remaining)}</span>}<small aria-hidden="true">{evolved?'◆':s.rank}</small></button>;})}</div>
 <progress aria-label="升级经验" value={game.exp} max={expNeeded(game.level)}/></div></footer>;
}
