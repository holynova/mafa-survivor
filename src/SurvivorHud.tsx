import {skillStatus} from './skill-status';
import {game,type Skill} from './game';
import {getSkill,type SkillId} from './spells';
import {assetUrl,isGraybox} from './release';
import {SURVIVAL_SECONDS,FINAL_OVERTIME_SECONDS} from './survivor';
import {skillCooldown} from './skill-metrics';
import cleave from './assets/bronze/skill-cleave.webp';
import firesword from './assets/bronze/skill-firesword.webp';
const approvedArt: Partial<Record<SkillId,string>>={cleave,firesword};
export function SkillIcon({id}:{id:SkillId}){return isGraybox||id==='reveal'?<span className="mir-skill-fallback" title={getSkill(id).name}>{getSkill(id).name.slice(0,1)}</span>:<img className="mir-skill-icon" src={approvedArt[id]??assetUrl(`ui/skills/${id}.png`)} alt="" draggable={false}/>;}
export function skillCooldownView(skill:Skill,globalCDR:number,survivorMode=false){const total=skillCooldown(skill,globalCDR,survivorMode);return {remaining:Math.max(0,skill.cd),ratio:total>0?Math.max(0,Math.min(1,skill.cd/total)):0};}
export function skillReadiness(skills:Skill[],cdr:number,survivorMode=false){const active=skills.filter(s=>!getSkill(s.id).passive);return active.length?active.reduce((sum,s)=>sum+1-skillCooldownView(s,cdr,survivorMode).ratio,0)/active.length:1;}
export function SurvivorHud({onSkillClick,interactive}: {onSkillClick:(id:SkillId)=>void;interactive:boolean}){
 const hp=Math.max(0,Math.min(1,game.player.hp/game.maxHP));
 const readiness=skillReadiness(game.skills,game.stats.cooldown_reduction??0,game.survivorMode);
 const time=`${Math.floor(game.clock/60).toString().padStart(2,'0')}:${Math.floor(game.clock%60).toString().padStart(2,'0')}`;
 const overtime=game.clock>=SURVIVAL_SECONDS&&!game.survival.finalBossDefeated;
 const left=Math.max(0,Math.ceil((game.survival.overtimeEndsAt||SURVIVAL_SECONDS+FINAL_OVERTIME_SECONDS)-game.clock));
 const timer=overtime?`决战 ${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`:time;
 return <>
  <header className="bronze-hud-top" aria-hidden={!interactive} inert={!interactive}>
   <time className="bronze-clock" aria-label={overtime?`决战剩余 ${left}秒`:`生存时间 ${time}`}>{timer}</time>
   <button className="bronze-pause-button" aria-label="暂停游戏" onClick={()=>game.pause()}/>
  </header>
  <footer className="mir-survival-hud" aria-hidden={!interactive} inert={!interactive} data-skills={game.skills.length}>
   <div className="mir-vital" role="img" aria-label={`生命 ${Math.ceil(game.player.hp)}/${game.maxHP}`}>
    <div className="mir-orb-fill" style={{clipPath:`inset(${(1-hp)*100}% 0 0)`}}/>
    <span>{Math.ceil(game.player.hp)}/{game.maxHP}</span>
   </div>
   <progress className="mir-ready-bar" aria-label={`技能就绪度 ${Math.round(readiness*100)}%`} value={readiness} max={1}/>
   <div className="mir-skill-dock" aria-label="已学技能">
    {game.skills.map(s=>{
     const def=getSkill(s.id), cooldown=skillCooldownView(s,game.stats.cooldown_reduction??0,game.survivorMode);
     const evolved=game.survival.evolved.includes(s.id),status=skillStatus(game,s);
     return <button className={`mir-skill-slot${evolved?' is-evolved':''}`} key={s.id}
       aria-label={`${def.name} ${s.rank}级 · ${status.label}，点击管理技能`} title={`${def.name} · ${status.label}`} onClick={()=>onSkillClick(s.id)}>
      <SkillIcon id={s.id}/>
      {status.active&&<span className="mir-active-badge" aria-hidden="true">效</span>}
      {cooldown.ratio>0&&<span aria-hidden="true" className="mir-cooldown-shade" style={{background:`conic-gradient(#050403d9 ${cooldown.ratio*360}deg,transparent 0)`}}/>}
      {!def.passive&&cooldown.remaining>0&&<span className="mir-cooldown-number" aria-hidden="true">{cooldown.remaining<10?cooldown.remaining.toFixed(1):Math.ceil(cooldown.remaining)}</span>}
      <small aria-hidden="true">{s.rank}</small>
     </button>;
    })}
   </div>
   <div className="mir-experience"><span>Lv.{game.level}</span><progress aria-label="升级经验" value={game.exp} max={game.experienceRequired}/></div>
  </footer>
 </>;
}
