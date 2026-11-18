import {GamePopupClose} from './GamePopupClose';
import {useState} from 'react';
import {SurvivorEquipment} from './SurvivorEquipment';
import {game} from './game';
import type {SkillId} from './spells';
import {SurvivorSkillManager} from './SurvivorSkillManager';
import {SurvivorBuildFocus} from './SurvivorBuildFocus';
import {SurvivorGrowthBook} from './SurvivorGrowthBook';
import {EvolutionBook} from './EvolutionBook';
export function SurvivorSkillPanel({initialSelected,initialTab,onBack}: {
 initialSelected:SkillId|null; initialTab:'skills'|'equipment'; onBack:()=>void;
}){
 const [tab,setTab]=useState(initialTab);
 return <section className="survivor-panel survivor-skill-panel" role="dialog" aria-modal="true" aria-labelledby="bronze-build-title">
    <GamePopupClose label="关闭技能与装备" onClose={onBack}/>
  <h2 className="bronze-plaque" id="bronze-build-title">技能与装备</h2>
  <div className="survivor-tabs bronze-build-tabs" aria-label="技能与装备">
   <button aria-pressed={tab==='equipment'} onClick={()=>setTab('equipment')}>装备</button>
   <button aria-pressed={tab==='skills'} onClick={()=>setTab('skills')}>技能</button>
  </div>
  {tab==='equipment'?<SurvivorEquipment/>:<>
   <SurvivorSkillManager initialSelected={initialSelected}/><SurvivorBuildFocus/>
   <details className="survivor-more"><summary>成长与进化</summary><EvolutionBook/><SurvivorGrowthBook classId={game.classId} skills={game.skills}/></details>
  </>}
  <button className="bronze-return" onClick={onBack}>返回暂停</button>
 </section>;
}
