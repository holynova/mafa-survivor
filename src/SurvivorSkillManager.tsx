import {skillStatus} from './skill-status';
import {useState} from 'react';
import {game} from './game';
import {getSkill,type SkillId} from './spells';
import {SkillIcon} from './SurvivorHud';
import {EVOLUTIONS} from './survivor';
import {changeSurvivalSkill,replacementSkills} from './survivor-skill-management';
export function SurvivorSkillManager(){
 const [selected,setSelected]=useState<SkillId|null>(null),[next,setNext]=useState<SkillId|null|undefined>(undefined);
 const skill=game.skills.find(s=>s.id===selected),status=skill?skillStatus(game,skill):null,reset=()=>{setSelected(null);setNext(undefined);};
 return <><h3>本局技能 <small>{game.skills.length}/6 · 点击管理</small></h3><div className="survivor-skill-manager">{game.skills.map(s=><button key={s.id} aria-pressed={selected===s.id} onClick={()=>{setSelected(s.id);setNext(undefined);}}><SkillIcon id={s.id}/><span>{game.survival.evolved.includes(s.id)?EVOLUTIONS[s.id]?.name:getSkill(s.id).name}<small>{game.survival.evolved.includes(s.id)?'已进化':`${s.rank}/8`} · {skillStatus(game,s).label}</small></span></button>)}</div>
 {skill&&<section className="skill-edit" aria-label="管理技能">
 <h4>{getSkill(skill.id).name}</h4>
 {status&&<div className="skill-status"><strong>{status.label}</strong><p>{status.detail}</p></div>}
 {next===undefined?<><p>替换从1级开始；移除或替换不返还升级，原有进化与召唤物会清除。</p><button disabled={game.skills.length<=1} onClick={()=>setNext(null)}>移除技能</button>{game.skills.length<=1&&<p>至少保留一个技能，也可以直接替换。</p>}<h4>替换为 <small>{game.mode==='test'?'测试 · 不限次数':`剩余 ${game.survival.respecs}/2 次`}</small></h4>{game.mode!=='test'&&<p>{game.survival.respecs===0?'本局重修次数已用完；仍可免费移除技能。':'仅可替换为本局三选一中见过的技能；移除免费。'}</p>}{replacementSkills(game).length===0&&game.survival.respecs>0&&<p>暂无可替换技能，继续升级发现新技能。</p>}<div className="survivor-skill-picker">{replacementSkills(game).map(s=><button key={s.id} onClick={()=>setNext(s.id)}><SkillIcon id={s.id}/><span>{s.name}</span></button>)}</div><button onClick={reset}>取消</button></>:<><p>{next?`将${getSkill(skill.id).name}替换为${getSkill(next).name}（1级），新技能从完整冷却开始。${game.mode==='test'?'':'消耗1次重修。'}`:`移除${getSkill(skill.id).name}，空出的技能位可在后续升级时重新学习。`}</p><div className="survivor-tabs"><button onClick={()=>{if(changeSurvivalSkill(game,skill.id,next))reset();}}>确认{next?'替换':'移除'}</button><button onClick={()=>setNext(undefined)}>返回</button></div></>}
 </section>}</>;
}
