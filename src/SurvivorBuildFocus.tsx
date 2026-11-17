import {game} from './game';
import {SKILLS,getSkill} from './spells';
import {CHARMS} from './survivor';
import {evolutionReadiness} from './survivor-evolutions';
import {toggleMainSkill} from './survivor-focus';
import {SkillIcon} from './SurvivorHud';
export function SurvivorBuildFocus(){
 const mains=game.survival.mainSkills;
 return <details className="survivor-more"><summary>主修与进化 · {mains.length}/2</summary>
 <p>主修连续两次未出现，下次必出；满级或无法学习时除外。</p>

 {mains.map(id=>{const state=evolutionReadiness(game,id);return <article className="survivor-rule" key={id}><b>{getSkill(id).name}{state?` → ${state.recipe.name}`:''}</b>{state?.evolved?<p className="survivor-met">已进化</p>:state?<p>{state.rank<8?`技能 ${state.rank}/8 · `:''}{!state.hasCharm?`缺${CHARMS.find(c=>c.id===state.recipe.charm)?.name} · `:''}{state.rank===8&&state.hasCharm?(state.eligibleChests?'配方齐全，拾取进化宝箱':'配方齐全，等待进化宝箱'):'配方齐全后拾取进化宝箱'}</p>:<p>当前 {game.skills.find(s=>s.id===id)?.rank??0}/8 级 · 此技能没有进化配方</p>}</article>;})}
 <details className="survivor-more"><summary>调整主修</summary><p>最多两项；先取消再改选，不消耗重修次数。</p> <div className="survivor-skill-picker">{SKILLS.filter(s=>s.classId===game.classId).map(s=><button key={s.id} aria-pressed={mains.includes(s.id)} disabled={!mains.includes(s.id)&&mains.length>=2} onClick={()=>toggleMainSkill(game,s.id)}><SkillIcon id={s.id}/><span>{s.name}{mains.includes(s.id)?' · 主修':''}</span></button>)}</div></details>
 </details>;
}
