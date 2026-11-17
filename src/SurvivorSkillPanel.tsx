import {game} from './game';
import type {SkillId} from './spells';
import {SurvivorSkillManager} from './SurvivorSkillManager';
import {SurvivorBuildFocus} from './SurvivorBuildFocus';
import {SurvivorGrowthBook} from './SurvivorGrowthBook';
import {EvolutionBook} from './EvolutionBook';
export function SurvivorSkillPanel({initialSelected,onBack}:{initialSelected:SkillId|null;onBack:()=>void}){
 return <section className="survivor-panel survivor-pause survivor-skill-panel" aria-label="技能与构筑">
 <header className="survivor-skill-header"><h2>技能与构筑</h2><div><button onClick={onBack}>返回暂停</button><button className="survivor-primary" onClick={()=>{game.survival.toast='';game.pause();}}>继续战斗</button></div></header>
 <SurvivorSkillManager initialSelected={initialSelected}/><SurvivorBuildFocus/>
 <details className="survivor-more"><summary>成长与进化</summary><EvolutionBook/><SurvivorGrowthBook classId={game.classId} skills={game.skills}/></details>
 </section>;
}
