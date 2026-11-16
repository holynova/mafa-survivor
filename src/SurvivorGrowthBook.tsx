import {useState} from 'react';
import {SKILLS,type SkillId} from './spells';
import type {ClassId} from './classes';
import {survivalGrowth} from './survivor';
export function SurvivorGrowthBook({classId,skills=[]}:{classId:ClassId;skills?:{id:SkillId;rank:number}[]}){
 const pool=SKILLS.filter(s=>s.classId===classId);
 const [selected,setSelected]=useState<SkillId>(pool[0].id);
 const skill=pool.find(s=>s.id===selected)??pool[0];
 const rank=skills.find(s=>s.id===skill.id)?.rank??0;
 return <details className="survivor-evolution-book survivor-growth-book"><summary>技能成长 · 1—8级</summary><label>查看技能<select aria-label="查看技能成长" value={skill.id} onChange={e=>setSelected(e.target.value as SkillId)}>{pool.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><p>{skill.description}</p><p>{rank?`当前 ${rank}/8 级`:'尚未学习'} · 以下为每级新增效果</p><ol>{survivalGrowth(skill.id).map((step,i)=><li key={i} className={rank>=i+1?'survivor-met':''}><b>{i+1}级{rank===i+1?' · 当前':''}</b><span>{step.label}</span></li>)}</ol><p>多发弹道分别攻击不同目标，不会集中命中同一个敌人。攻击仍受侦测距离和地形限制；8级后的进化需搭配被动与宝箱。</p></details>;
}
