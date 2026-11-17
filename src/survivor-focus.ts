import type {Game,Upgrade} from './game';
import {getSkill,type SkillId} from './spells';
import {EVOLUTIONS} from './survivor-evolutions';

/** Two missed offers trigger an eligible main-skill offer; no extra XP or ranks. */
export function focusedChoices(g:Game,shuffled:Upgrade[]):Upgrade[]{
 const mains=g.survival.mainSkills.filter(id=>getSkill(id).classId===g.classId);
 const eligible=mains.filter(id=>shuffled.some(c=>c.skill===id));
 const selected:Upgrade[]=[];
 const add=(choice:Upgrade|undefined)=>{if(choice&&!selected.includes(choice)&&selected.length<3)selected.push(choice);};
 for(const id of eligible)if((g.survival.focusMisses[id]??0)>=2)add(shuffled.find(c=>c.skill===id));
 // Keep the existing owned-skill guarantee, even when the main slots track unlearned skills.
 add(shuffled.find(c=>c.skill&&g.skills.some(s=>s.id===c.skill)));
 for(const choice of shuffled)add(choice);
 for(const id of mains)g.survival.focusMisses[id]=!eligible.includes(id)||selected.some(c=>c.skill===id)?0:Math.min(2,(g.survival.focusMisses[id]??0)+1);
 return selected;
}
export function toggleMainSkill(g:Game,id:SkillId){
 if(!g.survivorMode||g.phase!=='paused'||getSkill(id).classId!==g.classId)return false;
 const selected=g.survival.mainSkills.includes(id);
 if(!selected&&g.survival.mainSkills.length>=2)return false;
 g.survival.mainSkills=selected?g.survival.mainSkills.filter(s=>s!==id):[...g.survival.mainSkills,id];
 delete g.survival.focusMisses[id];g.emit();return true;
}
export function mainRecipeForChoice(g:Game,choice:Upgrade){
 return g.survival.mainSkills.filter(id=>EVOLUTIONS[id]?.charm===choice.id.slice(2)&&choice.id.startsWith('p:')&&!g.survival.evolved.includes(id));
}
