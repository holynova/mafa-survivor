import {getSkill,SKILLS,type SkillId} from './spells';
import type {Game} from './game';
import {clearTaoSkill} from './taoist';
import {skillCooldown} from './skill-metrics';
export function replacementSkills(g:Game){return SKILLS.filter(s=>s.classId===g.classId&&!g.skills.some(owned=>owned.id===s.id)&&(g.mode==='test'||g.survival.respecs>0&&g.survival.seenSkills.includes(s.id)));}
/** Explicit pause-only edit; no XP refund, borrowed evolution, or cooldown reset exploit. */
export function changeSurvivalSkill(g:Game,oldId:SkillId,nextId:SkillId|null){
 if(!g.survivorMode||g.phase!=='paused')return false;
 const index=g.skills.findIndex(s=>s.id===oldId);if(index<0||nextId===null&&g.skills.length<=1)return false;
 if(nextId&&!replacementSkills(g).some(s=>s.id===nextId))return false;
 g.survival.seenSkills=[...new Set([...g.survival.seenSkills,oldId])];
 if(g.survival.mainSkills.includes(oldId)){g.survival.mainSkills=[...new Set(g.survival.mainSkills.flatMap(id=>id===oldId?(nextId?[nextId]:[]):[id]))];delete g.survival.focusMisses[oldId];if(nextId)delete g.survival.focusMisses[nextId];}
 g.telemetry.event(g,"respec",{from:oldId,rank:g.skills[index].rank,to:nextId});
 clearTaoSkill(g,oldId);
 if(oldId==='charm')g.pets=g.pets.filter(p=>p.source!=='charm');
 if(oldId==='shield')g.player.shieldUntil=0;
 if(oldId==='powerstrike'||oldId==='firesword')delete g.charges[oldId];
 g.projectiles=g.projectiles.filter(p=>p.skill!==oldId);
 g.effects=g.effects.filter(f=>f.kind!==oldId && !(oldId==='beast'&&f.kind==='beastflame') && !(oldId==='talisman'&&f.kind==='talismanHit'));
 g.survival.evolved=g.survival.evolved.filter(id=>id!==oldId);delete g.survival.evoReadyAt[oldId];
 if(g.skillFocus===oldId){g.skillFocus=null;g.focusMisses=0;}
 if(nextId){if(g.mode!=='test')g.survival.respecs--;const next=g.newSkill(nextId);next.cd=skillCooldown(next,g.stats.cooldown_reduction??0);g.skills[index]=next;}
 else g.skills.splice(index,1);
 g.recompute();g.survival.toast=nextId?`已替换为${getSkill(nextId).name} · 1级`:`已移除${getSkill(oldId).name}`;g.emit();return true;
}
