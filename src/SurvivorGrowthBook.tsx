import {useState} from 'react';
import {SKILLS,type SkillId} from './spells';
import type {ClassId} from './classes';
import {SkillIcon} from './SurvivorHud';
import {survivalGrowth,survivalDescription} from './survivor';
export function SurvivorGrowthBook({classId,skills=[]}:{classId:ClassId;skills?:{id:SkillId;rank:number}[]}){
 const pool=SKILLS.filter(s=>s.classId===classId);
 const [selected,setSelected]=useState<SkillId>(pool[0].id);
 const skill=pool.find(s=>s.id===selected)??pool[0];
 const rank=skills.find(s=>s.id===skill.id)?.rank??0;
 return <details className="survivor-evolution-book survivor-growth-book"><summary>技能成长 · 1—8级</summary><div className="survivor-skill-picker" role="group" aria-label="查看技能成长">{pool.map(s=><button key={s.id} aria-pressed={skill.id===s.id} onClick={()=>setSelected(s.id)}><SkillIcon id={s.id}/><span>{s.name}</span></button>)}</div><p>{survivalDescription(skill.id)}</p><p>{rank?`当前 ${rank}/8 级`:'尚未学习'} · 以下为每级新增效果</p><ol>{survivalGrowth(skill.id).map((step,i)=><li key={i} className={rank>=i+1?'survivor-met':''}><b>{i+1}级{rank===i+1?' · 当前':''}</b><span>{step.label}</span></li>)}</ol><p>多发弹道分别攻击不同目标，不会集中命中同一个敌人。攻击仍受侦测距离和地形限制；8级后的进化需搭配被动与宝箱。</p></details>;
}
