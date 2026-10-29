import {useState} from "react";
import {game} from "./game";
import {SKILLS,getSkill,type SkillId} from "./spells";
import {SKILL_GROWTH,MAX_SKILL_RANK,FINAL_RANK_WAVE,nextSkillLabel} from "./skill-growth";
import {skillMetrics} from "./skill-metrics";

export function SkillGuide() {
  const [view,setView]=useState<SkillId>(game.classInfo.startingSkill);
  const available=SKILLS.filter(s=>s.classId===game.classId);
  const id=available.some(s=>s.id===view) ? view : game.classInfo.startingSkill;
  const owned=game.skills.find(s=>s.id===id),preview=owned??game.newSkill(id);
  return <section className="skill-study" aria-label="技能修炼">
    <h3>技能修炼 <small>技能最高6级 · 终阶第6波开放</small></h3>
    <p className="muted">重点培养两个主力，再补续航与脱身。辅助1—3级也能发挥作用。</p>
    <label>关注已学技能 <select aria-label="关注已学技能" value={game.skillFocus??""} onChange={e=>game.setSkillFocus((e.target.value||null) as SkillId|null)}>
      <option value="">不关注</option>
      {game.skills.filter(s=>s.rank<MAX_SKILL_RANK).map(s=><option key={s.id} value={s.id}>{getSkill(s.id).name} · Lv.{s.rank}</option>)}
    </select></label>
    <p className="fine-print muted">关注技能连续两次未出现在升级选项中，下次合法升级保证出现。</p>
    <label>查看技能成长 <select aria-label="查看技能成长" value={id} onChange={e=>setView(e.target.value as SkillId)}>
      {available.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
    </select></label>
    <p><strong>{getSkill(id).name} · {owned ? `Lv.${owned.rank}/6` : "尚未习得（预览1级）"}</strong></p>
    <p className="skill-metrics" aria-label="技能实际属性">{skillMetrics(game,preview).join(" · ")}</p>
    {owned && owned.rank<6 && <p className="next-skill">下一级：{nextSkillLabel(owned)}{owned.rank===5 && game.wave<FINAL_RANK_WAVE && game.mode!=="test" ? "（第6波开放）" : ""}</p>}
    <ol className="skill-steps">
      {SKILL_GROWTH[id].map((step,index)=><li key={index} className={owned?.rank===index+1 ? "current" : owned && owned.rank>index+1 ? "learned" : ""} aria-current={owned?.rank===index+1 ? "step" : undefined}>
        <b>Lv.{index+1}</b><span>{step.label}{index===5 ? " · 终阶" : ""}</span>
      </li>)}
    </ol>
  </section>;
}
